import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
const source = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
const code = source.replace(/^import .*$/gm, '').replace('import.meta.env.BASE_URL', "'/'").replace('export default router', '')
function guard({ token = '', info = false, initialized = false, fail = false } = {}) {
  let beforeEach
  const calls = []
  runInNewContext(code, {
    createRouter: () => ({ beforeEach: handler => { beforeEach = handler } }), createWebHistory: () => ({}), constantRoutes: [], document: {}, console,
    getToken: () => token,
    useUserStore: () => ({ infoLoaded: info, resetSession: () => calls.push('reset'), fetchUserInfo: async () => { calls.push('getInfo'); if (fail) throw new Error('test auth failure') } }),
    usePermissionStore: () => ({ initialized, generateRoutes: async () => calls.push('getRouters') })
  })
  return { calls, run: async path => { let target; await beforeEach({ path, fullPath: path, query: {}, hash: '' }, {}, next => { target = next }); return target } }
}
test('anonymous admin visits require login and preserve local target', async () => {
  const current = guard()
  assert.equal((await current.run('/system/user')).path, '/login')
  assert.equal((await current.run('/system/user')).query.redirect, '/system/user')
})
test('admin token restores identity and dynamic menus; initialized routes do not repeat it', async () => {
  const current = guard({ token: 'admin' })
  assert.equal((await current.run('/system/user')).path, '/system/user')
  assert.deepEqual(current.calls, ['getInfo', 'getRouters'])
  const ready = guard({ token: 'admin', info: true, initialized: true })
  assert.equal(await ready.run('/system/user'), undefined)
  assert.deepEqual(ready.calls, [])
})
test('failed admin identity prevents menu initialization and clears the session', async () => {
  const current = guard({ token: 'bad', fail: true })
  assert.equal((await current.run('/system/user')).path, '/login')
  assert.deepEqual(current.calls, ['getInfo', 'reset'])
})
test('admin-only routes no longer register old user pages', async () => {
  const { constantRoutes } = await import('../src/router/static-routes.js')
  assert.equal(constantRoutes.some(route => route.path.startsWith('/pc/')), false)
  assert.ok(constantRoutes.some(route => route.path === '/login'))
})
