<script setup lang="ts">
import type { DesktopStatus } from '../composables/useDesktopBridge'
import type { GlobalActivityStatus } from '../composables/useActivitySignal'
import type { ActivityState, Settings } from '../domain/types'

const props = defineProps<{
  settings: Settings
  activity: ActivityState
  activityBoost: number
  desktopStatus: DesktopStatus
  globalActivityError: string
  globalActivityStatus: GlobalActivityStatus
}>()

const emit = defineEmits<{
  updateSettings: [settings: Settings]
  exportData: []
  importData: []
  sendReminder: []
}>()

function patchSettings(patch: Partial<Settings>) {
  emit('updateSettings', {
    ...props.settings,
    ...patch,
  })
}

function toggleQuietHours(enabled: boolean) {
  patchSettings({
    quietHours: enabled ? { from: '23:00', to: '07:00' } : null,
  })
}

function getGlobalActivityLabel(status: GlobalActivityStatus) {
  const labels: Record<GlobalActivityStatus, string> = {
    unavailable: '窗口内',
    idle: '窗口内',
    starting: '启动中',
    listening: '全局',
    failed: '窗口内',
  }

  return labels[status]
}
</script>

<template>
  <section class="settings-panel" aria-label="设置">
    <div class="settings-panel__row">
      <div class="settings-panel__copy">
        <span class="settings-panel__label">温和模式</span>
        <span class="settings-panel__hint">枯萎会停在可恢复状态</span>
      </div>
      <input
        class="settings-panel__toggle"
        type="checkbox"
        :checked="settings.gentleMode"
        @change="patchSettings({ gentleMode: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <div class="settings-panel__row">
      <div class="settings-panel__copy">
        <span class="settings-panel__label">键鼠养分</span>
        <span class="settings-panel__hint">
          {{ getGlobalActivityLabel(globalActivityStatus) }} · 加成 {{ activityBoost.toFixed(0) }} · 今日 {{ activity.dailyInteractions }} 次
        </span>
      </div>
      <input
        class="settings-panel__toggle"
        type="checkbox"
        :checked="settings.activityMode"
        @change="patchSettings({ activityMode: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <div class="settings-panel__row">
      <div class="settings-panel__copy">
        <span class="settings-panel__label">每日提醒</span>
        <span class="settings-panel__hint">
          {{ desktopStatus.notificationGranted ? '系统通知已允许' : '开启时会请求通知权限' }}
        </span>
      </div>
      <input
        class="settings-panel__toggle"
        type="checkbox"
        :checked="settings.reminderEnabled"
        @change="patchSettings({ reminderEnabled: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <div class="settings-panel__row">
      <div class="settings-panel__copy">
        <span class="settings-panel__label">开机自启</span>
        <span class="settings-panel__hint">
          {{ desktopStatus.isDesktop ? '随系统启动花盆' : '桌面端可用' }}
        </span>
      </div>
      <input
        class="settings-panel__toggle"
        type="checkbox"
        :checked="settings.autostartEnabled"
        :disabled="!desktopStatus.isDesktop"
        @change="patchSettings({ autostartEnabled: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <div class="settings-panel__row">
      <div class="settings-panel__copy">
        <span class="settings-panel__label">画布穿透</span>
        <span class="settings-panel__hint">只让花盆画布不抢点击，控制区仍可用</span>
      </div>
      <input
        class="settings-panel__toggle"
        type="checkbox"
        :checked="settings.petSurfacePassThrough"
        @change="patchSettings({ petSurfacePassThrough: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <label class="settings-panel__field">
      <span class="settings-panel__label">一天从几点开始</span>
      <input
        class="settings-panel__number"
        type="number"
        min="0"
        max="12"
        :value="settings.dayStartHour"
        @input="patchSettings({ dayStartHour: Number(($event.target as HTMLInputElement).value) })"
      />
    </label>

    <div class="settings-panel__row">
      <div class="settings-panel__copy">
        <span class="settings-panel__label">夜间缓慢衰减</span>
        <span class="settings-panel__hint">夜里不把用户逼回来</span>
      </div>
      <input
        class="settings-panel__toggle"
        type="checkbox"
        :checked="Boolean(settings.quietHours)"
        @change="toggleQuietHours(($event.target as HTMLInputElement).checked)"
      />
    </div>

    <div class="settings-panel__actions">
      <button class="settings-panel__button" type="button" @click="emit('exportData')">
        导出备份
      </button>
      <button class="settings-panel__button" type="button" @click="emit('importData')">
        导入备份
      </button>
      <button class="settings-panel__button" type="button" @click="emit('sendReminder')">
        测试提醒
      </button>
    </div>

    <p class="settings-panel__status">
      {{ desktopStatus.isDesktop ? '桌面能力已启用' : '浏览器预览降级模式' }} ·
      {{ desktopStatus.storeAvailable ? '文件存储' : '本地存储' }}
      <template v-if="globalActivityStatus === 'failed' && globalActivityError">
        · {{ globalActivityError }}
      </template>
    </p>
  </section>
</template>

<style scoped>
.settings-panel {
  display: grid;
  gap: 7px;
  container-type: inline-size;
}

.settings-panel__row,
.settings-panel__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-block-size: 40px;
  padding: 6px 9px;
  border-radius: 12px;
  background: rgba(238, 232, 216, 0.44);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52);
}

.settings-panel__copy {
  display: grid;
  min-inline-size: 0;
  gap: 2px;
}

.settings-panel__label {
  overflow: hidden;
  color: #3b332b;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-panel__hint {
  overflow: hidden;
  color: #746d64;
  font-size: 10px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-panel__toggle {
  flex: 0 0 auto;
  inline-size: 22px;
  block-size: 22px;
  appearance: none;
  border: 1px solid rgba(92, 68, 49, 0.2);
  border-radius: 8px;
  background: rgba(255, 252, 244, 0.82);
  box-shadow: 0 2px 8px rgba(76, 55, 35, 0.08);
  cursor: pointer;
}

.settings-panel__toggle:checked {
  border-color: rgba(71, 119, 93, 0.28);
  background:
    #47775d
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 13l4 4L19 7'/%3E%3C/svg%3E")
    center / 17px 17px no-repeat;
}

.settings-panel__number {
  box-sizing: border-box;
  inline-size: 54px;
  min-block-size: 30px;
  border: 1px solid rgba(92, 68, 49, 0.14);
  border-radius: 8px;
  padding: 4px 8px;
  color: #2e2a24;
  background: rgba(255, 252, 244, 0.86);
  font: inherit;
}

.settings-panel__toggle:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.settings-panel__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.settings-panel__button {
  min-block-size: 32px;
  border: 1px solid rgba(92, 68, 49, 0.14);
  border-radius: 10px;
  color: #3b332a;
  background: rgba(255, 252, 244, 0.74);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.settings-panel__status {
  overflow: hidden;
  margin: 0;
  color: #746d64;
  font-size: 10px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@container (max-width: 300px) {
  .settings-panel__row,
  .settings-panel__field {
    min-block-size: 38px;
    padding: 6px 8px;
  }

  .settings-panel__label {
    font-size: 11px;
  }

  .settings-panel__hint {
    font-size: 9px;
  }

  .settings-panel__actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
  }

  .settings-panel__button {
    min-block-size: 30px;
    padding-inline: 3px;
    font-size: 10px;
  }
}

@media (max-height: 520px) {
  .settings-panel {
    gap: 6px;
  }

  .settings-panel__row,
  .settings-panel__field {
    min-block-size: 36px;
    padding-block: 5px;
  }

  .settings-panel__hint,
  .settings-panel__status {
    display: none;
  }

  .settings-panel__button {
    min-block-size: 28px;
  }
}
</style>
