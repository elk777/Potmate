import { clamp } from './emotion'
import type {
  Decoration,
  EmotionProfile,
  FlowerSpecies,
  FlowerType,
  GrowthStage,
  HslColor,
  LeafShape,
  PlantGenome,
  PlantRecord,
  PlantSeed,
  PlantState,
  StemStyle,
} from './types'

export type Difficulty = 'starter' | 'advanced' | 'rare'

// 已养成(归档)数量 → 解锁池
export function unlockedSpecies(bloomedCount: number): FlowerSpecies[] {
  if (bloomedCount < 1) return ['daisy', 'lotus']
  if (bloomedCount < 3) return ['daisy', 'lotus', 'sunflower', 'rose']
  return ['daisy', 'lotus', 'sunflower', 'rose', 'bellflower']
}

export function pickSpecies(emotion: EmotionProfile, unlocked: FlowerSpecies[]): FlowerSpecies {
  const ideal = idealSpecies(emotion)

  if (unlocked.includes(ideal)) return ideal
  if (unlocked.length === 0) return ideal

  return unlocked[emotion.seed % unlocked.length]
}

function idealSpecies(emotion: EmotionProfile): FlowerSpecies {
  if (emotion.valence > 0.5 && emotion.arousal > 0.6) return 'sunflower'
  if (emotion.valence > 0.2) return 'daisy'
  if (emotion.valence >= -0.2) return 'lotus'
  if (emotion.valence < -0.2 && emotion.arousal > 0.5) return 'rose'
  return 'bellflower'
}

export function createPlant(record: PlantRecord, bloomedCount: number): PlantState {
  const genome = createGenome(record.emotion, unlockedSpecies(bloomedCount))

  return {
    id: record.plantId,
    name: createPlantName(record.text, record.emotion),
    genome,
    birthRecordId: record.id,
    generation: 1,
    growth: 1,
    vitality: 100,
    stage: getGrowthStage(1),
    birthDate: record.date,
    lastWatered: record.wateredAt,
    wateredDates: [record.date],
  }
}

export function createPlantFromSeed(record: PlantRecord, seed: PlantSeed, bloomedCount: number): PlantState {
  const freshGenome = createGenome(record.emotion, unlockedSpecies(bloomedCount))

  return {
    id: record.plantId,
    name: createSeedlingName(record.text, record.emotion, seed.generation),
    genome: blendGenome(seed.genome, freshGenome, record.emotion),
    birthRecordId: record.id,
    generation: seed.generation,
    growth: 1,
    vitality: 100,
    stage: getGrowthStage(1),
    birthDate: record.date,
    lastWatered: record.wateredAt,
    wateredDates: [record.date],
  }
}

export function growPlant(plant: PlantState, record: PlantRecord): PlantState {
  const wateredDates = plant.wateredDates.includes(record.date)
    ? plant.wateredDates
    : [...plant.wateredDates, record.date]
  const growth = Math.min(wateredDates.length, 24)

  return {
    ...plant,
    genome: accumulateGenome(plant.genome, record.emotion),
    growth,
    vitality: 100,
    stage: getGrowthStage(growth),
    lastWatered: record.wateredAt,
    wateredDates,
  }
}

export function createPlantSeed(plant: PlantState, createdAt: number): PlantSeed {
  return {
    id: `seed-${plant.id}-${createdAt}`,
    sourcePlantId: plant.id,
    name: `${plant.name}的种子`,
    genome: plant.genome,
    createdAt,
    generation: plant.generation + 1,
  }
}

export function getGrowthStage(growth: number): GrowthStage {
  if (growth <= 0) return 'empty'
  if (growth === 1) return 'sprout'
  if (growth <= 3) return 'seedling'
  if (growth <= 6) return 'adult'
  if (growth <= 9) return 'bud'
  return 'bloom'
}

function createGenome(emotion: EmotionProfile, unlocked: FlowerSpecies[]): PlantGenome {
  return {
    stemStyle: pickStemStyle(emotion),
    leafShape: pickLeafShape(emotion),
    leafColor: colorFromValence(emotion.valence, emotion.seed),
    flowerType: pickFlowerType(emotion),
    species: pickSpecies(emotion, unlocked),
    flowerColor: flowerColorFromEmotion(emotion),
    decorations: createDecorations(emotion),
    density: 0.35 + emotion.length * 0.45,
    accentShifts: [flowerColorFromEmotion(emotion)],
    swayAmplitude: 0.5 + emotion.arousal * 1.5,
  }
}

function accumulateGenome(genome: PlantGenome, emotion: EmotionProfile): PlantGenome {
  const nextDecorations = [...genome.decorations, ...createDecorations(emotion)]
    .filter((decoration, index, items) => items.findIndex((item) => item.kind === decoration.kind) === index)
    .slice(0, 6)

  return {
    ...genome,
    species: genome.species,
    decorations: nextDecorations,
    density: clamp(genome.density + 0.08 + emotion.length * 0.16, 0.35, 1),
    accentShifts: [...genome.accentShifts.slice(-5), flowerColorFromEmotion(emotion)],
    flowerColor: flowerColorFromEmotion(emotion),
    swayAmplitude: 0.5 + emotion.arousal * 1.5,
  }
}

function blendGenome(parentGenome: PlantGenome, freshGenome: PlantGenome, emotion: EmotionProfile): PlantGenome {
  const decorations = [...parentGenome.decorations.slice(0, 3), ...freshGenome.decorations]
    .filter((decoration, index, items) => items.findIndex((item) => item.kind === decoration.kind) === index)
    .slice(0, 6)

  return {
    ...parentGenome,
    species: parentGenome.species ?? freshGenome.species,
    stemStyle: emotion.arousal > 0.7 ? freshGenome.stemStyle : parentGenome.stemStyle,
    leafShape: emotion.keywords.length > 0 ? freshGenome.leafShape : parentGenome.leafShape,
    leafColor: mixColor(parentGenome.leafColor, freshGenome.leafColor, 0.42),
    flowerType: freshGenome.flowerType === 'none' ? parentGenome.flowerType : freshGenome.flowerType,
    flowerColor: mixColor(parentGenome.flowerColor, freshGenome.flowerColor, 0.58),
    decorations,
    density: clamp((parentGenome.density + freshGenome.density) / 2 + 0.04, 0.35, 1),
    accentShifts: [...parentGenome.accentShifts.slice(-3), freshGenome.flowerColor],
    swayAmplitude: (parentGenome.swayAmplitude + freshGenome.swayAmplitude) / 2,
  }
}

function mixColor(first: HslColor, second: HslColor, secondWeight: number): HslColor {
  const firstWeight = 1 - secondWeight

  return {
    h: Math.round(first.h * firstWeight + second.h * secondWeight),
    s: Math.round(first.s * firstWeight + second.s * secondWeight),
    l: Math.round(first.l * firstWeight + second.l * secondWeight),
  }
}

function pickStemStyle(emotion: EmotionProfile): StemStyle {
  if (emotion.arousal > 0.7) return 'branching'
  if (emotion.valence < -0.35) return 'curved'
  return 'upright'
}

function pickLeafShape(emotion: EmotionProfile): LeafShape {
  if (emotion.keywords.some((keyword) => ['猫', '狗', '小猫', '小狗'].includes(keyword))) return 'heart'
  if (emotion.keywords.some((keyword) => ['雨', '风', '雪'].includes(keyword))) return 'long'

  const shapes: LeafShape[] = ['round', 'heart', 'long', 'split']
  return shapes[emotion.seed % shapes.length]
}

function pickFlowerType(emotion: EmotionProfile): FlowerType {
  if (emotion.valence < -0.5) return 'bell'
  if (emotion.arousal > 0.7) return 'cluster'
  if (emotion.valence > 0.2) return 'single'
  return 'none'
}

function colorFromValence(valence: number, seed: number): HslColor {
  const warmHue = 82 + (seed % 24)
  const coolHue = 145 + (seed % 46)
  const sadHue = 190 + (seed % 34)

  if (valence > 0.25) return { h: warmHue, s: 48 + valence * 22, l: 43 + valence * 7 }
  if (valence < -0.25) return { h: sadHue, s: 32, l: 35 }
  return { h: coolHue, s: 36, l: 39 }
}

function flowerColorFromEmotion(emotion: EmotionProfile): HslColor {
  // 心情定色系家族，个人 seed 在家族内决定具体色调/浓淡 → 同心情的用户也各不相同
  const base = flowerHueBase(emotion)
  const hue = (base + (emotion.seed % 45) - 22 + 360) % 360

  return {
    h: Math.round(hue),
    s: clamp(56 + emotion.arousal * 20 + (emotion.seed % 12), 40, 92),
    l: clamp(60 + emotion.valence * 8 + ((emotion.seed >>> 3) % 10), 40, 82),
  }
}

// 心情 → 花色基准色系（seed 只在 ±22° 内抖动，家族不变）
function flowerHueBase(emotion: EmotionProfile): number {
  if (emotion.valence > 0.5 && emotion.arousal > 0.6) return 38 // 暖金 / 珊瑚：又开心又有劲
  if (emotion.valence > 0.2) return 344 // 蜜桃粉 / 玫红：愉悦
  if (emotion.valence >= -0.2) return 288 // 薰衣草 / 淡紫：平静
  if (emotion.valence < -0.2 && emotion.arousal > 0.5) return 262 // 紫罗兰：低落而躁动
  return 214 // 青蓝：低落
}

function createDecorations(emotion: EmotionProfile): Decoration[] {
  const decorations: Decoration[] = []

  if (emotion.keywords.some((keyword) => ['猫', '狗', '鸟', '小猫', '小狗'].includes(keyword))) {
    decorations.push({ id: `butterfly-${emotion.seed}`, kind: 'butterfly', seed: emotion.imageSeed })
  }

  if (emotion.keywords.some((keyword) => ['雨', '雪'].includes(keyword))) {
    decorations.push({ id: `dew-${emotion.seed}`, kind: 'dew', seed: emotion.imageSeed })
  }

  if (emotion.keywords.some((keyword) => ['阳光', '太阳', '晚霞'].includes(keyword))) {
    decorations.push({ id: `sun-${emotion.seed}`, kind: 'sunDot', seed: emotion.imageSeed })
  }

  if (emotion.keywords.some((keyword) => ['咖啡', '茶', '奶茶'].includes(keyword))) {
    decorations.push({ id: `coffee-${emotion.seed}`, kind: 'coffeeBean', seed: emotion.imageSeed })
  }

  if (emotion.keywords.some((keyword) => ['星星', '月亮', '夜'].includes(keyword))) {
    decorations.push({ id: `star-${emotion.seed}`, kind: 'star', seed: emotion.imageSeed })
  }

  return decorations
}

function createPlantName(text: string, emotion: EmotionProfile) {
  const firstKeyword = emotion.keywords[0]
  const cleanText = text.trim().slice(0, 8)

  if (firstKeyword) return `${firstKeyword}小盆`
  if (cleanText) return `${cleanText}的芽`
  return '无名小芽'
}

function createSeedlingName(text: string, emotion: EmotionProfile, generation: number) {
  const baseName = createPlantName(text, emotion)

  return `${baseName} ${generation}代`
}
