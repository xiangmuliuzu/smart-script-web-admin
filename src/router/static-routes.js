/** 管理端公共路由；业务菜单由 /getRouters 动态注册。 */
export const constantRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/user/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/401',
    name: 'Page401',
    component: () => import('@/views/error/401.vue'),
    meta: { title: '未授权' }
  },
  {
    path: '/403',
    name: 'Page403',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限' }
  },
  {
    path: '/404',
    name: 'Page404',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '未找到' }
  },
  // catch-all：管理员动态路由注册前后未知路径都落 404（动态路由优先级高于通配，注册后不受影响）
  {
    path: '/:pathMatch(.*)*',
    name: 'Page404CatchAll',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '未找到' }
  }
]

export default constantRoutes
