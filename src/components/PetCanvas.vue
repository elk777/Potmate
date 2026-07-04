<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import cloudPotUrl from '../assets/cloud-pot-user.png'
import { hashText } from '../domain/emotion'
import { getGrowthStage } from '../domain/plantGenerator'
import type { FlowerSpecies, HslColor, PlantState } from '../domain/types'

const props = defineProps<{
  plant: PlantState | null
  vitality: number
  memories?: string[]
}>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const handGesture = shallowRef<'pet' | 'poke' | null>(null)
const handReplayKey = shallowRef(0)
const handStyle = shallowRef<Record<string, string>>({})

// ---------- 数学工具（移植自 mockup） ----------
const TAU = Math.PI * 2
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)

type Vec = { x: number; y: number }

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makeNoise(seed: number) {
  const rng = mulberry32(seed)
  const v = Array.from({ length: 256 }, () => rng())
  return (x: number) => {
    const i = Math.floor(x)
    return lerp(v[i & 255], v[(i + 1) & 255], smooth(x - i)) * 2 - 1
  }
}
function makeSpring(pos = 0, k = 5.5, d = 4.4) {
  return {
    p: pos,
    v: 0,
    step(target: number, dt: number) {
      const a = (target - this.p) * k - this.v * d
      this.v += a * dt
      this.p += this.v * dt
      return this.p
    },
  }
}
function sampleKeys(keys: number[][], t: number) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i]
    const [t1, v1] = keys[i + 1]
    if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)))
  }
  return keys[keys.length - 1][1]
}
function bezier(p0: Vec, c1: Vec, c2: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  }
}
function quadPoint(p0: Vec, cp: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t
  return { x: u * u * p0.x + 2 * u * t * cp.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * cp.y + t * t * p1.y }
}

// ---------- 基因：由真实 genome 派生出 mockup 需要的渲染参数 ----------
interface RenderGenome {
  flower: FlowerSpecies
  hueA: number
  hueB: number
  stemHueA: number
  stemHueB: number
  core: HslColor
  spiralHue: number
  sway: number
  seed: number
  memories: string[]
  sayings: string[]
  _jitter: { petalBonus: number; rot: number; wobble: number }
}

const SAYINGS: Record<FlowerSpecies, string[]> = {
  lotus: ['嘘…外面在下雨呢', '安安静静的，真好', '陪着你就够啦'],
  daisy: ['今天也超棒的！', '嘿嘿，被你戳到啦', '我们一起蹦跶吧～'],
  rose: ['心跳…你听见了吗', '为你开得最艳', '再靠近一点点嘛'],
  bellflower: ['低落也没关系的', '我陪你一起发会儿呆', '慢慢来，不着急'],
  sunflower: ['冲鸭！今天也满电！', '朝着光的方向长', '一起去晒太阳吧'],
}
const DEFAULT_MEMORIES: Record<FlowerSpecies, string[]> = {
  lotus: ['🌧️ 听了一下午的雨', '📖 读完了一章旧书'],
  daisy: ['🎈 今天什么都很顺利！', '🍰 同事分了我半块蛋糕'],
  rose: ['💗 心跳得好快', '🌹 收到了一束花'],
  bellflower: ['🌙 有些话没说出口', '☁️ 今天云很低'],
  sunflower: ['☀️ 早起看了日出', '🏃 跑了三公里'],
}

// 一株「空花盆」的占位基因（用于 plant === null）
const EMPTY_GENOME: RenderGenome = buildRenderGenome(null)

function buildRenderGenome(plant: PlantState | null): RenderGenome {
  if (!plant) {
    return {
      flower: 'lotus',
      hueA: 150,
      hueB: 200,
      stemHueA: 150,
      stemHueB: 180,
      core: { h: 150, s: 40, l: 72 },
      spiralHue: 170,
      sway: 0.7,
      seed: 1,
      memories: ['🌱 还没有故事', '✍️ 写下第一件小事吧'],
      sayings: ['写点什么给我听吧', '我在等一颗种子'],
      _jitter: { petalBonus: 0, rot: 0, wobble: 1 },
    }
  }

  const g = plant.genome
  const species = g.species ?? 'lotus'
  const fc = g.flowerColor
  const lc = g.leafColor
  const seed = hashText(plant.id)
  const rng = mulberry32(seed)

  return {
    flower: species,
    // 羽叶/星尘的冷暖两端由叶色与花色推导
    hueA: lc.h,
    hueB: (fc.h + 40) % 360,
    stemHueA: lc.h,
    stemHueB: (lc.h + 30) % 360,
    core: { h: fc.h, s: clamp(fc.s, 40, 95), l: clamp(fc.l, 45, 82) },
    spiralHue: fc.h,
    sway: clamp(g.swayAmplitude, 0.4, 1.6),
    seed,
    memories: DEFAULT_MEMORIES[species],
    sayings: SAYINGS[species],
    _jitter: {
      petalBonus: rng() > 0.5 ? 1 : 0,
      rot: rng() * TAU,
      wobble: 0.85 + rng() * 0.3,
    },
  }
}

// plant.growth(1..24) / stage → mockup 的 0..1 成长度
function growthToUnit(plant: PlantState | null): number {
  if (!plant) return 0
  const growth = plant.growth
  const stage = plant.stage ?? getGrowthStage(growth)
  switch (stage) {
    case 'empty':
      return 0
    case 'sprout':
      return 0.12
    case 'seedling':
      // growth 2..3 → 0.24..0.36
      return lerp(0.24, 0.36, clamp((growth - 2) / 1, 0, 1))
    case 'adult':
      // growth 4..6 → 0.45..0.62
      return lerp(0.45, 0.62, clamp((growth - 4) / 2, 0, 1))
    case 'bud':
      // growth 7..9 → 0.66..0.78
      return lerp(0.66, 0.78, clamp((growth - 7) / 2, 0, 1))
    case 'bloom':
      // growth 10..24 → 0.85..1.0
      return lerp(0.85, 1, clamp((growth - 10) / 14, 0, 1))
    default:
      return 0.5
  }
}

// ---------- 舞台常量 ----------
const W = 360
const H = 380
const BASE = { x: 180, y: 292 }
const POT = { rimY: 270, rimRx: 56, rimRy: 10, bottomY: 366, bottomRx: 34, footRx: 40 }
const STEM_FULL = 120
const CLOUD_POT = { sourceWidth: 536, sourceHeight: 308, drawWidth: 256, bottomY: 376, frontCropY: 82 }

// ---------- 运行时状态（组件作用域内，非响应式） ----------
let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let handTimer: number | null = null
let cloudPotImage: HTMLImageElement | null = null
let cloudPotReady = false
let cloudPotFailed = false

let genome: RenderGenome = EMPTY_GENOME
let feathers: ReturnType<typeof buildFeathers> = []
let buds: { dx: number; dy: number; ang: number; size: number; phase: number }[] = []
let noiseGust: (x: number) => number = () => 0
let noiseFlutter: (x: number) => number = () => 0
let rng: () => number = Math.random

let vitalitySmooth = 90
let sleeping = false
let sleepFold = 0
let reduced = false
let clockSleep = false
let soilDark = 0

let growth = 0
let growthSmooth = 0

const lean = makeSpring(0)
let attention = 0
const mouse = { x: -999, y: -999, inside: false }

const eye = { x: 0, y: 0 }
let blink = 0
let nextBlink = 3
let petT = 99
let petHoverAcc = 0

let pokeT = 99
let wobbleT = 99
let waterT = 99
let celebrateT = 99
const clickTimes: number[] = []
let bubble: { text: string; t: number } | null = null
let memoryCloud: { t: number; dur: number; lines: string[] } | null = null
let breathPhase = 0

type Particle = Record<string, number | string | boolean>
let particles: Particle[] = []
let butterflies: { t: number; dur: number; phase: number }[] = []
let dustAcc = 0
let glintAcc = 0
let moteAcc = 0
let wiltPetalAcc = 0
let nextIdleEvent = 9
let nextMemory = 26
let nextZzz = 0
let lastGeom: ReturnType<typeof stemGeom> | null = null

const POKE_SY = [
  [0, 1],
  [0.12, 0.85],
  [0.3, 1.06],
  [0.46, 0.96],
  [0.64, 1],
]

function stemH() {
  const g = growthSmooth
  return STEM_FULL * clamp((g - 0.05) / 0.6, 0.06, 1)
}
function bloom01() {
  return clamp((growthSmooth - 0.8) / 0.2, 0, 1)
}
function isSeedling() {
  return growthSmooth < 0.22
}
function hasBud() {
  return growthSmooth >= 0.5
}

function buildFeathers(gnm: RenderGenome, r: () => number) {
  const F = [
    { t: 0.3, ang: 2.72, len: 60, curl: 20 },
    { t: 0.46, ang: 0.42, len: 54, curl: -18 },
    { t: 0.62, ang: 3.42, len: 42, curl: 13 },
    { t: 0.76, ang: -0.3, len: 36, curl: -10 },
  ]
  return F.map((f) => ({
    ...f,
    phase: r() * 20,
    speed: 0.5 + r() * 0.5,
    wiltAt: 18 + r() * 60,
    wp: 0,
    hue0: gnm.hueA + r() * 24,
    glints: Array.from({ length: 2 }, () => ({ t: 0.3 + r() * 0.6, side: r() > 0.5 ? 1 : -1, ph: r() * TAU })),
  }))
}

function buildPlant(plant: PlantState | null) {
  genome = buildRenderGenome(plant)
  rng = mulberry32(genome.seed)
  noiseGust = makeNoise(genome.seed * 3 + 1)
  noiseFlutter = makeNoise(genome.seed * 7 + 5)
  feathers = buildFeathers(genome, rng)
  buds = [
    { dx: -38, dy: -56, ang: -1.9, size: 11, phase: rng() * 9 },
    { dx: 34, dy: -72, ang: -1.2, size: 9, phase: rng() * 9 },
  ]
  if (props.memories && props.memories.length) genome.memories = props.memories
  lastGeom = stemGeom(0)
}

// ---------- 行为（部分暴露给父组件） ----------
function poke() {
  playHandGesture('poke')
  if (waterT < 3.4) return
  pokeT = 0
  if (isSeedling()) {
    spawnSparkles(8)
    bubble = { text: '被戳醒啦', t: 0 }
  } else {
    spawnPetals(5)
  }
  if (bloom01() > 0.4 && genome.sayings) {
    bubble = { text: genome.sayings[(rng() * genome.sayings.length) | 0], t: 0 }
  }
  const now = performance.now() / 1000
  clickTimes.push(now)
  while (clickTimes.length && now - clickTimes[0] > 2.2) clickTimes.shift()
  if (clickTimes.length >= 5) {
    wobbleT = 0
    clickTimes.length = 0
    bubble = { text: '呜…头晕了', t: 0 }
  }
}
function water(message = '') {
  waterT = 0
  bubble = message ? { text: message, t: 0 } : null
}
function showMemory() {
  const lines = props.memories && props.memories.length ? props.memories : genome.memories
  memoryCloud = { t: 0, dur: 5.2, lines }
}
// 摸头：主动抚摸一次（冒爱心 + 轻蹭）
function petHead() {
  playHandGesture('pet')
  petHoverAcc = 1
  petT = 0
  spawnHearts(3)
  if (bloom01() > 0.4 && genome.sayings) {
    bubble = { text: genome.sayings[(rng() * genome.sayings.length) | 0], t: 0 }
  } else {
    bubble = { text: '摸摸，长高高', t: 0 }
  }
}
function summonButterfly() {
  if (butterflies.length < 2) butterflies.push({ t: 0, dur: 8.5 + rng() * 2, phase: rng() * 10 })
}
function toggleSleep() {
  sleeping = !sleeping
  if (!sleeping && !clockSleep) bubble = { text: '早上好呀', t: 0 }
  return sleeping
}

function playHandGesture(gesture: 'pet' | 'poke') {
  const tip = lastGeom?.p1 ?? { x: BASE.x, y: BASE.y - 28 }
  const x = clamp(tip.x + (gesture === 'poke' ? 34 : 22), 62, W - 52)
  const y = clamp(tip.y + (gesture === 'poke' ? 10 : -12), 72, H - 54)

  if (handTimer !== null) window.clearTimeout(handTimer)
  handStyle.value = {
    '--hand-x': `${(x / W) * 100}%`,
    '--hand-y': `${(y / H) * 100}%`,
  }
  handReplayKey.value += 1
  handGesture.value = gesture
  handTimer = window.setTimeout(() => {
    handGesture.value = null
    handTimer = null
  }, 960)
}

function spawnPetals(n: number) {
  const tip = lastGeom!.p1
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU
    particles.push({
      kind: 'petal',
      x: tip.x,
      y: tip.y,
      vx: Math.cos(a) * (24 + rng() * 40),
      vy: -26 - rng() * 46,
      rot: rng() * TAU,
      life: 1.5,
    })
  }
}
function spawnWiltPetal() {
  const tip = lastGeom!.p1
  particles.push({
    kind: 'petal',
    x: tip.x + (rng() - 0.5) * 18,
    y: tip.y + (rng() - 0.5) * 10,
    vx: (rng() - 0.5) * 10,
    vy: 8 + rng() * 10,
    rot: rng() * TAU,
    life: 2.4,
    fall: true,
  })
}
function spawnHearts(n: number) {
  const tip = lastGeom!.p1
  for (let i = 0; i < n; i++) {
    particles.push({
      kind: 'heart',
      x: tip.x + (rng() - 0.5) * 20,
      y: tip.y - 6,
      vx: (rng() - 0.5) * 14,
      vy: -22 - rng() * 20,
      life: 1.4,
    })
  }
}
function spawnSparkles(n: number) {
  const tip = lastGeom!.p1
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    particles.push({
      kind: 'spark',
      x: tip.x,
      y: tip.y,
      vx: Math.cos(a) * (40 + rng() * 30),
      vy: Math.sin(a) * (40 + rng() * 30) - 18,
      life: 1.1,
    })
  }
}

// ---------- 更新 ----------
let last = performance.now()
function frame(nowMs: number) {
  const dt = clamp((nowMs - last) / 1000, 0, 0.1)
  last = nowMs
  const t = nowMs / 1000
  update(dt)
  draw(t)
  rafId = requestAnimationFrame(frame)
}

function update(dt: number) {
  const rm = reduced ? 0.15 : 1
  const vitality = props.plant ? props.vitality : 100
  const vit01 = vitality / 100

  growthSmooth = lerp(growthSmooth, growth, 1 - Math.exp(-dt * 3.2))

  // 昼夜联动
  const hr = new Date().getHours()
  clockSleep = hr >= 20 || hr < 6
  const wantSleep = sleeping || clockSleep

  const breathT = lerp(7.5, 3.4, vit01) * (wantSleep ? 1.7 : 1)
  breathPhase += (dt / breathT) * TAU
  vitalitySmooth = lerp(vitalitySmooth, vitality, 1 - Math.exp(-dt * 1.6))
  sleepFold = clamp(sleepFold + (wantSleep ? dt / 2.6 : -dt / 2), 0, 1)

  const tip = lastGeom!.p1
  const dist = Math.hypot(mouse.x - tip.x, mouse.y - tip.y)
  const near = mouse.inside && dist < 220 && !wantSleep && !isSeedling()
  attention = clamp(attention + (near ? dt / 1.3 : -dt / 1.8), 0, 1)
  lean.step(near ? clamp((mouse.x - tip.x) / 220, -1, 1) * 0.6 * attention * rm : 0, dt)

  const look = near
    ? { x: clamp((mouse.x - tip.x) / 80, -1, 1), y: clamp((mouse.y - tip.y) / 80, -1, 1) }
    : { x: 0, y: 0 }
  eye.x = lerp(eye.x, look.x, 1 - Math.exp(-dt * 6))
  eye.y = lerp(eye.y, look.y, 1 - Math.exp(-dt * 6))
  nextBlink -= dt
  if (blink > 0) blink -= dt
  else if (nextBlink <= 0) {
    blink = 0.16
    nextBlink = 2.5 + Math.random() * 3.5
  }

  const overHead = near && dist < 46 && bloom01() > 0.4
  petHoverAcc = clamp(petHoverAcc + (overHead ? dt : -dt * 2), 0, 1)
  petT += dt
  if (overHead && petHoverAcc > 0.35 && petT > 0.9) {
    petT = 0
    spawnHearts(2)
  }

  for (const f of feathers) {
    const target = clamp((f.wiltAt - vitalitySmooth) / 14, 0, 1)
    f.wp = lerp(f.wp, target, 1 - Math.exp(-dt * 2.1))
  }

  pokeT += dt
  wobbleT += dt
  celebrateT += dt
  if (waterT < 99) {
    const prev = waterT
    waterT += dt
    if (waterT > 0.25 && waterT < 1.2 && !reduced) {
      particles.push({ kind: 'drop', x: BASE.x - 52 + rng() * 22, y: POT.rimY - 150, vx: 40 + rng() * 22, vy: 12, life: 3 })
    }
    if (waterT > 0.6) soilDark = clamp(soilDark + dt * 0.9, 0, 1)
    if (prev < 2.0 && waterT >= 2.0) {
      spawnSparkles(16)
      celebrateT = 0
      bubble = { text: '谢谢～', t: 0 }
    }
    if (waterT >= 3.4) waterT = 99
  }
  soilDark = clamp(soilDark - dt * 0.008, 0, 1)

  // 星尘漩涡
  const dustRate =
    22 * (0.25 + 0.75 * vit01) * (wantSleep ? 0.45 : 1) * (reduced ? 0.06 : 1) * clamp(growthSmooth * 1.4, 0.2, 1)
  dustAcc += dt * dustRate
  while (dustAcc >= 1 && particles.length < 280) {
    dustAcc -= 1
    particles.push({
      kind: 'dust',
      age: 0,
      life: 3.6 + rng() * 1.8,
      a0: rng() * TAU,
      r0: 12 + rng() * 18,
      w: (0.55 + rng() * 0.5) * (wantSleep ? 0.4 : 1) * (rng() > 0.5 ? 1 : -1),
      hue: (genome.spiralHue + rng() * 130) % 360,
      tw: rng() * TAU,
    })
  }
  glintAcc += dt * (reduced ? 0 : 2.0 * (0.3 + 0.7 * vit01))
  while (glintAcc >= 1) {
    glintAcc -= 1
    const f = feathers[(Math.random() * feathers.length) | 0]
    if (f && f.wp < 0.5) {
      const p = featherPoint(f, 0.25 + Math.random() * 0.6)
      particles.push({ kind: 'glint', x: p.x, y: p.y, life: 0.8 })
    }
  }
  moteAcc += dt * (reduced ? 0 : 0.9)
  while (moteAcc >= 1) {
    moteAcc -= 1
    particles.push({ kind: 'mote', x: BASE.x - 40 + rng() * 80, y: POT.rimY - 4, vx: (rng() - 0.5) * 6, vy: -12 - rng() * 10, life: 4 })
  }
  if (vitalitySmooth < 30 && bloom01() > 0.3 && !reduced) {
    wiltPetalAcc += ((dt * (30 - vitalitySmooth)) / 30) * 0.8
    while (wiltPetalAcc >= 1) {
      wiltPetalAcc -= 1
      spawnWiltPetal()
    }
  }

  nextIdleEvent -= dt
  if (nextIdleEvent <= 0) {
    nextIdleEvent = 16 + Math.random() * 22
    if (!reduced && !wantSleep && Math.random() < 0.5) summonButterfly()
  }
  nextMemory -= dt
  if (nextMemory <= 0) {
    nextMemory = 34 + Math.random() * 26
    if (!reduced && !wantSleep && !memoryCloud) showMemory()
  }
  nextZzz -= dt
  if (wantSleep && sleepFold > 0.7 && nextZzz <= 0) {
    nextZzz = 3.6
    particles.push({ kind: 'zzz', x: tip.x + 22, y: tip.y - 10, vx: 6, vy: -14, life: 3 })
  }

  if (bubble && (bubble.t += dt) > 2.6) bubble = null
  if (memoryCloud && (memoryCloud.t += dt) > memoryCloud.dur) memoryCloud = null

  particles = particles.filter((p) => ((p.life as number) -= dt) > 0)
  for (const p of particles) {
    if (p.kind === 'drop') {
      ;(p.vy as number) += 620 * dt
      ;(p.x as number) += (p.vx as number) * dt
      ;(p.y as number) += (p.vy as number) * dt
      if ((p.y as number) >= POT.rimY - 12 && Math.abs((p.x as number) - BASE.x) < 54) {
        p.life = 0
        particles.push({ kind: 'splash', x: p.x, y: POT.rimY - 12, life: 0.35 })
      }
    } else if (p.kind === 'petal') {
      ;(p.vy as number) += (p.fall ? 40 : 100) * dt
      ;(p.vx as number) *= 1 - dt * 0.9
      ;(p.x as number) += (p.vx as number) * dt
      ;(p.y as number) += (p.vy as number) * dt
      ;(p.rot as number) += dt * 3
    } else if (p.kind === 'heart') {
      ;(p.vy as number) += 30 * dt
      ;(p.vx as number) *= 1 - dt * 0.6
      ;(p.x as number) += (p.vx as number) * dt
      ;(p.y as number) += (p.vy as number) * dt
    } else if (p.kind === 'spark') {
      ;(p.vy as number) += 26 * dt
      ;(p.x as number) += (p.vx as number) * dt
      ;(p.y as number) += (p.vy as number) * dt
    } else if (p.kind === 'zzz' || p.kind === 'mote') {
      ;(p.x as number) += ((p.vx as number) || 0) * dt
      ;(p.y as number) += ((p.vy as number) || 0) * dt
    } else if (p.kind === 'dust') {
      ;(p.age as number) += dt
    }
  }
  butterflies = butterflies.filter((b) => (b.t += dt) < b.dur)
}

// ---------- 几何 ----------
function stemGeom(t: number) {
  const vit01 = vitalitySmooth / 100
  const droop = 1 - vit01
  const rm = reduced ? 0.15 : 1
  const gust = noiseGust ? noiseGust(t * 0.3) * (1 - 0.8 * sleepFold) : 0
  const leanPx = lean.p * 22
  const sway = genome ? genome.sway : 1
  const SH = stemH()
  return {
    p0: { x: BASE.x - 4, y: BASE.y },
    c1: { x: BASE.x - 50 + gust * 1.4 * rm, y: BASE.y - SH * 0.36 },
    c2: { x: BASE.x + 38 + leanPx * 0.6 + gust * 3.0 * rm * sway, y: BASE.y - SH * 0.73 },
    p1: { x: BASE.x + 8 + leanPx + gust * 4.2 * rm * sway, y: BASE.y - SH + droop * 22 + sleepFold * 8 },
    gust,
    droop,
    SH,
  }
}
function featherPoint(f: (typeof feathers)[number], tt: number) {
  const g = lastGeom!
  const at = bezier(g.p0, g.c1, g.c2, g.p1, f.t)
  const ang = featherAngle(f, last / 1000)
  const flen = f.len * clamp((growthSmooth - 0.18) / 0.34, 0, 1)
  const end = { x: at.x + Math.cos(ang) * flen, y: at.y + Math.sin(ang) * flen }
  const mid = { x: (at.x + end.x) / 2 - Math.sin(ang) * f.curl, y: (at.y + end.y) / 2 + Math.cos(ang) * f.curl }
  return quadPoint(at, mid, end, tt)
}
function featherAngle(f: (typeof feathers)[number], t: number) {
  const rm = reduced ? 0.15 : 1
  const flutter = noiseFlutter(t * f.speed + f.phase) * 0.075 * genome.sway * rm * (1 - 0.85 * sleepFold)
  const gustRot = (lastGeom ? lastGeom.gust : 0) * 0.045 * rm
  let ang = f.ang + flutter + gustRot
  const wiltAng = Math.cos(f.ang) >= 0 ? 1.05 : 2.1
  ang = lerp(ang, wiltAng, f.wp * 0.85)
  const foldAng = Math.cos(f.ang) >= 0 ? -0.55 : 3.7
  return lerp(ang, foldAng, sleepFold * (1 - f.wp) * 0.8)
}

// ---------- 绘制 ----------
function draw(t: number) {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const g = stemGeom(t)
  lastGeom = g
  const vit01 = vitalitySmooth / 100
  const glowK = (0.45 + 0.55 * vit01) * (1 - 0.5 * sleepFold) * clamp(growthSmooth * 1.5, 0.15, 1)

  drawBaseGlow(g, glowK)
  drawSwirlRings(g, t, glowK)
  drawDust(g, true)

  drawPotBack()

  const breathAmp = (reduced ? 0.005 : 0.012) * (0.6 + 0.4 * vit01)
  const bs = Math.sin(breathPhase) * breathAmp
  const sy = sampleKeys(POKE_SY, pokeT)
  const sx = clamp(2 - sy, 0.9, 1.12)
  const wob = wobbleT < 1.5 ? Math.sin(wobbleT * 15) * 0.12 * (1 - wobbleT / 1.5) : 0
  const shiverX = waterT > 1.4 && waterT < 1.95 ? Math.sin(waterT * 46) * 2.6 * (1 - (waterT - 1.4) / 0.55) : 0

  ctx.save()
  ctx.translate(BASE.x + shiverX, BASE.y)
  ctx.rotate(wob)
  ctx.scale(sx * (1 + bs * 0.6), sy * (1 + bs))
  ctx.translate(-BASE.x, -BASE.y)

  if (isSeedling()) {
    drawSeedling(g, t)
  } else {
    drawSideStems(g, t, glowK)
    drawMainStem(g, glowK)
    drawFeathers(g, t, glowK)
    if (hasBud() && bloom01() < 1) drawFlowerBud(g, glowK)
    if (bloom01() > 0) drawFlower(g, t, glowK)
  }
  ctx.restore()

  drawPotFront()
  drawRays(g)
  drawDust(g, false)
  drawParticles()
  drawButterflies(t, g)
  if (memoryCloud) drawMemoryCloud(g)
  if (bubble) drawBubble(g)
  if (sleepFold > 0.02) drawNight()
}

function drawBaseGlow(g: ReturnType<typeof stemGeom>, glowK: number) {
  if (!ctx) return
  if (cloudPotReady) return

  const midY = (BASE.y + (BASE.y - g.SH)) / 2
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const haloK = clamp((growthSmooth - 0.45) / 0.35, 0, 1)
  if (haloK > 0) {
    const halo = ctx.createRadialGradient(BASE.x, midY, 10, BASE.x, midY, 88)
    halo.addColorStop(0, `hsla(${genome.spiralHue}, 80%, 78%, ${(0.035 * glowK + attention * 0.035) * haloK})`)
    halo.addColorStop(0.6, `hsla(${(genome.spiralHue + 60) % 360}, 70%, 76%, ${0.014 * glowK * haloK})`)
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.ellipse(BASE.x, midY, 88, 112, 0, 0, TAU)
    ctx.fill()
  }

  const bg = ctx.createRadialGradient(BASE.x, POT.bottomY, 4, BASE.x, POT.bottomY, 78)
  bg.addColorStop(0, `hsla(${genome.hueB}, 85%, 78%, ${0.1 * glowK})`)
  bg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.bottomY + 5, 62, 12, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawSwirlRings(g: ReturnType<typeof stemGeom>, t: number, glowK: number) {
  if (!ctx || reduced || growthSmooth < 0.4) return
  const c = { x: g.p1.x, y: g.p1.y + 10 }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 2; i++) {
    const rot = t * 0.14 * (i ? -1 : 1) + i * 1.4
    const rx = 66 + i * 22 + Math.sin(t * 0.5 + i) * 4
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(rot * 0.3 + (i ? 0.5 : -0.25))
    ctx.strokeStyle = `hsla(${(genome.spiralHue + i * 70 + t * 14) % 360}, 85%, 80%, ${0.07 * glowK})`
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, rx * 0.4, 0, rot, rot + TAU * 0.72)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

function drawDust(g: ReturnType<typeof stemGeom>, behind: boolean) {
  if (!ctx) return
  const c = { x: g.p1.x, y: g.p1.y + 8 }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of particles) {
    if (p.kind !== 'dust') continue
    const ang = (p.a0 as number) + (p.age as number) * (p.w as number)
    const sinA = Math.sin(ang)
    if (sinA < 0 !== behind) continue
    const r = (p.r0 as number) + (p.age as number) * 18
    const x = c.x + Math.cos(ang) * r * 1.2
    const y = c.y + sinA * r * 0.48 - (p.age as number) * 6
    const fade = clamp((p.life as number) / 1.2, 0, 1) * clamp((p.age as number) * 2.5, 0, 1)
    const tw = 0.55 + 0.45 * Math.sin((p.age as number) * 9 + (p.tw as number))
    ctx.fillStyle = `hsla(${((p.hue as number) + (p.age as number) * 34) % 360}, 90%, 78%, ${0.5 * fade * tw})`
    ctx.beginPath()
    ctx.arc(x, y, 1.1 + tw * 1.3, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

// ---------- 花盆 ----------
function loadCloudPotImage() {
  if (cloudPotImage || cloudPotFailed) return

  const image = new Image()
  image.onload = () => {
    cloudPotReady = true
  }
  image.onerror = () => {
    cloudPotFailed = true
  }
  image.src = cloudPotUrl
  cloudPotImage = image
}

function cloudPotFrame() {
  const width = CLOUD_POT.drawWidth
  const height = (width / CLOUD_POT.sourceWidth) * CLOUD_POT.sourceHeight

  return {
    x: BASE.x - width / 2,
    y: CLOUD_POT.bottomY - height,
    width,
    height,
  }
}

function drawCloudPotBack() {
  if (!ctx || !cloudPotReady || !cloudPotImage) return false

  const frame = cloudPotFrame()
  ctx.save()
  ctx.shadowColor = 'rgba(101, 78, 48, 0.14)'
  ctx.shadowBlur = 9
  ctx.shadowOffsetY = 4
  ctx.drawImage(cloudPotImage, frame.x, frame.y, frame.width, frame.height)
  ctx.restore()

  return true
}

function drawCloudPotFront() {
  if (!ctx || !cloudPotReady || !cloudPotImage) return false

  const frame = cloudPotFrame()
  const scale = frame.width / CLOUD_POT.sourceWidth
  const cropY = CLOUD_POT.frontCropY
  const cropHeight = CLOUD_POT.sourceHeight - cropY

  ctx.drawImage(
    cloudPotImage,
    0,
    cropY,
    CLOUD_POT.sourceWidth,
    cropHeight,
    frame.x,
    frame.y + cropY * scale,
    frame.width,
    cropHeight * scale,
  )

  return true
}

function potPath() {
  if (!ctx) return
  ctx.beginPath()
  ctx.moveTo(BASE.x - POT.rimRx, POT.rimY)
  ctx.bezierCurveTo(
    BASE.x - POT.rimRx + 1,
    POT.rimY + 18,
    BASE.x - POT.bottomRx - 5,
    POT.bottomY - 18,
    BASE.x - POT.bottomRx,
    POT.bottomY,
  )
  ctx.quadraticCurveTo(BASE.x - 18, POT.bottomY + 8, BASE.x, POT.bottomY + 8)
  ctx.quadraticCurveTo(BASE.x + 18, POT.bottomY + 8, BASE.x + POT.bottomRx, POT.bottomY)
  ctx.bezierCurveTo(
    BASE.x + POT.bottomRx + 5,
    POT.bottomY - 18,
    BASE.x + POT.rimRx - 1,
    POT.rimY + 18,
    BASE.x + POT.rimRx,
    POT.rimY,
  )
  ctx.closePath()
}
function drawFallbackPotBack() {
  if (!ctx) return
  potPath()
  const glass = ctx.createLinearGradient(BASE.x - 58, POT.rimY, BASE.x + 50, POT.bottomY)
  glass.addColorStop(0, 'rgba(255, 255, 255, 0.24)')
  glass.addColorStop(0.42, 'rgba(221, 246, 255, 0.13)')
  glass.addColorStop(1, 'rgba(255, 225, 246, 0.18)')
  ctx.fillStyle = glass
  ctx.fill()

  const dry = [128, 92, 70]
  const wet = [76, 52, 44]
  const m = (i: number) => Math.round(lerp(dry[i], wet[i], soilDark))
  ctx.fillStyle = `rgba(${m(0)},${m(1)},${m(2)},0.16)`
  ctx.beginPath()
  ctx.moveTo(BASE.x - 42, POT.rimY + 5)
  ctx.bezierCurveTo(BASE.x - 37, POT.rimY + 38, BASE.x - 21, POT.bottomY - 27, BASE.x, POT.bottomY - 24)
  ctx.bezierCurveTo(BASE.x + 21, POT.bottomY - 27, BASE.x + 37, POT.rimY + 38, BASE.x + 42, POT.rimY + 5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = `rgba(${m(0) - 22},${m(1) - 16},${m(2) - 12},0.84)`
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.rimY + 4, 45, 8, 0, 0, TAU)
  ctx.fill()

  const innerGlow = ctx.createLinearGradient(BASE.x, POT.rimY + 8, BASE.x, POT.bottomY)
  innerGlow.addColorStop(0, 'rgba(255,255,255,0.18)')
  innerGlow.addColorStop(1, 'rgba(186,226,255,0.04)')
  ctx.fillStyle = innerGlow
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.bottomY - 7, 30, 8, 0, 0, TAU)
  ctx.fill()
}
function drawPotBack() {
  if (drawCloudPotBack()) return
  drawFallbackPotBack()
}

function drawFallbackPotFront() {
  if (!ctx) return
  potPath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.075)'
  ctx.fill()

  ctx.strokeStyle = 'rgba(106, 84, 66, 0.24)'
  ctx.lineWidth = 1.8
  potPath()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)'
  ctx.lineWidth = 1.2
  potPath()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(106, 84, 66, 0.28)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.rimY, POT.rimRx, POT.rimRy, 0, 0, TAU)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.rimY - 0.5, POT.rimRx - 1, POT.rimRy - 1, 0, 0, TAU)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1.7
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.rimY + 5, POT.rimRx - 9, POT.rimRy - 3, 0, 0, TAU)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(BASE.x, POT.bottomY + 3, POT.footRx, 8, 0, 0, TAU)
  ctx.stroke()

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 3.2
  ctx.beginPath()
  ctx.moveTo(BASE.x - POT.rimRx + 12, POT.rimY + 14)
  ctx.quadraticCurveTo(BASE.x - POT.rimRx + 6, POT.rimY + 45, BASE.x - POT.bottomRx + 6, POT.bottomY - 13)
  ctx.stroke()

  const iri = ctx.createLinearGradient(BASE.x + 36, POT.rimY, BASE.x + 50, POT.bottomY)
  iri.addColorStop(0, 'rgba(255, 176, 214, 0.38)')
  iri.addColorStop(0.5, 'rgba(162, 226, 255, 0.33)')
  iri.addColorStop(1, 'rgba(210, 180, 255, 0.36)')
  ctx.strokeStyle = iri
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(BASE.x + POT.rimRx - 11, POT.rimY + 15)
  ctx.quadraticCurveTo(BASE.x + POT.rimRx - 6, POT.rimY + 45, BASE.x + POT.bottomRx - 5, POT.bottomY - 12)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(BASE.x - 22, POT.bottomY - 6)
  ctx.quadraticCurveTo(BASE.x, POT.bottomY + 1, BASE.x + 22, POT.bottomY - 6)
  ctx.stroke()
}

function drawPotFront() {
  if (drawCloudPotFront()) return
  drawFallbackPotFront()
}

// ---------- 幼苗 ----------
function drawSeedling(_g: ReturnType<typeof stemGeom>, t: number) {
  if (!ctx) return
  const grow01 = clamp(growthSmooth / 0.22, 0, 1)
  const sprout = 8 + grow01 * 20
  const sway = noiseFlutter(t * 0.6) * 3 * (reduced ? 0.15 : 1)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = `hsla(${genome.stemHueA}, 55%, 66%, 0.9)`
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(BASE.x, BASE.y)
  ctx.quadraticCurveTo(BASE.x + sway * 0.4, BASE.y - sprout * 0.6, BASE.x + sway, BASE.y - sprout)
  ctx.stroke()
  const topY = BASE.y - sprout
  const topX = BASE.x + sway
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.translate(topX, topY)
    ctx.rotate(s * (0.9 - grow01 * 0.15))
    const lg = ctx.createLinearGradient(0, 0, 0, -16 * grow01 - 4)
    lg.addColorStop(0, `hsla(${genome.stemHueA}, 60%, 62%, 0.95)`)
    lg.addColorStop(1, `hsla(${genome.hueA}, 65%, 80%, 0.9)`)
    ctx.fillStyle = lg
    ctx.beginPath()
    const ll = 12 * grow01 + 5
    ctx.ellipse(0, -ll * 0.5, 5 * grow01 + 2, ll * 0.5, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// ---------- 茎与侧枝 ----------
function drawTapered(pts: Vec[], w0: number, w1: number, colorFn: (tt: number, alpha: number) => string, alpha: number) {
  if (!ctx) return
  for (let i = 0; i < pts.length - 1; i++) {
    const tt = i / (pts.length - 1)
    ctx.strokeStyle = colorFn(tt, alpha)
    ctx.lineWidth = lerp(w0, w1, tt)
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
    ctx.stroke()
  }
}
function stemColor(tt: number, alpha: number) {
  const h = lerp(genome.stemHueA, genome.stemHueB, tt)
  const l = lerp(66, 78, tt) * (0.8 + 0.2 * (vitalitySmooth / 100))
  return `hsla(${h}, 60%, ${l}%, ${alpha})`
}
function drawMainStem(g: ReturnType<typeof stemGeom>, glowK: number) {
  if (!ctx) return
  const pts = Array.from({ length: 23 }, (_, i) => bezier(g.p0, g.c1, g.c2, g.p1, i / 22))
  ctx.lineCap = 'round'
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  drawTapered(pts, 14, 6, stemColor, 0.1 * glowK)
  ctx.restore()
  drawTapered(pts, 11, 5, stemColor, 0.9)
  drawTapered(pts, 3.6, 1.4, () => 'rgba(255,255,255,0.7)', 0.7)
}
function drawSideStems(g: ReturnType<typeof stemGeom>, t: number, glowK: number) {
  if (!ctx || growthSmooth < 0.4) return
  for (const b of buds) {
    const sway = noiseFlutter(t * 0.6 + b.phase) * 3 * (reduced ? 0.15 : 1) * (1 - 0.8 * sleepFold)
    const gk = clamp((growthSmooth - 0.4) / 0.3, 0, 1)
    const p0 = { x: BASE.x + b.dx * 0.12, y: BASE.y - 2 }
    const p1 = { x: BASE.x + b.dx * gk + sway, y: BASE.y + b.dy * gk + g.droop * 12 }
    const cp = { x: BASE.x + b.dx * 0.55 * gk, y: BASE.y + b.dy * 0.45 * gk }
    const pts = Array.from({ length: 13 }, (_, i) => quadPoint(p0, cp, p1, i / 12))
    ctx.lineCap = 'round'
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    drawTapered(pts, 7, 3.5, stemColor, 0.08 * glowK)
    ctx.restore()
    drawTapered(pts, 4.4, 2.2, stemColor, 0.85)
    drawTapered(pts, 1.5, 0.7, () => 'rgba(255,255,255,0.65)', 0.65)
    drawGlassBud(p1.x, p1.y, b.size * gk, b.ang, glowK, t + b.phase)
  }
}
function drawGlassBud(x: number, y: number, size: number, ang: number, glowK: number, tt: number) {
  if (!ctx || size < 1) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang + Math.PI / 2)
  const grad = ctx.createLinearGradient(0, 0, 0, -size * 1.6)
  grad.addColorStop(0, `hsla(${genome.stemHueB}, 70%, 74%, 0.9)`)
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.85)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-size * 0.62, -size * 0.42, -size * 0.5, -size * 1.28, 0, -size * 1.55)
  ctx.bezierCurveTo(size * 0.5, -size * 1.28, size * 0.62, -size * 0.42, 0, 0)
  ctx.fill()
  ctx.globalCompositeOperation = 'lighter'
  const pulse = 0.5 + 0.5 * Math.sin(tt * 2.2)
  const halo = ctx.createRadialGradient(0, -size * 0.8, 1, 0, -size * 0.8, size * 1.7)
  halo.addColorStop(0, `hsla(${genome.core.h}, 90%, 80%, ${0.3 * glowK * (0.6 + 0.4 * pulse)})`)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, -size * 0.8, size * 1.7, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// ---------- 虹彩羽叶 ----------
function drawFeathers(g: ReturnType<typeof stemGeom>, t: number, glowK: number) {
  if (!ctx) return
  const flenK = clamp((growthSmooth - 0.18) / 0.34, 0, 1)
  if (flenK <= 0) return
  for (const f of feathers) {
    const at = bezier(g.p0, g.c1, g.c2, g.p1, f.t)
    const ang = featherAngle(f, t)
    const flen = f.len * flenK
    const end = { x: at.x + Math.cos(ang) * flen, y: at.y + Math.sin(ang) * flen }
    const mid = { x: (at.x + end.x) / 2 - Math.sin(ang) * f.curl, y: (at.y + end.y) / 2 + Math.cos(ang) * f.curl }
    const alpha = (0.62 - f.wp * 0.3) * (1 - sleepFold * 0.2)
    const satK = 1 - f.wp * 0.55

    const ribPts = Array.from({ length: 12 }, (_, i) => quadPoint(at, mid, end, i / 11))
    ctx.lineCap = 'round'
    drawTapered(ribPts, 2.8, 0.8, (tt, a) => `hsla(${lerp(f.hue0, genome.hueB, tt)}, ${58 * satK}%, 76%, ${a})`, alpha + 0.15)

    const n = Math.max(7, Math.round(flen / 8))
    for (let i = 1; i <= n; i++) {
      const tt = i / (n + 1)
      const p = quadPoint(at, mid, end, tt)
      const p2 = quadPoint(at, mid, end, Math.min(1, tt + 0.05))
      const dirA = Math.atan2(p2.y - p.y, p2.x - p.x)
      const envelope = Math.sin(Math.PI * clamp(tt * 1.06, 0, 1))
      const lobeLen = (6 + flen * 0.18) * envelope * (1 - f.wp * 0.25)
      const hue = lerp(f.hue0, genome.hueB, tt)
      for (const s of [-1, 1]) {
        const la = dirA + s * (1.15 - 0.25 * tt + f.wp * 0.3 * s)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(la)
        const lg = ctx.createLinearGradient(0, 0, lobeLen, 0)
        lg.addColorStop(0, `hsla(${hue}, ${72 * satK}%, 74%, ${alpha})`)
        lg.addColorStop(1, `hsla(${(hue + 40) % 360}, ${80 * satK}%, 86%, ${alpha * 0.25})`)
        ctx.fillStyle = lg
        ctx.beginPath()
        ctx.ellipse(lobeLen / 2, 0, lobeLen / 2, lobeLen * 0.22 + 1.1, 0, 0, TAU)
        ctx.fill()
        ctx.restore()
      }
    }
    if (f.wp < 0.5 && !reduced) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const gl of f.glints) {
        const p = quadPoint(at, mid, end, gl.t)
        const a = (0.3 + 0.7 * Math.max(0, Math.sin(t * 1.7 + gl.ph))) * 0.55 * glowK
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`
        ctx.beginPath()
        ctx.arc(p.x + gl.side * 5, p.y, 1.4, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }
  }
}

// ---------- 花苞 ----------
function drawFlowerBud(g: ReturnType<typeof stemGeom>, glowK: number) {
  if (!ctx) return
  const x = g.p1.x
  const y = g.p1.y
  const k = clamp((growthSmooth - 0.5) / 0.3, 0, 1)
  const size = 8 + k * 12
  const core = genome.core
  ctx.save()
  ctx.translate(x, y)
  const grad = ctx.createLinearGradient(0, 0, 0, -size * 1.7)
  grad.addColorStop(0, `hsla(${genome.stemHueB}, 55%, 66%, 0.95)`)
  grad.addColorStop(0.6, `hsla(${core.h}, ${core.s * 0.6}%, ${core.l}%, 0.9)`)
  grad.addColorStop(1, 'rgba(255,255,255,0.9)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-size * 0.66, -size * 0.5, -size * 0.5, -size * 1.5, 0, -size * 1.75)
  ctx.bezierCurveTo(size * 0.5, -size * 1.5, size * 0.66, -size * 0.5, 0, 0)
  ctx.fill()
  ctx.globalCompositeOperation = 'lighter'
  const pulse = 0.5 + 0.5 * Math.sin(breathPhase)
  const halo = ctx.createRadialGradient(0, -size, 1, 0, -size, size * 1.9)
  halo.addColorStop(0, `hsla(${core.h}, 92%, 80%, ${0.32 * glowK * (0.6 + 0.4 * pulse)})`)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, -size, size * 1.9, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// ---------- 花：分发到各花型 ----------
function drawFlower(g: ReturnType<typeof stemGeom>, t: number, glowK: number) {
  if (!ctx) return
  const x = g.p1.x
  const y = g.p1.y
  const headRot = lean.p * 0.5 + g.gust * 0.04 + eye.x * 0.06
  const petLean = petHoverAcc * clamp((mouse.x - x) / 60, -1, 1) * 0.16
  const open = clamp(
    bloom01() *
      (0.92 + Math.sin(breathPhase) * 0.04 - g.droop * 0.28 - sleepFold * 0.38 + (celebrateT < 1.2 ? (1.2 - celebrateT) * 0.18 : 0)),
    0,
    1.15,
  )
  const core = genome.core
  const jit = genome._jitter

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(headRot + petLean)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const pulse = 1 + Math.sin(breathPhase) * 0.08
  const hb = celebrateT < 1.6 ? (1.6 - celebrateT) * 0.45 : 0
  const R = 52 * pulse * (0.6 + 0.4 * open)
  const halo = ctx.createRadialGradient(0, -4, 4, 0, -4, R)
  halo.addColorStop(0, `hsla(${core.h}, ${core.s}%, ${core.l}%, ${(0.4 + hb) * glowK})`)
  halo.addColorStop(0.55, `hsla(${(core.h + 30) % 360}, 80%, 76%, ${0.14 * glowK})`)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, -4, R, 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.rotate(jit.rot)
  switch (genome.flower) {
    case 'daisy':
      drawDaisy(t, open, jit)
      break
    case 'rose':
      drawRose(t, open, jit)
      break
    case 'bellflower':
      drawBellflower(t, open, jit)
      break
    case 'sunflower':
      drawSunflower(t, open, jit)
      break
    default:
      drawLotus(t, open, jit)
      break
  }
  ctx.rotate(-jit.rot)

  drawEyes(open)

  ctx.restore()
}

function petalPath(len: number, w: number) {
  if (!ctx) return
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-w, -len * 0.3, -w * 0.72, -len * 0.85, 0, -len)
  ctx.bezierCurveTo(w * 0.72, -len * 0.85, w, -len * 0.3, 0, 0)
  ctx.closePath()
}
function petalFill(len: number, core: HslColor, lift: number) {
  const pg = ctx!.createLinearGradient(0, 0, 0, -len)
  pg.addColorStop(0, `hsla(${core.h}, ${core.s}%, ${core.l - 6}%, 0.95)`)
  pg.addColorStop(0.55, `hsla(${(core.h + 18) % 360}, 76%, ${core.l + 10 + lift}%, 0.85)`)
  pg.addColorStop(1, 'rgba(255, 252, 246, 0.9)')
  return pg
}

type Jit = RenderGenome['_jitter']

function drawLotus(_t: number, open: number, jit: Jit) {
  if (!ctx) return
  const core = genome.core
  const layers = [
    { n: 8 + jit.petalBonus, len: 44, w: 15, tilt: 0.32, rotOff: 0 },
    { n: 6, len: 34, w: 12.5, tilt: 0.2, rotOff: 0.4 },
    { n: 4, len: 24, w: 10, tilt: 0.1, rotOff: 0.85 },
  ]
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * TAU + L.rotOff
      ctx.save()
      ctx.rotate(a)
      ctx.translate(0, -5 * open)
      ctx.scale(open * jit.wobble, open * (0.78 + L.tilt))
      ctx.fillStyle = petalFill(L.len, core, 0)
      petalPath(L.len, L.w)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.restore()
    }
  }
  drawGlowCore(11)
}

function drawDaisy(_t: number, open: number, jit: Jit) {
  if (!ctx) return
  const core = genome.core
  const n = 13 + jit.petalBonus * 2
  for (let ring = 0; ring < 2; ring++) {
    const off = ring * (TAU / n / 2)
    const len = 42 - ring * 6
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + off
      ctx.save()
      ctx.rotate(a)
      ctx.translate(0, -4 * open)
      ctx.scale(open * jit.wobble, open)
      const lg = ctx.createLinearGradient(0, 0, 0, -len)
      lg.addColorStop(0, `hsla(${core.h}, ${core.s}%, ${core.l - 4}%, 0.95)`)
      lg.addColorStop(1, `hsla(${(core.h + 8) % 360}, 90%, 92%, 0.92)`)
      ctx.fillStyle = lg
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-4.4, -len * 0.5, -3.4, -len, 0, -len)
      ctx.bezierCurveTo(3.4, -len, 4.4, -len * 0.5, 0, 0)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.save()
  const cg = ctx.createRadialGradient(0, -3, 1, 0, -3, 13)
  cg.addColorStop(0, 'hsla(40, 90%, 62%, 1)')
  cg.addColorStop(1, 'hsla(32, 80%, 44%, 1)')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(0, -3, 13 * open, 0, TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(90,60,20,0.55)'
  for (let i = 0; i < 22; i++) {
    const a = i * 2.399
    const r = Math.sqrt(i / 22) * 11 * open
    ctx.beginPath()
    ctx.arc(Math.cos(a) * r, -3 + Math.sin(a) * r, 0.9, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
  drawGlowCore(7)
}

function drawRose(_t: number, open: number, jit: Jit) {
  if (!ctx) return
  const core = genome.core
  const layers = [
    { n: 7 + jit.petalBonus, len: 40, w: 20, tilt: 0.5, curl: 0.5, off: 0 },
    { n: 6, len: 30, w: 17, tilt: 0.4, curl: 0.7, off: 0.5 },
    { n: 5, len: 21, w: 14, tilt: 0.3, curl: 0.9, off: 1.0 },
    { n: 3, len: 12, w: 11, tilt: 0.2, curl: 1.1, off: 1.5 },
  ]
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * TAU + L.off
      ctx.save()
      ctx.rotate(a)
      ctx.translate(0, -3 * open)
      ctx.scale(open * jit.wobble, open)
      const lg = ctx.createLinearGradient(0, 0, 0, -L.len)
      lg.addColorStop(0, `hsla(${core.h}, ${core.s}%, ${core.l - 14}%, 0.96)`)
      lg.addColorStop(0.7, `hsla(${core.h}, ${core.s}%, ${core.l + 4}%, 0.94)`)
      lg.addColorStop(1, `hsla(${(core.h + 6) % 360}, 80%, ${core.l + 16}%, 0.9)`)
      ctx.fillStyle = lg
      const w = L.w
      const len = L.len
      const c = L.curl
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-w, -len * 0.3, -w * c, -len * 0.9, 0, -len)
      ctx.bezierCurveTo(w * c, -len * 0.9, w, -len * 0.3, 0, 0)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = `hsla(${core.h}, 70%, ${core.l - 20}%, 0.35)`
      ctx.lineWidth = 0.7
      ctx.stroke()
      ctx.restore()
    }
  }
  ctx.save()
  ctx.fillStyle = `hsla(${core.h}, ${core.s}%, ${core.l - 18}%, 0.95)`
  ctx.beginPath()
  ctx.arc(0, -3, 5 * open, 0, TAU)
  ctx.fill()
  ctx.restore()
  drawGlowCore(8)
}

function drawBellflower(t: number, open: number, jit: Jit) {
  if (!ctx) return
  const core = genome.core
  const n = 5 + jit.petalBonus
  ctx.save()
  ctx.strokeStyle = `hsla(${genome.stemHueB}, 45%, 68%, 0.85)`
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 4)
  ctx.quadraticCurveTo(10, -22, 4, -46 * open - 6)
  ctx.stroke()
  ctx.restore()
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    const stalk = quadPoint({ x: 0, y: 4 }, { x: 10, y: -22 }, { x: 4, y: -46 * open - 6 }, u)
    const sway = noiseFlutter(t * 0.7 + i) * 0.12
    const size = (10 - u * 3) * open * jit.wobble
    ctx.save()
    ctx.translate(stalk.x + 6, stalk.y)
    ctx.rotate(0.5 + sway)
    const lg = ctx.createLinearGradient(0, 0, 0, size * 1.4)
    lg.addColorStop(0, `hsla(${core.h}, ${core.s}%, ${core.l - 8}%, 0.95)`)
    lg.addColorStop(1, `hsla(${(core.h + 14) % 360}, 70%, ${core.l + 14}%, 0.92)`)
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(-size * 0.5, size * 0.4, -size * 0.62, size * 1.1, -size * 0.4, size * 1.4)
    ctx.quadraticCurveTo(0, size * 1.65, size * 0.4, size * 1.4)
    ctx.bezierCurveTo(size * 0.62, size * 1.1, size * 0.5, size * 0.4, 0, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = `hsla(${(core.h + 14) % 360}, 70%, ${core.l + 18}%, 0.9)`
    for (const dx of [-0.4, 0, 0.4]) {
      ctx.beginPath()
      ctx.arc(dx * size, size * 1.45, size * 0.14, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }
  drawGlowCore(6, -20)
}

function drawSunflower(_t: number, open: number, jit: Jit) {
  if (!ctx) return
  const core = genome.core
  const n = 18 + jit.petalBonus * 2
  for (let ring = 0; ring < 2; ring++) {
    const off = ring * (TAU / n / 2)
    const len = 40 - ring * 8
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + off
      ctx.save()
      ctx.rotate(a)
      ctx.translate(0, -12 * open)
      ctx.scale(open * jit.wobble, open)
      const lg = ctx.createLinearGradient(0, 0, 0, -len)
      lg.addColorStop(0, `hsla(${core.h}, ${core.s}%, ${core.l}%, 0.96)`)
      lg.addColorStop(1, `hsla(${(core.h + 12) % 360}, 95%, ${core.l + 20}%, 0.92)`)
      ctx.fillStyle = lg
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-4.2, -len * 0.5)
      ctx.lineTo(0, -len)
      ctx.lineTo(4.2, -len * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.save()
  const dg = ctx.createRadialGradient(0, -6, 2, 0, -6, 20 * open)
  dg.addColorStop(0, 'hsla(34, 70%, 46%, 1)')
  dg.addColorStop(0.7, 'hsla(28, 65%, 34%, 1)')
  dg.addColorStop(1, 'hsla(24, 60%, 26%, 1)')
  ctx.fillStyle = dg
  ctx.beginPath()
  ctx.arc(0, -6, 20 * open, 0, TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(60,40,16,0.5)'
  for (let i = 0; i < 60; i++) {
    const a = i * 2.399
    const r = Math.sqrt(i / 60) * 18 * open
    ctx.beginPath()
    ctx.arc(Math.cos(a) * r, -6 + Math.sin(a) * r, 1, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
  drawGlowCore(6, -6)
}

function drawGlowCore(r: number, oy = -3) {
  if (!ctx) return
  const core = genome.core
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const cg = ctx.createRadialGradient(0, oy, 0.5, 0, oy, r)
  cg.addColorStop(0, 'rgba(255, 250, 235, 0.95)')
  cg.addColorStop(0.5, `hsla(${core.h}, 95%, 74%, 0.8)`)
  cg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(0, oy, r, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawEyes(open: number) {
  if (!ctx || open < 0.35) return
  const asleep = sleepFold > 0.4
  const oy = genome.flower === 'sunflower' || genome.flower === 'daisy' ? -6 : -4
  const dx = 4.2
  const ex = eye.x * 2.4
  const ey = eye.y * 1.6
  ctx.save()
  for (const s of [-1, 1]) {
    const cx = s * dx
    const cy = oy
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, 2.6, 3.0, 0, 0, TAU)
    ctx.fill()
    if (asleep || blink > 0) {
      ctx.strokeStyle = 'rgba(70,60,50,0.8)'
      ctx.lineWidth = 1.1
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx, cy, 2.6, 0.2, Math.PI - 0.2)
      ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(50,42,36,0.95)'
      ctx.beginPath()
      ctx.arc(cx + ex, cy + ey, 1.5, 0, TAU)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.arc(cx + ex - 0.5, cy + ey - 0.6, 0.5, 0, TAU)
      ctx.fill()
    }
  }
  if ((genome.flower === 'daisy' || genome.flower === 'sunflower') && !asleep) {
    ctx.fillStyle = 'rgba(255,150,150,0.35)'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(s * 8, oy + 3.4, 2.4, 1.5, 0, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawRays(g: ReturnType<typeof stemGeom>) {
  if (!ctx || celebrateT >= 1.6 || isSeedling()) return
  const k = 1 - celebrateT / 1.6
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(g.p1.x, g.p1.y)
  ctx.rotate(celebrateT * 0.35)
  for (let i = 0; i < 8; i++) {
    ctx.rotate(TAU / 8)
    const rg = ctx.createLinearGradient(0, 0, 0, -78)
    rg.addColorStop(0, `hsla(${genome.core.h}, 90%, 80%, ${0.24 * k})`)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.moveTo(-2, 0)
    ctx.lineTo(2, 0)
    ctx.lineTo(0.5, -80)
    ctx.lineTo(-0.5, -80)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// ---------- 粒子 ----------
function drawParticles() {
  if (!ctx) return
  for (const p of particles) {
    const a = clamp(p.life as number, 0, 1)
    const px = p.x as number
    const py = p.y as number
    if (p.kind === 'drop') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = `rgba(170, 220, 255, ${0.9 * a})`
      ctx.beginPath()
      ctx.ellipse(px, py, 2, 3.6, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    } else if (p.kind === 'splash') {
      ctx.strokeStyle = `rgba(180, 226, 255, ${a * 0.8})`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(px, py, (0.35 - (p.life as number)) * 28, (0.35 - (p.life as number)) * 9, 0, 0, TAU)
      ctx.stroke()
    } else if (p.kind === 'petal') {
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(p.rot as number)
      ctx.fillStyle = `hsla(${genome.core.h}, 85%, 78%, ${a * 0.85})`
      ctx.beginPath()
      ctx.ellipse(0, 0, 3, 5.6, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    } else if (p.kind === 'heart') {
      ctx.save()
      ctx.translate(px, py)
      const sz = 3 + (1 - a) * 2
      ctx.fillStyle = `hsla(345, 85%, 70%, ${a})`
      ctx.beginPath()
      ctx.moveTo(0, sz * 0.3)
      ctx.bezierCurveTo(-sz, -sz * 0.6, -sz * 0.5, -sz * 1.3, 0, -sz * 0.6)
      ctx.bezierCurveTo(sz * 0.5, -sz * 1.3, sz, -sz * 0.6, 0, sz * 0.3)
      ctx.fill()
      ctx.restore()
    } else if (p.kind === 'spark') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = `rgba(255, 238, 190, ${a})`
      ctx.beginPath()
      ctx.arc(px, py, 2.6 * a + 0.6, 0, TAU)
      ctx.fill()
      ctx.restore()
    } else if (p.kind === 'glint') {
      const k = Math.sin((1 - (p.life as number) / 0.8) * Math.PI)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * k})`
      ctx.lineWidth = 1
      const r = 5 * k
      ctx.beginPath()
      ctx.moveTo(px - r, py)
      ctx.lineTo(px + r, py)
      ctx.moveTo(px, py - r)
      ctx.lineTo(px, py + r)
      ctx.stroke()
      ctx.fillStyle = `rgba(255, 255, 255, ${k})`
      ctx.beginPath()
      ctx.arc(px, py, 1.2, 0, TAU)
      ctx.fill()
      ctx.restore()
    } else if (p.kind === 'mote') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = `rgba(255, 246, 214, ${0.4 * clamp((p.life as number) / 2, 0, 1)})`
      ctx.beginPath()
      ctx.arc(px, py, 1.3, 0, TAU)
      ctx.fill()
      ctx.restore()
    } else if (p.kind === 'zzz') {
      ctx.fillStyle = `rgba(190, 200, 240, ${a * 0.85})`
      ctx.font = `${12 + (3 - (p.life as number)) * 3}px sans-serif`
      ctx.fillText('z', px, py)
    }
  }
}

function drawButterflies(t: number, g: ReturnType<typeof stemGeom>) {
  if (!ctx) return
  for (const b of butterflies) {
    const u = b.t / b.dur
    const tip = g.p1
    let x: number
    let y: number
    if (u < 0.35) {
      const k = smooth(u / 0.35)
      x = lerp(-30, tip.x + 34, k)
      y = lerp(160, tip.y - 20, k) + Math.sin(u * 40 + b.phase) * 9
    } else if (u < 0.7) {
      const k = ((u - 0.35) / 0.35) * TAU * 1.2
      x = tip.x + Math.cos(k) * 38
      y = tip.y - 14 + Math.sin(k) * 18
    } else {
      const k = smooth((u - 0.7) / 0.3)
      x = lerp(tip.x + 38, W + 40, k)
      y = lerp(tip.y - 14, 100, k) + Math.sin(u * 36) * 8
    }
    const flap = Math.abs(Math.sin(t * 16 + b.phase))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.translate(x, y)
    ctx.fillStyle = `hsla(${(genome.spiralHue + 100) % 360}, 90%, 80%, 0.85)`
    ctx.beginPath()
    ctx.ellipse(-4, 0, 6 * (0.35 + flap * 0.65), 4.6, -0.4, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(4, 0, 6 * (0.35 + flap * 0.65), 4.6, 0.4, 0, TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.ellipse(0, 0, 1.5, 4, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
}

function drawMemoryCloud(g: ReturnType<typeof stemGeom>) {
  if (!ctx) return
  const m = memoryCloud!
  const a = m.t < 0.5 ? smooth(m.t / 0.5) : m.t > m.dur - 0.7 ? smooth((m.dur - m.t) / 0.7) : 1
  const cx = clamp(g.p1.x - 92, 74, W - 92)
  const cy = clamp(g.p1.y - 54 - a * 5, 58, H - 124)
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(252, 250, 244, 0.94)'
  ctx.strokeStyle = 'rgba(150, 140, 128, 0.28)'
  ctx.lineWidth = 1
  for (const [ox, oy, r] of [
    [0, 0, 32],
    [32, -8, 25],
    [-32, -4, 24],
    [14, 14, 22],
    [-16, 13, 20],
    [46, 10, 16],
  ]) {
    ctx.beginPath()
    ctx.arc(cx + ox, cy + oy, r, 0, TAU)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(lerp(cx + 58, g.p1.x - 18, 0.3), lerp(cy + 24, g.p1.y - 8, 0.3), 6, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(lerp(cx + 72, g.p1.x - 8, 0.42), lerp(cy + 32, g.p1.y, 0.42), 3.6, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#4a4238'
  ctx.font = '12px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  m.lines.forEach((line, i) => {
    ctx!.fillText(line, cx, cy - 8 + i * 18)
  })
  ctx.restore()
}

function drawBubble(g: ReturnType<typeof stemGeom>) {
  if (!ctx) return
  const b = bubble!
  const a = b.t < 0.25 ? b.t / 0.25 : b.t > 2.1 ? clamp((2.6 - b.t) / 0.5, 0, 1) : 1
  const x = clamp(g.p1.x + 46, 56, W - 56)
  const y = g.p1.y - 26 - b.t * 4
  ctx.save()
  ctx.globalAlpha = a
  ctx.font = '13px "PingFang SC", sans-serif'
  const w = ctx.measureText(b.text).width + 22
  ctx.fillStyle = 'rgba(255, 253, 246, 0.95)'
  ctx.strokeStyle = 'rgba(119, 97, 67, 0.2)'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 15, w, 28, 14)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 8, y + 12)
  ctx.lineTo(x - 16, y + 22)
  ctx.lineTo(x + 1, y + 13)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#5c5145'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(b.text, x, y)
  ctx.restore()
}

function drawNight() {
  // 透明桌宠不能铺夜间遮罩，否则在桌面上会像一块背景图。
}

// ---------- 生命周期 / 事件 ----------
function handlePointerMove(e: PointerEvent) {
  const el = canvasRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const scaleX = W / r.width
  const scaleY = H / r.height
  mouse.x = (e.clientX - r.left) * scaleX
  mouse.y = (e.clientY - r.top) * scaleY
  mouse.inside = true
}
function handlePointerLeave() {
  mouse.inside = false
}

watch(
  () => props.plant?.id ?? null,
  () => {
    buildPlant(props.plant)
  },
)
watch(
  () => props.plant?.genome,
  () => {
    // 心情/花色随记录变化时刷新派生基因（保持同株 jitter 稳定）
    const prevJit = genome._jitter
    genome = buildRenderGenome(props.plant)
    if (props.plant) genome._jitter = prevJit
    if (props.memories && props.memories.length) genome.memories = props.memories
  },
  { deep: true },
)
watch(
  () => growthToUnit(props.plant),
  (next) => {
    growth = next
  },
  { immediate: true },
)
// 记录（浇水）→ lastWatered 变化时自动播放浇水庆祝，同日照料也会有反馈。
watch(
  () => props.plant?.lastWatered ?? 0,
  (next, prev) => {
    if (prev && next !== prev) water('喝到水啦')
  },
)

onMounted(() => {
  const el = canvasRef.value
  if (!el) return
  loadCloudPotImage()

  const dpr = window.devicePixelRatio || 1
  el.width = W * dpr
  el.height = H * dpr
  const context = el.getContext('2d')
  if (!context) return
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx = context

  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  growth = growthToUnit(props.plant)
  growthSmooth = growth
  vitalitySmooth = props.plant ? props.vitality : 100
  buildPlant(props.plant)

  el.addEventListener('pointermove', handlePointerMove)
  el.addEventListener('pointerleave', handlePointerLeave)

  last = performance.now()
  rafId = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  if (handTimer !== null) window.clearTimeout(handTimer)
  const el = canvasRef.value
  if (el) {
    el.removeEventListener('pointermove', handlePointerMove)
    el.removeEventListener('pointerleave', handlePointerLeave)
  }
})

defineExpose({ poke, petHead, water, showMemory, summonButterfly, toggleSleep })
</script>

<template>
  <div class="pet-canvas-wrap">
    <canvas ref="canvas" class="pet-canvas" width="360" height="380" />
    <div
      v-if="handGesture"
      :key="handReplayKey"
      class="pet-hand"
      :class="`pet-hand--${handGesture}`"
      :style="handStyle"
      aria-hidden="true"
    >
      <svg class="pet-hand__svg" viewBox="0 0 72 72">
        <path
          class="pet-hand__shadow"
          d="M22.6 47.5c7.8 9.7 23.8 8.6 30.2-.4 4.2-5.9 2.6-14.4-3-17.8-2.8-1.7-6-.7-8.1 1.8l-.7-13.2c-.1-2.5-2.2-4.4-4.7-4.2-2.3.1-4.1 2.1-4 4.4l.5 9.4-1.9-12.2c-.4-2.5-2.7-4.2-5.1-3.8-2.4.4-4 2.6-3.6 5.1l2.3 14.2-3.3-9.4c-.8-2.3-3.3-3.4-5.5-2.6-2.2.8-3.3 3.2-2.5 5.4l4.4 12.4-2.2-2.9c-1.6-2.1-4.4-2.5-6.4-.9-1.8 1.5-2.1 4.2-.7 6.1l4.3 5.6Z"
        />
        <path
          class="pet-hand__fill"
          d="M21.3 44.9c7.5 9.3 22.9 8.2 29.1-.4 4-5.6 2.5-13.8-2.9-17.1-2.7-1.6-5.8-.7-7.8 1.8L39 16.5c-.1-2.4-2.1-4.2-4.5-4.1-2.2.1-3.9 2-3.8 4.2l.5 9.1-1.8-11.8c-.4-2.4-2.6-4-4.9-3.7-2.3.4-3.9 2.5-3.5 4.9l2.2 13.7-3.2-9c-.8-2.2-3.2-3.3-5.3-2.5-2.1.8-3.2 3.1-2.4 5.2l4.2 12-2.1-2.8c-1.5-2-4.2-2.4-6.1-.8-1.8 1.4-2 4-.6 5.9l4.1 5.4Z"
        />
        <path class="pet-hand__line" d="M31.2 25.7 33 38.6M23.2 28.8l2.9 9.8M16.5 34.5l5.1 6.4M39.7 29.2l.2 8.4" />
        <path class="pet-hand__spark" d="M52.5 16.7 56 12M56.9 23.9l5.2-1.8M45.8 13.4l.8-5.3" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.pet-canvas-wrap {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: min(var(--pet-canvas-size, 520px), calc(100vw - 18px));
  min-inline-size: min(var(--pet-canvas-min-size, 150px), calc(100vw - 18px));
  aspect-ratio: 360 / 380;
  max-inline-size: 100%;
}

.pet-canvas {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  max-inline-size: 100%;
  touch-action: none;
}

.pet-hand {
  position: absolute;
  z-index: 3;
  inset-inline-start: var(--hand-x);
  inset-block-start: var(--hand-y);
  inline-size: 58px;
  block-size: 58px;
  pointer-events: none;
  transform-origin: 20% 20%;
  filter: drop-shadow(0 8px 14px rgba(91, 64, 42, 0.18));
}

.pet-hand--pet {
  animation: pet-hand-pat 0.92s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.pet-hand--poke {
  animation: pet-hand-poke 0.72s cubic-bezier(0.2, 0.9, 0.32, 1.2) both;
}

.pet-hand__svg {
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.pet-hand__shadow {
  fill: rgba(178, 131, 88, 0.18);
  transform: translate(2px, 3px);
}

.pet-hand__fill {
  fill: #ffe7c7;
  stroke: #b47a56;
  stroke-width: 2.2;
  stroke-linejoin: round;
}

.pet-hand__line,
.pet-hand__spark {
  fill: none;
  stroke: #b47a56;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pet-hand__spark {
  stroke: #e0a84b;
}

@keyframes pet-hand-pat {
  0% {
    opacity: 0;
    transform: translate(34px, 28px) rotate(18deg) scale(0.72);
  }
  18% {
    opacity: 1;
    transform: translate(8px, 8px) rotate(6deg) scale(1);
  }
  38% {
    transform: translate(-2px, -3px) rotate(-8deg) scale(0.98);
  }
  58% {
    transform: translate(8px, 2px) rotate(7deg) scale(1);
  }
  78% {
    opacity: 1;
    transform: translate(2px, -2px) rotate(-4deg) scale(0.98);
  }
  100% {
    opacity: 0;
    transform: translate(26px, 16px) rotate(12deg) scale(0.84);
  }
}

@keyframes pet-hand-poke {
  0% {
    opacity: 0;
    transform: translate(42px, 20px) rotate(18deg) scale(0.78);
  }
  25% {
    opacity: 1;
    transform: translate(10px, 4px) rotate(10deg) scale(1);
  }
  48% {
    transform: translate(-4px, -1px) rotate(4deg) scale(0.94);
  }
  68% {
    opacity: 1;
    transform: translate(9px, 5px) rotate(12deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(36px, 16px) rotate(16deg) scale(0.82);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-hand--pet,
  .pet-hand--poke {
    animation-duration: 0.24s;
  }
}
</style>
