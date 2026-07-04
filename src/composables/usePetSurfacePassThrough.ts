import { isTauri } from '@tauri-apps/api/core'
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window'
import { onMounted, onUnmounted, watch, type Ref } from 'vue'

export function usePetSurfacePassThrough(enabled: Ref<boolean>) {
  const STAGE_INTERACTIVE_TOP_RATIO = 0.38
  const STAGE_INTERACTIVE_HORIZONTAL_INSET_RATIO = 0.08
  let pollTimer: number | null = null
  let nativeIgnoring = false

  function syncClass(nextEnabled: boolean) {
    document.body.classList.toggle('pet-surface-pass-through', nextEnabled)
  }

  async function setNativeIgnore(nextIgnoring: boolean) {
    if (!isTauri() || nativeIgnoring === nextIgnoring) return

    nativeIgnoring = nextIgnoring
    try {
      await getCurrentWindow().setIgnoreCursorEvents(nextIgnoring)
    } catch {
      nativeIgnoring = !nextIgnoring
    }
  }

  function isControlPoint(clientX: number, clientY: number) {
    if (clientX < 0 || clientY < 0 || clientX > window.innerWidth || clientY > window.innerHeight) return false

    return document
      .elementsFromPoint(clientX, clientY)
      .some((element) => element instanceof HTMLElement && Boolean(element.closest('[data-pass-through-control]')))
  }

  function isStageContentPoint(clientX: number, clientY: number) {
    const stage = document.querySelector('[data-pass-through-stage]')
    if (!(stage instanceof HTMLElement)) return false

    const rect = stage.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false

    const interactiveTop = rect.top + rect.height * STAGE_INTERACTIVE_TOP_RATIO
    const horizontalInset = rect.width * STAGE_INTERACTIVE_HORIZONTAL_INSET_RATIO

    return (
      clientX >= rect.left + horizontalInset &&
      clientX <= rect.right - horizontalInset &&
      clientY >= interactiveTop &&
      clientY <= rect.bottom
    )
  }

  async function syncNativePassThrough() {
    if (!enabled.value || !isTauri()) {
      await setNativeIgnore(false)
      return
    }

    if (document.body.dataset.petResizeActive === 'true' || document.body.dataset.petPanelResizeActive === 'true') {
      await setNativeIgnore(false)
      return
    }

    try {
      const [cursor, position, size] = await Promise.all([
        cursorPosition(),
        getCurrentWindow().outerPosition(),
        getCurrentWindow().outerSize(),
      ])
      const scaleX = window.innerWidth / Math.max(size.width, 1)
      const scaleY = window.innerHeight / Math.max(size.height, 1)
      const clientX = (cursor.x - position.x) * scaleX
      const clientY = (cursor.y - position.y) * scaleY

      await setNativeIgnore(!(isControlPoint(clientX, clientY) || isStageContentPoint(clientX, clientY)))
    } catch {
      await setNativeIgnore(false)
    }
  }

  function startNativePolling() {
    if (pollTimer !== null || !isTauri()) return

    void syncNativePassThrough()
    pollTimer = window.setInterval(() => {
      void syncNativePassThrough()
    }, 90)
  }

  function stopNativePolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
    void setNativeIgnore(false)
  }

  onMounted(() => {
    syncClass(enabled.value)
    if (enabled.value) startNativePolling()
  })

  onUnmounted(() => {
    syncClass(false)
    stopNativePolling()
  })

  watch(enabled, (nextEnabled) => {
    syncClass(nextEnabled)
    if (nextEnabled) startNativePolling()
    else stopNativePolling()
  })
}
