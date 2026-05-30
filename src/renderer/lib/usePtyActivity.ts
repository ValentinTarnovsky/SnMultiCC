import { useEffect, useRef } from 'react'
import type { PaneState } from '@shared/types'
import { useAppStore } from './store'
import { useActivityStore } from './activityStore'
import { playBeep } from './sound'
import { useT, type TFn } from '@/i18n'

/** A "working" spell shorter than this isn't worth a "done" notification. */
const MIN_WORK_MS = 8000

interface PaneRef {
  title: string
  type: string
  workspaceId: string
}

function findPane(paneId: string): PaneRef | null {
  for (const w of useAppStore.getState().workspaces) {
    const p = w.panes.find((pane) => pane.id === paneId)
    if (p) return { title: p.title, type: p.type, workspaceId: w.id }
  }
  return null
}

function notify(title: string, body: string, workspaceId: string, sound: boolean): void {
  try {
    const n = new Notification(title, { body, silent: true })
    n.onclick = () => {
      useAppStore.getState().setActive(workspaceId)
      window.snApi.system.focus()
    }
  } catch {
    /* notifications unavailable */
  }
  window.snApi.system.requestAttention()
  if (sound) playBeep()
}

/**
 * Subscribes to per-pane activity (S3) once, mirrors it into the activity store
 * for the status overlays, and fires desktop notifications on the meaningful
 * transitions (task done / waiting for input) when the pane isn't in view.
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
          notify(pane.title, tRef.current('notify.doneBody', { secs }), pane.workspaceId, settings.notifySound)
        }
      }
      // Console is waiting for the user to answer a prompt.
      if (state === 'waiting' && prev !== 'waiting' && settings.notifyOnWaiting) {
        notify(pane.title, tRef.current('notify.waitingBody'), pane.workspaceId, settings.notifySound)
      }
    })
    return off
  }, [])
}
