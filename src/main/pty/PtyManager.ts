import { spawn, type IPty } from 'node-pty'
import type { WebContents } from 'electron'
import { CH } from '@shared/ipc-channels'
import type { PtyDataEvt, PtyExitEvt, PtySpawnReq } from '@shared/ipc-contract'
import { cleanEnv, defaultShell, homeDir } from './shellResolver'

interface Entry {
  pty: IPty
  /**
   * Coalescing buffer: raw chunks accumulated since the last flush, joined once
   * at flush time. A chunk list avoids the O(n²) realloc of repeated `+=` on a
   * fast pty (model output, build logs).
   */
  buf: string[]
  timer: ReturnType<typeof setTimeout> | null
}

/** Output is coalesced and flushed at ~120Hz to collapse IPC chatter. */
const FLUSH_MS = 8

/** Cap on a single IPC payload, so one huge burst is split across frames
 *  instead of stalling the renderer with a giant structured-clone message. */
const MAX_CHUNK = 256 * 1024

/**
 * Owns every node-pty instance. The renderer never touches native modules;
 * it drives ptys exclusively through this manager via IPC.
 */
export class PtyManager {
  private readonly entries = new Map<string, Entry>()
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

    const entry: Entry = { pty: proc, buf: [], timer: null }
    this.entries.set(ptyId, entry)

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
      if (entry.timer === null) {
        entry.timer = setTimeout(() => this.flush(ptyId), FLUSH_MS)
      }
    })

    proc.onExit(({ exitCode, signal }) => {
      this.flush(ptyId)
      this.send(CH.PTY_EXIT, { ptyId, exitCode, signal } satisfies PtyExitEvt)
      this.dispose(ptyId)
    })

    return ptyId
  }

  write(ptyId: string, data: string): void {
    this.entries.get(ptyId)?.pty.write(data)
  }

  resize(ptyId: string, cols: number, rows: number): void {
    const entry = this.entries.get(ptyId)
    if (entry && cols > 0 && rows > 0) {
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
    this.entries.delete(ptyId)
  }

  private send(channel: string, payload: PtyDataEvt | PtyExitEvt): void {
    const wc = this.getSender()
    if (wc && !wc.isDestroyed()) wc.send(channel, payload)
  }
}
