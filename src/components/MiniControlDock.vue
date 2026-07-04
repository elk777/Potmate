<script setup lang="ts">
type MiniControlTab = 'status' | 'gallery' | 'settings'

const props = defineProps<{
  expanded: boolean
  growthValue: number
  growthTarget: number
  todayCareCount: number
  todayGrowthDone: boolean
  storageLabel: string
  recordCount: number
  nutrientCount: number
}>()

const emit = defineEmits<{
  toggleExpanded: []
  openFull: [tab: MiniControlTab]
}>()

const tabs: Array<{ key: MiniControlTab; label: string }> = [
  { key: 'status', label: '状态' },
  { key: 'gallery', label: '图鉴' },
  { key: 'settings', label: '设置' },
]
</script>

<template>
  <div class="mini-control" :class="{ 'mini-control--expanded': props.expanded }" aria-label="迷你控制台">
    <section v-show="props.expanded" class="mini-control__drawer" aria-label="控制台摘要">
      <div class="mini-control__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="mini-control__tab"
          type="button"
          @click="emit('openFull', tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="mini-control__rows">
        <div class="mini-control__row">
          <span>成长进度</span>
          <strong>{{ props.growthValue }}/{{ props.growthTarget }}</strong>
        </div>
        <div class="mini-control__row">
          <span>{{ props.todayGrowthDone ? '今日成长已完成' : '今日还没成长' }}</span>
          <strong>{{ props.todayCareCount }} 次</strong>
        </div>
        <div class="mini-control__row">
          <span>{{ props.storageLabel }}</span>
          <strong>{{ props.recordCount }} 条</strong>
        </div>
      </div>

      <button class="mini-control__full" type="button" @click="emit('openFull', 'status')">
        完整控制台
      </button>
    </section>

    <section class="mini-control__capsule" aria-label="状态摘要">
      <span class="mini-control__chip" aria-label="成长进度">
        <svg viewBox="0 0 24 24" class="mini-control__icon" aria-hidden="true">
          <path d="M12 20V9M12 10c-4.2-.5-6.5-2.7-7-6.2 4 .1 6.2 2 7 6.2ZM12 12c3.8-.3 6.3-2.2 7.1-5.9-3.8-.1-6.3 1.8-7.1 5.9Z" />
        </svg>
        成长 {{ props.growthValue }}/{{ props.growthTarget }}
      </span>
      <span class="mini-control__chip" aria-label="今日浇水">
        <svg viewBox="0 0 24 24" class="mini-control__icon" aria-hidden="true">
          <path d="M12 3.6c3.3 4.2 5.2 7.2 5.2 10.1a5.2 5.2 0 0 1-10.4 0C6.8 10.8 8.7 7.8 12 3.6Z" />
        </svg>
        {{ props.todayGrowthDone ? '今日已浇' : '待浇水' }}
      </span>
      <span class="mini-control__care">{{ props.todayCareCount }} 次照料</span>
      <button class="mini-control__gear" type="button" aria-label="展开迷你控制台" @click="emit('toggleExpanded')">
        <svg viewBox="0 0 24 24" class="mini-control__gear-icon" aria-hidden="true">
          <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
          <path d="m4.9 13.6-.5-3.1 2.3-.9.8-1.4-.4-2.4 2.9-1.1 1.5 1.9h1.6l1.5-1.9 2.9 1.1-.4 2.4.8 1.4 2.3.9-.5 3.1-2.4.4-.9 1.3.1 2.5-3 1-1.3-2h-1.6l-1.3 2-3-1 .1-2.5-.9-1.3-2.4-.4Z" />
        </svg>
      </button>
    </section>
  </div>
</template>

<style scoped>
.mini-control {
  display: grid;
  justify-items: center;
  gap: 7px;
  inline-size: min(260px, calc(100vw - 18px));
  pointer-events: auto;
}

.mini-control__drawer,
.mini-control__capsule {
  box-sizing: border-box;
  border: 1px solid rgba(107, 138, 99, 0.18);
  color: #3b332a;
  background:
    linear-gradient(180deg, rgba(255, 254, 249, 0.96), rgba(250, 246, 235, 0.91)),
    rgba(255, 252, 244, 0.9);
  box-shadow:
    0 16px 34px rgba(88, 64, 38, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px);
}

.mini-control__capsule {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, auto) minmax(0, 1fr) 32px;
  align-items: center;
  gap: 5px;
  inline-size: 100%;
  min-block-size: 48px;
  padding: 7px 8px;
  border-radius: 999px;
}

.mini-control__chip,
.mini-control__care {
  display: inline-flex;
  align-items: center;
  min-inline-size: 0;
  white-space: nowrap;
}

.mini-control__chip {
  gap: 3px;
  color: #536f4d;
  font-size: 11px;
  font-weight: 800;
}

.mini-control__care {
  overflow: hidden;
  color: #746d64;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
}

.mini-control__icon,
.mini-control__gear-icon {
  inline-size: 15px;
  block-size: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mini-control__gear {
  display: grid;
  place-items: center;
  inline-size: 32px;
  block-size: 32px;
  border: 1px solid rgba(91, 73, 54, 0.12);
  border-radius: 999px;
  color: #6b6257;
  background: rgba(255, 252, 244, 0.74);
  cursor: pointer;
}

.mini-control__drawer {
  display: grid;
  gap: 5px;
  inline-size: min(232px, calc(100vw - 22px));
  max-block-size: calc(100vh - var(--mini-overlay-bottom, 152px) - 66px);
  padding: 7px;
  border-radius: 18px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(91, 73, 54, 0.2) transparent;
  transform: translateX(-10px);
}

.mini-control__drawer::-webkit-scrollbar {
  inline-size: 5px;
}

.mini-control__drawer::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(91, 73, 54, 0.18);
}

.mini-control__tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(222, 218, 203, 0.58);
}

.mini-control__tab {
  min-block-size: 24px;
  border: 0;
  border-radius: 999px;
  color: #5c5145;
  background: rgba(255, 252, 244, 0.52);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.mini-control__rows {
  display: grid;
  gap: 4px;
}

.mini-control__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-block-size: 24px;
  padding: 3px 7px;
  border-radius: 10px;
  background: rgba(238, 232, 216, 0.42);
  color: #746d64;
  font-size: 11px;
}

.mini-control__row strong {
  flex: 0 0 auto;
  color: #3b332a;
  font-size: 11px;
}

.mini-control__full {
  min-block-size: 24px;
  border: 1px solid rgba(71, 119, 93, 0.2);
  border-radius: 999px;
  color: #fdf9ed;
  background: #6f9368;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 245px) {
  .mini-control__capsule {
    grid-template-columns: minmax(0, 1fr) 32px;
  }

  .mini-control__chip:nth-of-type(2),
  .mini-control__care {
    display: none;
  }
}

@media (max-height: 340px) {
  .mini-control--expanded .mini-control__capsule {
    display: none;
  }

  .mini-control--expanded .mini-control__drawer {
    max-block-size: calc(100vh - var(--mini-overlay-bottom, 152px) - 12px);
    transform: none;
  }

  .mini-control--expanded .mini-control__full {
    display: none;
  }
}
</style>
