import { isTauri } from '@tauri-apps/api/core'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { Store } from '@tauri-apps/plugin-store'
import type { GardenState } from '../domain/types'

const storeFile = 'garden-state.json'
const storeKey = 'state'

export interface DesktopStatus {
  isDesktop: boolean
  autostartEnabled: boolean | null
  notificationGranted: boolean | null
  storeAvailable: boolean
}

export interface GardenBackup {
  exportedAt: number
  app: 'potmate' | 'elk-pet'
  state: GardenState
}

let storePromise: Promise<Store> | null = null

export function useDesktopBridge() {
  const isDesktop = isTauri()

  async function loadState() {
    if (!isDesktop) return null

    try {
      const store = await getStore()
      return (await store.get<GardenState>(storeKey)) ?? null
    } catch {
      return null
    }
  }

  async function saveState(state: GardenState) {
    if (!isDesktop) return false

    try {
      const store = await getStore()
      await store.set(storeKey, state)
      await store.save()
      return true
    } catch {
      return false
    }
  }

  async function getStatus(): Promise<DesktopStatus> {
    if (!isDesktop) {
      return {
        isDesktop: false,
        autostartEnabled: null,
        notificationGranted: null,
        storeAvailable: false,
      }
    }

    const [autostartEnabled, notificationGranted, storeAvailable] = await Promise.all([
      readAutostartState(),
      readNotificationState(),
      hasStore(),
    ])

    return {
      isDesktop: true,
      autostartEnabled,
      notificationGranted,
      storeAvailable,
    }
  }

  async function setAutostart(enabled: boolean) {
    if (!isDesktop) return false

    try {
      if (enabled) {
        await enable()
      } else {
        await disable()
      }
      return true
    } catch {
      return false
    }
  }

  async function requestNotifications() {
    if (!isDesktop) return false

    try {
      if (await isPermissionGranted()) return true

      return (await requestPermission()) === 'granted'
    } catch {
      return false
    }
  }

  async function notify(title: string, body: string) {
    if (!isDesktop) return false

    const granted = await requestNotifications()
    if (!granted) return false

    sendNotification({ title, body })
    return true
  }

  async function exportBackup(backup: GardenBackup) {
    const filename = `potmate-backup-${formatDate(backup.exportedAt)}.json`
    const content = JSON.stringify(backup, null, 2)

    if (!isDesktop) {
      downloadTextFile(filename, content)
      return filename
    }

    try {
      const targetPath = await save({
        defaultPath: filename,
        filters: [{ name: 'Potmate Backup', extensions: ['json'] }],
      })
      if (!targetPath) return null

      await writeTextFile(targetPath, content)
      return targetPath.split(/[\\/]/).pop() ?? filename
    } catch {
      downloadTextFile(filename, content)
      return filename
    }
  }

  async function importBackup() {
    if (!isDesktop) return openBackupInBrowser()

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Potmate Backup', extensions: ['json'] }],
      })
      if (!selected || Array.isArray(selected)) return null

      return safeParseBackup(await readTextFile(selected))
    } catch {
      return null
    }
  }

  return {
    isDesktop,
    exportBackup,
    getStatus,
    importBackup,
    loadState,
    notify,
    requestNotifications,
    saveState,
    setAutostart,
  }
}

async function getStore() {
  storePromise ??= Store.load(storeFile)
  return storePromise
}

async function hasStore() {
  try {
    await getStore()
    return true
  } catch {
    return false
  }
}

async function readAutostartState() {
  try {
    return await isEnabled()
  } catch {
    return null
  }
}

async function readNotificationState() {
  try {
    return await isPermissionGranted()
  } catch {
    return null
  }
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function openBackupInBrowser() {
  return new Promise<GardenBackup | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      resolve(safeParseBackup(await file.text()))
    }
    input.click()
  })
}

function safeParseBackup(content: string) {
  try {
    return parseBackup(content)
  } catch {
    return null
  }
}

function parseBackup(content: string) {
  const parsed = JSON.parse(content) as Partial<GardenBackup>

  if (!isKnownBackupApp(parsed.app) || !isGardenStateLike(parsed.state)) {
    throw new Error('Invalid Potmate backup file')
  }

  return parsed as GardenBackup
}

function isKnownBackupApp(value: unknown): value is GardenBackup['app'] {
  return value === 'potmate' || value === 'elk-pet'
}

function isGardenStateLike(value: unknown): value is GardenState {
  if (!value || typeof value !== 'object') return false

  const state = value as Partial<GardenState>

  return Array.isArray(state.records) && Boolean(state.settings)
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}
