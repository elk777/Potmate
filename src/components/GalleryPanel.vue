<script setup lang="ts">
import type { GalleryItem, PlantSeed } from '../domain/types'

defineProps<{
  gallery: GalleryItem[]
  seeds: PlantSeed[]
  pendingSeedId: string | null
  canArchivePlant: boolean
}>()

const emit = defineEmits<{
  archivePlant: []
  chooseSeed: [seedId: string | null]
}>()

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp)
}
</script>

<template>
  <section class="gallery-panel" aria-label="图鉴">
    <button
      class="gallery-panel__primary"
      type="button"
      :disabled="!canArchivePlant"
      @click="emit('archivePlant')"
    >
      结种收藏
    </button>

    <div class="gallery-panel__section">
      <p class="gallery-panel__title">种子</p>
      <p v-if="seeds.length === 0" class="gallery-panel__empty">
        植物盛放后可以结成种子，下一株会继承一部分形态。
      </p>
      <div v-else class="gallery-panel__seed-grid">
        <button
          v-for="seed in seeds"
          :key="seed.id"
          class="gallery-panel__seed"
          :class="{ 'gallery-panel__seed--active': pendingSeedId === seed.id }"
          type="button"
          @click="emit('chooseSeed', pendingSeedId === seed.id ? null : seed.id)"
        >
          <span class="gallery-panel__seed-name">{{ seed.name }}</span>
          <span class="gallery-panel__seed-meta">{{ seed.generation }}代</span>
        </button>
      </div>
    </div>

    <div class="gallery-panel__section">
      <p class="gallery-panel__title">图鉴</p>
      <p v-if="gallery.length === 0" class="gallery-panel__empty">
        这里会保存盛放过的植物。
      </p>
      <article v-for="item in gallery" :key="item.id" class="gallery-panel__item">
        <div class="gallery-panel__swatch" :style="{ backgroundColor: `hsl(${item.plant.genome.leafColor.h}, ${item.plant.genome.leafColor.s}%, ${item.plant.genome.leafColor.l}%)` }" />
        <div class="gallery-panel__item-body">
          <span class="gallery-panel__item-name">{{ item.plant.name }}</span>
          <span class="gallery-panel__item-meta">
            {{ formatDate(item.archivedAt) }} · {{ item.recordCount }}条养分 · {{ item.plant.generation }}代
          </span>
          <p class="gallery-panel__item-text">{{ item.coverRecordText }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.gallery-panel {
  display: grid;
  gap: 10px;
  min-block-size: 0;
  overflow: auto;
  padding-inline-end: 3px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(91, 73, 54, 0.22) transparent;
  container-type: inline-size;
}

.gallery-panel::-webkit-scrollbar {
  inline-size: 6px;
}

.gallery-panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(91, 73, 54, 0.2);
}

.gallery-panel__primary {
  min-block-size: 34px;
  border: 1px solid rgba(92, 68, 49, 0.14);
  border-radius: 12px;
  color: #fdf9ed;
  background: #47775d;
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.gallery-panel__primary:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.gallery-panel__section {
  display: grid;
  gap: 8px;
}

.gallery-panel__title,
.gallery-panel__empty,
.gallery-panel__item-text {
  margin: 0;
}

.gallery-panel__title {
  color: #707b62;
  font-size: 12px;
  font-weight: 700;
}

.gallery-panel__empty {
  color: #746d64;
  font-size: 13px;
  line-height: 1.5;
}

.gallery-panel__seed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 7px;
}

.gallery-panel__seed {
  display: grid;
  gap: 2px;
  min-block-size: 46px;
  border: 1px solid rgba(92, 68, 49, 0.14);
  border-radius: 12px;
  padding: 8px;
  color: #3b332a;
  background: rgba(255, 252, 244, 0.74);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.gallery-panel__seed--active {
  border-color: rgba(64, 119, 88, 0.46);
  background: #dbe9cf;
}

.gallery-panel__seed-name {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-panel__seed-meta {
  color: #746d64;
  font-size: 11px;
}

.gallery-panel__item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 9px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(238, 232, 216, 0.46);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.gallery-panel__swatch {
  inline-size: 24px;
  block-size: 24px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(50, 42, 34, 0.14);
}

.gallery-panel__item-body {
  display: grid;
  min-inline-size: 0;
  gap: 2px;
}

.gallery-panel__item-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-panel__item-meta {
  overflow: hidden;
  color: #7c776c;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-panel__item-text {
  overflow: hidden;
  color: #3b332b;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@container (max-width: 270px) {
  .gallery-panel__seed-grid {
    grid-template-columns: 1fr;
  }

  .gallery-panel__item {
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 7px;
    padding: 7px 8px;
  }

  .gallery-panel__swatch {
    inline-size: 20px;
    block-size: 20px;
  }
}
</style>
