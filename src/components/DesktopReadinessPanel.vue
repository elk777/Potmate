<script setup lang="ts">
import { computed } from 'vue'
import type { GlobalActivityStatus } from '../composables/useActivitySignal'
import type { DesktopStatus } from '../composables/useDesktopBridge'
import type { Settings } from '../domain/types'

const props = defineProps<{
  desktopStatus: DesktopStatus
  globalActivityError: string
  globalActivityStatus: GlobalActivityStatus
  settings: Settings
}>()

const rows = computed(() => [
  {
    id: 'runtime',
    label: '运行环境',
    status: props.desktopStatus.isDesktop ? '桌面端' : '预览',
    tone: props.desktopStatus.isDesktop ? 'ok' : 'muted',
  },
  {
    id: 'storage',
    label: '数据存储',
    status: props.desktopStatus.storeAvailable ? '文件' : '本地',
    tone: props.desktopStatus.storeAvailable ? 'ok' : 'muted',
  },
  {
    id: 'notification',
    label: '提醒权限',
    status: props.desktopStatus.notificationGranted ? '已允许' : props.settings.reminderEnabled ? '待授权' : '关闭',
    tone: props.desktopStatus.notificationGranted ? 'ok' : props.settings.reminderEnabled ? 'warn' : 'muted',
  },
  {
    id: 'autostart',
    label: '开机自启',
    status: props.desktopStatus.autostartEnabled ? '已开启' : props.settings.autostartEnabled ? '同步中' : '关闭',
    tone: props.desktopStatus.autostartEnabled ? 'ok' : props.settings.autostartEnabled ? 'warn' : 'muted',
  },
  {
    id: 'activity',
    label: '活动监听',
    status: getActivityStatusLabel(props.globalActivityStatus, props.globalActivityError),
    tone: props.globalActivityStatus === 'listening' ? 'ok' : props.globalActivityStatus === 'failed' ? 'warn' : 'muted',
  },
])

function getActivityStatusLabel(status: GlobalActivityStatus, error: string) {
  if (status === 'listening') return '全局'
  if (status === 'starting') return '启动中'
  if (status === 'failed') return error ? '降级' : '窗口内'
  if (status === 'idle') return '窗口内'

  return '窗口内'
}
</script>

<template>
  <section class="desktop-readiness" aria-label="桌面状态">
    <div
      v-for="row in rows"
      :key="row.id"
      class="desktop-readiness__chip"
      :class="`desktop-readiness__chip--${row.tone}`"
    >
      <span class="desktop-readiness__label">{{ row.label }}</span>
      <span class="desktop-readiness__status" :class="`desktop-readiness__status--${row.tone}`">
        {{ row.status }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.desktop-readiness {
  display: flex;
  flex-wrap: nowrap;
  gap: 5px;
  min-block-size: 28px;
  overflow: visible;
}

.desktop-readiness__chip {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  gap: 4px;
  min-block-size: 26px;
  min-inline-size: 0;
  max-inline-size: 100%;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(238, 232, 216, 0.4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.desktop-readiness__chip--ok {
  background: rgba(220, 235, 218, 0.62);
}

.desktop-readiness__chip--warn {
  background: rgba(241, 226, 198, 0.62);
}

.desktop-readiness__label {
  flex: 0 1 auto;
  overflow: hidden;
  color: #746d64;
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desktop-readiness__status {
  flex: 0 0 auto;
  overflow: hidden;
  max-inline-size: 42px;
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desktop-readiness__status--ok {
  color: #47775d;
}

.desktop-readiness__status--warn {
  color: #a36c2d;
}

.desktop-readiness__status--muted {
  color: #7c776c;
}

@media (max-width: 420px) {
  .desktop-readiness__chip {
    justify-content: center;
    padding-inline: 4px;
  }

  .desktop-readiness__label {
    display: none;
  }

  .desktop-readiness__status {
    max-inline-size: none;
  }
}
</style>
