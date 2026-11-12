<template>
  <div class="main-layout">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="240px" class="sidebar">
        <div class="logo">
          <el-icon class="logo-icon"><Files /></el-icon>
          <h2>剧云策</h2>
        </div>

        <el-scrollbar class="menu-scrollbar">
          <!-- 菜单树来自 /getRouters，节点渲染见 components/SidebarMenuItem.vue -->
          <el-menu
            :default-active="activeMenu"
            :unique-opened="false"
            router
            class="sidebar-menu"
          >
            <SidebarMenuItem
              v-for="item in menuTree"
              :key="item.path"
              :item="item"
              :depth="0"
            />
          </el-menu>
        </el-scrollbar>

        <!-- 底部管理员信息栏 -->
        <div class="sidebar-footer">
          <div class="admin-info">
            <el-avatar :size="36" class="admin-avatar">
              <el-icon><Avatar /></el-icon>
            </el-avatar>
            <div class="admin-details">
              <div class="admin-name">{{ userStore.username || '未登录' }}</div>
              <div class="admin-role">{{ roleLabel }}</div>
            </div>
            <el-icon class="logout-icon" @click="handleCommand('logout')">
              <Right />
            </el-icon>
          </div>
        </div>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <!-- 顶部导航 -->
        <el-header class="header">
          <div class="header-content">
            <div class="breadcrumb">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
                <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
              </el-breadcrumb>
            </div>
            <div class="header-right">
              <AdminCommunicationInbox />
              <el-dropdown @command="handleCommand">
                <span class="user-info">
                  <el-icon><Avatar /></el-icon>
                  {{ userStore.username || '未登录' }}
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="password">修改密码</el-dropdown-item>
                    <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>

        <!-- 内容区域 -->
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
    <ChangePasswordDialog v-model="passwordDialogVisible" @success="handlePasswordChanged" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Files, Avatar, Right } from '@element-plus/icons-vue'
import SidebarMenuItem from '@/components/SidebarMenuItem.vue'
import AdminCommunicationInbox from '@/components/messages/AdminCommunicationInbox.vue'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const permissionStore = usePermissionStore()

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 当前页面标题
const currentTitle = computed(() => route.meta.title || '')

const roleLabel = computed(() => {
  const roles = userStore.roles || []
  return roles.length ? roles.join(' / ') : '—'
})

/** 递归剔除 hidden 节点；空 children 的目录按叶子项渲染，与改造前一致。 */
function sanitize(nodes) {
  return (nodes || [])
    .filter((node) => node && !node.hidden)
    .map((node) => ({ ...node, children: sanitize(node.children) }))
}

/** 服务端菜单树（permission store），无硬编码生产菜单回退 */
const menuTree = computed(() => sanitize(permissionStore.sidebarRoutes))

// 修改密码弹窗
const passwordDialogVisible = ref(false)

/** 改密成功后退出当前会话，强制用新密码重新登录 */
const handlePasswordChanged = async () => {
  try {
    await userStore.logout()
  } catch (error) {
    console.error('退出失败:', error)
  }
  permissionStore.resetRoutes()
  router.push('/login')
}

// 处理下拉菜单命令
const handleCommand = async (command) => {
  if (command === 'password') {
    passwordDialogVisible.value = true
    return
  }
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确认退出登录？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await userStore.logout()
      permissionStore.resetRoutes()
      ElMessage.success('退出成功')
      router.push('/login')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('退出失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

/* ==================== 侧边栏样式 ==================== */
.sidebar {
  background-color: #1f2329;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.05);
}

/* Logo 区域 */
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #1a1d23;
  color: #fff;
  border-bottom: 1px solid #2a2e35;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
  color: #909399;
}

.logo h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1px;
}

/* 菜单滚动区域 */
.menu-scrollbar {
  flex: 1;
  overflow-y: auto;
}

.menu-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.menu-scrollbar :deep(.el-scrollbar__view) {
  padding-bottom: 20px;
}

/* 菜单容器：深浅色由 Element Plus 菜单变量接管 */
.sidebar-menu {
  border-right: none;
  --el-menu-bg-color: #1f2329;
  --el-menu-text-color: #8a8f99;
  --el-menu-active-color: #ffffff;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.05);
  --el-menu-hover-text-color: #c0c4cc;
}

/* 菜单项通用几何：缩进由节点的 --menu-indent 决定（见 SidebarMenuItem.vue） */
.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  height: 40px;
  line-height: 40px;
  padding-left: var(--menu-indent, 20px) !important;
  margin: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
}

.sidebar-menu :deep(.el-menu-item .el-icon),
.sidebar-menu :deep(.el-sub-menu__title .el-icon) {
  font-size: 17px;
  margin-right: 10px;
  vertical-align: middle;
}

.sidebar-menu :deep(.el-menu-item span),
.sidebar-menu :deep(.el-sub-menu__title span) {
  vertical-align: middle;
  font-size: 15px;
}

/* 一级分组标题：参考设计里它是无图标的小节标题 */
.sidebar-menu :deep(.menu-depth-0.el-sub-menu > .el-sub-menu__title) {
  background-color: rgba(255, 255, 255, 0.03);
  border-left: 3px solid #4a4d52;
  margin: 8px 8px 4px 8px;
  padding-left: 17px !important;
}

.sidebar-menu :deep(.menu-depth-0.el-sub-menu > .el-sub-menu__title > span) {
  font-size: 15px;
  color: #909399;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: "Arial", "Helvetica Neue", sans-serif;
  opacity: 0.85;
}

/* 二级及以下的分组标题：带图标，退回普通菜单项观感 */
.sidebar-menu :deep(.el-sub-menu .el-sub-menu__title) {
  background-color: transparent;
  border-left: none;
  margin: 2px 8px;
  padding-left: var(--menu-indent, 30px) !important;
}

/* 悬停效果 - 柔和 */
.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu .el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: #c0c4cc !important;
}

/* 一级分组标题悬停时有轻微变化 */
.sidebar-menu :deep(.menu-depth-0.el-sub-menu > .el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: #c0c4cc !important;
  border-left-color: #606266;
  cursor: pointer;
}

/* 选中态 - 灰色背景 + 左侧白色竖条 */
.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  position: relative;
}

.sidebar-menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background-color: #ffffff;
  border-radius: 0 2px 2px 0;
}

/* 一级分组下的子菜单项 */
.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  height: 38px;
  line-height: 38px;
  margin: 1px 8px;
  min-width: auto;
}

/* 二级嵌套（如 AI初审下的子项） */
.sidebar-menu :deep(.el-sub-menu .el-sub-menu .el-menu-item) {
  height: 36px;
  line-height: 36px;
  font-size: 15px;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item .el-icon) {
  font-size: 15px;
  margin-right: 8px;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item span) {
  font-size: 15px;
}

/* 子菜单展开箭头 */
.sidebar-menu :deep(.el-sub-menu__icon-arrow) {
  font-size: 12px;
  margin-right: 6px;
  color: #c0c4cc;
  font-weight: bold;
}

/* 一级分组标题的箭头更明显 */
.sidebar-menu :deep(.menu-depth-0.el-sub-menu > .el-sub-menu__title .el-sub-menu__icon-arrow) {
  font-size: 13px;
  color: #909399;
  font-weight: bold;
}

/* 菜单角标（红色数字提示） */
.menu-badge {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
}

.menu-badge :deep(.el-badge__content) {
  background-color: #f56c6c;
  border: none;
  height: 18px;
  line-height: 18px;
  padding: 0 6px;
  font-size: 11px;
  border-radius: 9px;
  font-weight: 500;
}

/* ==================== 底部管理员信息栏 ==================== */
.sidebar-footer {
  flex-shrink: 0;
  background-color: #1a1d23;
  border-top: 1px solid #2a2e35;
  padding: 12px;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px 10px;
  border-radius: 6px;
}

.admin-info:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.admin-avatar {
  background-color: #606266;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.admin-details {
  flex: 1;
  min-width: 0;
}

.admin-name {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-role {
  font-size: 11px;
  color: #8a8f99;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-icon {
  font-size: 14px;
  color: #8a8f99;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.admin-info:hover .logout-icon {
  color: #c0c4cc;
  transform: translateX(2px);
}

/* ==================== 顶部导航栏 ==================== */
.header {
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #606266;
  font-size: 12px;
}

.user-info:hover {
  background-color: #f5f7fa;
  color: #303133;
}

.user-info .el-icon {
  margin-right: 6px;
  font-size: 16px;
}

/* ==================== 主内容区 ==================== */
.main-content {
  background-color: #f5f6f8;
  overflow-y: auto;
  /* 预留滚动条槽位，避免内容高度临界时滚动条反复出现/消失引发布局抖动 */
  scrollbar-gutter: stable;
  padding: 0;
}
</style>
