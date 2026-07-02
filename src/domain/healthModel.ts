import type { Settings } from './types'

const HOURS_TO_WILT = 72
const WILT_THRESHOLD = 36
const GENTLE_MIN_VITALITY = 12

export function computeVitality(lastWatered: number, now: number, settings: Settings) {
  const elapsedHours = Math.max((now - lastWatered) / 3_600_000, 0)
  const quietAdjustedHours = adjustQuietHours(elapsedHours, settings)
  const drop = (quietAdjustedHours / HOURS_TO_WILT) * (100 - WILT_THRESHOLD)
  const minVitality = settings.gentleMode ? GENTLE_MIN_VITALITY : 0

  return Math.max(100 - drop, minVitality)
}

export function getVitalityLabel(vitality: number) {
  if (vitality > 76) return '精神很好'
  if (vitality > 52) return '安静生长'
  if (vitality > 32) return '有些发蔫'
  return '等你回来'
}

function adjustQuietHours(elapsedHours: number, settings: Settings) {
  if (!settings.quietHours) return elapsedHours

  // v1 prototype: approximate quiet-time relief until full timeline accounting lands.
  return elapsedHours * 0.82
}
