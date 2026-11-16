import { resolveComponent } from '@/router/component-map'

const DIAG = '[route-adapter]'

// These D-module paths must not fall back to the generic scaffold when a
// legacy server menu still returns its placeholder component identifier.
const PATH_COMPONENT_OVERRIDES = {
  '/support/messages': 'support/MessagesAnnouncements',
  '/copyright/assets': 'copyright/CopyrightAssets',
  '/copyright/seals': 'copyright/SealReview'
}

function messageRedirect(to) {
  return { path: '/support/messages', query: { ...to.query, tab: 'messages' }, hash: to.hash }
}

function chatRedirect(to) {
  return { path: '/support/messages', query: { ...to.query, tab: 'chat' }, hash: to.hash }
}

function isExternal(path) {
  return typeof path === 'string' && /^(https?:|mailto:|tel:)/i.test(path)
}

function joinPath(parentPath, childPath) {
  if (!childPath) return parentPath || '/'
  if (childPath.startsWith('/')) return childPath
  const base = !parentPath || parentPath === '/' ? '' : parentPath.replace(/\/$/, '')
  return `${base}/${childPath}`.replace(/\/{2,}/g, '/')
}

/**
 * 将若依 RouterVo 转为 Vue Router：所有已映射叶子页注册到 MainLayout 下的绝对路径。
 * 未知 component 默认拒绝。
 */
export function adaptRuoYiRoutes(routers) {
  const rejected = []
  const leaves = []
  const sidebar = []

  if (!Array.isArray(routers)) {
    console.warn(DIAG, 'getRouters payload is not an array')
    return { routes: [], rejected, sidebar: [] }
  }

  function walk(items, parentPath) {
    const localSidebar = []
    for (const item of items || []) {
      if (!item || typeof item !== 'object') continue
      if (isExternal(item.path) || isExternal(item.meta?.link)) continue

      const path = joinPath(parentPath, item.path || '')
      const componentId = PATH_COMPONENT_OVERRIDES[path] || item.component
      const childrenVo = Array.isArray(item.children) ? item.children : []
      const meta = {
        title: item.meta?.title || item.name || path,
        icon: item.meta?.icon || '',
        noCache: !!item.meta?.noCache,
        hidden: !!item.hidden
      }
      const isDir =
        componentId === 'Layout' ||
        componentId === 'ParentView' ||
        (!componentId && childrenVo.length > 0)

      if (isDir) {
        const childSidebar = walk(childrenVo, path)
        // 目录自身没有路由：子项全被白名单拒绝时它只会渲染成一个点不动的空壳，
        // 因此只在有可见子项时才进侧边栏（与 utils/ruoyi-response.js 的 empty-directory 判定一致）。
        if (childSidebar.length) {
          localSidebar.push({
            path,
            name: item.name || `Dir_${path.replace(/\W+/g, '_')}`,
            meta,
            hidden: !!item.hidden,
            children: childSidebar
          })
        }
        continue
      }

      const comp = resolveComponent(componentId)
      if (!comp) {
        rejected.push({ path, component: String(componentId || ''), reason: 'unknown-component' })
        continue
      }

      const isLegacyMessages = componentId === 'user/message/index'
      const isLegacyChat = componentId === 'chat/ChatSessions'
      const legacyRedirect = isLegacyMessages ? messageRedirect : isLegacyChat ? chatRedirect : null
      if (legacyRedirect) meta.hidden = true
      const leaf = {
        path,
        // name 必须全局唯一：同一组件可能用于多个菜单入口。
        name: (item.name ? `${item.name}` : String(componentId).replace(/[^\w]+/g, '_')) +
          '__' + path.replace(/[^\w]+/g, '_'),
        ...(legacyRedirect ? { redirect: legacyRedirect } : { component: comp }),
        meta,
        hidden: meta.hidden
      }
      leaves.push(leaf)
      if (!meta.hidden) {
        localSidebar.push({
          path,
          name: leaf.name,
          meta,
          hidden: false,
          children: []
        })
      }
    }
    return localSidebar
  }

  const topSidebar = walk(routers, '')
  sidebar.push(...topSidebar)

  // 旧菜单和收藏地址统一进入消息页；旧菜单不再出现在用户中心。
  const hasLegacyMessages = leaves.some(leaf => leaf.redirect === messageRedirect || leaf.redirect === chatRedirect)
  let hasMessagesPage = leaves.some(leaf => leaf.path === '/support/messages')
  if (hasLegacyMessages && !hasMessagesPage) {
    const messagesComp = resolveComponent('support/MessagesAnnouncements')
    if (messagesComp) {
      leaves.push({ path: '/support/messages', name: 'LegacyMessagesPage', component: messagesComp,
        meta: { title: '消息与公告', hidden: true }, hidden: true })
      hasMessagesPage = true
    }
  }
  if (hasMessagesPage) {
    for (const path of ['/appuser/message', '/user/message']) {
      if (!leaves.some(leaf => leaf.path === path)) {
        leaves.push({ path, name: `LegacyMessages_${path.replace(/\W+/g, '_')}`, redirect: messageRedirect,
          meta: { title: '用户消息', hidden: true }, hidden: true })
      }
    }
    for (const path of ['/appuser/chat-sessions']) {
      if (!leaves.some(leaf => leaf.path === path)) {
        leaves.push({ path, name: `LegacyChat_${path.replace(/\W+/g, '_')}`, redirect: chatRedirect,
          meta: { title: '用户沟通', hidden: true }, hidden: true })
      }
    }
  }

  const layoutComp = resolveComponent('Layout')
  // 接收者阅读只依赖后台身份。没有业务菜单的管理员也需要布局和阅读入口。
  // 隐藏路由不加入侧栏，也不提供任何公告管理能力。
  const inboxComp = resolveComponent('support/ReceivedAnnouncements')
  if (inboxComp && !leaves.some(leaf => leaf.path === '/support/announcements')) {
    leaves.push({ path: '/support/announcements', name: 'AdminReceivedAnnouncements', component: inboxComp,
      meta: { title: '后台公告', hidden: true }, hidden: true })
  }
  const visibleLeaves = leaves.filter((l) => !l.meta?.hidden)
  // 首页优先：数据总览(/workspace/dashboard) > 旧 /dashboard > App用户与创作者 > 首个可见叶子。
  // 根路由 '/' 的 redirect 据此解析，登录后即落到工作台数据总览。
  const preferred =
    visibleLeaves.find((l) => l.path === '/workspace/dashboard') ||
    visibleLeaves.find((l) => l.path === '/dashboard') ||
    visibleLeaves.find((l) => l.path === '/appuser/users') ||
    visibleLeaves[0] ||
    leaves[0]

  const routes = []
  if (layoutComp && leaves.length) {
    routes.push({
      path: '/',
      name: 'MainShell',
      component: layoutComp,
      redirect: preferred?.path || '/404',
      meta: { title: '首页', hidden: true },
      children: leaves
    })
  }

  return { routes, rejected, sidebar }
}

export default adaptRuoYiRoutes
