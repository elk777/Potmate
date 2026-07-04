<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { MoodTag } from '../domain/types'

const emit = defineEmits<{
  submitRecord: [payload: { text: string; mood: MoodTag | null }]
  expand: []
}>()

const text = shallowRef('')
const canSubmit = computed(() => text.value.trim().length > 0)

function submitRecord() {
  if (!canSubmit.value) return

  emit('submitRecord', {
    text: text.value,
    mood: null,
  })
  text.value = ''
}
</script>

<template>
  <form class="mini-record" aria-label="快速记录" @submit.prevent="submitRecord">
    <span class="mini-record__leaf" aria-hidden="true">
      <svg viewBox="0 0 24 24" class="mini-record__icon">
        <path d="M5.5 13.8C6.6 7.7 12 4.4 19.2 4.5c.1 7-3.1 12.4-9.5 13.2-1.6.2-3.1-.2-4.2-1.1 1.9-.5 4.9-1.7 7.1-4.6" />
      </svg>
    </span>

    <input
      v-model="text"
      class="mini-record__input"
      maxlength="120"
      placeholder="记一句今天的小事"
      aria-label="记一句今天的小事"
    />

    <button class="mini-record__button mini-record__button--water" type="submit" :disabled="!canSubmit" aria-label="浇水">
      <svg viewBox="0 0 24 24" class="mini-record__button-icon" aria-hidden="true">
        <path d="M12 3.6c3.3 4.2 5.2 7.2 5.2 10.1a5.2 5.2 0 0 1-10.4 0C6.8 10.8 8.7 7.8 12 3.6Z" />
      </svg>
    </button>

    <button class="mini-record__button" type="button" aria-label="展开完整记录" @click="emit('expand')">
      <svg viewBox="0 0 24 24" class="mini-record__button-icon" aria-hidden="true">
        <path d="M8 6h10v10M18 6 7 17" />
      </svg>
    </button>
  </form>
</template>

<style scoped>
.mini-record {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 32px 32px;
  align-items: center;
  gap: 5px;
  inline-size: min(236px, calc(100vw - 18px));
  min-block-size: 48px;
  padding: 7px 8px;
  border: 1px solid rgba(107, 138, 99, 0.2);
  border-radius: 999px;
  color: #3b332a;
  background:
    linear-gradient(180deg, rgba(255, 254, 249, 0.96), rgba(250, 246, 235, 0.9)),
    rgba(255, 252, 244, 0.88);
  box-shadow:
    0 16px 34px rgba(88, 64, 38, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px);
}

.mini-record__leaf,
.mini-record__button {
  display: grid;
  place-items: center;
}

.mini-record__leaf {
  inline-size: 24px;
  block-size: 24px;
  border-radius: 999px;
  color: #6f9368;
  background: rgba(226, 240, 212, 0.7);
}

.mini-record__icon,
.mini-record__button-icon {
  inline-size: 18px;
  block-size: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mini-record__input {
  min-inline-size: 0;
  border: 0;
  color: #3b332a;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  outline: none;
}

.mini-record__input::placeholder {
  color: rgba(102, 93, 82, 0.62);
}

.mini-record__button {
  inline-size: 32px;
  block-size: 32px;
  border: 1px solid rgba(91, 73, 54, 0.12);
  border-radius: 999px;
  color: #6b6257;
  background: rgba(255, 252, 244, 0.72);
  cursor: pointer;
}

.mini-record__button--water {
  color: #fdf9ed;
  background: #6f9368;
}

.mini-record__button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
</style>
