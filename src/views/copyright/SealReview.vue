<template>
  <PageContainer>
    <PageHeader title="印章审核" description="审核创作者已提交的印章及审核材料；操作变更均记录到审核日志。" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.reviewStatus" clearable placeholder="全部审核状态" style="width: 150px">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.sealStatus" clearable placeholder="全部印章状态" style="width: 150px">
          <el-option label="已停用" value="disabled" />
          <el-option label="已启用" value="enabled" />
          <el-option label="异常" value="abnormal" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input v-model="query.keyword" clearable placeholder="印章名称 / 申请人" style="width: 230px" @keyup.enter="handleQuery" />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="rows"
      :loading="loading"
      :total="total"
      :empty-text="loadFailed ? '加载失败，请重试' : '暂无印章申请记录'"
      @page-change="loadRows"
      @size-change="loadRows"
    >
      <template #actions>
        <el-button v-if="loadFailed" link type="primary" @click="loadRows">重试</el-button>
      </template>
      <el-table-column prop="sealId" label="申请编号" width="100" />
      <el-table-column prop="sealName" label="印章名称" min-width="150" show-overflow-tooltip />
      <el-table-column label="用户信息" min-width="150">
        <template #default="{ row }">
          <div>{{ row.userName || '—' }}</div>
          <div v-if="row.userId" class="muted">ID: {{ row.userId }}</div>
        </template>
      </el-table-column>
      <el-table-column label="审核状态" width="110">
        <template #default="{ row }"><el-tag :type="reviewType(row.reviewStatus)" size="small">{{ reviewLabel(row.reviewStatus) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="印章状态" width="110">
        <template #default="{ row }"><el-tag :type="sealType(row.sealStatus)" size="small">{{ sealLabel(row.sealStatus) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="驳回原因" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.rejectReason || '—' }}</template>
      </el-table-column>
      <el-table-column label="审核时间" width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ row.reviewTime || '—' }}</template>
      </el-table-column>
      <el-table-column prop="createTime" label="申请时间" width="170" show-overflow-tooltip />
      <el-table-column label="操作" width="340" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button link type="primary" @click="openDetail(row)">查看材料</el-button>
            <el-button link type="primary" @click="openLogs(row)">审核记录</el-button>
            <el-button v-if="row.reviewStatus === 'pending'" v-permission="'smartscript:copyright:seals:audit'" link type="primary" @click="openReview(row)">审核</el-button>
            <el-button v-if="row.reviewStatus === 'approved' && row.sealStatus === 'abnormal'" v-permission="'smartscript:copyright:seals:status'" link type="warning" @click="openResolveAbnormal(row)">处理异常</el-button>
            <el-button v-if="row.reviewStatus === 'approved' && ['disabled', 'enabled'].includes(row.sealStatus)" v-permission="'smartscript:copyright:seals:status'" :type="row.sealStatus === 'enabled' ? 'danger' : 'success'" link :loading="statusChangingSealId === row.sealId" :disabled="statusChangingSealId !== null && statusChangingSealId !== row.sealId" @click="changeStatus(row)">
              {{ row.sealStatus === 'enabled' ? '停用' : '启用' }}
            </el-button>
            <el-button link type="primary" :disabled="!row.userId" @click="handleContactUser(row)">联系用户</el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <el-drawer v-model="detailVisible" title="印章申请详情" size="560px" destroy-on-close>
      <div v-loading="detailLoading" class="drawer-content">
        <el-empty v-if="detailFailed" description="详情加载失败，请重试">
          <el-button type="primary" @click="loadDetail">重试</el-button>
        </el-empty>
        <template v-else-if="detail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="申请编号">{{ detail.sealId }}</el-descriptions-item>
            <el-descriptions-item label="印章名称">{{ detail.sealName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.userName || '—' }}（{{ detail.userAccount || '—' }}）</el-descriptions-item>
            <el-descriptions-item label="审核状态">{{ reviewLabel(detail.reviewStatus) }}</el-descriptions-item>
            <el-descriptions-item label="印章状态">{{ sealLabel(detail.sealStatus) }}</el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ detail.createTime || '—' }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ detail.reviewTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.rejectReason" label="驳回原因">{{ detail.rejectReason }}</el-descriptions-item>
          </el-descriptions>
          <section class="material-block">
            <h3>印章图片</h3>
            <el-image v-if="safeUrl(detail.sealImageUrl)" :src="safeUrl(detail.sealImageUrl)" :preview-src-list="[safeUrl(detail.sealImageUrl)]" fit="contain" class="seal-image" />
            <el-empty v-else description="未提供印章图片" :image-size="56" />
          </section>
          <section class="material-block">
            <h3>审核材料</h3>
            <el-empty v-if="!materialLinks.length" description="未提供审核材料" :image-size="56" />
            <ul v-else class="material-list">
              <li v-for="(item, index) in materialLinks" :key="`${item.url}-${index}`">
                <span class="material-name">{{ item.name }}</span>
                <div class="material-actions">
                  <el-button link type="primary" size="small" @click="previewMaterial(item)">在线预览</el-button>
                  <el-button link type="primary" size="small" @click="downloadMaterial(item)">下载</el-button>
                </div>
              </li>
            </ul>
          </section>
          <section v-if="detail.reviewStatus === 'pending'" class="review-actions">
            <el-button v-permission="'smartscript:copyright:seals:audit'" type="success" @click="openReview(detail)">审核申请</el-button>
          </section>
          <section class="material-block">
            <h3>审核与状态记录</h3>
            <el-alert
              v-if="logsFailed"
              title="操作记录加载失败，请重试"
              type="error"
              :closable="false"
              show-icon
              style="margin-bottom: 12px"
            >
              <el-button link type="primary" @click="loadLogs">重试</el-button>
            </el-alert>
            <el-table v-loading="logsLoading" :data="logs" size="small" empty-text="暂无操作记录">
              <el-table-column label="操作" min-width="125"><template #default="{ row }">{{ operationLabel(row.operationType) }}</template></el-table-column>
              <el-table-column prop="operatorName" label="操作人" width="105" />
              <el-table-column label="状态变化" min-width="150"><template #default="{ row }">{{ stateLabel(row.fromStatus) }} → {{ stateLabel(row.toStatus) }}</template></el-table-column>
              <el-table-column prop="createTime" label="时间" min-width="155" />
              <el-table-column prop="reason" label="原因 / 备注" min-width="150" show-overflow-tooltip />
            </el-table>
          </section>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="reviewVisible" title="印章审核" width="500px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="reviewForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="reviewForm.action === 'reject'" label="驳回原因" required>
          <el-input v-model="reviewForm.reason" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请填写驳回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewSubmitting" @click="submitReview">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resolveVisible" title="处理印章异常" width="500px" destroy-on-close>
      <el-alert title="处理后印章将恢复为停用状态；如需重新启用，请单独执行启用操作。" type="warning" :closable="false" show-icon />
      <el-form label-width="90px" style="margin-top: 18px">
        <el-form-item label="处理说明" required>
          <el-input v-model="resolveReason" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="填写异常原因及处理结果" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" :loading="resolveSubmitting" @click="resolveAbnormal">确认处理</el-button>
      </template>
    </el-dialog>

    <!-- 审核记录抽屉 -->
    <el-drawer v-model="logsVisible" title="审核记录" size="700px" destroy-on-close>
      <div v-loading="logsLoading" class="drawer-content">
        <el-alert v-if="logsFailed" title="审核记录加载失败，请重试" type="error" :closable="false" show-icon>
          <el-button link type="primary" @click="reloadLogs">重试</el-button>
        </el-alert>
        <el-empty v-else-if="!logsLoading && logs.length === 0" description="暂无审核记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="log in logs"
            :key="log.logId"
            :timestamp="log.createTime"
            :type="logType(log.operationType)"
            placement="top"
          >
            <el-card>
              <template #header>
                <div class="log-header">
                  <div>
                    <el-tag :type="logType(log.operationType)" size="small">{{ logActionLabel(log.operationType) }}</el-tag>
                    <span class="operator"> by {{ log.operatorName || '系统' }}</span>
                  </div>
                  <span class="muted">{{ log.operateTime }}</span>
                </div>
              </template>
              <div class="log-content">
                <div v-if="log.fromStatus || log.toStatus">
                  <strong>状态变化：</strong>
                  <el-tag v-if="log.fromStatus" size="small">{{ stateLabel(log.fromStatus) }}</el-tag>
                  <span v-if="log.fromStatus && log.toStatus"> → </span>
                  <el-tag v-if="log.toStatus" :type="sealType(log.toStatus)" size="small">{{ stateLabel(log.toStatus) }}</el-tag>
                </div>
                <div v-if="log.reason"><strong>{{ log.operationType === 'review_reject' ? '驳回原因' : '说明' }}：</strong>{{ log.reason }}</div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>

    <!-- 材料预览对话框 -->
    <MaterialPreviewDialog
      v-model="previewVisible"
      :material-url="currentMaterial.url"
      :material-name="currentMaterial.name"
    />
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useContactUser } from '@/composables/useContactUser'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import MaterialPreviewDialog from '@/components/MaterialPreviewDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { getCopyrightSealList, getCopyrightSealDetail, getCopyrightSealLogs, reviewCopyrightSeal, updateCopyrightSealStatus, resolveAbnormalCopyrightSeal } from '@/api/copyright'
import { resolveMediaUrl } from '@/utils/request'


defineOptions({ name: 'CopyrightSealReview' })

const query = ref({ pageNo: 1, pageSize: 10, reviewStatus: '', sealStatus: '', keyword: '' })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadFailed = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailFailed = ref(false)
const detail = ref(null)
const logs = ref([])
const logsLoading = ref(false)
const logsFailed = ref(false)
const logsVisible = ref(false)
const currentSealId = ref(null)
const reviewVisible = ref(false)
const reviewSubmitting = ref(false)
const resolveVisible = ref(false)
const resolveSubmitting = ref(false)
const statusChangingSealId = ref(null)
const resolveReason = ref('')
const reviewForm = ref({ sealId: null, action: 'approve', reason: '' })
const previewVisible = ref(false)
const currentMaterial = ref({ url: '', name: '' })
let selectedSealId = null
let listRequest = 0
let detailRequest = 0
let logsRequest = 0

const materialLinks = computed(() => {
  const source = detail.value?.materialUrls
  if (!source) return []
  let values = []
  try {
    values = Array.isArray(source) ? source : JSON.parse(source)
  } catch {
    values = String(source).split(',').map(value => value.trim()).filter(Boolean)
  }
  return values.map((item, index) => {
    const rawUrl = typeof item === 'string' ? item : item?.url
    if (!rawUrl) return null
    const url = resolveMediaUrl(rawUrl)
    const name = typeof item === 'object' && (item?.name || item?.filename)
      ? (item.name || item.filename)
      : `审核材料 ${index + 1}`
    return { url, name }
  }).filter(Boolean)
})

function safeUrl(value) {
  if (typeof value !== 'string') return ''
  return resolveMediaUrl(value)
}

function reviewLabel(status) {
  return ({ pending: '待审核', approved: '已通过', rejected: '已驳回' })[status] || status || '未知'
}
function reviewType(status) {
  return ({ pending: 'warning', approved: 'success', rejected: 'danger' })[status] || 'info'
}
function sealLabel(status) {
  return ({ disabled: '已停用', enabled: '已启用', abnormal: '异常' })[status] || status || '未知'
}
function stateLabel(status) {
  return ({ pending: '待审核', approved: '已通过', rejected: '已驳回', disabled: '已停用', enabled: '已启用', abnormal: '异常' })[status] || status || '—'
}
function sealType(status) {
  return ({ disabled: 'info', enabled: 'success', abnormal: 'danger' })[status] || 'info'
}
function operationLabel(type) {
  return ({ review_approve: '审核通过', review_reject: '审核驳回', enable: '启用', disable: '停用', resolve_abnormal: '异常处理', submit: '提交审核' })[type] || type || '—'
}
function logActionLabel(type) {
  return operationLabel(type)
}
function logType(type) {
  return ({ submit: 'primary', review_approve: 'success', review_reject: 'danger', enable: 'success', disable: 'warning', resolve_abnormal: 'info' })[type] || 'primary'
}

async function loadRows() {
  const requestId = ++listRequest
  loading.value = true
  try {
    const result = await getCopyrightSealList({ ...query.value, keyword: query.value.keyword.trim() || undefined })
    if (!Array.isArray(result?.rows) || !Number.isFinite(Number(result.total))) throw new Error('印章列表响应无效')
    if (requestId === listRequest) {
      rows.value = result.rows
      total.value = Number(result.total)
      loadFailed.value = false
    }
  } catch {
    if (requestId === listRequest) {
      rows.value = []
      total.value = 0
      loadFailed.value = true
    }
  } finally {
    if (requestId === listRequest) loading.value = false
  }
}

function handleQuery() {
  query.value.pageNo = 1
  loadRows()
}
function handleReset() {
  query.value = { pageNo: 1, pageSize: 10, reviewStatus: '', sealStatus: '', keyword: '' }
  loadRows()
}

async function openDetail(row) {
  selectedSealId = row.sealId
  detailVisible.value = true
  detail.value = null
  logs.value = []
  await Promise.all([loadDetail(), loadLogs()])
}

async function loadDetail() {
  if (selectedSealId == null) return
  const requestId = ++detailRequest
  detailLoading.value = true
  detailFailed.value = false
  try {
    const record = await getCopyrightSealDetail(selectedSealId)
    if (requestId === detailRequest) detail.value = record
  } catch {
    if (requestId === detailRequest) {
      detailFailed.value = true
      detail.value = null
    }
  } finally {
    if (requestId === detailRequest) detailLoading.value = false
  }
}

async function loadLogs() {
  if (selectedSealId == null) return
  const requestId = ++logsRequest
  const sealId = selectedSealId
  logsLoading.value = true
  logsFailed.value = false
  try {
    const history = await getCopyrightSealLogs(sealId)
    if (!Array.isArray(history)) throw new Error('印章操作记录响应无效')
    if (requestId === logsRequest && sealId === selectedSealId) logs.value = history
  } catch {
    if (requestId === logsRequest && sealId === selectedSealId) {
      logsFailed.value = true
      logs.value = []
    }
  } finally {
    if (requestId === logsRequest && sealId === selectedSealId) logsLoading.value = false
  }
}

async function openLogs(row) {
  currentSealId.value = row.sealId
  logsVisible.value = true
  logs.value = []
  logsLoading.value = true
  logsFailed.value = false
  try {
    const history = await getCopyrightSealLogs(row.sealId)
    if (!Array.isArray(history)) throw new Error('印章操作记录响应无效')
    logs.value = history
  } catch {
    logsFailed.value = true
    logs.value = []
    ElMessage.error('加载审核记录失败')
  } finally {
    logsLoading.value = false
  }
}

function openReview(row) {
  reviewForm.value = { sealId: row.sealId, action: 'approve', reason: '' }
  reviewVisible.value = true
}

// A3 联系用户（任务 27）：复用公共 composable 创建会话并跳转聊天详情
const { handleContactUser } = useContactUser({
  businessType: 'SEAL',
  extractUserId: (row) => row.userId,
  extractBusinessId: (row) => row.sealId,
  extractBusinessName: (row) => row.sealName,
  emptyMessage: '该印章申请暂未关联用户，无法发起沟通'
})

async function submitReview() {
  if (reviewSubmitting.value) return
  if (reviewForm.value.action === 'reject' && !reviewForm.value.reason.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  reviewSubmitting.value = true
  try {
    await reviewCopyrightSeal(reviewForm.value.sealId, {
      action: reviewForm.value.action,
      reason: reviewForm.value.reason.trim() || undefined
    })
    ElMessage.success(reviewForm.value.action === 'approve' ? '审核已通过' : '申请已驳回')
    reviewVisible.value = false
    await loadRows()
    if (selectedSealId === reviewForm.value.sealId) await Promise.all([loadDetail(), loadLogs()])
  } catch (error) {
    ElMessage.error(error?.message || '审核操作失败')
  } finally {
    reviewSubmitting.value = false
  }
}

async function changeStatus(row) {
  if (statusChangingSealId.value !== null) return
  const status = row.sealStatus === 'enabled' ? 'disabled' : 'enabled'
  const action = status === 'enabled' ? '启用' : '停用'
  statusChangingSealId.value = row.sealId
  try {
    await ElMessageBox.confirm(`确认${action}“${row.sealName}”吗？`, '印章状态变更', { type: 'warning' })
    await updateCopyrightSealStatus(row.sealId, status)
    ElMessage.success(`${action}成功`)
    await loadRows()
    if (selectedSealId === row.sealId) await Promise.all([loadDetail(), loadLogs()])
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || `${action}失败`)
  } finally {
    statusChangingSealId.value = null
  }
}

function openResolveAbnormal(row) {
  reviewForm.value.sealId = row.sealId
  resolveReason.value = ''
  resolveVisible.value = true
}

async function resolveAbnormal() {
  if (resolveSubmitting.value) return
  const reason = resolveReason.value.trim()
  if (!reason) {
    ElMessage.warning('请填写异常处理说明')
    return
  }
  resolveSubmitting.value = true
  try {
    await resolveAbnormalCopyrightSeal(reviewForm.value.sealId, reason)
    ElMessage.success('异常已处理，印章状态已恢复为停用')
    resolveVisible.value = false
    await loadRows()
    if (selectedSealId === reviewForm.value.sealId) await Promise.all([loadDetail(), loadLogs()])
  } catch (error) {
    ElMessage.error(error?.message || '异常处理失败')
  } finally {
    resolveSubmitting.value = false
  }
}

function previewMaterial(material) {
  currentMaterial.value = {
    url: material.url,
    name: material.name
  }
  previewVisible.value = true
}

function downloadMaterial(material) {
  if (!material.url) {
    ElMessage.warning('文件地址无效')
    return
  }
  
  const link = document.createElement('a')
  link.href = material.url
  link.download = material.name || 'material'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(loadRows)
</script>

<style scoped>
.drawer-content { min-height: 180px; }
.muted { color: #909399; font-size: 12px; }
.material-block { margin-top: 24px; }
.material-block h3 { margin: 0 0 12px; color: #303133; font-size: 14px; }
.seal-image { width: 100%; height: 220px; border: 1px solid #ebeef5; border-radius: 4px; }
.material-list { margin: 0; padding: 0; list-style: none; }
.material-list li { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f0f0f0; }
.material-list li:last-child { border-bottom: none; }
.material-name { flex: 1; color: #303133; font-size: 14px; }
.material-actions { display: flex; gap: 8px; }
.review-actions { margin-top: 20px; }
.log-header { display: flex; justify-content: space-between; align-items: center; }
.operator { color: #606266; font-size: 13px; }
.log-content { margin-top: 8px; color: #606266; line-height: 1.6; }
.log-content strong { color: #303133; margin-right: 4px; }
.action-buttons { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; }
.action-buttons .el-button { margin: 0; }
:deep(.action-buttons .el-button + .el-button) { margin-left: 0; }
:deep(.action-buttons .el-button--success.is-link),
:deep(.action-buttons .el-button--danger.is-link) { color: #fff !important; font-weight: 600; }
</style>
