import { createRouter, createWebHistory } from 'vue-router'
import { constantRoutes } from '@/router/static-routes'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: constantRoutes })
router.beforeEach(async (to, from, next) => {
  const token = getToken()
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  document.title = to.meta?.title ? `${to.meta.title} - 剧云策运维管理端` : '剧云策运维管理端'
  if (to.path === '/login') {
    next(token ? '/' : undefined)
    return
  }
  if (!token) {
    userStore.resetSession()
    next({ path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } })
    return
  }
  if (!userStore.infoLoaded || !permissionStore.initialized) {
    try {
      if (!userStore.infoLoaded) await userStore.fetchUserInfo()
      if (!permissionStore.initialized) await permissionStore.generateRoutes()
      next({ path: to.path, query: to.query, hash: to.hash, replace: true })
    } catch (error) {
      console.error('[router] init failed', error?.message || error)
      userStore.resetSession()
      next({ path: '/login', query: { redirect: to.fullPath } })
    }
    return
  }
  next()
})
export default router
