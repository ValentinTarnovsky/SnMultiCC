import { useEffect } from 'react'
import { useAppStore } from './store'

/** Sidebar display order: favorites first (matches the Sidebar). */
function displayOrder() {
  return [...useAppStore.getState().workspaces].sort(
    (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0),
  )
}

/**
 * App-wide keyboard shortcuts, attached on the capture phase so they win over
 * xterm:
 *  - Ctrl/Cmd+K  → toggle the command palette
 *  - Ctrl+Tab    → flip to the most-recently-active workspace
 *  - Alt+1..9    → jump to the Nth workspace
 */
export function useGlobalKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey

      if (mod && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        e.stopPropagation()
        const s = useAppStore.getState()
        s.setPaletteOpen(!s.paletteOpen)
        return
      }

      if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'Tab') {
        const s = useAppStore.getState()
        const prev = s.previousWorkspaceId
        if (prev && prev !== s.activeWorkspaceId && s.workspaces.some((w) => w.id === prev)) {
          e.preventDefault()
          e.stopPropagation()
          s.setActive(prev)
        }
        return
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
        const target = displayOrder()[Number(e.key) - 1]
        if (target) {
          e.preventDefault()
          e.stopPropagation()
          useAppStore.getState().setActive(target.id)
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}
