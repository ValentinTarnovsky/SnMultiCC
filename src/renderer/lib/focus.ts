/**
 * Tracks the most recently focused console pane, so actions triggered from
 * elsewhere (command palette, snippets) know which terminal to target.
 */
let lastFocusedPaneId: string | null = null

export function setFocusedPane(paneId: string): void {
  lastFocusedPaneId = paneId
}

export function getFocusedPane(): string | null {
  return lastFocusedPaneId
}
