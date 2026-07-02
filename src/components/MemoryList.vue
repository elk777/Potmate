<script setup lang="ts">
import type { PlantRecord } from '../domain/types'

defineProps<{
  records: PlantRecord[]
}>()
</script>

<template>
  <div class="memory-list" aria-label="最近记录">
    <p class="memory-list__title">最近的养分</p>
    <p v-if="records.length === 0" class="memory-list__empty">
      第一条记录会决定这株植物的叶形、主色和性格。
    </p>
    <article v-for="record in records" :key="record.id" class="memory-list__item">
      <span class="memory-list__date">{{ record.date }}</span>
      <p class="memory-list__text">{{ record.text }}</p>
    </article>
  </div>
</template>

<style scoped>
.memory-list {
  display: grid;
  gap: 8px;
}

.memory-list__title,
.memory-list__empty,
.memory-list__text {
  margin: 0;
}

.memory-list__title {
  color: #707b62;
  font-size: 12px;
  font-weight: 700;
}

.memory-list__empty {
  color: #746d64;
  font-size: 13px;
  line-height: 1.5;
}

.memory-list__item {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(238, 232, 216, 0.58);
}

.memory-list__date {
  color: #7c776c;
  font-size: 11px;
}

.memory-list__text {
  color: #3b332b;
  font-size: 13px;
  line-height: 1.45;
}
</style>
