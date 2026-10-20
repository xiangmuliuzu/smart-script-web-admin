import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { ref, reactive, computed } from 'vue'

// ---- 面板组件 ----
async function panelSetup(content, loading = false) {
  const source = await readFile(
    new URL('../src/views/copyright/ReviewWorkContentPanel.vue', import.meta.url), 'utf8'
  )
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  const context = { computed, defineProps: () => ({ content, loading }) }
  runInNewContext(`${code}\nthis.page = { work, chapters }`, context)
  return context.page
}

test('面板: 有内容时取简介与章节', async () => {
  const content = {
    work: { title: '测试剧本', summary: '一个简介' },
    chapters: [
      { chapterId: 1, chapterNo: 1, chapterTitle: '开端', content: '正文A' },
      { chapterId: 2, chapterNo: 2, chapterTitle: '发展', content: '正文B' }
    ]
  }
  const page = await panelSetup(content)
  assert.equal(page.work.value.summary, '一个简介')
  assert.equal(page.chapters.value.length, 2)
  assert.equal(page.chapters.value[0].content, '正文A')
})

test('面板: content 为 null 时安全兜底', async () => {
  const page = await panelSetup(null)
  assert.equal(Object.keys(page.work.value).length, 0)
  assert.equal(page.chapters.value.length, 0)
})

// ---- 审核页加载内容 ----
async function wbSetup(overrides = {}) {
  const source = await readFile(
    new URL('../src/views/copyright/ReviewWorkbench.vue', import.meta.url), 'utf8'
  )
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  const context = {
    ref, reactive, computed,
    onMounted() {}, onBeforeUnmount() {}, defineExpose() {},
    useContactUser: () => ({ handleContactUser() {} }),
    ElMessage: { success() {}, error() {}, warning() {}, info() {} },
    ...overrides
  }
  runInNewContext(`${code}\nthis.page = { loadReviewContent }`, context)
  return context.page
}

test('loadReviewContent: 成功返回 data', async () => {
  const adminFetch = async () => ({
    json: async () => ({ code: 200, data: { workId: 84, work: {}, chapters: [] } })
  })
  const page = await wbSetup({ adminFetch })
  const data = await page.loadReviewContent(7)
  assert.equal(data.workId, 84)
})

test('loadReviewContent: 接口异常返回 null', async () => {
  const adminFetch = async () => { throw new Error('network') }
  const page = await wbSetup({ adminFetch })
  const data = await page.loadReviewContent(7)
  assert.equal(data, null)
})
