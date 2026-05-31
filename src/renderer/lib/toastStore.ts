import { create } from 'zustand'

export interface Toast {
  id: string
  kind: 'done' | 'waiting'
  /** Console (pane) title. */
  title: string
  /** Short reason line. */
  body: string
  workspaceId: string
  workspaceName: string
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

/** In-app, ephemeral notifications shown by the Toaster (top-right). */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      // Keep at most 5 on screen.
      return { toasts: [...s.toasts, { ...t, id }].slice(-5) }
    }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
