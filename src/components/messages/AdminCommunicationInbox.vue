<template>
  <el-badge v-if="chatTab || noticeTab" :value="totalUnread" :max="99" :hidden="totalUnread === 0" class="communication-badge"><el-button text aria-label="打开通信" @click="open"><el-icon :size="19"><ChatLineSquare /></el-icon><span>沟通</span></el-button></el-badge>
  <el-drawer v-model="visible" title="沟通" size="min(560px, 95vw)" @opened="onOpened">
    <el-tabs v-model="activeTab" class="communication-tabs">
      <el-tab-pane v-if="chatTab" label="用户消息" name="chat">
        <div v-loading="chatLoading" class="chat-panel">
          <el-alert v-if="chatError" :title="chatError" type="error" :closable="false" show-icon><template #default><el-button link @click="loadChat">重新加载</el-button></template></el-alert>
          <button v-for="session in unreadSessions" :key="session.sessionId" type="button" class="session-row" @click="openChat(session)">
            <el-avatar :size="32" :src="avatarUrl(session.user1Avatar) || undefined"><el-icon><UserFilled /></el-icon></el-avatar>
            <div class="session-copy"><strong>{{ session.user1Name || ('用户#' + session.user1Id) }}<el-tag v-if="session.user2Unread > 99" size="small" type="danger" class="session-unread">99+</el-tag><el-tag v-else-if="session.user2Unread > 0" size="small" type="danger" class="session-unread">{{ session.user2Unread }}</el-tag></strong><span>{{ session.lastMessage || '暂无消息内容' }}</span></div>
            <time>{{ formatTime(session.lastMessageTime) }}</time>
          </button>
          <el-empty v-if="!chatLoading && !chatError && !unreadSessions.length" description="暂无未读的用户消息" :image-size="70" />
          <div class="panel-footer"><el-button link type="primary" @click="goAllSessions">查看全部会话并回复</el-button></div>
        </div>
      </el-tab-pane>
      <el-tab-pane v-if="noticeTab" label="公告" name="notice">
        <AnnouncementReader v-if="visible" ref="reader" :api="adminAnnouncements" @changed="onNoticeChanged" />
      </el-tab-pane>
    </el-tabs>
  </el-drawer>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChatLineSquare, UserFilled } from '@element-plus/icons-vue'
import AnnouncementReader from '@/components/messages/AnnouncementReader.vue'
import { adminAnnouncements } from '@/api/announcements'
import { getChatUnreadCount, listSessions } from '@/api/adminChat'
import { isRealtimeConnected, onRealtime } from '@/utils/realtimeSocket'
import { unreadSources } from '@/utils/notificationDraft'
import { avatarUrl } from '@/utils/avatarUrl'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
const userStore = useUserStore(), permissionStore = usePermissionStore(), router = useRouter()
const chatTab = computed(() => userStore.hasPermission('chat:session:list'))
// 公告接收接口（/system/notice/received/*）后端只要求登录，无需权限判定
const noticeTab = computed(() => true)
const contains = (item, path) => item.path === path || (item.children || []).some(child => contains(child, path))
const formatTime = value => (value ? String(value).replace('T', ' ').slice(5, 16) : '—')
const totalUnread = computed(() => counts.value[0] + counts.value[1])
const visible = ref(false), activeTab = ref('chat')
const counts = ref([0, 0]), unreadSessions = ref([]), chatLoading = ref(false), chatError = ref(''), reader = ref(null)
let timer, generation = 0, inFlight = false, chatGeneration = 0
function open() {
  activeTab.value = chatTab.value ? 'chat' : 'notice'
  visible.value = true
}
function onOpened() { refreshAll(); if (chatTab.value) loadChat() }
async function refreshAll() {
  if (inFlight || document.hidden) return
  const current = generation
  inFlight = true
  const tasks = [
    chatTab.value ? getChatUnreadCount({ silent: true }) : Promise.resolve({ chatUnread: 0 }),
    adminAnnouncements.unreadCount({ silent: true })
  ]
  try {
    const settled = await Promise.allSettled(tasks)
    if (current !== generation) return
    counts.value = unreadSources(settled.map((r, i) => ({ status: r.status, value: i === 0 ? r.value?.chatUnread : r.value?.total })), counts.value).counts
  } finally { if (current === generation) inFlight = false }
}
async function loadChat() {
  const current = ++chatGeneration
  chatLoading.value = true; chatError.value = ''
  try {
    const result = await listSessions({ pageNum: 1, pageSize: 20 })
    if (current !== chatGeneration) return
    unreadSessions.value = (result.rows || []).filter(row => row.user2Unread > 0)
  } catch (e) {
    if (current === chatGeneration) { unreadSessions.value = []; chatError.value = e?.message || '会话加载失败' }
  } finally { if (current === chatGeneration) chatLoading.value = false }
}
function openChat(session) {
  visible.value = false
  router.push({ path: '/appuser/chat-detail', query: { sessionId: session.sessionId, from: 'communication' } })
}
function goAllSessions() {
  visible.value = false
  const hasMessages = permissionStore.sidebarRoutes.some(item => contains(item, '/support/messages'))
  router.push(hasMessages ? { path: '/support/messages', query: { tab: 'chat' } } : { path: '/appuser/chat-sessions' })
}
function onNoticeChanged() { refreshCount(); if (visible.value) reader.value?.refresh() }
function refreshCount() { generation++; inFlight = false; refreshAll() }
function onExternalChange() { refreshCount(); if (visible.value && chatTab.value) loadChat() }
// 长连接可用时未读角标由服务端帧驱动，轮询退居兜底并拉长；连接不可用时恢复原来的 5s 频率。
const POLL_ACTIVE_MS = 5000
const POLL_IDLE_MS = 60000
function applyPollInterval() {
  clearInterval(timer)
  timer = setInterval(refreshAll, isRealtimeConnected() ? POLL_IDLE_MS : POLL_ACTIVE_MS)
}
let offRealtime = []
onMounted(() => {
  refreshAll()
  applyPollInterval()
  document.addEventListener('visibilitychange', refreshAll)
  window.addEventListener('admin-chat-changed', onExternalChange)
  window.addEventListener('announcements-changed', onNoticeChanged)
  offRealtime = [
    onRealtime('chat', onExternalChange),
    onRealtime('notification', refreshCount),
    onRealtime('connected', applyPollInterval),
    onRealtime('disconnected', applyPollInterval)
  ]
})
onBeforeUnmount(() => {
  generation++; chatGeneration++
  clearInterval(timer)
  offRealtime.forEach(off => off())
  document.removeEventListener('visibilitychange', refreshAll)
  window.removeEventListener('admin-chat-changed', onExternalChange)
  window.removeEventListener('announcements-changed', onNoticeChanged)
})
</script>
<style scoped>
.communication-badge :deep(.el-badge__content){background:#f56c6c;border:0}
.communication-tabs :deep(.el-tabs__header){padding:0 20px;margin-bottom:0}
.chat-panel{min-height:180px}
.session-row{display:flex;align-items:center;gap:12px;width:100%;border:0;border-bottom:1px solid #edf0f2;background:#fff;padding:16px 20px;text-align:left;cursor:pointer;color:#303133}
.session-row:hover{background:#fafbfc}
.session-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}
.session-copy strong{font-size:14px;overflow-wrap:anywhere}
.session-copy span{font-size:12px;color:#909399;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.session-unread{margin-left:8px}
.session-row time{font-size:12px;color:#909399;flex-shrink:0}
.panel-footer{padding:12px 20px;text-align:center}
</style>
