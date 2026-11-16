<template>
  <PageContainer>
    <PageHeader title="会话详情" description="阅读即已读，由打开详情的管理员处理，可结束或重新打开会话">
      <template #actions>
        <el-button @click="goBack">返回列表</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="chat-detail">
      <!-- 左：消息窗口 -->
      <el-card class="chat-main" shadow="never">
        <template #header>
          <div class="chat-head">
            <div class="chat-head-user">
              <el-avatar :size="32" :src="avatarUrl(session.user1Avatar) || undefined"><el-icon><UserFilled /></el-icon></el-avatar>
              <div>
                <strong>{{ session.user1Name || ('用户#' + (session.user1Id || '')) }}</strong>
                <small>{{ businessTypeLabel(session.businessType) }}<template v-if="session.businessName"> · {{ session.businessName }}</template></small>
              </div>
            </div>
            <el-tag :type="statusTagType(session.status)">{{ statusLabel(session.status) }}</el-tag>
          </div>
        </template>

        <el-scrollbar ref="scrollRef" class="chat-scroll">
          <div class="chat-messages">
            <div v-if="!messages.length" class="chat-empty">暂无消息</div>
            <template v-for="m in messages" :key="m.messageId">
              <div v-if="m.msgType === 'SYSTEM'" class="msg-system">{{ m.content }}</div>
              <div
                v-else
                class="msg-row"
                :class="{ mine: isMine(m) }"
              >
                <el-avatar :size="30" :src="avatarUrl(m.senderAvatar) || undefined">
                  <el-icon><UserFilled /></el-icon>
                </el-avatar>
                <div class="msg-body">
                  <div class="msg-meta">
                    <span>{{ m.senderName || (isMine(m) ? '我' : '管理员') }}</span>
                    <span class="msg-time">{{ formatTime(m.createdAt) }}</span>
                  </div>
                  <div class="msg-bubble">{{ m.content }}</div>
                </div>
              </div>
            </template>
          </div>
        </el-scrollbar>

        <div class="chat-input">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            resize="none"
            :disabled="loading || isClosed || !isHandler"
            :placeholder="isClosed ? '会话已结束，无法发送消息' : (isHandler ? '输入回复内容，Enter 发送，Shift+Enter 换行' : '其他管理员已打开此会话，请重新进入详情处理')"
            @keydown.enter="handleKeydown"
          />
          <div class="chat-input-actions">
            <span v-if="isClosed" class="closed-tip">会话已结束</span>
            <span v-else-if="!isHandler" class="closed-tip">{{ assignedAdminLabel }} 已打开此会话，请重新进入详情处理</span>
            <el-button v-permission="['chat:message:send']" type="primary" class="black-button" :loading="sending" :disabled="loading || isClosed || !isHandler" @click="handleSend">发送</el-button>
          </div>
        </div>
      </el-card>

      <!-- 右：会话信息与操作 -->
      <el-card class="chat-side" shadow="never">
        <div class="side-block">
          <div class="side-title">用户信息</div>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="用户ID">{{ session.user1Id || '—' }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ session.user1Name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="当前处理人">{{ assignedAdminLabel }}</el-descriptions-item>
            <el-descriptions-item label="业务类型">{{ businessTypeLabel(session.businessType) }}</el-descriptions-item>
            <el-descriptions-item label="业务ID">{{ session.businessId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(session.createdAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="side-block">
          <div class="side-title">关联业务</div>
          <div class="biz-summary">
            <span>{{ businessTypeLabel(session.businessType) }}<template v-if="session.businessName"> · {{ session.businessName }}</template></span>
            <el-button
              v-if="businessRoute"
              link
              type="primary"
              @click="goBusiness"
            >查看{{ businessTypeLabel(session.businessType) }}详情</el-button>
          </div>
        </div>

        <div class="side-block">
          <div class="side-title">会话操作</div>
          <div v-permission="['chat:session:status']" class="status-actions">
            <el-button v-if="!isClosed" type="danger" class="close-btn" :loading="acting" :disabled="loading || !isHandler" @click="handleChangeStatus('close')">结束会话</el-button>
            <el-button v-else :loading="acting" :disabled="loading || !isHandler" @click="handleChangeStatus('reopen')">重新打开</el-button>
          </div>
        </div>
      </el-card>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getSession, openSession, listMessages, sendMessage, markSessionRead, changeStatus } from '@/api/adminChat'
import { useUserStore } from '@/stores/user'
import { avatarUrl } from '@/utils/avatarUrl'
import { isRealtimeConnected, onRealtime } from '@/utils/realtimeSocket'

defineOptions({ name: 'ChatDetail' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sessionId = route.query.sessionId

const loading = ref(false)
const sending = ref(false)
const acting = ref(false)

const session = ref({})
const messages = ref([])
const draft = ref('')
const scrollRef = ref()
const opened = ref(false)

const isClosed = computed(() => Number(session.value.status) === 2)
// 最近打开详情者处理会话；轮询仅同步，不改变处理人。
const isHandler = computed(() => opened.value && Number(session.value.assignedAdminId) === Number(userStore.userId))
const assignedAdminLabel = computed(() => {
  const id = session.value.assignedAdminId
  if (!id) return '—'
  return session.value.user2Name || `管理员#${id}`
})

const statusOptions = [
  { value: 0, label: '进行中' },
  { value: 2, label: '已结束' }
]
function statusLabel(status) {
  return statusOptions.find(o => o.value === (Number(status) === 1 ? 0 : Number(status)))?.label || '未知'
}
function statusTagType(status) {
  const s = Number(status)
  if (s === 0 || s === 1) return 'primary'
  return 'info'
}
function businessTypeLabel(type) {
  const map = { WORK: '作品', SEAL: '印章', COPYRIGHT: '版权', ORDER: '订单', GENERAL: '通用' }
  return map[type] || (type || '通用')
}
// 任务 21：关联业务跳转——业务类型对应管理端页面；GENERAL 或无路由时不出按钮
const businessRouteMap = {
  WORK: '/copyright/ai-review/review',
  COPYRIGHT: '/copyright/assets',
  ORDER: '/trade/orders',
  SEAL: '/copyright/seals'
}
const businessRoute = computed(() => {
  const path = businessRouteMap[session.value.businessType]
  return path && Number(session.value.businessId) > 0 ? path : null
})
function goBusiness() {
  router.push({ path: businessRoute.value, query: { businessId: session.value.businessId } })
}
function formatTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '—'
}
// 默认靠左；仅当前管理员自己发出的消息靠右（以发送者身份判定，免疫移交后多管理员场景）
const isMine = (m) => String(m.senderId) === String(userStore.userId)

async function scrollToBottom() {
  await nextTick()
  const wrap = scrollRef.value?.wrapRef
  if (wrap) wrap.scrollTop = wrap.scrollHeight
}

async function loadSession() {
  const detail = await getSession(sessionId)
  session.value = detail || {}
}

async function loadMessages() {
  const data = await listMessages(sessionId)
  messages.value = Array.isArray(data?.list) ? data.list : []
  await scrollToBottom()
}

async function loadAll() {
  if (!sessionId) {
    ElMessage.error('缺少会话ID')
    return
  }
  loading.value = true
  try {
    await Promise.all([loadSession(), loadMessages()])
    await nextTick()
    if (disposed || document.hidden) return
    session.value = await openSession(sessionId, displayedMessageId())
    opened.value = true
    window.dispatchEvent(new Event('admin-chat-changed'))
  } catch {
    ElMessage.error('加载会话详情失败')
  } finally {
    loading.value = false
  }
}

function handleKeydown(e) {
  // Enter 发送；Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleSend() {
  if (loading.value || !isHandler.value || sending.value) return
  const content = draft.value.trim()
  if (!content) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (isClosed.value) {
    ElMessage.warning('会话已结束，无法发送消息')
    return
  }
  sending.value = true
  try {
    await sendMessage(sessionId, { content, msgType: 'TEXT' })
    draft.value = ''
    await Promise.all([loadSession(), loadMessages()])
  } catch {
    // 请求封装统一提示服务端错误
  } finally {
    sending.value = false
  }
}

async function handleChangeStatus(action) {
  acting.value = true
  try {
    await changeStatus(sessionId, action)
    ElMessage.success('状态已更新')
    await loadSession()
  } catch {
    // ignore
  } finally {
    acting.value = false
  }
}

function displayedMessageId() {
  return messages.value.reduce((max, message) => Math.max(max, Number(message.messageId) || 0), 0)
}

async function readDisplayedMessages() {
  if (document.hidden || !isHandler.value) return
  const unread = messages.value.filter(message => String(message.senderId) === String(session.value.user1Id) && !message.isRead)
  if (!unread.length) return
  await nextTick()
  if (disposed || document.hidden || !isHandler.value) return
  await markSessionRead(sessionId, displayedMessageId())
  unread.forEach(message => { message.isRead = true })
  window.dispatchEvent(new Event('admin-chat-changed'))
}

function goBack() {
  router.push(route.query.from === 'messages' ? { path: '/support/messages', query: { tab: 'chat' } } : { path: '/appuser/chat-sessions' })
}

// 5s 轮询刷新会话与消息，页面隐藏时暂停。
// 长连接可用时由服务端帧驱动刷新，轮询退居兜底并拉长；断开时恢复 5s 原频率。
const POLL_ACTIVE_MS = 5000
const POLL_IDLE_MS = 60000
let timer = null, refreshing = false, disposed = false, offRealtime = []
async function poll() {
  if (document.hidden || !sessionId || refreshing || disposed) return
  if (!opened.value) { if (!loading.value) await loadAll(); return }
  refreshing = true
  try {
    await Promise.all([loadSession(), loadMessages()])
    if (!disposed) await readDisplayedMessages()
  } catch { /* 后续刷新重试，不改变处理人。 */ }
  finally { refreshing = false }
}
function applyPollInterval() {
  if (timer) clearInterval(timer)
  timer = setInterval(poll, isRealtimeConnected() ? POLL_IDLE_MS : POLL_ACTIVE_MS)
}

onMounted(async () => {
  await loadAll()
  if (disposed) return
  applyPollInterval()
  document.addEventListener('visibilitychange', poll)
  offRealtime = [
    onRealtime('chat', frame => { if (String(frame?.sessionId) === String(sessionId)) poll() }),
    // 断线重连期间可能对端发了消息，立刻补拉一次
    onRealtime('reconnect', () => poll()),
    onRealtime('connected', applyPollInterval),
    onRealtime('disconnected', applyPollInterval)
  ]
})

onUnmounted(() => {
  disposed = true
  if (timer) clearInterval(timer)
  offRealtime.forEach(off => off())
  document.removeEventListener('visibilitychange', poll)
})
</script>

<style scoped>
.chat-detail { display: flex; gap: 20px; align-items: flex-start; }
.chat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.chat-main :deep(.el-card__body) { padding: 0; display: flex; flex-direction: column; }
.chat-head { display: flex; align-items: center; justify-content: space-between; }
.chat-head-user { display: flex; align-items: center; gap: 10px; }
.chat-head-user strong { display: block; font-size: 14px; color: #1f2329; }
.chat-head-user small { color: #8a8f99; font-size: 12px; }
.chat-scroll { height: 460px; }
.chat-messages { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
.chat-empty { text-align: center; color: #a8abb2; padding: 40px 0; }
.msg-row { display: flex; gap: 10px; align-items: flex-start; }
.msg-system { text-align: center; color: #a0a5ac; font-size: 12px; padding: 2px 0; }
.msg-row.mine { flex-direction: row-reverse; }
.msg-body { max-width: 70%; }
.msg-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #a0a5ac; margin-bottom: 4px; }
.msg-row.mine .msg-meta { flex-direction: row-reverse; }
.msg-bubble { padding: 9px 13px; border-radius: 8px; background: #f2f3f5; color: #303133; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.msg-row.mine .msg-bubble { background: #1f2329; color: #fff; }
.chat-input { border-top: 1px solid #f0f0f0; padding: 12px 16px; }
.chat-input-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 10px; }
.closed-tip { color: #f56c6c; font-size: 12px; margin-right: auto; }
.black-button { background-color: #1f2329 !important; border-color: #1f2329 !important; color: #fff !important; }
.close-btn { color: #fff !important; }
.close-btn:hover { color: #000 !important; }
.chat-side { width: 320px; min-width: 320px; }
.side-block { padding: 4px 0 18px; border-bottom: 1px solid #f0f0f0; margin-bottom: 16px; }
.side-block:last-child { border-bottom: 0; margin-bottom: 0; }
.side-title { font-size: 13px; font-weight: 600; color: #1f2329; margin-bottom: 12px; }
.biz-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; color: #303133; }
.status-actions { display: flex; flex-wrap: wrap; gap: 8px; }
@media (max-width: 900px) { .chat-detail { flex-direction: column; } .chat-side { width: 100%; min-width: 0; } }
</style>
