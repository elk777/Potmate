<script setup lang="ts">
import { computed } from 'vue'

export type PetActionKey = 'record' | 'pet' | 'poke' | 'memory' | 'butterfly' | 'console'

interface ArcAction {
  key: PetActionKey
  label: string
  icon: 'note' | 'pet' | 'poke' | 'memory' | 'butterfly' | 'console'
  hint: string
  tone: string
  accent: string
}

const props = defineProps<{
  open: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'action', key: PetActionKey): void
}>()

const actions: ArcAction[] = [
  { key: 'record', label: '描述', icon: 'note', hint: '写下一件小事', tone: '#fff4cd', accent: '#a9823f' },
  { key: 'pet', label: '抚摸', icon: 'pet', hint: '摸摸头', tone: '#fff7ee', accent: '#7b9b72' },
  { key: 'poke', label: '挑逗', icon: 'poke', hint: '戳一下', tone: '#f4faee', accent: '#6f9368' },
  { key: 'memory', label: '回忆', icon: 'memory', hint: '翻翻旧事', tone: '#f4fbff', accent: '#6f9368' },
  { key: 'butterfly', label: '招蝶', icon: 'butterfly', hint: '引来蝴蝶', tone: '#faf7ff', accent: '#7b9b72' },
  { key: 'console', label: '控制', icon: 'console', hint: '状态 · 图鉴 · 设置', tone: '#fffaf0', accent: '#7f7668' },
]

const ARC_START = -164
const ARC_END = -16
const RADIUS = 140

const placed = computed(() =>
  actions.map((action, index) => {
    const t = actions.length === 1 ? 0.5 : index / (actions.length - 1)
    const angleDeg = ARC_START + (ARC_END - ARC_START) * t
    const angle = (angleDeg * Math.PI) / 180
    const x = Math.cos(angle) * RADIUS
    const y = Math.sin(angle) * RADIUS
    return {
      ...action,
      style: {
        '--arc-x': `${x.toFixed(1)}px`,
        '--arc-y': `${y.toFixed(1)}px`,
        '--arc-delay': `${index * 32}ms`,
        '--arc-tone': action.tone,
        '--arc-accent': action.accent,
      } as Record<string, string>,
    }
  }),
)

function handleClick(key: PetActionKey) {
  if (props.disabled) return
  emit('action', key)
}
</script>

<template>
  <div class="action-arc" :class="{ 'action-arc--open': open }" :aria-hidden="!open">
    <button
      v-for="item in placed"
      :key="item.key"
      class="action-arc__item"
      type="button"
      :style="item.style"
      :title="item.hint"
      :aria-label="`${item.label} · ${item.hint}`"
      :tabindex="open ? 0 : -1"
      @pointerdown.stop
      @click.stop="handleClick(item.key)"
    >
      <span class="action-arc__icon" aria-hidden="true">
        <svg v-if="item.icon === 'note'" viewBox="0 0 40 40" class="action-arc__svg">
          <path class="action-arc__fill" d="M13 9.8h14.2c2.1 0 3.7 1.6 3.7 3.7v13.8c0 2.1-1.6 3.7-3.7 3.7H12.8c-2 0-3.6-1.6-3.6-3.7V13.5c0-2.1 1.7-3.7 3.8-3.7Z" />
          <path class="action-arc__line" d="M14 17h12M14 22h9.5M25.5 28l4.8-4.8" />
          <path class="action-arc__line action-arc__line--thick" d="M28.3 20.4l2.1 2.1" />
        </svg>
        <svg v-else-if="item.icon === 'pet'" viewBox="0 0 40 40" class="action-arc__svg">
          <path class="action-arc__fill" d="M15.4 17.8c.3-3.2 4.6-3.4 5.2-.4.8-2.5 4.3-2.1 4.7.7.5 3.8-3.1 7.4-7.6 9.5-4.3-2.1-7.3-5.8-6.5-9 .5-2 3.1-2.5 4.2-.8Z" />
          <path class="action-arc__line" d="M12.4 13.3c-.4-3.4 3.2-4 4.1-.9M20.4 11.5c.2-3.6 4.2-3.5 4.4.1M28 14c1.2-2.9 4.7-1.3 3.4 1.9" />
          <path class="action-arc__line action-arc__line--thick" d="M18.1 26.8c.6 2.2 3.5 2.1 4.1.1" />
        </svg>
        <svg v-else-if="item.icon === 'poke'" viewBox="0 0 40 40" class="action-arc__svg">
          <path class="action-arc__fill" d="M18.5 8.8c2.2 0 3.3 1.6 3.3 3.2v7.8l1.5-1.1c1.6-1.1 3.8-.4 4.4 1.5l.9 2.9c.6 1.9-.1 4-1.8 5.1l-4.1 2.7c-1.1.8-2.5 1.1-3.9.9l-4.4-.7c-1.2-.2-2.2-1-2.7-2.1l-2-4.5c-.6-1.4.1-3 1.5-3.5 1.1-.4 2.3 0 2.9.9l1.3 1.8V12c0-1.8 1.1-3.2 3.1-3.2Z" />
          <path class="action-arc__line" d="M21.8 20.1v3M15.4 23.7l1.9 2.3M27.9 9.7l2.8-2.8M29.4 15h4" />
        </svg>
        <svg v-else-if="item.icon === 'memory'" viewBox="0 0 40 40" class="action-arc__svg">
          <path class="action-arc__fill" d="M14.2 26.3c-4 0-7-2.7-7-6.3 0-3.4 2.8-6 6.4-6.2 1.3-2.7 4-4.4 7.4-4.4 4.4 0 7.8 2.8 8.2 6.6 2.3.8 3.7 2.8 3.7 5.2 0 3-2.4 5.1-5.8 5.1H14.2Z" />
          <path class="action-arc__line" d="M16 18.2h8M14.5 22.4h11" />
          <path class="action-arc__line action-arc__line--thick" d="M14.1 30.1h4.4M9.8 33.1h2" />
        </svg>
        <svg v-else-if="item.icon === 'butterfly'" viewBox="0 0 40 40" class="action-arc__svg">
          <path class="action-arc__fill" d="M19.4 19.7c-3.5-7.8-10.5-8.1-11.7-3.5-1 3.9 3.7 7.2 9.5 5.8-5.1 2.8-6.5 8.1-3.2 10 3.6 2.1 6.4-2.1 6.5-8 .2 5.9 3.1 10 6.6 7.9 3.2-1.9 1.8-7.1-3.3-9.9 5.8 1.4 10.4-1.9 9.4-5.8-1.2-4.6-8.1-4.3-11.7 3.5l-1.1 2.1-1-2.1Z" />
          <path class="action-arc__line" d="M20.5 18.5v9.3M17.6 13.8l-2.3-3.1M23.3 13.8l2.3-3.1" />
          <path class="action-arc__line action-arc__line--thick" d="M17 22.2c2 1.1 4.6 1.1 6.8 0" />
        </svg>
        <svg v-else viewBox="0 0 40 40" class="action-arc__svg">
          <path class="action-arc__fill" d="M19.9 10.1 22 13c.6.2 1.1.4 1.6.7l3.5-.7 2.6 4.4-2.2 2.8v1.8l2.2 2.8-2.6 4.4-3.5-.7c-.5.3-1 .5-1.6.7l-2.1 2.9h-5.1l-2.1-2.9c-.6-.2-1.1-.4-1.6-.7l-3.5.7L5 24.8l2.2-2.8v-1.8L5 17.4 7.6 13l3.5.7c.5-.3 1-.5 1.6-.7l2.1-2.9h5.1Z" />
          <circle class="action-arc__line" cx="17.4" cy="21.3" r="4" />
        </svg>
      </span>
      <span class="action-arc__label">{{ item.label }}</span>
    </button>

    <svg class="action-arc__vine" viewBox="-150 -126 300 128" aria-hidden="true">
      <path class="action-arc__vine-line" d="M-114 -9C-84 -78 -33 -106 0 -106S84 -78 114 -9" />
      <path class="action-arc__vine-leaf" d="M-49 -101c8-9 20-11 31-5-5 11-15 17-29 15" />
      <path class="action-arc__vine-leaf" d="M49 -101c-8-9-20-11-31-5 5 11 15 17 29 15" />
    </svg>
  </div>
</template>

<style scoped>
.action-arc {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 43%;
  inline-size: 0;
  block-size: 0;
  pointer-events: none;
  z-index: 4;
  transform: scale(var(--pet-ui-scale, 1));
  transform-origin: 0 0;
}

.action-arc__item {
  position: absolute;
  z-index: 2;
  inset-inline-start: 0;
  inset-block-end: 0;
  display: grid;
  place-items: center;
  gap: 0;
  inline-size: 58px;
  block-size: 58px;
  margin-inline-start: -29px;
  margin-block-end: -29px;
  padding: 0;
  border: 1px solid rgba(116, 148, 106, 0.18);
  border-radius: 999px;
  color: #5f7e58;
  background:
    radial-gradient(circle at 34% 23%, rgba(255, 255, 255, 0.96), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 251, 0.78), rgba(247, 242, 230, 0.56)),
    color-mix(in srgb, var(--arc-tone) 42%, transparent);
  box-shadow:
    0 10px 22px rgba(89, 68, 42, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.54) inset,
    inset 0 -5px 10px rgba(105, 137, 96, 0.05);
  backdrop-filter: blur(14px);
  cursor: pointer;
  opacity: 0;
  transform: translate(0, 0) scale(0.48);
  transition:
    transform 0.34s cubic-bezier(0.22, 1.1, 0.36, 1),
    opacity 0.24s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  transition-delay: 0ms;
}

.action-arc__item:first-of-type {
  inline-size: 68px;
  block-size: 68px;
  margin-inline-start: -34px;
  margin-block-end: -34px;
  border-color: rgba(169, 130, 63, 0.25);
  color: #7b6d43;
  background:
    radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.98), transparent 30%),
    linear-gradient(180deg, rgba(255, 252, 239, 0.88), rgba(252, 244, 218, 0.66));
  box-shadow:
    0 12px 24px rgba(112, 83, 45, 0.13),
    0 0 22px rgba(247, 223, 151, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.64) inset;
}

.action-arc--open .action-arc__item {
  pointer-events: auto;
  opacity: 1;
  transform: translate(var(--arc-x), var(--arc-y)) scale(1);
  transition-delay: var(--arc-delay);
}

.action-arc__item:hover {
  color: #426c4e;
  border-color: rgba(96, 134, 88, 0.34);
  background:
    radial-gradient(circle at 34% 23%, rgba(255, 255, 255, 1), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 251, 0.92), rgba(246, 242, 228, 0.72));
  box-shadow:
    0 12px 24px rgba(89, 68, 42, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.7) inset,
    0 0 16px rgba(175, 218, 159, 0.18);
  transform: translate(var(--arc-x), var(--arc-y)) scale(1.1);
}

.action-arc__item:active {
  transform: translate(var(--arc-x), var(--arc-y)) scale(0.96);
}

.action-arc__item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--arc-accent) 60%, white);
  outline-offset: 2px;
}

.action-arc__icon {
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  line-height: 1;
}

.action-arc__svg {
  inline-size: 26px;
  block-size: 26px;
  overflow: visible;
}

.action-arc__fill {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.action-arc__line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.action-arc__line--thick {
  stroke-width: 2.2;
}

.action-arc__label {
  max-inline-size: 50px;
  overflow: hidden;
  color: #60584f;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-arc__item:first-of-type .action-arc__icon {
  inline-size: 28px;
  block-size: 28px;
}

.action-arc__item:first-of-type .action-arc__svg {
  inline-size: 28px;
  block-size: 28px;
}

.action-arc__item:first-of-type .action-arc__label {
  color: #6d5d3b;
  font-size: 11px;
}

.action-arc__vine {
  position: absolute;
  z-index: 1;
  inset-inline-start: -150px;
  inset-block-end: -4px;
  inline-size: 300px;
  block-size: 128px;
  opacity: 0;
  transform: scale(0.92);
  transition:
    opacity 0.28s ease,
    transform 0.34s cubic-bezier(0.22, 1.1, 0.36, 1);
}

.action-arc--open .action-arc__vine {
  opacity: 1;
  transform: scale(1);
}

.action-arc__vine-line,
.action-arc__vine-leaf {
  fill: none;
  stroke: rgba(111, 147, 104, 0.24);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.action-arc__vine-leaf {
  fill: rgba(227, 241, 215, 0.18);
  stroke: rgba(111, 147, 104, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .action-arc__item {
    transition-duration: 0.12s;
  }
}
</style>
