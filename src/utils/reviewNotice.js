// 作品审核结果通知拼装（纯函数，便于单测）。
// 管理员侧消息保持简洁（评分/风险/状态/问题定位），用户侧额外带上：
//  - AI 原始驳回原因关键词（reasonKeywords）
//  - 每个问题章节的命中词 + 上下文片段（snippet），让用户能看到具体问题内容
const STATUS_TEXT = { pending: '待审核', manual_review: '待人工复核', ai_reviewing: 'AI审核中', approved: '已通过', rejected: '已驳回' }
const LEVEL_TEXT = { low: '低风险', medium: '中风险', high: '高风险' }

function parseAiResult (row) {
  try {
    if (!row || !row.aiResult) return { score: null, level: '', keywords: [] }
    const obj = typeof row.aiResult === 'string' ? JSON.parse(row.aiResult) : row.aiResult
    return { score: obj.score ?? null, level: obj.level || '', keywords: Array.isArray(obj.keywords) ? obj.keywords.filter(Boolean) : [] }
  } catch (e) {
    return { score: null, level: '', keywords: [] }
  }
}

function cut (s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

// row: 列表行（workTitle/aiScore/aiResult/status）；issues: 详情接口返回的问题定位；aiInfo: 详情接口返回的 {score,level,keywords}
export function buildReviewNotice (row, issues, aiInfo) {
  const parts = []
  parts.push('【作品审核结果通知】')
  parts.push('作品：《' + (row.workTitle || row.workName || '') + '》')
  const ai = aiInfo || parseAiResult(row)
  const score = ai.score != null ? ai.score : '-'
  parts.push('AI 评分：' + score + ' 分' + (ai.level ? '（' + (LEVEL_TEXT[ai.level] || ai.level) + '）' : ''))
  parts.push('审核状态：' + (STATUS_TEXT[row.status] || row.status || '-'))

  const reasonKeywords = (Array.isArray(ai.keywords) ? ai.keywords : []).filter(Boolean)
  if (reasonKeywords.length) {
    parts.push('AI 驳回原因：' + reasonKeywords.join('、'))
  }

  const issueList = Array.isArray(issues) ? issues : []
  if (issueList.length) {
    parts.push('AI 问题定位（请重点修改以下内容）：')
    for (const iss of issueList) {
      const title = iss.chapterNo === 0 ? '作品简介' : '第' + iss.chapterNo + '章 ' + (iss.chapterTitle || '')
      const hits = Array.isArray(iss.hits) ? iss.hits : []
      const words = hits.map((h) => h.word).filter(Boolean).join('、')
      parts.push('- ' + title + '：命中「' + (words || '未标注') + '」')
      for (const h of hits) {
        if (h.snippet) {
          parts.push('  · 原文片段：「' + cut(h.snippet, 80) + '」')
        }
      }
    }
  } else if (reasonKeywords.length) {
    parts.push('AI 未定位到具体片段，建议对照上述原因自查修改。')
  } else if (row.status === 'rejected') {
    parts.push('AI 综合评分低于规则阈值，自动驳回。')
  }

  parts.push('请根据上述问题修改后重新提交审核，谢谢配合。')
  return parts.join('\n')
}
