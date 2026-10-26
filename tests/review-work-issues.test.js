import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { computed, ref, reactive } from 'vue'

// ---- 面板：AI 问题定位模式（红字 + 章节后驳回原因 + 只显示问题章节） ----
async function panelSetup(content, aiInfo, issues) {
  const source = await readFile(
    new URL('../src/views/copyright/ReviewWorkContentPanel.vue', import.meta.url), 'utf8'
  )
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  const context = {
    computed,
    defineProps: () => ({ content, loading: false, aiInfo, issues })
  }
  runInNewContext(`${code}\nthis.page = { hasIssues, hasAiResult, aiInfo, work, chapters, renderBody, escapeHtml, riskLevelText }`, context)
  return context.page
}

test('面板: 问题模式下只渲染问题章节的正文并红字标记命中词', async () => {
  const content = {
    work: { title: '测试剧本', summary: '一部充满暴力元素的简介' },
    chapters: [
      { chapterId: 1, chapterNo: 1, chapterTitle: '开端', content: '他拿起刀使用暴力，随后离开。' },
      { chapterId: 2, chapterNo: 2, chapterTitle: '发展', content: '一切正常。' }
    ]
  }
  const aiInfo = { score: 45, level: 'high' }
  const issues = [
    { chapterId: null, chapterNo: 0, chapterTitle: '简介', hits: [{ word: '暴力', snippet: '充满暴力元素' }] },
    { chapterId: 1, chapterNo: 1, chapterTitle: '开端', hits: [{ word: '暴力', snippet: '使用暴力' }] }
  ]
  const page = await panelSetup(content, aiInfo, issues)

  assert.equal(page.hasIssues.value, true)
  assert.equal(page.aiInfo.value.score, 45)
  assert.equal(page.riskLevelText.value, '高风险')
  // 章节2（无问题）不应出现在问题章节渲染来源中；问题项数量=2（简介+章节1）
  // renderBody 对命中词输出红字 span，且转义防 XSS
  const html = page.renderBody(issues[1])
  assert.match(html, /<span class="issue-word">暴力<\/span>/)
  // 简介项正文取自 work.summary
  const introHtml = page.renderBody(issues[0])
  assert.match(introHtml, /<span class="issue-word">暴力<\/span>/)
  // 未命中词不产生标记
  const noHitHtml = page.renderBody({ chapterId: 1, hits: [{ word: '不存在的词', snippet: '' }] })
  assert.equal(noHitHtml.includes('<span class="issue-word">'), false)
})

test('面板: 命中词转义防 XSS（正文含标签时先转义再标记）', async () => {
  const content = {
    work: { title: 't', summary: '' },
    chapters: [{ chapterId: 1, chapterNo: 1, chapterTitle: '开端', content: '<script>alert(1)</script>暴力内容' }]
  }
  const issues = [{ chapterId: 1, chapterNo: 1, chapterTitle: '开端', hits: [{ word: '暴力', snippet: '' }] }]
  const page = await panelSetup(content, { score: 30, level: 'high' }, issues)
  const html = page.renderBody(issues[0])
  assert.equal(html.includes('<script>'), false)
  assert.match(html, /&lt;script&gt;/)
})

test('面板: 有 aiInfo 但 issues 为空时提示人工查看全文', async () => {
  const content = { work: { title: 't', summary: '简介' }, chapters: [] }
  const page = await panelSetup(content, { score: 70, level: 'medium' }, [])
  assert.equal(page.hasIssues.value, false)
  assert.equal(page.hasAiResult.value, true)
})

test('面板: 无 issues 字段（旧接口）走兼容分支，hasIssues 为 false', async () => {
  const content = { work: { title: 't', summary: '简介' }, chapters: [{ chapterId: 1, chapterNo: 1, chapterTitle: '开端', content: '正文' }] }
  const page = await panelSetup(content, null, null)
  assert.equal(page.hasIssues.value, false)
  assert.equal(page.chapters.value.length, 1)
})

// ---- 审核工作台：联系用户时配置了"先发作品详情再跳转" ----
test('工作台: 联系用户注入 sendFirstMessage（发作品审核详情给用户）', async () => {
  const source = await readFile(
    new URL('../src/views/copyright/ReviewWorkbench.vue', import.meta.url), 'utf8'
  )
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  let capturedOpts = null
  const context = {
    ref, reactive, computed,
    onMounted() {}, onBeforeUnmount() {}, defineExpose() {},
    ElMessage: { success() {}, error() {}, warning() {}, info() {} },
    useContactUser: (opts) => {
      capturedOpts = opts
      return { handleContactUser() {} }
    }
  }
  runInNewContext(code, context)

  assert.ok(capturedOpts, '应调用 useContactUser')
  assert.equal(capturedOpts.businessType, 'WORK')
  assert.equal(typeof capturedOpts.sendFirstMessage, 'function', '应配置发送首条消息的回调')
  assert.equal(typeof capturedOpts.extractUserId, 'function')
})
