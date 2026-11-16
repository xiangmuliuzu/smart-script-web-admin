import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { reactive, ref, computed } from 'vue'

async function setup(exports, overrides = {}) {
  const source = await readFile(
    new URL('../src/views/welfare/WelfarePoints.vue', import.meta.url), 'utf8'
  )
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  const context = {
    reactive, ref, computed,
    onMounted() {}, onBeforeUnmount() {}, defineExpose() {},
    ElMessage: { error() {}, warning() {}, success() {}, info() {} },
    ElMessageBox: { confirm: async () => true },
    ...overrides
  }
  runInNewContext(`${code}\nthis.page = { ${exports} }`, context)
  return context.page
}

function mockFetch(handler) {
  const calls = []
  const adminFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body })
    return { json: async () => handler(url, opts) }
  }
  return { adminFetch, calls }
}

test('fetchExchangeRate 读取当前 tokenPerPoint 并同步输入框', async () => {
  const { adminFetch } = mockFetch(() => ({ code: 200, data: 1000 }))
  const page = await setup('tokenPerPoint, newTokenPerPoint, fetchExchangeRate', { adminFetch })
  await page.fetchExchangeRate()
  assert.equal(page.tokenPerPoint.value, 1000)
  assert.equal(page.newTokenPerPoint.value, 1000)
})

test('handleUpdateRate 合法配置走 PUT', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('tokenPerPoint, newTokenPerPoint, handleUpdateRate', { adminFetch })
  page.newTokenPerPoint.value = 2000
  await page.handleUpdateRate()
  assert.equal(calls[0].method, 'PUT')
  assert.equal(calls[0].url, '/api/v1/admin/ai/quota/token-per-point')
  assert.equal(JSON.parse(calls[0].body).tokenPerPoint, 2000)
  assert.equal(page.tokenPerPoint.value, 2000)
})

test('handleUpdateRate 配置小于1时拦截', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('newTokenPerPoint, handleUpdateRate', { adminFetch })
  page.newTokenPerPoint.value = 0
  await page.handleUpdateRate()
  assert.equal(calls.length, 0)
})

test('handleUpdateRate 后端返回失败时提示不改当前值', async () => {
  const { adminFetch } = mockFetch(() => ({ code: 400, msg: 'tokenPerPoint 必须为整数' }))
  const page = await setup('tokenPerPoint, newTokenPerPoint, handleUpdateRate', { adminFetch })
  page.tokenPerPoint.value = 1000
  page.newTokenPerPoint.value = 0
  await page.handleUpdateRate()
  assert.equal(page.tokenPerPoint.value, 1000)
})
