export type MoodTag = 'joyful' | 'happy' | 'neutral' | 'down' | 'sad'

export type MoodSource = 'manual' | 'rule'

export interface HslColor {
  h: number
  s: number
  l: number
}

export interface EmotionProfile {
  valence: number
  arousal: number
  keywords: string[]
  length: number
  seed: number
  imageSeed: number
  moodSource: MoodSource
}

export type StemStyle = 'upright' | 'curved' | 'branching'
export type LeafShape = 'round' | 'heart' | 'long' | 'split'
export type FlowerType = 'none' | 'single' | 'cluster' | 'bell'
export type GrowthStage = 'empty' | 'sprout' | 'seedling' | 'adult' | 'bud' | 'bloom'
export type ActivityKind = 'click' | 'key'

export interface Decoration {
  id: string
  kind: 'butterfly' | 'dew' | 'sunDot' | 'coffeeBean' | 'star'
  seed: number
}

export interface PlantGenome {
  stemStyle: StemStyle
  leafShape: LeafShape
  leafColor: HslColor
  flowerType: FlowerType
  flowerColor: HslColor
  decorations: Decoration[]
  density: number
  accentShifts: HslColor[]
  swayAmplitude: number
}

export interface PlantRecord {
  id: string
  plantId: string
  date: string
  text: string
  mood: MoodTag | null
  emotion: EmotionProfile
  wateredAt: number
}

export interface PlantState {
  id: string
  name: string
  genome: PlantGenome
  birthRecordId: string
  generation: number
  growth: number
  vitality: number
  stage: GrowthStage
  birthDate: string
  lastWatered: number
  wateredDates: string[]
}

export interface PlantSeed {
  id: string
  sourcePlantId: string
  name: string
  genome: PlantGenome
  createdAt: number
  generation: number
}

export interface GalleryItem {
  id: string
  plant: PlantState
  archivedAt: number
  recordCount: number
  seed: PlantSeed
  coverRecordText: string
}

export interface ActivityState {
  lastActiveAt: number | null
  activeDate: string | null
  dailyInteractions: number
  totalClicks: number
  totalKeys: number
}

export interface Settings {
  dayStartHour: number
  quietHours: { from: string; to: string } | null
  soundEnabled: boolean
  gentleMode: boolean
  activityMode: boolean
  reminderEnabled: boolean
  autostartEnabled: boolean
  petSurfacePassThrough: boolean
}

export interface GardenState {
  schemaVersion: 1
  plant: PlantState | null
  records: PlantRecord[]
  gallery: GalleryItem[]
  seeds: PlantSeed[]
  pendingSeedId: string | null
  activity: ActivityState
  lastReminderDate: string | null
  settings: Settings
}
