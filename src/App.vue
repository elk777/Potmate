<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import DesktopReadinessPanel from './components/DesktopReadinessPanel.vue'
import GalleryPanel from './components/GalleryPanel.vue'
import MemoryList from './components/MemoryList.vue'
import MiniControlDock from './components/MiniControlDock.vue'
import MiniRecordBubble from './components/MiniRecordBubble.vue'
import PetActionArc, { type PetActionKey } from './components/PetActionArc.vue'
import PetCanvas from './components/PetCanvas.vue'
import RecordPanel from './components/RecordPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useActivitySignal } from './composables/useActivitySignal'
import { usePetGarden } from './composables/usePetGarden'
import { usePetSurfacePassThrough } from './composables/usePetSurfacePassThrough'
import type { MoodTag } from './domain/types'

type PanelTab = 'record' | 'status' | 'gallery' | 'settings'
type MiniOverlay = 'record' | 'console'

const BASE_WINDOW_WIDTH = 380
const BASE_WINDOW_HEIGHT = 560
const DEFAULT_PET_SCALE = 0.58
const MINI_PET_SCALE_BREAKPOINT = 0.52
const MIN_WINDOW_WIDTH = 190
const MIN_WINDOW_HEIGHT = 250
const MIN_PET_SCALE = 0.34
const MAX_PET_SCALE = 1.35
const RESIZE_SCALE_STEP = 560
const PANEL_SIDE_GAP = 12
const PANEL_TOP_GAP = 12
const PANEL_TARGET_WIDTH = 360
const PANEL_MIN_WIDTH = 300
const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const {
  garden,
  activityBoost,
  canArchivePlant,
  currentPlantRecords,
  desktopStatus,
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
  updateSettings,
} = usePetGarden()

const activeTab = shallowRef<PanelTab>('record')
const consolePanelHeight = shallowRef(430)
const exportMessage = shallowRef('')
const panelOpen = shallowRef(false)
const arcOpen = shallowRef(false)
const miniOverlay = shallowRef<MiniOverlay | null>(null)
const miniControlExpanded = shallowRef(false)
const petScale = shallowRef(DEFAULT_PET_SCALE)
const viewportSize = shallowRef({ width: 380, height: 560 })
const petCanvasRef = useTemplateRef<InstanceType<typeof PetCanvas>>('petCanvas')
let closeTimer: number | null = null
let arcCloseTimer: number | null = null
let messageTimer: number | null = null
let dragStart: { x: number; y: number } | null = null
let panelResizeStart: { y: number; height: number; pointerId: number; target: HTMLElement } | null = null
let windowResizeStart: {
  centerX: number
  centerY: number
  distance: number
  width: number
  height: number
  scale: number
  pointerId: number
  target: HTMLElement
} | null = null
let pendingWindowResize = false
let latestWindowSize: { width: number; height: number } | null = null

const plant = computed(() => garden.value.plant)
const settings = computed(() => garden.value.settings)
const stageLabel = computed(() => {
  const stage = plant.value?.stage ?? 'empty'
  const labels = {
    empty: '空花盆',
    sprout: '发芽',
    seedling: '幼苗',
    adult: '成株',
    bud: '花苞',
    bloom: '绽放',
  }

  return labels[stage]
})
const titleLabel = computed(() => {
  if (pendingSeed.value && !plant.value) return `种下 ${pendingSeed.value.name}`
  if (todayRecord.value) return '今天已经留下了一片叶子'

  return '写下一件小事'
})
const isConsoleOpen = computed(() => activeTab.value !== 'record')
const isMiniPetMode = computed(
  () => petScale.value <= MINI_PET_SCALE_BREAKPOINT || viewportSize.value.width <= 260 || viewportSize.value.height <= 380,
)
const hasOpenOverlay = computed(() => panelOpen.value || miniOverlay.value !== null)
const growthTarget = 10
const growthValue = computed(() => Math.min(plant.value?.growth ?? 0, growthTarget))
const growthPercent = computed(() => Math.round((growthValue.value / growthTarget) * 100))
const progressTitle = computed(() => {
  if (!plant.value) return '空花盆'
  if (plant.value.stage === 'bloom') return '已经盛放'

  return `成长值 ${growthValue.value}/${growthTarget}`
})
const currentPlantTodayRecords = computed(() => {
  const today = todayRecord.value?.date
  if (!plant.value || !today) return []

  return currentPlantRecords.value.filter((record) => record.date === today)
})
const todayGrowthDone = computed(() => {
  const today = todayRecord.value?.date
  if (!plant.value || !today) return false

  return plant.value.wateredDates.includes(today)
})
const progressHint = computed(() => {
  if (!plant.value) return '写下第一件小事后，这里会记录植物成长。'
  if (plant.value.stage === 'bloom') return '可以在图鉴里结种收藏，开始下一株。'
  if (todayGrowthDone.value) return '今天的成长值已完成；继续描述会补水、保留养分，明天再涨 1 格。'

  return `每天第一条描述成长 1 格，还差 ${Math.max(growthTarget - growthValue.value, 0)} 格到盛放。`
})
const storageLabel = computed(() => (desktopStatus.value.storeAvailable ? '文件存储' : '本地存储'))
const petMemories = computed(() =>
  currentPlantRecords.value
    .slice(0, 3)
    .map((record) => record.text)
    .filter((text) => text.length > 0),
)
const petUiScale = computed(() => clampNumber(petScale.value, 0.62, 1))
const petPanelScale = computed(() => clampNumber(petScale.value, 0.68, 1))
const scaledPx = (value: number, scale: number) => `${Math.round(value * scale)}px`
const growthUnit = computed(() => clampNumber(growthValue.value / growthTarget, 0, 1))
const petCanvasHeight = computed(() => 520 * petScale.value * (380 / 360))
const panelTargetWidth = computed(() => {
  const availableWidth = Math.max(120, viewportSize.value.width - PANEL_SIDE_GAP * 2)
  const comfortableWidth = clampNumber(availableWidth, Math.min(PANEL_MIN_WIDTH, availableWidth), PANEL_TARGET_WIDTH)

  return Math.round(comfortableWidth)
})
const desiredPopoverBottom = computed(() => {
  const clearanceRatio = 0.42 + growthUnit.value * 0.22

  return Math.round(petCanvasHeight.value * clearanceRatio + 18)
})
const popoverBottomPx = computed(() => {
  const maxBottom = viewportSize.value.height - 132 - PANEL_TOP_GAP
  const safeMaxBottom = Math.max(96, maxBottom)

  return Math.round(clampNumber(desiredPopoverBottom.value, 96, safeMaxBottom))
})
const popoverMaxHeight = computed(() => {
  const availableHeight = viewportSize.value.height - popoverBottomPx.value - PANEL_TOP_GAP

  return Math.round(Math.max(132, availableHeight))
})
const popoverStyle = computed(() =>
  isConsoleOpen.value
    ? { '--console-panel-height': `${consolePanelHeight.value}px` }
    : undefined,
)
const appStyle = computed(() => ({
  '--pet-scale': petScale.value.toFixed(3),
  '--pet-ui-scale': petUiScale.value.toFixed(3),
  '--pet-panel-scale': petPanelScale.value.toFixed(3),
  '--pet-canvas-size': scaledPx(520, petScale.value),
  '--pet-canvas-min-size': scaledPx(150, petScale.value),
  '--pet-popover-bottom': `${popoverBottomPx.value}px`,
  '--pet-popover-width': `${panelTargetWidth.value}px`,
  '--pet-popover-max-height': `${popoverMaxHeight.value}px`,
  '--pet-popover-padding': '14px',
  '--pet-popover-gap': '8px',
  '--console-bottom-gap': `${popoverBottomPx.value}px`,
  '--mini-overlay-bottom': `${popoverBottomPx.value}px`,
  '--resize-corner-size': scaledPx(76, petUiScale.value),
  '--resize-corner-padding': scaledPx(7, petUiScale.value),
  '--resize-grip-size': scaledPx(48, petUiScale.value),
  '--resize-grip-line-size': scaledPx(28, petUiScale.value),
  '--resize-grip-line-offset': scaledPx(7, petUiScale.value),
}))
const stageStyle = computed(() => ({ '--pet-scale': petScale.value.toFixed(3) }))

const { globalActivityError, globalActivityStatus } = useActivitySignal(
  recordActivity,
  computed(() => settings.value.activityMode),
)
usePetSurfacePassThrough(computed(() => settings.value.petSurfacePassThrough))

function syncViewportSize() {
  viewportSize.value = {
    width: window.innerWidth || BASE_WINDOW_WIDTH,
    height: window.innerHeight || BASE_WINDOW_HEIGHT,
  }
}

function getPetWindowSize(scale = petScale.value) {
  return {
    width: Math.max(MIN_WINDOW_WIDTH, Math.round(BASE_WINDOW_WIDTH * scale)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.round(BASE_WINDOW_HEIGHT * scale)),
  }
}

function resizeNativeWindow(size: { width: number; height: number }) {
  if (!isTauri()) return

  void getCurrentWindow().setSize(new LogicalSize(size.width, size.height))
}

onMounted(() => {
  syncViewportSize()
  window.addEventListener('resize', syncViewportSize)

  resizeNativeWindow(getPetWindowSize(DEFAULT_PET_SCALE))
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportSize)
  if (closeTimer !== null) window.clearTimeout(closeTimer)
  if (arcCloseTimer !== null) window.clearTimeout(arcCloseTimer)
  if (messageTimer !== null) window.clearTimeout(messageTimer)
  finishConsolePanelResize()
  finishWindowResize()
})

function handleSubmitRecord(payload: { text: string; mood: MoodTag | null }) {
  const beforeGrowth = plant.value?.growth ?? 0
  addRecord(payload.text, payload.mood)
  const afterGrowth = plant.value?.growth ?? 0
  const grew = afterGrowth > beforeGrowth

  clearToast()
  petCanvasRef.value?.water(grew ? '喝到水啦' : '今天也喝饱啦')
  panelOpen.value = false
  miniOverlay.value = null
  miniControlExpanded.value = false
}

async function handleExportData() {
  const filename = await exportGardenData()
  showToast(filename ? `已导出 ${filename}` : '已取消导出')
}

async function handleImportData() {
  const imported = await importGardenData()
  showToast(imported ? '备份已导入' : '没有导入备份')
}

async function handleSendReminder() {
  const sent = await maybeSendDailyReminder()
  showToast(sent ? '提醒已发送' : '今天已经提醒过或通知未授权')
}

function showToast(message: string) {
  if (messageTimer !== null) window.clearTimeout(messageTimer)
  exportMessage.value = message
  messageTimer = window.setTimeout(() => {
    exportMessage.value = ''
    messageTimer = null
  }, 2800)
}

function clearToast() {
  if (messageTimer !== null) {
    window.clearTimeout(messageTimer)
    messageTimer = null
  }
  exportMessage.value = ''
}

function openPanel(tab: PanelTab = 'record') {
  closeArc()
  miniOverlay.value = null
  miniControlExpanded.value = false
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
  activeTab.value = tab
  panelOpen.value = true
}

function openMiniOverlay(overlay: MiniOverlay) {
  closeArc()
  cancelClosePanel()
  panelOpen.value = false
  miniOverlay.value = overlay
  miniControlExpanded.value = overlay === 'console' ? miniControlExpanded.value : false
}

function openFullPanelFromMini(tab: PanelTab) {
  miniOverlay.value = null
  miniControlExpanded.value = false
  openPanel(tab)
}

function closeArc() {
  if (arcCloseTimer !== null) {
    window.clearTimeout(arcCloseTimer)
    arcCloseTimer = null
  }
  arcOpen.value = false
}

function openArc() {
  if (hasOpenOverlay.value) return
  if (arcCloseTimer !== null) {
    window.clearTimeout(arcCloseTimer)
    arcCloseTimer = null
  }
  arcOpen.value = true
}

function scheduleCloseArc() {
  if (arcCloseTimer !== null) window.clearTimeout(arcCloseTimer)
  arcCloseTimer = window.setTimeout(() => {
    arcOpen.value = false
  }, 700)
}

function handleArcAction(key: PetActionKey) {
  closeArc()
  switch (key) {
    case 'record':
      if (isMiniPetMode.value) openMiniOverlay('record')
      else openPanel('record')
      break
    case 'console':
      if (isMiniPetMode.value) openMiniOverlay('console')
      else openPanel('status')
      break
    case 'pet':
      petCanvasRef.value?.petHead()
      break
    case 'poke':
      petCanvasRef.value?.poke()
      break
    case 'memory':
      petCanvasRef.value?.showMemory()
      break
    case 'butterfly':
      petCanvasRef.value?.summonButterfly()
      break
  }
}

function scheduleClosePanel() {
  if (closeTimer !== null) window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    panelOpen.value = false
    miniOverlay.value = null
    miniControlExpanded.value = false
  }, 900)
}

function cancelClosePanel() {
  if (closeTimer === null) return

  window.clearTimeout(closeTimer)
  closeTimer = null
}

function rememberDragStart(event: PointerEvent) {
  if (event.button !== 0) return

  dragStart = { x: event.clientX, y: event.clientY }
}

async function maybeStartWindowDrag(event: PointerEvent) {
  if (!dragStart || !isTauri()) return

  const distance = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y)
  if (distance < 6) return

  dragStart = null
  try {
    await getCurrentWindow().startDragging()
  } catch {
    // Dragging is best-effort; clicking still opens the record panel.
  }
}

function clearDragStart() {
  dragStart = null
}

function clampConsolePanelHeight(height: number) {
  const maxHeight = Math.max(132, viewportSize.value.height - popoverBottomPx.value - PANEL_TOP_GAP)
  const minHeight = Math.min(240, maxHeight)

  return clampNumber(height, minHeight, maxHeight)
}

function resizeConsolePanel(event: PointerEvent) {
  if (!panelResizeStart) return

  event.preventDefault()
  const delta = (panelResizeStart.y - event.clientY) / Math.max(petPanelScale.value, 0.1)
  consolePanelHeight.value = clampConsolePanelHeight(panelResizeStart.height + delta)
}

function finishConsolePanelResize() {
  if (panelResizeStart) {
    try {
      panelResizeStart.target.releasePointerCapture(panelResizeStart.pointerId)
    } catch {
      // Pointer capture can already be released by the browser.
    }
  }
  panelResizeStart = null
  delete document.body.dataset.petPanelResizeActive
  window.removeEventListener('pointermove', resizeConsolePanel, { capture: true })
  window.removeEventListener('pointerup', finishConsolePanelResize, { capture: true })
  window.removeEventListener('pointercancel', finishConsolePanelResize, { capture: true })
}

function startConsolePanelResize(event: PointerEvent) {
  if (event.button !== 0) return

  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return

  cancelClosePanel()
  document.body.dataset.petPanelResizeActive = 'true'
  if (isTauri()) void getCurrentWindow().setIgnoreCursorEvents(false)
  panelResizeStart = {
    y: event.clientY,
    height: consolePanelHeight.value,
    pointerId: event.pointerId,
    target,
  }
  try {
    target.setPointerCapture(event.pointerId)
  } catch {
    // Window listeners below still drive resizing.
  }
  window.addEventListener('pointermove', resizeConsolePanel, { capture: true })
  window.addEventListener('pointerup', finishConsolePanelResize, { capture: true })
  window.addEventListener('pointercancel', finishConsolePanelResize, { capture: true })
}

function resizeWindowManually(event: PointerEvent) {
  if (!windowResizeStart) return

  event.preventDefault()
  const nextDistance = Math.hypot(event.clientX - windowResizeStart.centerX, event.clientY - windowResizeStart.centerY)
  const distanceScale = nextDistance / Math.max(windowResizeStart.distance, 1)
  const fallbackDelta = (event.clientX - windowResizeStart.centerX + event.clientY - windowResizeStart.centerY) / RESIZE_SCALE_STEP
  const nextScale = Number.isFinite(distanceScale)
    ? windowResizeStart.scale * distanceScale
    : windowResizeStart.scale + fallbackDelta
  petScale.value = clampNumber(nextScale, MIN_PET_SCALE, MAX_PET_SCALE)

  if (!isTauri()) return

  const sizeRatio = petScale.value / Math.max(windowResizeStart.scale, 0.01)
  latestWindowSize = {
    width: Math.max(MIN_WINDOW_WIDTH, Math.round(windowResizeStart.width * sizeRatio)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.round(windowResizeStart.height * sizeRatio)),
  }

  if (pendingWindowResize) return
  pendingWindowResize = true
  window.requestAnimationFrame(() => {
    pendingWindowResize = false
    if (!latestWindowSize) return

    const { width, height } = latestWindowSize
    void getCurrentWindow().setSize(new LogicalSize(width, height))
  })
}

function finishWindowResize() {
  if (windowResizeStart) {
    try {
      windowResizeStart.target.releasePointerCapture(windowResizeStart.pointerId)
    } catch {
      // Pointer capture can already be released by the browser.
    }
  }
  windowResizeStart = null
  latestWindowSize = null
  pendingWindowResize = false
  delete document.body.dataset.petResizeActive
  window.removeEventListener('pointermove', resizeWindowManually, { capture: true })
  window.removeEventListener('pointerup', finishWindowResize, { capture: true })
  window.removeEventListener('pointercancel', finishWindowResize, { capture: true })
}

function startResizeDrag(event: PointerEvent) {
  if (event.button !== 0) return

  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return

  closeArc()
  cancelClosePanel()
  document.body.dataset.petResizeActive = 'true'
  if (isTauri()) void getCurrentWindow().setIgnoreCursorEvents(false)
  const stage = document.querySelector('.pet-stage')
  const rect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : document.body.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  windowResizeStart = {
    centerX,
    centerY,
    distance: Math.hypot(event.clientX - centerX, event.clientY - centerY),
    width: window.innerWidth,
    height: window.innerHeight,
    scale: petScale.value,
    pointerId: event.pointerId,
    target,
  }
  try {
    target.setPointerCapture(event.pointerId)
  } catch {
    // Pointer capture is a convenience; window listeners below still drive resizing.
  }
  window.addEventListener('pointermove', resizeWindowManually, { capture: true })
  window.addEventListener('pointerup', finishWindowResize, { capture: true })
  window.addEventListener('pointercancel', finishWindowResize, { capture: true })
}
</script>

<template>
  <main
    class="app-shell"
    :class="{ 'app-shell--open': panelOpen }"
    :style="appStyle"
    @pointerenter="cancelClosePanel"
    @pointerleave="scheduleClosePanel"
  >
    <section
      v-show="miniOverlay !== null"
      class="mini-overlay"
      data-pass-through-control
      aria-label="迷你操作"
      @pointerenter="cancelClosePanel"
      @click.stop
    >
      <MiniRecordBubble
        v-if="miniOverlay === 'record'"
        @submit-record="handleSubmitRecord"
        @expand="openFullPanelFromMini('record')"
      />

      <MiniControlDock
        v-else-if="miniOverlay === 'console'"
        :expanded="miniControlExpanded"
        :growth-value="growthValue"
        :growth-target="growthTarget"
        :today-care-count="currentPlantTodayRecords.length"
        :today-growth-done="todayGrowthDone"
        :storage-label="storageLabel"
        :record-count="garden.records.length"
        :nutrient-count="currentPlantRecords.length"
        @toggle-expanded="miniControlExpanded = !miniControlExpanded"
        @open-full="openFullPanelFromMini"
      />
    </section>

    <section
      v-show="panelOpen"
      class="pet-popover"
      data-pass-through-control
      :class="{ 'pet-popover--console': isConsoleOpen }"
      :style="popoverStyle"
      aria-label="记录小事"
      @pointerenter="cancelClosePanel"
      @click.stop
    >
      <button
        v-show="isConsoleOpen"
        class="pet-popover__height-grip"
        type="button"
        aria-label="调整控制台高度"
        title="上下拖动调整控制台高度"
        @pointerdown.stop.prevent="startConsolePanelResize"
      />

      <div class="pet-popover__header">
        <div class="pet-popover__title-wrap">
          <p class="pet-popover__eyebrow">{{ isConsoleOpen ? '控制台' : '今日浇水' }}</p>
          <h1 class="pet-popover__title">{{ isConsoleOpen ? stageLabel : titleLabel }}</h1>
        </div>
        <div class="pet-popover__actions">
          <button
            class="pet-popover__link"
            type="button"
            @click="openPanel(isConsoleOpen ? 'record' : 'status')"
          >
            {{ isConsoleOpen ? '返回记录' : '控制台' }}
          </button>
          <button class="pet-popover__close" type="button" aria-label="收起" @click="panelOpen = false">
            ×
          </button>
        </div>
      </div>

      <div v-show="activeTab === 'record'" class="pet-popover__record">
        <RecordPanel compact @submit-record="handleSubmitRecord" />
      </div>

      <div v-show="activeTab !== 'record'" class="pet-popover__console">
        <div class="panel-tabs" aria-label="面板切换">
          <button
            class="panel-tabs__button"
            :class="{ 'panel-tabs__button--active': activeTab === 'status' }"
            type="button"
            @click="openPanel('status')"
          >
            状态
          </button>
          <button
            class="panel-tabs__button"
            :class="{ 'panel-tabs__button--active': activeTab === 'gallery' }"
            type="button"
            @click="openPanel('gallery')"
          >
            图鉴
          </button>
          <button
            class="panel-tabs__button"
            :class="{ 'panel-tabs__button--active': activeTab === 'settings' }"
            type="button"
            @click="openPanel('settings')"
          >
            设置
          </button>
        </div>

        <div v-show="activeTab === 'status'" class="pet-popover__status">
          <section class="progress-panel" aria-label="成长进度">
            <div class="progress-panel__main">
              <span class="progress-panel__label">成长进度</span>
              <strong class="progress-panel__value">{{ progressTitle }}</strong>
            </div>
            <div class="progress-panel__bar" aria-hidden="true">
              <span class="progress-panel__fill" :style="{ inlineSize: `${growthPercent}%` }" />
            </div>
            <p class="progress-panel__hint">{{ progressHint }}</p>
            <div class="progress-panel__meta">
              <span>今日照料 {{ currentPlantTodayRecords.length }} 次</span>
              <span>{{ todayGrowthDone ? '今日成长已完成' : '今日未成长' }}</span>
              <span>{{ storageLabel }}</span>
              <span>{{ garden.records.length }} 条记录</span>
              <span>{{ currentPlantRecords.length }} 条养分</span>
            </div>
          </section>

          <MemoryList :records="garden.records.slice(0, 8)" />
        </div>

        <GalleryPanel
          v-show="activeTab === 'gallery'"
          :gallery="garden.gallery"
          :seeds="garden.seeds"
          :pending-seed-id="garden.pendingSeedId"
          :can-archive-plant="canArchivePlant"
          @archive-plant="archiveBloomingPlant"
          @choose-seed="chooseSeed"
        />

        <div v-show="activeTab === 'settings'" class="pet-popover__settings">
          <DesktopReadinessPanel
            :desktop-status="desktopStatus"
            :global-activity-error="globalActivityError"
            :global-activity-status="globalActivityStatus"
            :settings="garden.settings"
          />

          <SettingsPanel
            :settings="garden.settings"
            :activity="garden.activity"
            :activity-boost="activityBoost"
            :desktop-status="desktopStatus"
            :global-activity-error="globalActivityError"
            :global-activity-status="globalActivityStatus"
            @update-settings="updateSettings"
            @export-data="handleExportData"
            @import-data="handleImportData"
            @send-reminder="handleSendReminder"
          />
        </div>
      </div>

    </section>

    <section
      class="pet-stage"
      :style="stageStyle"
      data-tauri-drag-region
      data-pass-through-stage
      aria-label="桌宠花盆"
      @click="openArc"
      @pointerenter="openArc"
      @pointerleave="scheduleCloseArc"
      @pointerdown="rememberDragStart"
      @pointermove="maybeStartWindowDrag"
      @pointerup="clearDragStart"
      @pointercancel="clearDragStart"
    >
      <PetCanvas ref="petCanvas" :plant="plant" :vitality="liveVitality" :memories="petMemories" />
      <PetActionArc data-pass-through-control :open="arcOpen" @action="handleArcAction" />
    </section>

    <div class="resize-corner" data-pass-through-control aria-label="缩放桌宠">
      <button
        class="resize-grip"
        type="button"
        aria-label="拖动缩放桌宠"
        title="拖动缩放"
        @pointerdown.stop.prevent="startResizeDrag"
      />
    </div>

    <p v-if="exportMessage" class="app-toast">{{ exportMessage }}</p>
  </main>
</template>

<style scoped>
.app-shell {
  box-sizing: border-box;
  min-block-size: 100vh;
  inline-size: 100vw;
  position: relative;
  display: grid;
  place-items: end center;
  padding: clamp(6px, 2vh, 14px) clamp(6px, 2.4vw, 16px) clamp(8px, 2.8vh, 20px);
  color: #2f2a24;
  background: transparent;
  overflow: hidden;
}

.app-shell--open {
  place-items: end center;
}

.pet-stage {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 100%;
  min-block-size: 0;
  touch-action: none;
  cursor: grab;
}

.pet-stage:active {
  cursor: grabbing;
}

.mini-overlay {
  position: absolute;
  z-index: 6;
  inset-block-end: var(--mini-overlay-bottom, 152px);
  inset-inline-start: 50%;
  box-sizing: border-box;
  display: grid;
  justify-items: center;
  max-block-size: calc(100vh - var(--mini-overlay-bottom, 152px) - 8px);
  max-inline-size: calc(100vw - 12px);
  overflow: visible;
  transform: translateX(-50%);
  pointer-events: auto;
}

.pet-popover {
  position: absolute;
  z-index: 5;
  inset-block-end: var(--pet-popover-bottom, 238px);
  inset-inline-start: 50%;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--pet-popover-gap, 8px);
  inline-size: min(var(--pet-popover-width, 360px), calc(100vw - 24px));
  max-block-size: min(var(--pet-popover-max-height, 250px), calc(100vh - 122px));
  padding: var(--pet-popover-padding, 14px);
  border: 1px solid rgba(119, 97, 67, 0.16);
  border-radius: clamp(16px, 4vw, 24px);
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 253, 246, 0.96), rgba(250, 245, 232, 0.92)),
    rgba(255, 252, 244, 0.92);
  box-shadow:
    0 18px 42px rgba(88, 64, 38, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px);
  container-type: inline-size;
  transform: translateX(-50%);
  transform-origin: 50% 100%;
}

.pet-popover--console {
  inset-block-end: var(--console-bottom-gap, 230px);
  block-size: min(var(--console-panel-height, 430px), calc(100vh - var(--console-bottom-gap, 230px) - 14px));
  max-block-size: calc(100vh - var(--console-bottom-gap, 230px) - 14px);
  overflow: hidden;
}

.pet-popover__height-grip {
  position: absolute;
  z-index: 8;
  inset-block-start: 0;
  inset-inline-start: 50%;
  inline-size: 128px;
  block-size: 20px;
  transform: translateX(-50%);
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: ns-resize;
  touch-action: none;
}

.pet-popover__height-grip::before {
  content: "";
  position: absolute;
  inset-block-start: 5px;
  inset-inline-start: 50%;
  inline-size: 58px;
  block-size: 6px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(109, 96, 76, 0.26);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72);
}

.pet-popover__height-grip:hover::before {
  background: rgba(80, 124, 90, 0.42);
}

.pet-popover__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
  min-block-size: 0;
  min-inline-size: 0;
}

.pet-popover__title-wrap {
  min-inline-size: 0;
}

.pet-popover__eyebrow {
  margin: 0 0 2px;
  color: #6d7d63;
  font-size: 12px;
  font-weight: 700;
}

.pet-popover__title {
  margin: 0;
  overflow: hidden;
  font-size: clamp(16px, 4.5cqw, 24px);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-popover__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  min-inline-size: 0;
}

.pet-popover__link,
.pet-popover__close {
  min-block-size: 32px;
  border: 1px solid rgba(91, 73, 54, 0.14);
  border-radius: 999px;
  color: #5c5145;
  background: rgba(255, 252, 244, 0.68);
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.pet-popover__link {
  min-inline-size: 0;
  padding: 0 10px;
}

.pet-popover__close {
  inline-size: 32px;
  padding: 0;
}

.pet-popover__record,
.pet-popover__console,
.pet-popover__status,
.pet-popover__settings {
  display: grid;
  gap: 8px;
  min-block-size: 0;
  min-inline-size: 0;
}

.pet-popover__record {
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(91, 73, 54, 0.22) transparent;
}

.pet-popover__console {
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.pet-popover__settings {
  overflow: auto;
  gap: 14px;
  align-content: start;
  padding-block-start: 2px;
  padding-block-end: 8px;
  padding-inline-end: 3px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(91, 73, 54, 0.22) transparent;
}

.pet-popover__status {
  overflow: auto;
  padding-block-end: 8px;
  padding-inline-end: 3px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(91, 73, 54, 0.22) transparent;
}

.pet-popover__settings::-webkit-scrollbar,
.pet-popover__status::-webkit-scrollbar,
.pet-popover__console::-webkit-scrollbar {
  inline-size: 6px;
}

.pet-popover__settings::-webkit-scrollbar-thumb,
.pet-popover__status::-webkit-scrollbar-thumb,
.pet-popover__console::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(91, 73, 54, 0.2);
}

.app-toast {
  position: absolute;
  z-index: 9;
  inset-inline-start: 50%;
  inset-block-end: clamp(88px, 18vh, 142px);
  box-sizing: border-box;
  max-inline-size: min(320px, calc(100vw - 32px));
  margin: 0;
  padding: 9px 12px;
  border: 1px solid rgba(255, 252, 244, 0.26);
  border-radius: 999px;
  color: #fdf9ed;
  background: rgba(47, 42, 36, 0.78);
  box-shadow: 0 10px 24px rgba(45, 35, 24, 0.18);
  backdrop-filter: blur(12px);
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.panel-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(222, 218, 203, 0.58);
}

.panel-tabs__button {
  min-block-size: 32px;
  border: 0;
  border-radius: 999px;
  color: #5c5145;
  background: transparent;
  font: inherit;
  font-size: clamp(13px, 4cqw, 16px);
  white-space: nowrap;
  cursor: pointer;
}

.panel-tabs__button--active {
  color: #2f2a24;
  background: rgba(255, 252, 244, 0.9);
  box-shadow: 0 2px 10px rgba(76, 55, 35, 0.1);
}

.progress-panel {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(238, 232, 216, 0.46);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.54);
}

.progress-panel__main {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  min-inline-size: 0;
}

.progress-panel__label {
  color: #707b62;
  font-size: 11px;
  font-weight: 700;
}

.progress-panel__value {
  overflow: hidden;
  color: #2f2a24;
  font-size: 15px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-panel__bar {
  overflow: hidden;
  block-size: 8px;
  border-radius: 999px;
  background: rgba(255, 252, 244, 0.82);
  box-shadow: inset 0 1px 3px rgba(80, 66, 48, 0.12);
}

.progress-panel__fill {
  display: block;
  block-size: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8fb79c, #d8c985);
}

.progress-panel__hint {
  margin: 0;
  color: #746d64;
  font-size: 11px;
  line-height: 1.35;
}

.progress-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.progress-panel__meta span {
  min-block-size: 22px;
  padding: 4px 7px;
  border-radius: 999px;
  color: #66715a;
  background: rgba(255, 252, 244, 0.62);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.resize-corner {
  position: absolute;
  z-index: 10;
  inset-inline-end: 0;
  inset-block-end: 0;
  inline-size: var(--resize-corner-size, 76px);
  block-size: var(--resize-corner-size, 76px);
  display: flex;
  align-items: end;
  justify-content: end;
  padding: 0 var(--resize-corner-padding, 7px) var(--resize-corner-padding, 7px) 0;
  border: 0;
  border-radius: 999px 0 0 0;
  background: transparent;
  pointer-events: auto;
}

.resize-grip {
  border: 0;
  color: #665848;
  background: transparent;
  pointer-events: auto;
}

.resize-grip {
  position: relative;
  inline-size: var(--resize-grip-size, 48px);
  block-size: var(--resize-grip-size, 48px);
  border-radius: 999px 0 0 0;
  background:
    radial-gradient(circle at 82% 82%, rgba(255, 252, 244, 0.34), rgba(255, 252, 244, 0.08) 58%, transparent 64%);
  box-shadow: none;
  cursor: nwse-resize;
  opacity: 0.36;
  touch-action: none;
  transition:
    opacity 160ms ease,
    background-color 160ms ease;
}

.resize-grip::before {
  content: "";
  position: absolute;
  inset-inline-end: var(--resize-grip-line-offset, 7px);
  inset-block-end: var(--resize-grip-line-offset, 7px);
  inline-size: var(--resize-grip-line-size, 28px);
  block-size: var(--resize-grip-line-size, 28px);
  background:
    linear-gradient(135deg, transparent 38%, rgba(102, 88, 72, 0.16) 39%, rgba(102, 88, 72, 0.16) 45%, transparent 46%),
    linear-gradient(135deg, transparent 55%, rgba(102, 88, 72, 0.22) 56%, rgba(102, 88, 72, 0.22) 62%, transparent 63%),
    linear-gradient(135deg, transparent 72%, rgba(102, 88, 72, 0.28) 73%, rgba(102, 88, 72, 0.28) 79%, transparent 80%);
}

.resize-grip:hover {
  opacity: 0.72;
  background-color: rgba(255, 252, 244, 0.16);
}

@container (max-width: 340px) {
  .pet-popover__header {
    gap: 8px;
  }

  .pet-popover__link {
    min-inline-size: 58px;
    padding-inline: 8px;
  }

  .pet-popover__close {
    inline-size: 30px;
  }
}

@media (max-height: 520px) {
  .pet-popover {
    max-block-size: min(var(--pet-popover-max-height, 216px), calc(100vh - 118px));
  }

  .pet-popover--console {
    block-size: min(var(--console-panel-height, 430px), calc(100vh - var(--console-bottom-gap, 230px) - 14px));
  }
}
</style>
