import { useEffect, useRef } from 'react'
import type { PaneState, Settings } from '@shared/types'
import { useAppStore } from './store'
import { useActivityStore } from './activityStore'
import { useToastStore } from './toastStore'
import { playBeep } from './sound'
import { useT, type TFn } from '@/i18n'

/** A "working" spell shorter than this isn't worth a "done" alert. */
const MIN_WORK_MS = 5000

interface PaneRef {
  title: string
  type: string
  workspaceId: string
  workspaceName: string
}

function findPane(paneId: string): PaneRef | null {
  for (const w of useAppStore.getState().workspaces) {
    const p = w.panes.find((pane) => pane.id === paneId)
    if (p) return { title: p.title, type: p.type, workspaceId: w.id, workspaceName: w.name }
  }
  return null
}

/** In-app toast + best-effort OS notification + optional chime. */
function raiseAlert(kind: 'done' | 'waiting', pane: PaneRef, body: string, settings: Settings): void {
  useToastStore.getState().push({
    kind,
    title: pane.title,
    body,
    workspaceId: pane.workspaceId,
    workspaceName: pane.workspaceName,
  })
  try {
    const n = new Notification(pane.title, { body: `${body} · ${pane.workspaceName}`, silent: true })
    n.onclick = () => {
      useAppStore.getState().setActive(pane.workspaceId)
      window.snApi.system.focus()
    }
  } catch {
    /* notifications unavailable */
  }
  window.snApi.system.requestAttention()
  if (settings.notifySound) playBeep(settings.notifyVolume / 100)
}

/**
 * Subscribes to per-pane activity (S3) once, mirrors it into the activity store
 * for the status overlays, and raises an alert (toast + notification + chime)
 * on the meaningful transitions (task done / waiting for input) when the pane
 * isn't currently in view.
 */
export function usePtyActivity(): void {
  const t = useT()
  const tRef = useRef<TFn>(t)
  tRef.current = t

  const prevRef = useRef<Record<string, PaneState>>({})
  const workingSinceRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const off = window.snApi.pty.onState((e) => {
      const { paneId, state } = e
      const prev = prevRef.current[paneId]
      useActivityStore.getState().setState(paneId, state)
      if (state === 'working') workingSinceRef.current[paneId] = Date.now()

      const pane = findPane(paneId)
      prevRef.current[paneId] = state
      if (!pane || pane.type === 'shell') return

      const { settings, activeWorkspaceId } = useAppStore.getState()
      const inView = document.hasFocus() && pane.workspaceId === activeWorkspaceId
      if (inView) return

      // Task finished: a working spell of meaningful length went quiet.
      if (prev === 'working' && state === 'idle' && settings.notifyOnDone) {
        const secs = Math.round((Date.now() - (workingSinceRef.current[paneId] ?? 0)) / 1000)
        if (secs * 1000 >= MIN_WORK_MS) {
          raiseAlert('done', pane, tRef.current('notify.doneBody', { secs }), settings)
        }
      }
      // Console is waiting for the user to answer a prompt.
      if (state === 'waiting' && prev !== 'waiting' && settings.notifyOnWaiting) {
        raiseAlert('waiting', pane, tRef.current('notify.waitingBody'), settings)
      }
    })
    return off
  }, [])
}
