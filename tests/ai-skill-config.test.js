import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { reactive, ref } from 'vue'

async function setup(exports, overrides = {}) {
  const source = await readFile(
    new URL('../src/views/system/AiOperations.vue', import.meta.url), 'utf8'
  )
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  const context = {
    reactive, ref,
    URLSearchParams, FormData,
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
    calls.push({ url, method: opts.method || 'GET', body: opts.body, headers: opts.headers })
    return { json: async () => handler(url, opts) }
  }
  return { adminFetch, calls }
}

const BASE = '/api/v1/admin/content/ai-skill'

test('fetchList 组装分页与筛选参数并写入列表', async () => {
  const { adminFetch, calls } = mockFetch(() => ({
    code: 200, total: 2,
    rows: [{ id: 1, skillName: '悬疑烧脑导演', fileName: 'a.md', status: '0' }]
  }))
  const page = await setup('query, list, total, fetchList', { adminFetch })
  page.query.skillName = '悬疑'
  page.query.status = '0'
  await page.fetchList()
  assert.ok(calls[0].url.startsWith(`${BASE}/list?`))
  assert.ok(calls[0].url.includes('pageNum=1'))
  assert.ok(calls[0].url.includes('pageSize=10'))
  assert.ok(calls[0].url.includes('skillName=' + encodeURIComponent('悬疑')))
  assert.ok(calls[0].url.includes('status=0'))
  assert.equal(page.list.value.length, 1)
  assert.equal(page.total.value, 2)
})

test('handleSave 新增时未选文件被拦截', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('editingId, form, dialogVisible, handleSave', { adminFetch })
  page.editingId.value = null
  page.form.skillName = '古风武侠导演'
  page.form.file = null
  await page.handleSave()
  assert.equal(calls.length, 0)
})

test('handleSave 名称为空被拦截', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('editingId, form, handleSave', { adminFetch })
  page.editingId.value = null
  page.form.skillName = '  '
  page.form.file = {}
  await page.handleSave()
  assert.equal(calls.length, 0)
})

test('handleSave 新增走 POST 且 FormData 含 skillName 与 file', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('editingId, form, dialogVisible, submitting, handleSave, fetchList', { adminFetch })
  page.editingId.value = null
  page.form.skillName = '古风武侠导演'
  page.form.file = { name: 'gufeng.md', size: 100 }
  page.form.status = '0'
  await page.handleSave()
  assert.equal(calls.length >= 1, true)
  const saveCall = calls[0]
  assert.equal(saveCall.method, 'POST')
  assert.equal(saveCall.url, BASE)
  assert.ok(saveCall.body instanceof FormData)
  assert.equal(saveCall.body.get('skillName'), '古风武侠导演')
  assert.ok(saveCall.body.get('file'))
  assert.equal(saveCall.body.get('status'), '0')
  assert.equal(page.dialogVisible.value, false)
})

test('handleSave 编辑走 PUT 且 FormData 含 id（不传文件时保留原内容）', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('editingId, form, dialogVisible, submitting, handleSave, fetchList', { adminFetch })
  page.editingId.value = 7
  page.form.skillName = '古风武侠导演v2'
  page.form.file = null
  page.form.status = '1'
  await page.handleSave()
  const saveCall = calls[0]
  assert.equal(saveCall.method, 'PUT')
  assert.equal(saveCall.body.get('id'), '7')
  assert.equal(saveCall.body.get('skillName'), '古风武侠导演v2')
  assert.equal(saveCall.body.get('file'), null)
  assert.equal(saveCall.body.get('status'), '1')
})

test('toggleStatus 停用时 PUT status=1', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('fetchList, toggleStatus', { adminFetch })
  await page.toggleStatus({ id: 2, skillName: '甜宠爆款导演', status: '0' })
  const call = calls[0]
  assert.equal(call.method, 'PUT')
  assert.equal(call.url, BASE)
  assert.equal(call.body.get('id'), '2')
  assert.equal(call.body.get('status'), '1')
})

test('handleDelete 走 DELETE /{id}', async () => {
  const { adminFetch, calls } = mockFetch(() => ({ code: 200 }))
  const page = await setup('fetchList, handleDelete', { adminFetch })
  await page.handleDelete({ id: 7, skillName: '古风武侠导演' })
  assert.equal(calls[0].method, 'DELETE')
  assert.equal(calls[0].url, `${BASE}/7`)
})

test('openDetail 拉取详情并回填预览', async () => {
  const { adminFetch, calls } = mockFetch((url) => {
    if (url === `${BASE}/1`) return { code: 200, data: { skillName: '悬疑烧脑导演', fileName: 'a.md', fileContent: '你是悬疑导演...' } }
    return { code: 404 }
  })
  const page = await setup('detail, detailVisible, openDetail', { adminFetch })
  await page.openDetail({ id: 1 })
  assert.equal(page.detail.skillName, '悬疑烧脑导演')
  assert.equal(page.detail.fileContent, '你是悬疑导演...')
  assert.equal(page.detailVisible.value, true)
})
