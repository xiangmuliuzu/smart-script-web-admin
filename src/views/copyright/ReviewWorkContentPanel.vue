<template>
  <div class="content-panel">
    <div v-if="loading" class="content-tip">内容加载中…</div>
    <template v-else-if="content">
      <el-divider content-position="left">作品内容</el-divider>
      <div class="section">
        <div class="section-label">简介</div>
        <div class="section-body">{{ work.summary || '暂无' }}</div>
      </div>
      <el-divider content-position="left">章节正文</el-divider>
      <div v-if="chapters.length === 0" class="content-tip">暂无章节内容</div>
      <div
        v-for="ch in chapters"
        :key="ch.chapterId"
        class="chapter"
      >
        <div class="chapter-title">第{{ ch.chapterNo }}章 {{ ch.chapterTitle || '' }}</div>
        <div class="chapter-body">{{ ch.content || '暂无正文' }}</div>
      </div>
    </template>
    <div v-else class="content-tip">暂无作品内容</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const work = computed(() => (props.content && props.content.work) || {})
const chapters = computed(() => (props.content && props.content.chapters) || [])
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
.content-tip {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 16px 0;
}
</style>
