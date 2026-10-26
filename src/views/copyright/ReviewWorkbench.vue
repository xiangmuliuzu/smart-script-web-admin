<template>
  <div class="review-workbench-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">作品审核工作台</h2>
      <div class="header-actions">
        <el-button size="default" @click="handleExportReport">导出报告</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value warning">{{ statistics.pending }}</div>
          <div class="stat-label">待审核</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value primary">{{ statistics.aiReviewing }}</div>
          <div class="stat-label">AI审核中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value success">{{ statistics.approved }}</div>
          <div class="stat-label">本月通过</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value danger">{{ statistics.rejected }}</div>
          <div class="stat-label">本月驳回</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item>
          <el-select v-model="filterForm.status" placeholder="全部状态" style="width: 140px">
            <el-option label="全部状态" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="AI审核中" value="ai_reviewing" />
            <el-option label="待人工复核" value="manual_review" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="filterForm.type" placeholder="全部类型" style="width: 140px">
            <el-option label="全部类型" value="" />
            <el-option label="剧本" value="script" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="filterForm.genre" placeholder="全部题材" style="width: 140px">
            <el-option label="全部题材" value="" />
            <el-option v-for="g in genreOptions" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="filterForm.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始日期"
            :disabled-date="disabledStartDate"
            style="width: 160px"
          />
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="filterForm.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束日期"
            :disabled-date="disabledEndDate"
            style="width: 160px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="black-button" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 作品审核列表 -->
    <el-card class="table-card" v-loading="loading">
      <el-table
        :data="worksList"
        style="width: 100%"
      >
        <el-table-column prop="reviewId" label="编号" width="100" />
        <el-table-column prop="workTitle" label="作品名称" min-width="180" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            {{ getTypeText(row.workType) }}
          </template>
        </el-table-column>
        <el-table-column prop="genreName" label="题材" width="100" />
        <el-table-column prop="authorName" label="作者" width="120" />
        <el-table-column prop="createTime" label="提交时间" width="160" />
        <el-table-column label="AI评分" width="100">
          <template #default="{ row }">
            <span :class="getScoreClass(row.aiScore)">{{ row.aiScore != null ? row.aiScore + '分' : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' || row.status === 'manual_review'"
              type="primary"
              size="small"
              link
              @click="handleReview(row)"
            >
              审核
            </el-button>
            <el-button type="primary" size="small" link @click="handleDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 审核日志 -->
    <el-card class="log-card">
      <template #header>
        <div class="log-header">
          <span class="log-title">审核日志</span>
          <el-button size="small" @click="handleExportLogs">导出日志</el-button>
        </div>
      </template>
      <el-table :data="reviewLogs" style="width: 100%">
        <el-table-column prop="time" label="时间" width="160" />
        <el-table-column prop="operatorName" label="操作人" width="120" />
        <el-table-column prop="workTitle" label="作品" min-width="150" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="280" />
      </el-table>
    </el-card>
    <!-- 审核详情弹窗 -->
    <el-dialog
      v-model="reviewDialogVisible"
      title="作品审核"
      width="600px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="作品名称">{{ currentReview.workTitle }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ currentReview.authorName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getTypeText(currentReview.workType) }}</el-descriptions-item>
        <el-descriptions-item label="题材">{{ currentReview.genreName }}</el-descriptions-item>
        <el-descriptions-item label="AI评分">{{ currentReview.aiScore != null ? currentReview.aiScore + '分' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ currentReview.createTime }}</el-descriptions-item>
      </el-descriptions>
      <ReviewWorkContentPanel
        :content="reviewContent"
        :ai-info="reviewAiInfo"
        :issues="reviewIssues"
        :loading="reviewContentLoading"
      />
      <el-form :model="reviewForm" label-width="80px" style="margin-top: 20px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="reviewForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input
            v-model="reviewForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入审核备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReview">提交</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="作品详情"
      width="700px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="作品名称">{{ currentDetail.workTitle }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ currentDetail.authorName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getTypeText(currentDetail.workType) }}</el-descriptions-item>
        <el-descriptions-item label="题材">{{ currentDetail.genreName }}</el-descriptions-item>
        <el-descriptions-item label="AI评分">{{ currentDetail.aiScore != null ? currentDetail.aiScore + '分' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="AI风险等级">
          <el-tag :type="getRiskLevelType(aiResultOf(currentDetail).level)" size="small">
            {{ getRiskLevelText(aiResultOf(currentDetail).level) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="AI驳回原因" v-if="currentDetail.status === 'rejected'">
          <template v-if="aiKeywordsOf(currentDetail).length">
            <el-tag v-for="kw in aiKeywordsOf(currentDetail)" :key="kw" type="danger" size="small" style="margin-right: 4px">
              {{ kw }}
            </el-tag>
          </template>
          <span v-else>AI 评分 {{ currentDetail.aiScore }} 分，低于规则阈值自动驳回</span>
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ currentDetail.createTime }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentDetail.status)" size="small">
            {{ getStatusText(currentDetail.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <ReviewWorkContentPanel
        :content="detailContent"
        :ai-info="detailAiInfo"
        :issues="detailIssues"
        :loading="detailContentLoading"
      />
      <template #footer>
        <!-- A3 联系用户入口（任务 25）：待作品关联真实 userId 后自动启用 -->
        <el-button type="primary" plain :disabled="!currentDetail.userId" @click="handleContactUser(currentDetail)">联系用户</el-button>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useContactUser } from '@/composables/useContactUser'
import { sendMessage } from '@/api/adminChat'
import ReviewWorkContentPanel from './ReviewWorkContentPanel.vue'

// A3 联系用户（任务 25）：复用公共 composable 创建会话并跳转聊天详情
// 顺带把作品审核详情（AI 评分/风险/问题定位）作为首条消息发给用户，便于用户看到驳回原因
const { handleContactUser } = useContactUser({
  businessType: 'WORK',
  extractUserId: (row) => row.userId,
  extractBusinessId: (row) => row.workId || row.reviewId,
  extractBusinessName: (row) => row.workTitle || row.workName || row.name,
  emptyMessage: '该作品暂未关联用户，无法发起沟通',
  sendFirstMessage: async (sessionId, row) => {
    const parts = []
    parts.push('【作品审核结果通知】')
    parts.push('作品：《' + (row.workTitle || '') + '》')
    const score = row.aiScore != null ? row.aiScore : (aiResultOf(row).score ?? '-')
    const level = aiResultOf(row).level
    const levelMap = { low: '低风险', medium: '中风险', high: '高风险' }
    parts.push('AI 评分：' + score + ' 分' + (level ? '（' + (levelMap[level] || level) + '）' : ''))
    parts.push('审核状态：' + (getStatusText(row.status) || row.status))
    const issues = (detailContent.value && detailContent.value.issues) || []
    if (issues.length) {
      parts.push('AI 问题定位：')
      for (const iss of issues) {
        const title = iss.chapterNo === 0 ? '作品简介' : '第' + iss.chapterNo + '章 ' + (iss.chapterTitle || '')
        const words = (iss.hits || []).map((h) => h.word).filter(Boolean).join('、')
        parts.push('- ' + title + '：命中「' + (words || '未标注') + '」')
      }
    } else {
      const kws = aiKeywordsOf(row)
      if (kws.length) {
        parts.push('AI 命中问题词：' + kws.join('、'))
      } else if (row.status === 'rejected') {
        parts.push('AI 综合评分低于规则阈值，自动驳回')
      }
    }
    parts.push('请根据上述问题修改后重新提交审核。')
    await sendMessage(sessionId, { content: parts.join('\n') })
  }
})

// 筛选表单
const filterForm = ref({
  status: '',
  type: '',
  genre: '',
  startDate: '',
  endDate: ''
})

// 题材选项（与 sys_category theme 分类对齐）
const genreOptions = ['玄幻', '仙侠', '武侠', '都市', '悬疑', '历史', '科幻', '言情', '游戏', '二次元', '军事', '体育']

// 类型映射（sys_work.work_type 枚举）
const getTypeText = (type) => {
  const typeMap = {
    script: '剧本',
    novel: '小说',
    movie: '电影剧本',
    tv: '电视剧剧本',
    short: '短剧剧本'
  }
  return typeMap[type] || type || '-'
}

// 加载状态
const loading = ref(false)

// 统计数据
const statistics = ref({
  pending: 12,
  aiReviewing: 8,
  approved: 156,
  rejected: 23
})

// 审核详情弹窗
const reviewDialogVisible = ref(false)
const currentReview = ref({})
const reviewContent = ref(null)
const reviewContentLoading = ref(false)
const reviewForm = ref({
  action: 'approve',
  remark: ''
})

// 作品审核列表数据
const worksList = ref([])

// 审核日志数据
const reviewLogs = ref([])

// 页面加载时获取数据
import { onMounted } from 'vue'
import adminFetch from '@/utils/adminFetch'

onMounted(async () => {
  try {
    // 获取审核统计
    const statsRes = await adminFetch('/api/v1/admin/review/statistics')
    const statsData = await statsRes.json()
    if (statsData.code === 200) {
      statistics.value = {
        pending: statsData.pending,
        aiReviewing: statsData.aiReviewing,
        approved: statsData.approved,
        rejected: statsData.rejected
      }
    }

    // 获取审核列表
    await loadWorks()

    // 获取审核日志
    await loadLogs()
  } catch (e) {
    console.error('获取数据失败:', e)
  }
})

// 获取AI评分样式
const getScoreClass = (score) => {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-medium'
  return 'score-low'
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    manual_review: 'warning',
    ai_reviewing: 'info',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || ''
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    pending: '待审核',
    manual_review: '待人工复核',
    ai_reviewing: 'AI审核中',
    approved: '已通过',
    rejected: '已驳回'
  }
  return textMap[status] || status
}

// 解析 AI 审核结果（aiResult 为 JSON 字符串：{score, level, keywords, prompt}）
const parseAiResult = (row) => {
  try {
    if (!row || !row.aiResult) return { score: null, level: '', keywords: [] }
    const obj = typeof row.aiResult === 'string' ? JSON.parse(row.aiResult) : row.aiResult
    return {
      score: obj.score != null ? obj.score : null,
      level: obj.level || '',
      keywords: Array.isArray(obj.keywords) ? obj.keywords : []
    }
  } catch (e) {
    return { score: null, level: '', keywords: [] }
  }
}
const aiResultOf = (row) => parseAiResult(row)
const aiKeywordsOf = (row) => parseAiResult(row).keywords

// 获取AI风险等级样式与文案
const getRiskLevelType = (level) => {
  const typeMap = { low: 'success', medium: 'warning', high: 'danger' }
  return typeMap[level] || 'info'
}
const getRiskLevelText = (level) => {
  const textMap = { low: '低风险', medium: '中风险', high: '高风险' }
  return textMap[level] || level || '-'
}

// 获取操作类型
const getActionType = (action) => {
  if (action === '通过') return 'success'
  if (action === '驳回') return 'danger'
  return 'info'
}

// 处理搜索
const handleSearch = () => {
  loadWorks(buildQuery())
}

// 构建筛选参数
const buildQuery = () => {
  const q = {}
  if (filterForm.value.status) q.status = filterForm.value.status
  if (filterForm.value.type) q.workType = filterForm.value.type
  if (filterForm.value.genre) q.genreName = filterForm.value.genre
  if (filterForm.value.startDate) q.beginTime = filterForm.value.startDate
  if (filterForm.value.endDate) q.endTime = filterForm.value.endDate + ' 23:59:59'
  return q
}

// 日期归一到本地零点（el-date-picker 传入的 date 可能是 UTC，直接比较会错 8 小时）
const dayZero = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const todayZeroMs = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

// 开始日期：不能晚于结束日期，不能选未来
const disabledStartDate = (date) => {
  const t = dayZero(date)
  if (filterForm.value.endDate) {
    return t > dayZero(new Date(filterForm.value.endDate)) || t > todayZeroMs()
  }
  return t > todayZeroMs()
}

// 结束日期：不能早于开始日期，不能选未来
const disabledEndDate = (date) => {
  const t = dayZero(date)
  if (filterForm.value.startDate) {
    return t < dayZero(new Date(filterForm.value.startDate)) || t > todayZeroMs()
  }
  return t > todayZeroMs()
}

// 处理审核
// 加载审核作品完整内容（简介/设定/章节正文）
const loadReviewContent = async (reviewId) => {
  try {
    const res = await adminFetch(`/api/v1/admin/review/content/${reviewId}`)
    const data = await res.json()
    if (data.code === 200) return data.data
  } catch (e) {
    console.error('加载作品内容失败:', e)
  }
  return null
}

const handleReview = async (row) => {
  currentReview.value = row
  reviewForm.value.action = 'approve'
  reviewForm.value.remark = ''
  reviewContent.value = null
  reviewDialogVisible.value = true
  reviewContentLoading.value = true
  reviewContent.value = await loadReviewContent(row.reviewId)
  reviewContentLoading.value = false
}

// 提交审核结果
const handleSubmitReview = async () => {
  try {
    const res = await adminFetch('/api/v1/admin/review/operate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: currentReview.value.reviewId,
        status: reviewForm.value.action === 'approve' ? 'approved' : 'rejected',
        reviewOpinion: reviewForm.value.remark,
        reviewerId: 1
      })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('审核提交成功')
      reviewDialogVisible.value = false
      // 刷新列表和日志
      await loadWorks()
      await loadLogs()
    } else {
      ElMessage.error(data.msg || '审核提交失败')
    }
  } catch (e) {
    ElMessage.error('提交失败，请重试')
  }
}

// 详情弹窗
const detailDialogVisible = ref(false)
const currentDetail = ref({})
const detailContent = ref(null)
const detailContentLoading = ref(false)
const detailAiInfo = computed(() => (detailContent.value && detailContent.value.aiInfo) || null)
const detailIssues = computed(() => (detailContent.value && detailContent.value.issues) || null)
const reviewAiInfo = computed(() => (reviewContent.value && reviewContent.value.aiInfo) || null)
const reviewIssues = computed(() => (reviewContent.value && reviewContent.value.issues) || null)

// 处理详情
const handleDetail = async (row) => {
  currentDetail.value = row
  detailContent.value = null
  detailDialogVisible.value = true
  detailContentLoading.value = true
  detailContent.value = await loadReviewContent(row.reviewId)
  detailContentLoading.value = false
}

// 导出审核报告
const handleExportReport = async () => {
  try {
    const res = await adminFetch('/api/v1/admin/review/export')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'review_report.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出报告成功')
  } catch (e) {
    ElMessage.error('导出报告失败，请检查后端服务')
  }
}

// 导出审核日志
const handleExportLogs = async () => {
  try {
    const res = await adminFetch('/api/v1/admin/review/logs/export')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'review_logs.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出日志成功')
  } catch (e) {
    ElMessage.error('导出日志失败，请检查后端服务')
  }
}

// 加载作品列表
const loadWorks = async (query = {}) => {
  try {
    const params = new URLSearchParams(query).toString()
    const url = '/api/v1/admin/review/list?page=1&pageSize=100' + (params ? '&' + params : '')
    const res = await adminFetch(url)
    const data = await res.json()
    if (data.code === 200) {
      worksList.value = data.rows || []
    }
  } catch (e) {
    console.error('获取列表失败:', e)
  }
}

// 加载审核日志
const loadLogs = async () => {
  try {
    const res = await adminFetch('/api/v1/admin/review/logs')
    const data = await res.json()
    if (data.code === 200) {
      reviewLogs.value = (data.rows || []).map(item => ({
        time: item.createTime || '',
        operatorName: item.operatorName || '',
        workTitle: item.workTitle || '',
        action: item.action || '',
        remark: (item.beforeStatus || '') + ' → ' + (item.afterStatus || '')
      }))
    }
  } catch (e) {
    console.error('获取日志失败:', e)
  }
}


</script>

<style scoped>
.review-workbench-container {
  padding: 20px;
  background-color: #f7f8fa;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.filter-card :deep(.el-card__body) {
  padding: 20px;
}

.filter-form {
  margin: 0;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}

.filter-form :deep(.el-form-item:last-child) {
  margin-right: 0;
}

/* 表格卡片 */
.table-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

/* AI评分样式 */
.score-high {
  color: #52c41a;
  font-weight: 600;
  font-size: 14px;
}

.score-medium {
  color: #fa8c16;
  font-weight: 600;
  font-size: 14px;
}

.score-low {
  color: #ff4d4f;
  font-weight: 600;
  font-size: 14px;
}

/* 日志卡片 */
.log-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.log-card :deep(.el-card__header) {
  padding: 18px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.log-card :deep(.el-card__body) {
  padding: 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-title {
  font-size: 14px;
  color: #1f2329;
  font-weight: 600;
}

/* 黑色主按钮 */
.black-button {
  background-color: #1f2329;
  border-color: #1f2329;
  color: #ffffff;
}

.black-button:hover {
  background-color: #000000;
  border-color: #000000;
}

.black-button:active {
  background-color: #000000;
  border-color: #000000;
}

/* 表格样式统一 */
:deep(.el-table) {
  font-size: 13px;
  color: #262626;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #595959;
  font-weight: 500;
  font-size: 12px;
}

:deep(.el-table td) {
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f5;
}

:deep(.el-table tr:hover > td) {
  background-color: #fafafa !important;
}

:deep(.el-button.is-link) {
  color: #1f2329;
  font-size: 12px;
  padding: 0;
}

:deep(.el-button.is-link:hover) {
  color: #000000;
}

/* 标签样式 */
:deep(.el-tag) {
  border: none;
  font-size: 11px;
  padding: 4px 10px;
}

:deep(.el-tag.el-tag--warning) {
  background-color: #fff7e6;
  color: #d48806;
}

:deep(.el-tag.el-tag--success) {
  background-color: #f6ffed;
  color: #389e0d;
}

:deep(.el-tag.el-tag--danger) {
  background-color: #fff1f0;
  color: #cf1322;
}

:deep(.el-tag.el-tag--info) {
  background-color: #fafafa;
  color: #595959;
}

:deep(.el-tag:not(.el-tag--warning):not(.el-tag--success):not(.el-tag--danger):not(.el-tag--info)) {
  background-color: #1f2329;
  color: #ffffff;
}

/* 按钮样式统一 */
:deep(.el-button) {
  font-size: 12px;
  border-radius: 4px;
}

:deep(.el-button--default) {
  color: #595959;
  border-color: #d9d9d9;
  background: #ffffff;
}

:deep(.el-button--default:hover) {
  color: #1f2329;
  border-color: #1f2329;
}

/* 表单控件样式 */
:deep(.el-select .el-input__wrapper) {
  border-radius: 4px;
  border-color: #d9d9d9;
}

:deep(.el-date-editor .el-input__wrapper) {
  border-radius: 4px;
  border-color: #d9d9d9;
}

:deep(.el-input__inner) {
  font-size: 12px;
  color: #262626;
}

:deep(.el-input__inner::placeholder) {
  color: #bfbfbf;
}
</style>






