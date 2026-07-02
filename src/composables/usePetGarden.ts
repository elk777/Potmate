import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useDesktopBridge, type DesktopStatus } from './useDesktopBridge'
import { analyseEmotion, clamp } from '../domain/emotion'
import { computeVitality } from '../domain/healthModel'
import { createPlant, createPlantFromSeed, createPlantSeed, growPlant } from '../domain/plantGenerator'
import type {
  ActivityKind,
  ActivityState,
  GalleryItem,
  GardenState,
  MoodTag,
  PlantRecord,
  PlantSeed,
  PlantState,
  Settings,
} from '../domain/types'

const storageKey = 'elk-pet:garden-state:v1'

const defaultSettings: Settings = {
  dayStartHour: 4,
  quietHours: { from: '23:00', to: '07:00' },
  soundEnabled: true,
  gentleMode: true,
  activityMode: true,
  reminderEnabled: false,
  autostartEnabled: false,
  petSurfacePassThrough: false,
}

const defaultActivity: ActivityState = {
  lastActiveAt: null,
  activeDate: null,
  dailyInteractions: 0,
  totalClicks: 0,
  totalKeys: 0,
}

export function usePetGarden() {
  const desktopBridge = useDesktopBridge()
  const garden = shallowRef<GardenState>(createDefaultState())
  const desktopStatus = shallowRef<DesktopStatus>({
    isDesktop: desktopBridge.isDesktop,
    autostartEnabled: null,
    notificationGranted: null,
    storeAvailable: false,
  })
  const now = shallowRef(Date.now())
  let timerId: number | null = null
  let lastActivityPersistedAt = 0

  const activityBoost = computed(() => {
    if (!garden.value.settings.activityMode || !garden.value.activity.lastActiveAt) return 0

    const elapsedMinutes = Math.max((now.value - garden.value.activity.lastActiveAt) / 60_000, 0)
    const recentBoost = elapsedMinutes < 5 ? 8 : elapsedMinutes < 30 ? 4 : elapsedMinutes < 120 ? 2 : 0
    const dailyBoost = clamp(garden.value.activity.dailyInteractions / 80, 0, 1) * 4

    return recentBoost + dailyBoost
  })

  const liveVitality = computed(() => {
    if (!garden.value.plant) return 100

    const baseVitality = computeVitality(garden.value.plant.lastWatered, now.value, garden.value.settings)
    return Math.min(baseVitality + activityBoost.value, 100)
  })

  const todayRecord = computed(() => {
    const today = getRecordDay(now.value, garden.value.settings.dayStartHour)
    return garden.value.records.find((record) => record.date === today) ?? null
  })

  const currentPlantRecords = computed(() => {
    if (!garden.value.plant) return []

    return garden.value.records.filter((record) => record.plantId === garden.value.plant?.id)
  })

  const pendingSeed = computed(() => {
    if (!garden.value.pendingSeedId) return null

    return garden.value.seeds.find((seed) => seed.id === garden.value.pendingSeedId) ?? null
  })

  const canArchivePlant = computed(() => garden.value.plant?.stage === 'bloom')
  const hasPlant = computed(() => Boolean(garden.value.plant))

  function addRecord(text: string, mood: MoodTag | null) {
    const wateredAt = Date.now()
    const plantId = garden.value.plant?.id ?? createId('plant')
    const record: PlantRecord = {
      id: createId('record'),
      plantId,
      date: getRecordDay(wateredAt, garden.value.settings.dayStartHour),
      text: text.trim(),
      mood,
      emotion: analyseEmotion(text, mood, wateredAt, garden.value.records.length + 1),
      wateredAt,
    }

    const seed = pendingSeed.value
    const plant = getNextPlant(record, garden.value.plant, seed)

    garden.value = {
      ...garden.value,
      plant,
      pendingSeedId: null,
      records: [record, ...garden.value.records],
    }
    void persistGarden(garden.value)
    now.value = wateredAt
  }

  function archiveBloomingPlant() {
    const plant = garden.value.plant
    if (!plant || plant.stage !== 'bloom') return null

    const archivedAt = Date.now()
    const plantRecords = garden.value.records.filter((record) => record.plantId === plant.id)
    const seed = createPlantSeed(plant, archivedAt)
    const galleryItem: GalleryItem = {
      id: `gallery-${plant.id}-${archivedAt}`,
      plant,
      archivedAt,
      recordCount: plantRecords.length,
      seed,
      coverRecordText: plantRecords[plantRecords.length - 1]?.text ?? plant.name,
    }

    garden.value = {
      ...garden.value,
      plant: null,
      gallery: [galleryItem, ...garden.value.gallery],
      seeds: [seed, ...garden.value.seeds],
      pendingSeedId: seed.id,
    }
    void persistGarden(garden.value)
    now.value = archivedAt

    return galleryItem
  }

  function chooseSeed(seedId: string | null) {
    garden.value = {
      ...garden.value,
      pendingSeedId: seedId,
    }
    void persistGarden(garden.value)
  }

  async function updateSettings(nextSettings: Settings) {
    const previousSettings = garden.value.settings
    const settings = normalizeSettings(nextSettings)

    garden.value = {
      ...garden.value,
      settings,
    }
    await persistGarden(garden.value)

    if (settings.autostartEnabled !== previousSettings.autostartEnabled) {
      const changed = await desktopBridge.setAutostart(settings.autostartEnabled)
      desktopStatus.value = await desktopBridge.getStatus()

      if (!changed) {
        garden.value = {
          ...garden.value,
          settings: {
            ...garden.value.settings,
            autostartEnabled: previousSettings.autostartEnabled,
          },
        }
        await persistGarden(garden.value)
      }
    }

    if (settings.reminderEnabled && !previousSettings.reminderEnabled) {
      await desktopBridge.requestNotifications()
      desktopStatus.value = await desktopBridge.getStatus()
      await maybeSendDailyReminder()
    }
  }

  function recordActivity(kind: ActivityKind) {
    if (!garden.value.settings.activityMode) return

    const activeAt = Date.now()
    const activeDate = getRecordDay(activeAt, garden.value.settings.dayStartHour)
    const sameDate = garden.value.activity.activeDate === activeDate
    const activity: ActivityState = {
      ...garden.value.activity,
      lastActiveAt: activeAt,
      activeDate,
      dailyInteractions: sameDate ? garden.value.activity.dailyInteractions + 1 : 1,
      totalClicks: garden.value.activity.totalClicks + (kind === 'click' ? 1 : 0),
      totalKeys: garden.value.activity.totalKeys + (kind === 'key' ? 1 : 0),
    }

    garden.value = {
      ...garden.value,
      activity,
    }
    now.value = activeAt

    if (activeAt - lastActivityPersistedAt > 10_000) {
      void persistGarden(garden.value)
      lastActivityPersistedAt = activeAt
    }
  }

  async function exportGardenData() {
    const exportedAt = Date.now()
    const payload = {
      exportedAt,
      app: 'potmate' as const,
      state: garden.value,
    }

    return desktopBridge.exportBackup(payload)
  }

  async function importGardenData() {
    const backup = await desktopBridge.importBackup()
    if (!backup) return false

    garden.value = normalizeState(backup.state)
    await persistGarden(garden.value)
    now.value = Date.now()

    return true
  }

  function resetGarden() {
    garden.value = createDefaultState()
    void persistGarden(garden.value)
    now.value = Date.now()
  }

  async function maybeSendDailyReminder() {
    if (!garden.value.settings.reminderEnabled || todayRecord.value) return false

    const today = getRecordDay(now.value, garden.value.settings.dayStartHour)
    if (garden.value.lastReminderDate === today) return false

    const sent = await desktopBridge.notify('Potmate', '今天的小事还没浇水，花盆在等你。')
    if (!sent) return false

    garden.value = {
      ...garden.value,
      lastReminderDate: today,
    }
    await persistGarden(garden.value)

    return true
  }

  onMounted(async () => {
    garden.value = await loadGarden(desktopBridge)
    desktopStatus.value = await desktopBridge.getStatus()
    now.value = Date.now()
    timerId = window.setInterval(() => {
      now.value = Date.now()
      void maybeSendDailyReminder()
    }, 60_000)
    void maybeSendDailyReminder()
  })

  onUnmounted(() => {
    if (timerId !== null) {
      window.clearInterval(timerId)
    }
  })

  return {
    garden,
    activityBoost,
    canArchivePlant,
    currentPlantRecords,
    desktopStatus,
    hasPlant,
    liveVitality,
    pendingSeed,
    todayRecord,
    addRecord,
    archiveBloomingPlant,
    chooseSeed,
    exportGardenData,
    importGardenData,
    maybeSendDailyReminder,
    recordActivity,
    resetGarden,
    updateSettings,
  }
}

function getNextPlant(record: PlantRecord, currentPlant: PlantState | null, seed: PlantSeed | null): PlantState {
  if (currentPlant) return growPlant(currentPlant, record)
  if (seed) return createPlantFromSeed(record, seed)

  return createPlant(record)
}

async function loadGarden(desktopBridge: ReturnType<typeof useDesktopBridge>): Promise<GardenState> {
  try {
    const storedState = await desktopBridge.loadState()
    if (storedState) return normalizeState(storedState)

    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return createDefaultState()
    const parsed = JSON.parse(raw) as Partial<GardenState>
    const state = normalizeState(parsed)
    void desktopBridge.saveState(state)

    return state
  } catch {
    return createDefaultState()
  }
}

async function persistGarden(state: GardenState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state))
  await useDesktopBridge().saveState(state)
}

function normalizeState(parsed: Partial<GardenState>): GardenState {
  const settings = normalizeSettings(parsed.settings)
  const activity = {
    ...defaultActivity,
    ...parsed.activity,
  }
  const plant = parsed.plant ? normalizePlant(parsed.plant) : null

  return {
    schemaVersion: 1,
    plant,
    records: Array.isArray(parsed.records) ? parsed.records : [],
    gallery: Array.isArray(parsed.gallery)
      ? parsed.gallery.map((item) => ({ ...item, plant: normalizePlant(item.plant) }))
      : [],
    seeds: Array.isArray(parsed.seeds) ? parsed.seeds : [],
    pendingSeedId: parsed.pendingSeedId ?? null,
    activity,
    lastReminderDate: parsed.lastReminderDate ?? null,
    settings,
  }
}

function normalizePlant(plant: PlantState): PlantState {
  return {
    ...plant,
    generation: plant.generation ?? 1,
  }
}

function normalizeSettings(settings: Partial<Settings> | undefined): Settings {
  return {
    ...defaultSettings,
    ...settings,
    dayStartHour: clamp(Number(settings?.dayStartHour ?? defaultSettings.dayStartHour), 0, 12),
  }
}

function createDefaultState(): GardenState {
  return {
    schemaVersion: 1,
    plant: null,
    records: [],
    gallery: [],
    seeds: [],
    pendingSeedId: null,
    activity: { ...defaultActivity },
    lastReminderDate: null,
    settings: { ...defaultSettings },
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getRecordDay(timestamp: number, dayStartHour: number) {
  const date = new Date(timestamp)

  if (date.getHours() < dayStartHour) {
    date.setDate(date.getDate() - 1)
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}
