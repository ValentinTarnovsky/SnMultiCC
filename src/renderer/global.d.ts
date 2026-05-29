import type { SnApi } from '@shared/ipc-contract'

declare global {
  interface Window {
    snApi: SnApi
  }
}

export {}
