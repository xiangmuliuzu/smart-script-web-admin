import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { reactive, ref } from 'vue'

const source = await readFile(new URL('../src/views/user/UserManage.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const setupCode = descriptor.scriptSetup.content.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')

function setup(fetchUsers) {
  const context = { reactive, ref, onMounted: () => {}, listAppUsers: fetchUsers }
  runInNewContext(`${setupCode}\nthis.page = { filterForm, query, userList, total, loading, handleSearch, handleReset, onPageChange, loadUsers }`, context)
  return context.page
}

test('dropdown changes and Enter apply the current filters', () => {
  const template = descriptor.template.content
  const selects = [...template.matchAll(/<el-select\b[^>]*>/g)].map(match => match[0])
  assert.equal(selects.length, 3)
  for (const select of selects) assert.match(select, /@change="handleSearch"/)
  assert.match(template, /@keyup\.enter="handleSearch"/)
  assert.match(template, /placeholder="手机号"/)
  assert.doesNotMatch(template, /filterForm\.nickname/)
})

test('search and reset preserve false filters, reset pagination and refresh rows', async () => {
  const requests = []
  const page = setup(async params => {
    requests.push(params)
    return { rows: [{ userId: params.authorCapability === false ? 2 : 1 }], total: 1 }
  })
  page.query.pageNum = 5
  Object.assign(page.filterForm, { authorCapability: false, status: '0', realNameStatus: 'PENDING', keyword: ' 14786152186 ' })
  page.handleSearch()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(requests[0].pageNum, 1)
  assert.equal(requests[0].authorCapability, false)
  assert.equal(requests[0].status, '0')
  assert.equal(requests[0].realNameStatus, 'PENDING')
  assert.equal(requests[0].keyword, '14786152186')
  assert.equal(Object.hasOwn(requests[0], 'nickname'), false)
  assert.equal(page.userList.value[0].userId, 2)
  page.handleReset()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(requests[1].authorCapability, undefined)
  assert.equal(requests[1].keyword, undefined)
  assert.equal(requests[1].pageNum, 1)
})

test('a slower previous query cannot overwrite the newest filters', async () => {
  const responses = []
  const page = setup(() => new Promise(resolve => responses.push(resolve)))
  page.filterForm.authorCapability = true
  page.handleSearch()
  page.filterForm.authorCapability = false
  page.handleSearch()
  responses[1]({ rows: [{ userId: 2 }], total: 1 })
  await new Promise(resolve => setImmediate(resolve))
  responses[0]({ rows: [{ userId: 1 }], total: 10 })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(page.userList.value[0].userId, 2)
  assert.equal(page.total.value, 1)
  assert.equal(page.loading.value, false)
})
