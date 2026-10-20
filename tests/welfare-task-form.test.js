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

test('handleAddTask 清空图标/每日上限/日期', async () => {
  const page = await setup('taskForm, taskDateRange, handleAddTask')
  page.taskForm.icon = 'book'
  page.taskForm.dailyLimit = 3
  page.taskDateRange.value = ['2026-01-01', '2026-02-01']
  page.handleAddTask()
  assert.equal(page.taskForm.icon, '')
  assert.equal(page.taskForm.dailyLimit, 0)
  assert.equal(page.taskDateRange.value, null)
})

test('handleEditTask 回填新字段与日期范围', async () => {
  const page = await setup('taskForm, taskDateRange, handleEditTask')
  page.handleEditTask({
    taskId: 9, taskName: '活动', taskType: 'ACTIVITY', taskCode: 'ACT',
    description: '', targetCount: 1, rewardPoints: 5, icon: 'gift', dailyLimit: 2,
    startTime: '2026-01-01 00:00:00', endTime: '2026-03-01 00:00:00',
    sort: 0, status: 1, remark: ''
  })
  assert.equal(page.taskForm.icon, 'gift')
  assert.equal(page.taskForm.dailyLimit, 2)
  assert.equal(page.taskDateRange.value[0], '2026-01-01 00:00:00')
  assert.equal(page.taskDateRange.value[1], '2026-03-01 00:00:00')
})

test('handleSubmitTask 日期范围转成 startTime/endTime', async () => {
  const calls = []
  const adminFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method, body: opts.body })
    return { json: async () => ({ code: 200 }) }
  }
  const page = await setup(
    'taskForm, taskDateRange, handleSubmitTask', { adminFetch }
  )
  page.taskForm.taskName = '活动'
  page.taskForm.taskType = 'ACTIVITY'
  page.taskDateRange.value = ['2026-01-01 00:00:00', '2026-03-01 00:00:00']
  await page.handleSubmitTask()
  const body = JSON.parse(calls[0].body)
  assert.equal(body.startTime, '2026-01-01 00:00:00')
  assert.equal(body.endTime, '2026-03-01 00:00:00')
})

test('handleSubmitTask 未设日期时不带 startTime', async () => {
  const calls = []
  const adminFetch = async (url, opts = {}) => {
    calls.push({ body: opts.body })
    return { json: async () => ({ code: 200 }) }
  }
  const page = await setup('taskForm, taskDateRange, handleSubmitTask', { adminFetch })
  page.taskForm.taskName = '每日'
  page.taskForm.taskType = 'DAILY'
  page.taskDateRange.value = null
  await page.handleSubmitTask()
  const body = JSON.parse(calls[0].body)
  assert.equal(body.startTime, undefined)
})
