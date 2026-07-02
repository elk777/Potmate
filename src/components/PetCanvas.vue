<script setup lang="ts">
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import type { HslColor, PlantState } from '../domain/types'

const props = defineProps<{
  plant: PlantState | null
  vitality: number
}>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const vitalityRatio = computed(() => props.vitality / 100)

watch(
  () => [props.plant, props.vitality] as const,
  () => drawPet(),
  { deep: true },
)

onMounted(() => {
  drawPet()
})

function drawPet() {
  const canvas = canvasRef.value
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) return

  const ratio = window.devicePixelRatio || 1
  const width = 320
  const height = 360
  canvas.width = width * ratio
  canvas.height = height * ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)

  drawAmbientGlow(context, width, height)
  drawShadow(context)
  drawPot(context)

  if (!props.plant) {
    drawEmptySoil(context)
    return
  }

  drawPlant(context, props.plant)
}

function drawShadow(context: CanvasRenderingContext2D) {
  const gradient = context.createRadialGradient(160, 326, 8, 160, 326, 112)
  gradient.addColorStop(0, 'rgba(99, 78, 57, 0.16)')
  gradient.addColorStop(1, 'rgba(82, 58, 42, 0)')
  context.fillStyle = gradient
  context.beginPath()
  context.ellipse(160, 326, 112, 20, 0, 0, Math.PI * 2)
  context.fill()
}

function drawAmbientGlow(context: CanvasRenderingContext2D, width: number, height: number) {
  const glow = context.createRadialGradient(width / 2, height * 0.48, 10, width / 2, height * 0.48, 154)
  glow.addColorStop(0, 'rgba(255, 247, 216, 0.22)')
  glow.addColorStop(0.55, 'rgba(214, 239, 222, 0.15)')
  glow.addColorStop(1, 'rgba(214, 239, 222, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)
}

function drawPot(context: CanvasRenderingContext2D) {
  const potGradient = context.createLinearGradient(76, 230, 244, 330)
  potGradient.addColorStop(0, '#eab58a')
  potGradient.addColorStop(0.48, '#c8795f')
  potGradient.addColorStop(1, '#9c5e4f')

  context.fillStyle = potGradient
  roundRect(context, 74, 236, 172, 46, 23)
  context.fill()

  const bodyGradient = context.createLinearGradient(94, 268, 224, 332)
  bodyGradient.addColorStop(0, '#c98264')
  bodyGradient.addColorStop(1, '#aa6654')
  context.fillStyle = bodyGradient
  roundRect(context, 94, 276, 132, 62, 24)
  context.fill()

  const lipGradient = context.createLinearGradient(84, 238, 236, 270)
  lipGradient.addColorStop(0, 'rgba(255, 222, 177, 0.8)')
  lipGradient.addColorStop(1, 'rgba(181, 91, 72, 0.2)')
  context.fillStyle = lipGradient
  roundRect(context, 90, 248, 140, 12, 6)
  context.fill()

  context.fillStyle = '#6f4d43'
  context.beginPath()
  context.ellipse(160, 270, 70, 18, 0, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#493430'
  context.beginPath()
  context.ellipse(160, 268, 56, 11, 0, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(255, 223, 184, 0.42)'
  context.lineWidth = 4
  context.beginPath()
  context.arc(160, 294, 50, 0.18 * Math.PI, 0.82 * Math.PI)
  context.stroke()

  context.fillStyle = 'rgba(255, 232, 190, 0.58)'
  roundRect(context, 96, 250, 38, 14, 8)
  context.fill()
}

function drawEmptySoil(context: CanvasRenderingContext2D) {
  context.fillStyle = 'rgba(255, 234, 176, 0.78)'
  context.beginPath()
  context.arc(126, 258, 3, 0, Math.PI * 2)
  context.arc(198, 258, 2.5, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(134, 184, 132, 0.58)'
  context.lineWidth = 3
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(160, 266)
  context.quadraticCurveTo(156, 252, 164, 242)
  context.stroke()

  drawLeaf(context, 151, 250, 9, -1, 'round', 'hsla(104, 42%, 62%, 0.82)')
  drawLeaf(context, 169, 248, 9, 1, 'heart', 'hsla(112, 38%, 64%, 0.76)')
}

function drawPlant(context: CanvasRenderingContext2D, plant: PlantState) {
  const genome = plant.genome
  const growthRatio = Math.min(plant.growth / 10, 1)
  const wilt = 1 - vitalityRatio.value
  const baseX = 160
  const baseY = 266
  const height = 74 + growthRatio * 118
  const topY = baseY - height + wilt * 24
  const bend = genome.stemStyle === 'curved' ? -20 : genome.stemStyle === 'branching' ? 17 : 4

  context.lineCap = 'round'
  context.strokeStyle = withVitality(genome.leafColor, props.vitality, 0.72)
  context.lineWidth = 6 - wilt * 2
  context.beginPath()
  context.moveTo(baseX, baseY)
  context.bezierCurveTo(baseX - bend, baseY - height * 0.35, baseX + bend, baseY - height * 0.7, baseX + bend * 0.35, topY)
  context.stroke()

  context.strokeStyle = 'rgba(245, 255, 231, 0.28)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(baseX - 1, baseY - 4)
  context.bezierCurveTo(baseX - bend - 1, baseY - height * 0.36, baseX + bend - 1, baseY - height * 0.72, baseX + bend * 0.35 - 1, topY + 4)
  context.stroke()

  if (genome.stemStyle === 'branching') {
    drawBranch(context, baseX, baseY - height * 0.52, -30, -32, genome.leafColor, wilt)
    drawBranch(context, baseX + 8, baseY - height * 0.66, 32, -34, genome.leafColor, wilt)
  }

  drawLeaves(context, plant, baseX, baseY, height, bend, wilt)

  if (plant.stage === 'bud' || plant.stage === 'bloom') {
    drawFlower(context, plant, baseX + bend * 0.35, topY, plant.stage === 'bloom' ? 0.92 : 0.42)
  }

  drawDecorations(context, plant)
}

function drawLeaves(
  context: CanvasRenderingContext2D,
  plant: PlantState,
  baseX: number,
  baseY: number,
  height: number,
  bend: number,
  wilt: number,
) {
  const genome = plant.genome
  const count = Math.max(3, Math.round(4 + genome.density * 6 + plant.growth * 0.22))

  for (let index = 0; index < count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const progress = 0.22 + (index / count) * 0.68
    const x = baseX + bend * progress + side * (18 + (index % 3) * 7)
    const y = baseY - height * progress + wilt * 22
    const size = 15 + genome.density * 13 - wilt * 5
    drawLeaf(context, x, y, size, side, genome.leafShape, withVitality(genome.leafColor, props.vitality, 0.9))
  }
}

function drawBranch(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: HslColor,
  wilt: number,
) {
  context.strokeStyle = withVitality(color, props.vitality, 0.58)
  context.lineWidth = 3.2 - wilt
  context.beginPath()
  context.moveTo(x, y)
  context.quadraticCurveTo(x + dx * 0.52, y + dy * 0.18, x + dx, y + dy)
  context.stroke()
}

function drawLeaf(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  side: number,
  shape: PlantState['genome']['leafShape'],
  color: string,
) {
  context.save()
  context.translate(x, y)
  context.rotate(side * -0.55)
  const leafGradient = context.createLinearGradient(-size, -size, size, size)
  leafGradient.addColorStop(0, color)
  leafGradient.addColorStop(0.76, 'rgba(226, 244, 210, 0.72)')
  leafGradient.addColorStop(1, 'rgba(255, 250, 220, 0.42)')
  context.fillStyle = leafGradient
  context.strokeStyle = 'rgba(52, 77, 49, 0.1)'
  context.lineWidth = 1
  context.beginPath()

  if (shape === 'heart') {
    context.moveTo(0, size * 0.48)
    context.bezierCurveTo(-size, -size * 0.2, -size * 0.2, -size, 0, -size * 0.28)
    context.bezierCurveTo(size * 0.2, -size, size, -size * 0.2, 0, size * 0.48)
  } else if (shape === 'long') {
    context.ellipse(0, 0, size * 0.42, size, 0, 0, Math.PI * 2)
  } else if (shape === 'split') {
    context.moveTo(0, -size)
    context.bezierCurveTo(-size * 0.9, -size * 0.2, -size * 0.42, size * 0.8, 0, size)
    context.bezierCurveTo(size * 0.42, size * 0.8, size * 0.9, -size * 0.2, 0, -size)
  } else {
    context.ellipse(0, 0, size * 0.72, size * 0.9, 0, 0, Math.PI * 2)
  }

  context.fill()
  context.stroke()
  context.strokeStyle = 'rgba(248, 255, 236, 0.38)'
  context.lineWidth = 1.4
  context.beginPath()
  context.moveTo(0, size * 0.55)
  context.quadraticCurveTo(side * size * 0.18, 0, 0, -size * 0.72)
  context.stroke()
  context.restore()
}

function drawFlower(context: CanvasRenderingContext2D, plant: PlantState, x: number, y: number, scale: number) {
  const color = hsl(plant.genome.flowerColor)
  const petals = plant.genome.flowerType === 'cluster' ? 8 : plant.genome.flowerType === 'bell' ? 5 : 6

  context.save()
  context.translate(x, y)
  context.scale(scale * 1.06, scale * 1.06)

  const halo = context.createRadialGradient(0, 0, 4, 0, 0, 42)
  halo.addColorStop(0, 'rgba(255, 243, 198, 0.42)')
  halo.addColorStop(1, 'rgba(255, 243, 198, 0)')
  context.fillStyle = halo
  context.beginPath()
  context.arc(0, 0, 42, 0, Math.PI * 2)
  context.fill()

  for (let index = 0; index < petals; index += 1) {
    context.rotate((Math.PI * 2) / petals)
    const petalGradient = context.createLinearGradient(0, -30, 0, 2)
    petalGradient.addColorStop(0, 'rgba(255, 250, 234, 0.94)')
    petalGradient.addColorStop(0.68, color)
    petalGradient.addColorStop(1, 'rgba(255, 233, 202, 0.72)')
    context.fillStyle = petalGradient
    context.beginPath()
    context.ellipse(0, -17, 7.5, 20, 0, 0, Math.PI * 2)
    context.fill()
  }

  context.fillStyle = '#f5d784'
  context.beginPath()
  context.arc(0, 0, 8, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(117, 86, 45, 0.22)'
  context.beginPath()
  context.arc(0, 1, 3, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawDecorations(context: CanvasRenderingContext2D, plant: PlantState) {
  plant.genome.decorations.forEach((decoration, index) => {
    const x = 62 + ((decoration.seed + index * 37) % 196)
    const y = 54 + ((decoration.seed + index * 29) % 142)

    if (decoration.kind === 'dew') {
      context.fillStyle = 'rgba(186, 226, 231, 0.62)'
      context.beginPath()
      context.arc(x, y, 3.4, 0, Math.PI * 2)
      context.fill()
      return
    }

    if (decoration.kind === 'coffeeBean') {
      context.fillStyle = 'rgba(111, 77, 59, 0.76)'
      context.beginPath()
      context.ellipse(x, y, 4, 6.5, 0.4, 0, Math.PI * 2)
      context.fill()
      return
    }

    context.fillStyle = decoration.kind === 'sunDot' ? 'rgba(244, 201, 102, 0.66)' : decoration.kind === 'star' ? 'rgba(245, 226, 168, 0.7)' : 'rgba(214, 126, 142, 0.56)'
    context.beginPath()
    context.arc(x, y, 4.2, 0, Math.PI * 2)
    context.fill()
  })
}

function withVitality(color: HslColor, vitality: number, alpha: number) {
  const ratio = vitality / 100
  const h = color.h - (1 - ratio) * 28
  const s = color.s * (0.52 + ratio * 0.48)
  const l = color.l * (0.76 + ratio * 0.24)

  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`
}

function hsl(color: HslColor) {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}
</script>

<template>
  <canvas ref="canvas" class="pet-canvas" aria-label="花盆桌宠" />
</template>

<style scoped>
.pet-canvas {
  display: block;
  inline-size: clamp(220px, min(88vw, 70vh), 520px);
  max-inline-size: 100%;
  block-size: auto;
}
</style>
