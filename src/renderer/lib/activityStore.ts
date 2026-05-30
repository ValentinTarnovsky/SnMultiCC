import { create } from 'zustand'
import type { PaneState } from '@shared/types'

export interface PaneActivity {
  state: PaneState
  /** Accumulated time spent in the "working" state, in ms (idle/waiting don't count). */
  workedMs: number
  /** Epoch ms when the current working spell began, else null. */
  workingSince: number | null
}

/**
 * Transient per-pane activity, kept OUT of the persisted app store so the
 * high-frequency working/idle churn never triggers a config save.
 *
 * The runtime timer counts only working time: it advances while a console is
 * working and pauses when it goes idle/waiting.
 */
interface ActivityState {
  activity: Record<string, PaneActivity>
  setState: (paneId: string, state: PaneState) => void
  clear: (paneId: string) => void
}

export const useActivityStore = create<ActivityState>((set) => ({
  activity: {},
  setState: (paneId, state) =>
    set((s) => {
      const prev = s.activity[paneId]
      const now = Date.now()
      let workedMs = prev?.workedMs ?? 0
      let workingSince = prev?.workingSince ?? null
      const wasWorking = prev?.state === 'working'

      if (state === 'working' && !wasWorking) {
        workingSince = now
      } else if (state !== 'working' && wasWorking) {
        if (workingSince != null) workedMs += now - workingSince
        workingSince = null
      }
      return { activity: { ...s.activity, [paneId]: { state, workedMs, workingSince } } }
    }),
  clear: (paneId) =>
    set((s) => {
      const activity = { ...s.activity }
      delete activity[paneId]
      return { activity }
    }),
}))
