/**
 * Single source of truth for IPC channel names.
 * Convention: `domain:action`. Imported by both main and preload.
 */
export const CH = {
  // App
  APP_INFO: 'app:info',

  // PTY lifecycle (renderer -> main)
  PTY_SPAWN: 'pty:spawn', // invoke -> { ptyId }
  PTY_WRITE: 'pty:write', // send (high frequency)
  PTY_RESIZE: 'pty:resize', // send
  PTY_KILL: 'pty:kill', // invoke

  // PTY events (main -> renderer)
  PTY_DATA: 'pty:data', // { ptyId, data }
  PTY_EXIT: 'pty:exit', // { ptyId, exitCode, signal }

  // Workspaces
  WS_LIST: 'workspaces:list',
  WS_SAVE: 'workspaces:save',
  WS_DELETE: 'workspaces:delete',
  WS_LAYOUT_SAVE: 'workspaces:layout:save',

  // Agent presets
  PRESET_LIST: 'presets:list',
  PRESET_SAVE: 'presets:save',
  PRESET_DELETE: 'presets:delete',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Dialogs
  DIALOG_OPEN_DIR: 'dialog:openDirectory',
} as const

export type ChannelName = (typeof CH)[keyof typeof CH]
