import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Run the production adapter with a component resolver stub: Node cannot import Vue SFCs.
const source = await readFile(new URL('../src/router/route-adapter.js', import.meta.url), 'utf8')
const code = source.replace("import { resolveComponent } from '@/router/component-map'", `
const known = new Set(['Layout', 'user/message/index', 'chat/ChatSessions', 'support/MessagesAnnouncements', 'support/ReceivedAnnouncements', 'user/feedback/index'])
const resolveComponent = id => known.has(id) ? { id } : undefined
`)
const { adaptRuoYiRoutes } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const oldMenu = { path: 'appuser', component: 'Layout', children: [
  { path: 'message', component: 'user/message/index', meta: { title: '用户消息' } },
  { path: 'feedback', component: 'user/feedback/index', meta: { title: '用户反馈' } }
] }
const operations = { path: 'operation', component: 'Layout', children: [
  { path: '/support/messages', component: 'support/MessagesAnnouncements', meta: { title: '消息与公告' } }
] }

test('old message menu redirects to its tab while other user center entries remain visible', () => {
  const result = adaptRuoYiRoutes([oldMenu, operations])
  const leaves = result.routes[0].children
  const legacy = leaves.find(item => item.path === '/appuser/message')
  assert.deepEqual(legacy.redirect({ query: { page: '2', tab: 'chat' }, hash: '#receipt' }), {
    path: '/support/messages', query: { page: '2', tab: 'messages' }, hash: '#receipt'
  })
  assert.equal(legacy.hidden, true)
  assert.equal(leaves.filter(item => item.path === '/support/messages').length, 1)
  assert.deepEqual(result.sidebar[0].children.map(item => item.path), ['/appuser/feedback'])
  assert.deepEqual(result.sidebar[1].children.map(item => item.path), ['/support/messages'])
})

test('migrated menu preserves both legacy bookmarks without adding sidebar entries', () => {
  const result = adaptRuoYiRoutes([operations])
  const leaves = result.routes[0].children
  for (const path of ['/appuser/message', '/user/message']) {
    const legacy = leaves.find(item => item.path === path)
    assert.equal(legacy.hidden, true)
    assert.equal(legacy.redirect({ query: {}, hash: '' }).query.tab, 'messages')
  }
  assert.equal(result.sidebar.length, 1)
  assert.equal(result.routes[0].redirect, '/support/messages')
})

test('legacy backend menu remains usable while awaiting the database migration', () => {
  const result = adaptRuoYiRoutes([{ ...oldMenu, children: [oldMenu.children[0]] }])
  const target = result.routes[0].children.find(item => item.path === '/support/messages')
  assert.equal(target.component.id, 'support/MessagesAnnouncements')
  assert.equal(target.hidden, true)
  assert.deepEqual(result.sidebar, [])
})

test('accounts with no message menu get no message management routes or aliases', () => {
  const result = adaptRuoYiRoutes([])
  assert.deepEqual(result.routes[0].children.map(item => item.path), ['/support/announcements'])
})

test('retired session list redirects to user communication and leaves other menus visible', () => {
  const chatMenu = { path: 'chat-sessions', component: 'chat/ChatSessions', meta: { title: '会话列表' } }
  for (const menus of [
    [{ ...oldMenu, children: [chatMenu, oldMenu.children[1]] }, operations],
    [{ ...oldMenu, children: [chatMenu] }],
    [operations]
  ]) {
    const result = adaptRuoYiRoutes(menus)
    const leaves = result.routes[0].children
    const legacy = leaves.find(item => item.path === '/appuser/chat-sessions')
    assert.equal(legacy.hidden, true)
    assert.deepEqual(legacy.redirect({ query: { keyword: '用户', tab: 'messages' }, hash: '#session' }), {
      path: '/support/messages', query: { keyword: '用户', tab: 'chat' }, hash: '#session'
    })
    assert.equal(leaves.filter(item => item.path === '/support/messages').length, 1)
    assert.ok(!JSON.stringify(result.sidebar).includes('会话列表'))
    if (menus.length === 2) assert.equal(result.sidebar[0].children[0].path, '/appuser/feedback')
  }
})
