import { contextBridge, ipcRenderer } from 'electron'
import { CH } from '@shared/ipc-channels'
import type { AppInfo, SnApi } from '@shared/ipc-contract'

const api: SnApi = {
  platform: process.platform,
  app: {
    info: () => ipcRenderer.invoke(CH.APP_INFO) as Promise<AppInfo>,
  },
}

// contextIsolation is always enabled (see window.ts), so exposing via the
// bridge is the only path.
try {
  contextBridge.exposeInMainWorld('snApi', api)
} catch (error) {
  console.error('Failed to expose snApi over contextBridge:', error)
}
