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

function mockFetch(response) {
  const calls = []
  const adminFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body })
    return { json: async () => response }
  }
  return { adminFetch, calls }
}

test('adTypeLabel 映射广告形式，未知值原样返回', async () => {
  const page = await setup('adTypeLabel')
  assert.equal(page.adTypeLabel('reward_video'), '激励视频')
  assert.equal(page.adTypeLabel('reward_image'), '图文广告')
  assert.equal(page.adTypeLabel('unknown'), 'unknown')
})

test('fetchAdTasks 走福利广告接口并解析 rows', async () => {
  const rows = [
    { adId: 6, adName: '看激励视频得积分', adType: 'reward_video', frequencyLimit: 5, rewardPoints: 10 }
  ]
  const { adminFetch, calls } = mockFetch({ code: 200, rows })
  const page = await setup('adQuery, adTaskList, fetchAdTasks', { adminFetch })
  await page.fetchAdTasks()
  assert.match(calls[0].url, /^\/api\/v1\/admin\/welfare\/ad\/list/)
  assert.equal(page.adTaskList.value.length, 1)
  assert.equal(page.adTaskList.value[0].adName, '看激励视频得积分')
})

test('fetchAdTasks 带查询条件时拼接参数', async () => {
  const { adminFetch, calls } = mockFetch({ code: 200, rows: [] })
  const page = await setup('adQuery, fetchAdTasks', { adminFetch })
  page.adQuery.adName = '激励'
  page.adQuery.adType = 'reward_video'
  await page.fetchAdTasks()
  assert.match(calls[0].url, /adName=/)
  assert.match(calls[0].url, /adType=reward_video/)
})

test('handleAddAdTask 重置默认值并打开弹窗', async () => {
  const page = await setup('adForm, adDialogVisible, handleAddAdTask')
  page.adForm.adName = '残留数据'
  page.handleAddAdTask()
  assert.equal(page.adDialogVisible.value, true)
  assert.equal(page.adForm.adName, '')
  assert.equal(page.adForm.adType, 'reward_video')
  assert.equal(page.adForm.frequencyLimit, 5)
  assert.equal(page.adForm.rewardPoints, 10)
})

test('handleSubmitAdTask 新增走 POST', async () => {
  const { adminFetch, calls } = mockFetch({ code: 200 })
  const page = await setup('adForm, adDialogVisible, isEditAdTask, handleSubmitAdTask, fetchAdTasks', {
    adminFetch
  })
  page.isEditAdTask.value = false
  page.adForm.adName = '新广告任务'
  page.adForm.adType = 'reward_video'
  await page.handleSubmitAdTask()
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].url, '/api/v1/admin/welfare/ad')
  const body = JSON.parse(calls[0].body)
  assert.equal(body.adName, '新广告任务')
})

test('handleSubmitAdTask 编辑走 PUT', async () => {
  const { adminFetch, calls } = mockFetch({ code: 200 })
  const page = await setup('adForm, isEditAdTask, handleSubmitAdTask, fetchAdTasks', { adminFetch })
  page.isEditAdTask.value = true
  page.adForm.adId = 6
  page.adForm.adName = '改后任务'
  page.adForm.adType = 'reward_video'
  await page.handleSubmitAdTask()
  assert.equal(calls[0].method, 'PUT')
})

test('handleSubmitAdTask 未填名称时拦截不发请求', async () => {
  const { adminFetch, calls } = mockFetch({ code: 200 })
  const page = await setup('adForm, handleSubmitAdTask', { adminFetch })
  page.adForm.adName = ''
  page.adForm.adType = 'reward_video'
  await page.handleSubmitAdTask()
  assert.equal(calls.length, 0)
})

test('handleToggleAdTask 切换启停状态', async () => {
  const { adminFetch, calls } = mockFetch({ code: 200 })
  const page = await setup('handleToggleAdTask, fetchAdTasks', { adminFetch })
  await page.handleToggleAdTask({
    adId: 6, adName: '任务', adType: 'reward_video', isEnabled: 1
  })
  assert.equal(calls[0].method, 'PUT')
  const body = JSON.parse(calls[0].body)
  assert.equal(body.isEnabled, 0)
})

test('handleDeleteAdTask 走 DELETE', async () => {
  const { adminFetch, calls } = mockFetch({ code: 200 })
  const page = await setup('handleDeleteAdTask', { adminFetch })
  await page.handleDeleteAdTask({ adId: 6, adName: '任务' })
  assert.equal(calls[0].method, 'DELETE')
  assert.equal(calls[0].url, '/api/v1/admin/welfare/ad/6')
})
