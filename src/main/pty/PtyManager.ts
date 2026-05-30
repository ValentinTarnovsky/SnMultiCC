import { spawn, type IPty } from 'node-pty'
import type { WebContents } from 'electron'
import { CH } from '@shared/ipc-channels'
import type { PaneState } from '@shared/types'
import type {
  PtyDataEvt,
  PtyExitEvt,
  PtyReattachRes,
  PtySpawnReq,
  PtyStateEvt,
} from '@shared/ipc-contract'
import { cleanEnv, defaultShell, homeDir } from './shellResolver'

interface Entry {
  pty: IPty
  /** Stable renderer-owned id; lets the renderer reattach across remounts. */
  paneId: string
  /** Raw chunks accumulated since the last flush (joined once at flush). */
  buf: string[]
  timer: ReturnType<typeof setTimeout> | null
  /** Bounded recent-output ring, replayed into a fresh terminal on reattach. */
  history: string[]
  historyBytes: number
  /** Live activity state, derived from the output stream. */
  state: PaneState
  idleTimer: ReturnType<typeof setTimeout> | null
  /** False while the owning workspace is hidden (output is throttled). */
  active: boolean
  /** Timestamp of the last output chunk (burst detection). */
  lastDataMs: number
  /** When the current output burst began. */
  burstStartMs: number
  /** Ignore output for state purposes until this time (post-resize redraw). */
  suppressUntil: number
}

/** Output is coalesced and flushed at ~120Hz for the visible workspace. */
const FLUSH_MS = 8
/** Hidden workspaces flush far slower — their xterms can't paint anyway. */
const HIDDEN_FLUSH_MS = 250
/** Cap on a single IPC payload (split larger bursts across frames). */
const MAX_CHUNK = 256 * 1024
/** Replay ring-buffer size per pty. */
const HISTORY_CAP = 256 * 1024
/** Quiet for this long ⇒ classify the pane (idle, or waiting if it's a prompt). */
const IDLE_AFTER_MS = 800
/** Gap (ms) that separates two output bursts. */
const BURST_GAP_MS = 400
/** Continuous output beyond this ⇒ the console is genuinely "working". */
const WORK_MIN_MS = 400
/** Ignore output for this long after a resize — it's a prompt redraw, not work. */
const RESIZE_SUPPRESS_MS = 700
/** Heuristic: the tail looks like a console waiting for the user to answer. */
const WAITING_RX =
  /(\(y\/n\)|\[y\/n\]|\(yes\/no\)|do you want to proceed|press enter to continue|continue\?|overwrite\?|❯\s*1\.|\b1\.\s*yes\b|\(use arrow keys\))/i

/**
 * Owns every node-pty instance. The renderer never touches native modules;
 * it drives ptys exclusively through this manager via IPC.
 *
 * Beyond raw I/O it maintains, per pane: a replay ring buffer (so a remounted
 * or reloaded renderer can rebind without respawning), a derived activity state
 * (working / waiting / idle / exited), an active flag for hidden-workspace
 * output throttling, and flow control for backpressure.
 */
export class PtyManager {
  private readonly entries = new Map<string, Entry>()
  private readonly byPane = new Map<string, string>()
  private seq = 0

  constructor(private readonly getSender: () => WebContents | null) {}

  /** Number of live ptys. */
  get count(): number {
    return this.entries.size
  }

  spawn(req: PtySpawnReq): string {
    const ptyId = `pty-${++this.seq}`
    const shell = req.shell || defaultShell()
    const proc = spawn(shell, req.args ?? [], {
      name: 'xterm-256color',
      cols: req.cols > 0 ? req.cols : 80,
      rows: req.rows > 0 ? req.rows : 24,
      cwd: req.cwd || homeDir(),
      env: cleanEnv(req.env),
    })

    const entry: Entry = {
      pty: proc,
      paneId: req.paneId,
      buf: [],
      timer: null,
      history: [],
      historyBytes: 0,
      state: 'idle',
      idleTimer: null,
      active: true,
      lastDataMs: 0,
      burstStartMs: 0,
      suppressUntil: 0,
    }
    this.entries.set(ptyId, entry)
    this.byPane.set(req.paneId, ptyId)
    // Register the pane with the renderer right away (idle dot + zeroed timer).
    this.send(CH.PTY_STATE, { ptyId, paneId: req.paneId, state: 'idle' } satisfies PtyStateEvt)

    if (req.initialCommand && req.initialCommand.trim()) {
      // Terminate with a bare CR — exactly what pressing Enter sends in a
      // terminal. CRLF makes PowerShell emit a spurious ">>" continuation.
      // Small delay so the shell finishes initializing before we feed input.
      setTimeout(() => {
        try {
          proc.write(req.initialCommand!.trim() + '\r')
        } catch {
          /* pty may have exited */
        }
      }, 350)
    }

    proc.onData((data) => {
      entry.buf.push(data)
      this.pushHistory(entry, data)
      this.trackActivity(ptyId, entry)
      if (entry.timer === null) {
        entry.timer = setTimeout(() => this.flush(ptyId), entry.active ? FLUSH_MS : HIDDEN_FLUSH_MS)
      }
    })

    proc.onExit(({ exitCode, signal }) => {
      this.flush(ptyId)
      this.setState(ptyId, 'exited')
      this.send(CH.PTY_EXIT, { ptyId, exitCode, signal } satisfies PtyExitEvt)
      this.dispose(ptyId)
    })

    return ptyId
  }

  /** Rebind to a live pty for paneId, returning its id + replay history. */
  reattach(paneId: string): PtyReattachRes | null {
    const ptyId = this.byPane.get(paneId)
    if (!ptyId) return null
    const entry = this.entries.get(ptyId)
    if (!entry) return null
    // Drain anything pending so post-subscribe output isn't a duplicate of replay.
    this.flush(ptyId)
    return { ptyId, replay: entry.history.join('') }
  }

  write(ptyId: string, data: string): void {
    this.entries.get(ptyId)?.pty.write(data)
  }

  resize(ptyId: string, cols: number, rows: number): void {
    const entry = this.entries.get(ptyId)
    if (entry && cols > 0 && rows > 0) {
      // A resize makes the shell repaint its prompt; don't count that as work.
      entry.suppressUntil = Date.now() + RESIZE_SUPPRESS_MS
      try {
        entry.pty.resize(cols, rows)
      } catch {
        /* pty may have already exited */
      }
    }
  }

  kill(ptyId: string): void {
    const entry = this.entries.get(ptyId)
    if (!entry) return
    try {
      entry.pty.kill()
    } catch {
      /* already gone */
    }
    this.dispose(ptyId)
  }

  killAll(): void {
    // Drain buffered output before tearing down so the last bytes aren't lost.
    for (const id of [...this.entries.keys()]) {
      this.flush(id)
      this.kill(id)
    }
  }

  /** Mark which panes are in the visible workspace; others throttle output. */
  setActive(paneIds: string[]): void {
    const activeSet = new Set(paneIds)
    for (const [ptyId, entry] of this.entries) {
      const nowActive = activeSet.has(entry.paneId)
      const wasActive = entry.active
      entry.active = nowActive
      // On reveal, paint whatever was buffered while hidden, immediately.
      if (nowActive && !wasActive) this.flush(ptyId)
    }
  }

  /** Backpressure: pause/resume a pty when the renderer can't keep up. */
  setFlow(ptyId: string, pause: boolean): void {
    const entry = this.entries.get(ptyId)
    if (!entry) return
    try {
      if (pause) entry.pty.pause()
      else entry.pty.resume()
    } catch {
      /* pty may have exited */
    }
  }

  private pushHistory(entry: Entry, data: string): void {
    entry.history.push(data)
    entry.historyBytes += data.length
    while (entry.historyBytes > HISTORY_CAP && entry.history.length > 1) {
      const dropped = entry.history.shift()
      if (dropped) entry.historyBytes -= dropped.length
    }
  }

  /**
   * Mark the pane "working" only on *sustained* output (an agent streaming, a
   * build running) — never on a one-shot prompt redraw from a click/resize/
   * focus. When output settles, classifyQuiet decides idle vs waiting.
   */
  private trackActivity(ptyId: string, entry: Entry): void {
    const now = Date.now()
    if (now >= entry.suppressUntil) {
      if (now - entry.lastDataMs >= BURST_GAP_MS) {
        // First chunk of a fresh burst — not enough to call it work yet.
        entry.burstStartMs = now
      } else if (now - entry.burstStartMs >= WORK_MIN_MS) {
        this.setState(ptyId, 'working')
      }
    }
    entry.lastDataMs = now
    if (entry.idleTimer) clearTimeout(entry.idleTimer)
    entry.idleTimer = setTimeout(() => this.classifyQuiet(ptyId), IDLE_AFTER_MS)
  }

  /** When output settles, the tail decides: waiting on a prompt, or just idle. */
  private classifyQuiet(ptyId: string): void {
    const entry = this.entries.get(ptyId)
    if (!entry) return
    if (WAITING_RX.test(this.tail(entry))) this.setState(ptyId, 'waiting')
    else this.setState(ptyId, 'idle')
  }

  /** Roughly the last 2KB of recent output. */
  private tail(entry: Entry): string {
    let out = ''
    for (let i = entry.history.length - 1; i >= 0 && out.length < 2048; i--) {
      out = entry.history[i] + out
    }
    return out.slice(-2048)
  }

  private setState(ptyId: string, state: PaneState): void {
    const entry = this.entries.get(ptyId)
    if (!entry || entry.state === state) return
    entry.state = state
    this.send(CH.PTY_STATE, { ptyId, paneId: entry.paneId, state } satisfies PtyStateEvt)
  }

  private flush(ptyId: string): void {
    const entry = this.entries.get(ptyId)
    if (!entry) return
    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
    if (entry.buf.length === 0) return
    const data = entry.buf.join('')
    entry.buf = []
    if (data.length <= MAX_CHUNK) {
      this.send(CH.PTY_DATA, { ptyId, data } satisfies PtyDataEvt)
      return
    }
    // Oversized burst: split into renderer-digestible frames.
    for (let i = 0; i < data.length; i += MAX_CHUNK) {
      this.send(CH.PTY_DATA, { ptyId, data: data.slice(i, i + MAX_CHUNK) } satisfies PtyDataEvt)
    }
  }

  private dispose(ptyId: string): void {
    const entry = this.entries.get(ptyId)
    if (!entry) return
    if (entry.timer) clearTimeout(entry.timer)
    if (entry.idleTimer) clearTimeout(entry.idleTimer)
    if (this.byPane.get(entry.paneId) === ptyId) this.byPane.delete(entry.paneId)
    this.entries.delete(ptyId)
  }

  private send(channel: string, payload: PtyDataEvt | PtyExitEvt | PtyStateEvt): void {
    const wc = this.getSender()
    if (wc && !wc.isDestroyed()) wc.send(channel, payload)
  }
}
