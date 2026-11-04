import { useUserStore } from '@/stores/user'

/**
 * 按钮权限前端体验层：以 /getInfo 的 permissions 为准，支持 *:*:*。
 * 不得用角色名称绕过权限标识；真正授权由后端完成。
 */
function applyPermission(el, binding) {
  const required = Array.isArray(binding.value) ? binding.value : [binding.value]
  const userStore = useUserStore()
  const allowed = required.some((permission) => userStore.hasPermission(permission))
  if (!allowed) {
    el.parentNode?.removeChild(el)
  }
}

export function registerPermissionDirective(app) {
  app.directive('permission', {
    mounted: applyPermission
  })
  // 若依惯用指令名，与 v-permission 等价
  app.directive('hasPermi', {
    mounted: applyPermission
  })
}
