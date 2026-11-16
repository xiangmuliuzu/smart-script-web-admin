<template>
  <div class="content-panel">
    <div v-if="loading" class="content-tip">内容加载中…</div>
    <template v-else-if="content">
      <!-- AI 审核结果概览 -->
      <div v-if="hasIssues" class="section">
        <div class="section-label">AI 审核结果</div>
        <div class="ai-summary">
          AI 综合评分：
          <b :class="scoreClass">{{ aiInfo.score != null ? aiInfo.score + ' 分' : '-' }}</b>
          <el-tag :type="riskTagType" size="small" style="margin-left: 8px">{{ riskLevelText }}</el-tag>
        </div>
      </div>

      <!-- 问题模式：只展示有问题的地方（简介/章节命中词红字 + 章节后 AI 驳回原因） -->
      <template v-if="hasIssues">
        <el-divider content-position="left">问题定位（{{ issues.length }} 处）</el-divider>
        <div
          v-for="iss in issues"
          :key="iss.chapterId != null ? iss.chapterId : 'intro'"
          class="chapter"
        >
          <div class="chapter-title">
            {{ iss.chapterNo === 0 ? '作品简介' : '第' + iss.chapterNo + '章 ' + (iss.chapterTitle || '') }}
          </div>
          <div class="chapter-body" v-html="renderBody(iss)"></div>
          <div class="issue-reason">
            AI 驳回原因：
            <el-tag
              v-for="kw in reasonKeywords"
              :key="kw"
              type="danger"
              size="small"
              style="margin: 2px 4px 2px 0"
            >
              {{ kw }}
            </el-tag>
            <span class="issue-hint" v-if="aiInfo.score != null">（AI 评分 {{ aiInfo.score }} 分）</span>
          </div>
        </div>
      </template>

      <!-- 无具体定位但有 AI 结果：提示人工查看并展示全文兜底（人工审核必须能看到内容） -->
      <template v-else-if="hasAiResult">
        <el-divider content-position="left">AI 审核结果</el-divider>
        <div class="content-tip">
          AI 未定位到具体违规片段（综合评分 {{ aiInfo.score }} 分 / {{ riskLevelText }}），下方为全文，请人工审核。
          <div v-if="reasonKeywords.length" class="reason-fallback">
            AI 驳回原因：
            <el-tag
              v-for="kw in reasonKeywords"
              :key="kw"
              type="danger"
              size="small"
              style="margin: 2px 4px 2px 0"
            >
              {{ kw }}
            </el-tag>
          </div>
        </div>
        <el-divider content-position="left">全文内容</el-divider>
        <div class="section">
          <div class="section-label">简介</div>
          <div class="section-body">{{ work.summary || '暂无' }}</div>
        </div>
        <div v-if="chapters.length === 0" class="content-tip">暂无章节内容</div>
        <div v-for="ch in chapters" :key="ch.chapterId" class="chapter">
          <div class="chapter-title">第{{ ch.chapterNo }}章 {{ ch.chapterTitle || '' }}</div>
          <div class="chapter-body">{{ ch.content || '暂无正文' }}</div>
        </div>
      </template>

      <!-- 兼容旧接口（无 issues 字段）：完整展示 -->
      <template v-else>
        <el-divider content-position="left">作品内容</el-divider>
        <div class="section">
          <div class="section-label">简介</div>
          <div class="section-body">{{ work.summary || '暂无' }}</div>
        </div>
        <el-divider content-position="left">章节正文</el-divider>
        <div v-if="chapters.length === 0" class="content-tip">暂无章节内容</div>
        <div v-for="ch in chapters" :key="ch.chapterId" class="chapter">
          <div class="chapter-title">第{{ ch.chapterNo }}章 {{ ch.chapterTitle || '' }}</div>
          <div class="chapter-body">{{ ch.content || '暂无正文' }}</div>
        </div>
      </template>
    </template>
    <div v-else class="content-tip">暂无作品内容</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  // AI 审核结果概览：{ score, level }（后端 content 接口新增 aiInfo）
  aiInfo: { type: Object, default: null },
  // 章节级问题定位：[{ chapterId, chapterNo, chapterTitle, hits: [{word, snippet}] }]
  issues: { type: Array, default: null }
})

const work = computed(() => (props.content && props.content.work) || {})
const chapters = computed(() => (props.content && props.content.chapters) || [])
const hasIssues = computed(() => Array.isArray(props.issues) && props.issues.length > 0)
const hasAiResult = computed(
  () => Array.isArray(props.issues) && props.aiInfo && props.aiInfo.score != null
)
const aiInfo = computed(() => props.aiInfo || {})
const reasonKeywords = computed(() => {
  const kws = aiInfo.value.keywords
  return Array.isArray(kws) ? kws.filter(Boolean) : []
})
const riskLevelText = computed(() => {
  const map = { low: '低风险', medium: '中风险', high: '高风险' }
  return map[aiInfo.value.level] || aiInfo.value.level || '-'
})
const riskTagType = computed(() => {
  const map = { low: 'success', medium: 'warning', high: 'danger' }
  return map[aiInfo.value.level] || 'info'
})
const scoreClass = computed(() => {
  const s = aiInfo.value.score
  if (s == null) return ''
  if (s >= 85) return 'score-high'
  if (s >= 60) return 'score-medium'
  return 'score-low'
})

// 命中词在章节正文中高亮为红字（先转义防 XSS，再对转义后的命中词做标记替换）
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function chapterOf(chapterId) {
  return chapters.value.find((c) => c.chapterId === chapterId) || null
}

function renderBody(iss) {
  let text
  if (iss.chapterId == null) {
    // 简介问题项
    text = work.value.summary || ''
  } else {
    const ch = chapterOf(iss.chapterId)
    text = (ch && ch.content) || ''
  }
  const escaped = escapeHtml(text)
  // 从长到短替换，避免短词先替换造成重叠标记
  const words = (iss.hits || [])
    .map((h) => h.word)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  let html = escaped
  for (const w of words) {
    const ew = escapeHtml(w)
    html = html.split(ew).join('<span class="issue-word">' + ew + '</span>')
  }
  return html
}
</script>

<style scoped>
.content-panel {
  margin-top: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
}
.section { margin-bottom: 12px; }
.section-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}
.section-body {
  font-size: 14px;
  color: #303133;
  white-space: pre-wrap;
  line-height: 1.7;
  background: #f7f8fa;
  border-radius: 4px;
  padding: 8px 10px;
}
.chapter { margin-bottom: 14px; }
.chapter-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}
.chapter-body {
  font-size: 14px;
  color: #303133;
  white-space: pre-wrap;
  line-height: 1.8;
  background: #f7f8fa;
  border-radius: 4px;
  padding: 8px 10px;
}
.issue-reason {
  margin-top: 6px;
  font-size: 13px;
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  padding: 6px 10px;
}
.issue-hint {
  color: #909399;
  font-size: 12px;
}
.reason-fallback {
  margin-top: 6px;
  font-size: 13px;
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  padding: 6px 10px;
  text-align: left;
}
.issue-word {
  color: #f56c6c;
  font-weight: 700;
  background: #fde2e2;
  padding: 0 2px;
  border-radius: 2px;
}
.ai-summary {
  font-size: 14px;
  color: #303133;
  background: #f7f8fa;
  border-radius: 4px;
  padding: 8px 10px;
}
.score-high { color: #67c23a; }
.score-medium { color: #e6a23c; }
.score-low { color: #f56c6c; }
.content-tip {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 16px 0;
}
</style>
