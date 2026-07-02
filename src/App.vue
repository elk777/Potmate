<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import DesktopReadinessPanel from './components/DesktopReadinessPanel.vue'
import GalleryPanel from './components/GalleryPanel.vue'
import MemoryList from './components/MemoryList.vue'
import PetCanvas from './components/PetCanvas.vue'
import RecordPanel from './components/RecordPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useActivitySignal } from './composables/useActivitySignal'
import { usePetGarden } from './composables/usePetGarden'
import { usePetSurfacePassThrough } from './composables/usePetSurfacePassThrough'
import type { MoodTag } from './domain/types'

type PanelTab = 'record' | 'status' | 'gallery' | 'settings'

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
let closeTimer: number | null = null
let dragStart: { x: number; y: number } | null = null
let panelResizeStart: { y: number; height: number } | null = null

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
const growthTarget = 10
const growthValue = computed(() => Math.min(plant.value?.growth ?? 0, growthTarget))
const growthPercent = computed(() => Math.round((growthValue.value / growthTarget) * 100))
const progressTitle = computed(() => {
  if (!plant.value) return '空花盆'
  if (plant.value.stage === 'bloom') return '已经盛放'

  return `${growthValue.value}/${growthTarget} 次浇水`
})
const progressHint = computed(() => {
  if (!plant.value) return '写下第一件小事后，这里会记录植物成长。'
  if (plant.value.stage === 'bloom') return '可以在图鉴里结种收藏，开始下一株。'

  return `还差 ${Math.max(growthTarget - growthValue.value, 0)} 次记录到盛放。`
})
const storageLabel = computed(() => (desktopStatus.value.storeAvailable ? '文件存储' : '本地存储'))
const popoverStyle = computed(() =>
  isConsoleOpen.value
    ? { '--console-panel-height': `${consolePanelHeight.value}px` }
    : undefined,
)

const { globalActivityError, globalActivityStatus } = useActivitySignal(
  recordActivity,
  computed(() => settings.value.activityMode),
)
usePetSurfacePassThrough(computed(() => settings.value.petSurfacePassThrough))

onUnmounted(() => {
  finishConsolePanelResize()
})

function handleSubmitRecord(payload: { text: string; mood: MoodTag | null }) {
  addRecord(payload.text, payload.mood)
  panelOpen.value = false
}

async function handleExportData() {
  const filename = await exportGardenData()
  exportMessage.value = filename ? `已导出 ${filename}` : '已取消导出'
  window.setTimeout(() => {
    exportMessage.value = ''
  }, 2800)
}

async function handleImportData() {
  const imported = await importGardenData()
  exportMessage.value = imported ? '备份已导入' : '没有导入备份'
  window.setTimeout(() => {
    exportMessage.value = ''
  }, 2800)
}

async function handleSendReminder() {
  const sent = await maybeSendDailyReminder()
  exportMessage.value = sent ? '提醒已发送' : '今天已经提醒过或通知未授权'
  window.setTimeout(() => {
    exportMessage.value = ''
  }, 2800)
}

function openPanel(tab: PanelTab = 'record') {
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
  activeTab.value = tab
  panelOpen.value = true
}

function scheduleClosePanel() {
  if (closeTimer !== null) window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    panelOpen.value = false
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
  const viewportHeight = window.innerHeight || 720
  const maxHeight = Math.max(320, viewportHeight - 170)

  return Math.min(Math.max(height, 300), maxHeight)
}

function resizeConsolePanel(event: PointerEvent) {
  if (!panelResizeStart) return

  const delta = panelResizeStart.y - event.clientY
  consolePanelHeight.value = clampConsolePanelHeight(panelResizeStart.height + delta)
}

function finishConsolePanelResize() {
  panelResizeStart = null
  window.removeEventListener('pointermove', resizeConsolePanel)
  window.removeEventListener('pointerup', finishConsolePanelResize)
  window.removeEventListener('pointercancel', finishConsolePanelResize)
}

function startConsolePanelResize(event: PointerEvent) {
  if (event.button !== 0) return

  cancelClosePanel()
  panelResizeStart = {
    y: event.clientY,
    height: consolePanelHeight.value,
  }
  window.addEventListener('pointermove', resizeConsolePanel)
  window.addEventListener('pointerup', finishConsolePanelResize)
  window.addEventListener('pointercancel', finishConsolePanelResize)
}

async function startResizeDrag(event: PointerEvent) {
  if (event.button !== 0 || !isTauri()) return

  try {
    await getCurrentWindow().startResizeDragging('SouthEast')
  } catch {
    // Native resize is best-effort; the window can still be resized from its edge.
  }
}
</script>

<template>
  <main
    class="app-shell"
    :class="{ 'app-shell--open': panelOpen }"
    @pointerenter="cancelClosePanel"
    @pointerleave="scheduleClosePanel"
  >
    <section
      v-show="panelOpen"
      class="pet-popover"
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

      <p v-if="exportMessage" class="pet-popover__toast">{{ exportMessage }}</p>
    </section>

    <section
      class="pet-stage"
      data-tauri-drag-region
      aria-label="桌宠花盆"
      @click="openPanel('record')"
      @pointerenter="openPanel('record')"
      @pointerdown="rememberDragStart"
      @pointermove="maybeStartWindowDrag"
      @pointerup="clearDragStart"
      @pointercancel="clearDragStart"
    >
      <PetCanvas :plant="plant" :vitality="liveVitality" />
    </section>

    <button
      class="resize-grip"
      type="button"
      aria-label="缩放窗口"
      title="拖动缩放"
      @pointerdown.stop.prevent="startResizeDrag"
    />
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
  padding: clamp(10px, 2.2vh, 18px) clamp(10px, 2.6vw, 22px) clamp(16px, 3vh, 30px);
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

.pet-popover {
  position: absolute;
  z-index: 5;
  inset-block-end: clamp(220px, 39vh, 348px);
  inset-inline-start: 50%;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 8px;
  inline-size: min(500px, calc(100vw - clamp(22px, 8vw, 52px)));
  max-block-size: min(250px, calc(100vh - 246px));
  padding: clamp(10px, 2.2vw, 14px);
  border: 1px solid rgba(119, 97, 67, 0.16);
  border-radius: clamp(16px, 4vw, 24px);
  overflow: visible;
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
  --console-bottom-gap: clamp(214px, 32vh, 318px);
  inset-block-end: var(--console-bottom-gap);
  block-size: min(var(--console-panel-height, 430px), calc(100vh - var(--console-bottom-gap) - 18px));
  max-block-size: calc(100vh - var(--console-bottom-gap) - 18px);
  overflow: visible;
}

.pet-popover__height-grip {
  position: absolute;
  z-index: 8;
  inset-block-start: -13px;
  inset-inline-start: 50%;
  inline-size: 88px;
  block-size: 24px;
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
  inset-block-start: 8px;
  inset-inline-start: 50%;
  inline-size: 46px;
  block-size: 5px;
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
  min-inline-size: 70px;
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

.pet-popover__toast {
  position: absolute;
  inset-inline: 14px;
  inset-block-end: 10px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  color: #fdf9ed;
  background: rgba(47, 42, 36, 0.84);
  font-size: 12px;
  text-align: center;
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

.resize-grip {
  position: absolute;
  z-index: 7;
  inset-inline-end: 0;
  inset-block-end: 0;
  inline-size: 48px;
  block-size: 48px;
  border: 0;
  border-radius: 999px 0 0 0;
  background: transparent;
  cursor: nwse-resize;
  opacity: 0.68;
  touch-action: none;
}

.resize-grip::before {
  content: "";
  position: absolute;
  inset-inline-end: 8px;
  inset-block-end: 8px;
  inline-size: 26px;
  block-size: 26px;
  background:
    linear-gradient(135deg, transparent 38%, rgba(102, 88, 72, 0.22) 39%, rgba(102, 88, 72, 0.22) 46%, transparent 47%),
    linear-gradient(135deg, transparent 56%, rgba(102, 88, 72, 0.32) 57%, rgba(102, 88, 72, 0.32) 64%, transparent 65%);
}

.resize-grip:hover {
  opacity: 0.9;
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
    inset-block-end: 176px;
    max-block-size: min(216px, calc(100vh - 198px));
  }

  .pet-popover--console {
    --console-bottom-gap: clamp(144px, 34vh, 180px);
    block-size: min(var(--console-panel-height, 430px), calc(100vh - var(--console-bottom-gap) - 18px));
  }
}
</style>
