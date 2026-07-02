import { isTauri } from '@tauri-apps/api/core'
import { onMounted, onUnmounted, shallowRef, type Ref } from 'vue'
import type { ActivityKind } from '../domain/types'

export type GlobalActivityStatus = 'unavailable' | 'idle' | 'starting' | 'listening' | 'failed'

export function useActivitySignal(onActivity: (kind: ActivityKind) => void, enabled?: Ref<boolean>) {
  const globalActivityStatus = shallowRef<GlobalActivityStatus>(isTauri() ? 'idle' : 'unavailable')
  const globalActivityError = shallowRef('窗口内活动模式')

  function handlePointerDown() {
    if (enabled && !enabled.value) return
    onActivity('click')
  }

  function handleKeyDown() {
    if (enabled && !enabled.value) return
    onActivity('key')
  }

  onMounted(() => {
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('keydown', handleKeyDown, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    globalActivityError,
    globalActivityStatus,
  }
}
