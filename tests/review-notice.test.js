import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildReviewNotice } from '../src/utils/reviewNotice.js'

test('有 issues 时消息包含原始驳回原因+问题章节+原文片段', () => {
  const row = { workTitle: '斗破', status: 'rejected' }
  const issues = [
    { chapterNo: 0, chapterTitle: '简介', hits: [{ word: '三十年河东，三十年河西，莫欺少年穷', snippet: '从被赶出家门的废物，到让整个都市都仰望' }] },
    { chapterNo: 1, chapterTitle: '归来', hits: [{ word: '三十年河东，三十年河西，莫欺少年穷', snippet: '大小姐？林羽抬起头，眼中闪过一丝冷冽' }] }
  ]
  const aiInfo = { score: 45, level: 'high', keywords: ['斗破', '版权查重风险'] }
  const msg = buildReviewNotice(row, issues, aiInfo)

  assert.ok(msg.includes('【作品审核结果通知】'))
  assert.ok(msg.includes('作品：《斗破》'))
  assert.ok(msg.includes('AI 评分：45 分（高风险）'))
  assert.ok(msg.includes('审核状态：已驳回'))
  assert.ok(msg.includes('AI 驳回原因：斗破、版权查重风险'))
  assert.ok(msg.includes('作品简介：命中「三十年河东，三十年河西，莫欺少年穷」'))
  assert.ok(msg.includes('第1章 归来：命中「三十年河东，三十年河西，莫欺少年穷」'))
  assert.ok(msg.includes('原文片段：「从被赶出家门的废物'))
  assert.ok(msg.includes('原文片段：「大小姐？林羽抬起头'))
  assert.ok(msg.includes('请根据上述问题修改后重新提交审核'))
})

test('snippet 超长时截断', () => {
  const row = { workTitle: 'A', status: 'rejected' }
  const longSnippet = 'x'.repeat(200)
  const msg = buildReviewNotice(row, [{ chapterNo: 1, chapterTitle: '一章', hits: [{ word: 'w', snippet: longSnippet }] }], { score: 30, level: 'high', keywords: [] })
  const line = msg.split('\n').find((l) => l.startsWith('  · 原文片段'))
  assert.ok(line.length < 120, '片段应截断到 80 字符内，实际长度=' + line.length)
  assert.ok(line.includes('…'))
})

test('无 issues 但有原因关键词：提示未定位到具体片段', () => {
  const row = { workTitle: 'B', status: 'rejected' }
  const msg = buildReviewNotice(row, [], { score: 40, level: 'medium', keywords: ['疑似《斗破苍穹》原文', '暴力描写'] })
  assert.ok(msg.includes('AI 未定位到具体片段，建议对照上述原因自查修改。'))
  assert.ok(msg.includes('AI 驳回原因：疑似《斗破苍穹》原文、暴力描写'))
})

test('rejected 且无任何 AI 数据：自动驳回兜底', () => {
  const msg = buildReviewNotice({ workTitle: 'C', status: 'rejected' }, null, null)
  assert.ok(msg.includes('AI 综合评分低于规则阈值，自动驳回。'))
  assert.ok(msg.includes('AI 评分：- 分'))
})

test('row 的 aiResult JSON 字符串可作 aiInfo 兜底', () => {
  const row = { workTitle: 'D', status: 'pending', aiResult: '{"score":88,"level":"low","keywords":["轻微"]}' }
  const msg = buildReviewNotice(row, [], null)
  assert.ok(msg.includes('AI 评分：88 分（低风险）'))
  assert.ok(msg.includes('AI 驳回原因：轻微'))
})
