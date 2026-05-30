import { create } from 'zustand'
import type { PaneState } from '@shared/types'

/**
 * Transient per-pane activity, kept OUT of the persisted app store so the
 * high-frequency working/idle churn never triggers a config save.
 */
interface ActivityState {
  /** paneId -> live activity state. */
  states: Record<string, PaneState>
  /** paneId -> epoch ms when its pty was first seen (drives the runtime timer). */
  spawnedAt: Record<string, number>
  setState: (paneId: string, state: PaneState) => void
  clear: (paneId: string) => void
}

export const useActivityStore = create<ActivityState>((set) => ({
  states: {},
  spawnedAt: {},
  setState: (paneId, state) =>
    set((s) => ({
      states: { ...s.states, [paneId]: state },
      spawnedAt: s.spawnedAt[paneId] ? s.spawnedAt : { ...s.spawnedAt, [paneId]: Date.now() },
    })),
  clear: (paneId) =>
    set((s) => {
      const states = { ...s.states }
      const spawnedAt = { ...s.spawnedAt }
      delete states[paneId]
      delete spawnedAt[paneId]
      return { states, spawnedAt }
    }),
}))
