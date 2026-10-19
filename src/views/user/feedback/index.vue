<template>
  <div class="a4-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item>
          <el-select v-model="filterForm.status" placeholder="全部状态" style="width: 140px" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="待受理" value="SUBMITTED" />
            <el-option label="处理中" value="PROCESSING" />
            <el-option label="已回复" value="REPLIED" />
            <el-option label="已关闭" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="filterForm.category" placeholder="全部分类" style="width: 140px" clearable>
            <el-option label="全部分类" value="" />
            <el-option v-for="(label, value) in feedbackCategories" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="filterForm.nickname" placeholder="昵称（精确匹配）" clearable style="width: 180px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="filterForm.keyword" placeholder="内容/昵称/账号" style="width: 200px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="black-button" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="rows" style="width: 100%" v-loading="loading">
        <el-table-column prop="feedbackId" label="反馈 ID" width="100" />
        <el-table-column prop="userId" label="用户 ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="phoneMasked" label="手机号" width="130">
          <template #default="{ row }">{{ row.phoneMasked || '—' }}</template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ categoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="handlerName" label="处理人" width="110">
          <template #default="{ row }">{{ row.handlerName || '—' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="['user:feedback:query']"
              size="small"
              @click="openDetail(row)"
            >详情</el-button>
            <el-button
              v-if="row.status !== 'CLOSED'"
              v-permission="['user:feedback:handle']"
              type="primary"
              size="small"
              @click="openHandle(row)"
            >处理</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <span v-if="errorText">{{ errorText }}</span>
            <span v-else>暂无数据</span>
            <el-button v-if="errorText" size="small" type="primary" link @click="load">重试</el-button>
          </div>
        </template>
      </el-table>
      <div class="pager-wrap">
        <el-pagination
          layout="total, prev, pager, next"
          :total="total"
          :page-size="query.pageSize"
          :current-page="query.pageNum"
          @current-change="onPageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" @closed="materialPreview?.clear()" title="反馈详情" width="560px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="反馈 ID">{{ detail.feedbackId }}</el-descriptions-item>
        <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ detail.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.phoneMasked || '—' }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ categoryLabel(detail.category) }}</el-descriptions-item>
        <el-descriptions-item label="内容">{{ detail.content }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
        <el-descriptions-item label="回复">{{ detail.reply || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处理人">{{ detail.handlerName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatTime(detail.submittedAt) }}</el-descriptions-item>
        <el-descriptions-item label="处理时间">{{ formatTime(detail.handledAt) }}</el-descriptions-item>
        <el-descriptions-item label="附件">
          <div v-if="detail.attachmentRefs && detail.attachmentRefs.length" class="material-list">
            <el-button
              v-for="(ref, idx) in detail.attachmentRefs"
              :key="ref"
              size="small"
              type="primary"
              link
              :loading="materialBusy === ref"
              @click="viewAttachment(ref)"
            >查看附件 {{ idx + 1 }}</el-button>
            <div class="material-hint">
              每次查看都会消耗该短时引用（5 分钟内有效，且只能使用一次）
            </div>
          </div>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="handleVisible" title="处理反馈" width="520px">
      <el-form label-width="90px">
        <el-form-item label="当前状态">{{ statusLabel(handleTarget?.status) }}</el-form-item>
        <el-form-item label="可用动作">
          {{ availableActions.map(a => actionLabel(a)).join('、') || '无可执行动作' }}
        </el-form-item>
        <el-form-item label="动作">
          <el-radio-group v-model="handleForm.action">
            <el-radio v-for="a in availableActions" :key="a" :label="a">{{ actionLabel(a) }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="handleForm.action === 'REPLY'" label="回复内容" required>
          <el-input v-model="handleForm.reply" type="textarea" :rows="3" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitHandle">确定</el-button>
      </template>
    </el-dialog>
    <MaterialPreview ref="materialPreview" />
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import MaterialPreview from '@/components/MaterialPreview.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listFeedback,
  getFeedback,
  handleFeedback
} from '@/api/user/feedback'

const feedbackCategories = { FEATURE: '功能建议', EXPERIENCE: '体验问题', BUG: '缺陷报告', COMPLAINT: '投诉', OTHER: '其他' }

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const total = ref(0)
const errorText = ref('')
const query = reactive({ pageNum: 1, pageSize: 10, status: '', category: '', nickname: '', keyword: '' })
const filterForm = reactive({ status: '', category: '', nickname: '', keyword: '' })

const detailVisible = ref(false)
const detail = ref(null)
const materialBusy = ref('')
const materialPreview = ref(null)

/**
 * 查看附件：短时令牌 → 一次性访问链接 → 真实内容。
 * 令牌一次性，查看后自动刷新详情获取新的引用。
 */
async function viewAttachment(token) {
  if (materialBusy.value) return
  materialBusy.value = token
  try {
    await materialPreview.value.open(token)
  } catch (e) {
    ElMessage.error(e?.message || '材料查看失败，请重新打开详情重试')
  } finally {
    // 一次性令牌使用后刷新引用，支持在同一详情中再次查看。
    if (detailVisible.value && detail.value) {
      const id = detail.value.feedbackId
      try {
        const result = await getFeedback(id)
        if (detailVisible.value && detail.value?.feedbackId === id) detail.value = result?.data || result
      } catch { /* 原详情仍可查看；重新打开可重试。 */ }
    }
    materialBusy.value = ''
  }
}
const handleVisible = ref(false)
const handleTarget = ref(null)
const handleForm = reactive({ action: 'ACCEPT', reply: '' })

/** 状态机：仅列出当前状态允许的动作，避免前端给出后端必然拒绝的选项 */
const availableActions = computed(() => {
  const status = handleTarget.value?.status
  if (status === 'SUBMITTED') return ['ACCEPT', 'REPLY', 'CLOSE']
  if (status === 'PROCESSING') return ['REPLY', 'CLOSE']
  if (status === 'REPLIED') return ['CLOSE']
  return []
})

function statusLabel(status) {
  if (status === 'SUBMITTED') return '待受理'
  if (status === 'PROCESSING') return '处理中'
  if (status === 'REPLIED') return '已回复'
  if (status === 'CLOSED') return '已关闭'
  return status || '—'
}

function statusTagType(status) {
  if (status === 'SUBMITTED') return 'warning'
  if (status === 'PROCESSING') return 'info'
  if (status === 'REPLIED') return 'success'
  return ''
}

function categoryLabel(category) {
  return feedbackCategories[category] || (category === 'SUGGESTION' ? '功能建议' : '其他')
}

function actionLabel(action) {
  if (action === 'ACCEPT') return '受理'
  if (action === 'REPLY') return '回复'
  if (action === 'CLOSE') return '关闭'
  return action
}

function formatTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listFeedback({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      status: query.status || undefined,
      category: query.category || undefined,
      nickname: query.nickname || undefined,
      keyword: query.keyword || undefined
    })
    rows.value = res?.rows || []
    total.value = Number(res?.total || 0)
  } catch (e) {
    rows.value = []
    total.value = 0
    errorText.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.status = filterForm.status
  query.category = filterForm.category
  query.nickname = filterForm.nickname.trim()
  query.keyword = filterForm.keyword
  query.pageNum = 1
  load()
}

function handleReset() {
  filterForm.status = ''
  filterForm.category = ''
  filterForm.nickname = ''
  filterForm.keyword = ''
  handleSearch()
}

function onPageChange(page) {
  query.pageNum = page
  load()
}

async function openDetail(row) {
  detail.value = null
  detailVisible.value = true
  try {
    const res = await getFeedback(row.feedbackId)
    detail.value = res?.data || res
  } catch (e) {
    detailVisible.value = false
    ElMessage.error(e?.message || '详情加载失败')
  }
}

function openHandle(row) {
  handleTarget.value = row
  handleForm.action = availableActions.value[0] || 'ACCEPT'
  handleForm.reply = ''
  handleVisible.value = true
}

async function submitHandle() {
  if (!handleForm.action) {
    ElMessage.warning('当前状态无可用动作')
    return
  }
  if (handleForm.action === 'REPLY' && !handleForm.reply.trim()) {
    ElMessage.warning('回复内容必填')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认执行「${actionLabel(handleForm.action)}」？`,
      '操作确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  saving.value = true
  try {
    const res = await handleFeedback(handleTarget.value.feedbackId, {
      action: handleForm.action,
      reply: handleForm.action === 'REPLY' ? handleForm.reply.trim() : undefined,
      expectedStatus: handleTarget.value.status
    })
    const changed = res?.data?.changed
    ElMessage.success(changed === false ? '状态未变化，无重复变更' : '处理成功')
    handleVisible.value = false
    await load()
  } catch (e) {
    // 409 = 状态已变化（含并发处理或非法回退）
    if (e?.response?.status === 409) {
      ElMessage.error('该反馈状态已变化，请刷新后重试')
      await load()
    } else {
      ElMessage.error(e?.message || '处理失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.a4-page {
  padding: 20px;
  background-color: #f7f8fa;
}

.filter-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.filter-card :deep(.el-card__body) {
  padding: 20px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}

.table-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px;
  border-top: 1px solid #f0f0f0;
}

.material-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.material-hint {
  font-size: 12px;
  color: #8c8c8c;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 0;
  color: #8c8c8c;
  font-size: 13px;
}

.black-button {
  background-color: #1f2329;
  border-color: #1f2329;
  color: #ffffff;
}

.black-button:hover {
  background-color: #000000;
  border-color: #000000;
}

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

:deep(.el-button) {
  font-size: 12px;
  border-radius: 4px;
  padding: 5px 12px;
}

:deep(.el-tag) {
  border: none;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
}

:deep(.el-tag.el-tag--success) {
  background-color: #f6ffed;
  color: #389e0d;
}

:deep(.el-tag.el-tag--warning) {
  background-color: #fff7e6;
  color: #d48806;
}

:deep(.el-tag.el-tag--info) {
  background-color: #fafafa;
  color: #8c8c8c;
}
</style>
