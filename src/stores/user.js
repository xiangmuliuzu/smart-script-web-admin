import { defineStore } from 'pinia'
import { logout as logoutApi, getInfo } from '@/api/login'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { usePermissionStore } from '@/stores/permission'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    user: null,
    roles: [],
    permissions: [],
    infoLoaded: false
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.user?.nickName || state.user?.userName || '',
    userId: (state) => state.user?.userId || null
  },

  actions: {
    /** 若依登录成功后写入管理端会话；token 为若依管理端令牌（服务端已确认 user_type=00） */
    adoptAdminToken(token) {
      this.token = token
      setToken(token)
    },

    async fetchUserInfo() {
      const data = await getInfo()
      const user = data?.user || null
      // 账号域防御：管理端会话只允许 00；后端已在 /login 拦截，这里兜底防御旧 Token / 异常数据
      if (user?.userType && user.userType !== '00') {
        this.resetSession()
        throw new Error('该账号类型不允许在管理端登录')
      }
      this.user = user
      this.roles = Array.isArray(data?.roles) ? [...data.roles] : []
      const perms = data?.permissions
      this.permissions = Array.isArray(perms)
        ? [...perms]
        : perms && typeof perms === 'object'
          ? [...perms]
          : []
      this.infoLoaded = true
      return data
    },

    async logout({ callServer = true } = {}) {
      if (callServer && this.token) {
        try {
          await logoutApi()
        } catch (error) {
          console.error('退出接口失败，仍清理本地会话:', error?.message || error)
        }
      }
      this.resetSession()
    },

    resetSession() {
      this.token = ''
      this.user = null
      this.roles = []
      this.permissions = []
      this.infoLoaded = false
      removeToken()
      try {
        usePermissionStore().resetRoutes()
      } catch (e) {
        // store may not be active during early failures
      }
    },

    hasPermission(permission) {
      if (!permission) return true
      if (this.permissions.includes('*:*:*')) return true
      return this.permissions.includes(permission)
    }
  }
})
