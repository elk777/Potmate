import { onMounted, onUnmounted, watch, type Ref } from 'vue'

export function usePetSurfacePassThrough(enabled: Ref<boolean>) {
  function syncClass(nextEnabled: boolean) {
    document.body.classList.toggle('pet-surface-pass-through', nextEnabled)
  }

  onMounted(() => {
    syncClass(enabled.value)
  })

  onUnmounted(() => {
    syncClass(false)
  })

  watch(enabled, (nextEnabled) => {
    syncClass(nextEnabled)
  })
}
