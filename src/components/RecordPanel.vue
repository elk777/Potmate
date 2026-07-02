<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { MoodTag } from '../domain/types'

const emit = defineEmits<{
  submitRecord: [payload: { text: string; mood: MoodTag | null }]
}>()

defineProps<{
  compact?: boolean
}>()

const text = shallowRef('')
const mood = shallowRef<MoodTag | null>(null)

const moodOptions: Array<{ value: MoodTag; label: string; face: string }> = [
  { value: 'joyful', label: '雀跃', face: '＾▽＾' },
  { value: 'happy', label: '轻快', face: '◕‿◕' },
  { value: 'neutral', label: '平静', face: '˘ᵕ˘' },
  { value: 'down', label: '低落', face: 'ó﹏ò' },
  { value: 'sad', label: '难过', face: 'T_T' },
]

const canSubmit = computed(() => text.value.trim().length > 0)

function submitRecord() {
  if (!canSubmit.value) return

  emit('submitRecord', {
    text: text.value,
    mood: mood.value,
  })
  text.value = ''
  mood.value = null
}
</script>

<template>
  <form class="record-panel" :class="{ 'record-panel--compact': compact }" @submit.prevent="submitRecord">
    <textarea
      v-model="text"
      class="record-panel__input"
      maxlength="200"
      placeholder="今天发生了什么小事？"
    />

    <div class="record-panel__moods" aria-label="心情">
      <button
        v-for="option in moodOptions"
        :key="option.value"
        class="record-panel__mood"
        :class="{ 'record-panel__mood--active': mood === option.value }"
        type="button"
        @click="mood = mood === option.value ? null : option.value"
      >
        <span class="record-panel__face">{{ option.face }}</span>
        <span class="record-panel__mood-label">{{ option.label }}</span>
      </button>
    </div>

    <button class="record-panel__submit" type="submit" :disabled="!canSubmit">
      浇水
    </button>
  </form>
</template>

<style scoped>
.record-panel {
  display: grid;
  gap: 8px;
}

.record-panel__input {
  box-sizing: border-box;
  min-block-size: 86px;
  resize: none;
  border: 1px solid rgba(92, 68, 49, 0.16);
  border-radius: 8px;
  padding: 12px;
  color: #2e2a24;
  background: rgba(255, 252, 244, 0.9);
  font: inherit;
  line-height: 1.5;
  outline: none;
}

.record-panel--compact .record-panel__input {
  min-block-size: 64px;
  padding: 9px 10px;
}

.record-panel__input:focus {
  border-color: rgba(80, 124, 90, 0.45);
  box-shadow: 0 0 0 3px rgba(80, 124, 90, 0.12);
}

.record-panel__moods {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.record-panel__mood,
.record-panel__submit {
  min-block-size: 36px;
  border: 1px solid rgba(92, 68, 49, 0.14);
  border-radius: 8px;
  color: #3b332a;
  background: rgba(255, 252, 244, 0.74);
  font: inherit;
  cursor: pointer;
}

.record-panel--compact .record-panel__mood,
.record-panel--compact .record-panel__submit {
  min-block-size: 34px;
  font-size: 12px;
}

.record-panel__mood {
  display: grid;
  place-items: center;
  gap: 1px;
  min-inline-size: 0;
  padding: 4px 2px;
}

.record-panel__face {
  display: block;
  max-inline-size: 100%;
  overflow: hidden;
  font-family:
    ui-rounded, "SF Pro Rounded", "Hiragino Sans", "Microsoft YaHei",
    system-ui, sans-serif;
  font-size: 12px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-panel__mood-label {
  color: #6b5f52;
  font-size: 10px;
  line-height: 1.1;
}

.record-panel__mood--active {
  border-color: rgba(64, 119, 88, 0.46);
  background: #dbe9cf;
}

.record-panel__mood--active .record-panel__mood-label {
  color: #315d45;
}

.record-panel__submit {
  color: #fdf9ed;
  background: #47775d;
}

.record-panel__submit:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
