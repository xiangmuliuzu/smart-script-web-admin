<template>
  <PageContainer>
    <PageHeader title="消息与公告" description="接收与回复用户沟通，发送用户消息，管理平台公告" />
    <el-tabs v-if="allowedTabs.length" v-model="activeTab" @tab-change="refreshTab">
      <el-tab-pane v-if="canChat" label="用户沟通" name="chat" lazy><ChatSessions ref="chatSessions" embedded /></el-tab-pane>
      <el-tab-pane v-if="canMessages" label="用户消息" name="messages" lazy><UserMessageManager ref="userMessages" /></el-tab-pane>
      <el-tab-pane v-if="canNotices" label="公告管理" name="announcements" lazy><NoticeManager @changed="notifyAnnouncementChange" /></el-tab-pane>
    </el-tabs>
    <el-empty v-else description="暂无消息或公告查询权限，请联系管理员授权" />
  </PageContainer>
</template>
<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import NoticeManager from '@/components/messages/NoticeManager.vue'
import UserMessageManager from '@/components/messages/UserMessageManager.vue'
import ChatSessions from '@/views/chat/ChatSessions.vue'
const userStore = useUserStore()
const route = useRoute()
const chatSessions = ref(null)
const userMessages = ref(null)
const canChat = computed(() => userStore.hasPermission('chat:session:list'))
const canMessages = computed(() => userStore.hasPermission('user:message:list'))
const canNotices = computed(() => userStore.hasPermission('system:notice:list'))
const allowedTabs = computed(() => [canChat.value && 'chat', canMessages.value && 'messages', canNotices.value && 'announcements'].filter(Boolean))
const activeTab = ref('')
function refreshTab(name) {
  const view = name === 'chat' ? chatSessions.value : name === 'messages' ? userMessages.value : null
  if (view) nextTick(() => view.refresh())
}
watch([() => route.query.tab, allowedTabs], ([tab, allowed]) => {
  activeTab.value = allowed.includes(tab) ? tab : allowed[0] || ''
}, { immediate: true })
function notifyAnnouncementChange() { window.dispatchEvent(new Event('announcements-changed')) }
</script>
