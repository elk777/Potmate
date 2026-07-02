import type { EmotionProfile, MoodTag } from './types'

const positiveWords = ['开心', '喜欢', '温暖', '舒服', '惊喜', '治愈', '好喝', '可爱', '顺利', '漂亮']
const negativeWords = ['难过', '累', '焦虑', '失望', '孤独', '烦', '糟糕', '压力', '生气', '低落']
const amplifiers = ['非常', '超级', '特别', '很', '太', '爆']
const softeners = ['有点', '稍微', '还行', '一点']
const negations = ['不', '没', '没有', '别']

const keywordMap: Record<string, string[]> = {
  animal: ['猫', '狗', '鸟', '小猫', '小狗'],
  weather: ['雨', '阳光', '太阳', '风', '雪'],
  food: ['咖啡', '蛋糕', '茶', '面包', '奶茶'],
  night: ['夜', '月亮', '星星', '晚霞'],
}

const moodProfiles: Record<MoodTag, Pick<EmotionProfile, 'valence' | 'arousal'>> = {
  joyful: { valence: 0.9, arousal: 0.85 },
  happy: { valence: 0.55, arousal: 0.45 },
  neutral: { valence: 0, arousal: 0.25 },
  down: { valence: -0.45, arousal: 0.35 },
  sad: { valence: -0.8, arousal: 0.65 },
}

export function analyseEmotion(text: string, mood: MoodTag | null, timestamp: number, sequence: number): EmotionProfile {
  const cleanText = text.trim()
  const ruleProfile = analyseByRules(cleanText)
  const manualProfile = mood ? moodProfiles[mood] : null
  const imageSeed = hashText(cleanText || 'empty-record')
  const seed = hashText(`${cleanText}|${timestamp}|${sequence}`)

  return {
    valence: manualProfile?.valence ?? ruleProfile.valence,
    arousal: manualProfile?.arousal ?? ruleProfile.arousal,
    keywords: extractKeywords(cleanText),
    length: Math.min(cleanText.length / 120, 1),
    seed,
    imageSeed,
    moodSource: manualProfile ? 'manual' : 'rule',
  }
}

function analyseByRules(text: string): Pick<EmotionProfile, 'valence' | 'arousal'> {
  if (!text) {
    return { valence: 0, arousal: 0.15 }
  }

  const positiveScore = scoreWords(text, positiveWords, 1)
  const negativeScore = scoreWords(text, negativeWords, -1)
  const intensity = getIntensity(text)
  const negated = negations.some((word) => text.includes(word))
  const rawValence = (positiveScore + negativeScore) * intensity * (negated ? -1 : 1)
  const punctuationArousal = Math.min((text.match(/[!！]/g)?.length ?? 0) * 0.12, 0.35)
  const arousal = clamp(0.2 + Math.abs(rawValence) * 0.22 + punctuationArousal + (intensity - 1) * 0.2, 0, 1)

  return {
    valence: clamp(rawValence / 4, -1, 1),
    arousal,
  }
}

function scoreWords(text: string, words: string[], score: number) {
  return words.reduce((total, word) => total + (text.includes(word) ? score : 0), 0)
}

function getIntensity(text: string) {
  const hasAmplifier = amplifiers.some((word) => text.includes(word))
  const hasSoftener = softeners.some((word) => text.includes(word))

  if (hasAmplifier) return 1.45
  if (hasSoftener) return 0.65
  return 1
}

function extractKeywords(text: string) {
  const keywords = new Set<string>()

  Object.values(keywordMap).forEach((words) => {
    words.forEach((word) => {
      if (text.includes(word)) {
        keywords.add(word)
      }
    })
  })

  return [...keywords]
}

export function hashText(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
