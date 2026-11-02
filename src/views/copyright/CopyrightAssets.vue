<template>
  <PageContainer>
    <PageHeader title="版权资产管理" description="仅管理已标记为有版权且未删除的作品上架状态；详情仅查看，不修改作品内容。" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" placeholder="全部上架状态" clearable style="width: 160px">
          <el-option label="已上架" value="on_shelf" />
          <el-option label="已下架" value="off_shelf" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.keyword"
          clearable
          placeholder="作品名称 / 作者"
          style="width: 220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="assets"
      :loading="loading"
      :total="total"
      :empty-text="emptyText"
      @page-change="loadAssets"
      @size-change="loadAssets"
    >
      <template #actions>
        <el-button v-if="loadFailed" link type="primary" @click="loadAssets">重试</el-button>
      </template>
      <el-table-column prop="workId" label="作品编号" width="100" />
      <el-table-column prop="title" label="作品名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="authorName" label="作者" width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.authorName || '—' }}</template>
      </el-table-column>
      <el-table-column prop="workType" label="作品类型" width="130">
        <template #default="{ row }">{{ workTypeLabel(row.workType) }}</template>
      </el-table-column>
      <el-table-column label="上架状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="light" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <div class="asset-actions">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-permission="'smartscript:copyright:assets:history'" link type="primary" @click="openHistory(row)">授权历史</el-button>
            <el-button
              v-if="row.status === 'on_shelf' || row.status === 'off_shelf'"
              v-permission="'smartscript:copyright:assets:edit'"
              link
              :loading="statusUpdatingWorkId === row.workId"
              :disabled="statusUpdatingWorkId !== null && statusUpdatingWorkId !== row.workId"
              @click="changeAssetStatus(row)"
            >
              {{ row.status === 'on_shelf' ? '下架' : '上架' }}
            </el-button>
            <!-- A3 联系用户入口（任务 26）：待版权资产关联真实 userId 后自动启用 -->
            <el-button link type="primary" :disabled="!row.userId" @click="handleContactUser(row)">联系用户</el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <el-drawer v-model="detailVisible" title="版权资产详情" size="520px">
      <div v-loading="detailLoading" class="asset-detail">
        <el-empty v-if="detailFailed" description="详情加载失败，请重试">
          <el-button type="primary" @click="retryDetail">重试</el-button>
        </el-empty>
        <template v-else-if="detail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="作品编号">{{ detail.workId }}</el-descriptions-item>
            <el-descriptions-item label="作品名称">{{ detail.title || '—' }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ detail.authorName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="作品类型">{{ workTypeLabel(detail.workType) }}</el-descriptions-item>
            <el-descriptions-item label="上架状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.createTime || '—' }}</el-descriptions-item>
          </el-descriptions>
          <section class="summary-block">
            <h3>作品简介</h3>
            <p>{{ detail.summary || '暂无简介' }}</p>
          </section>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="historyVisible" title="授权历史" width="900px" destroy-on-close>
      <div v-loading="historyLoading">
        <el-alert
          v-if="historyFailed"
          title="授权历史加载失败，请重试"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 12px"
        >
          <el-button link type="primary" @click="loadHistory">重试</el-button>
        </el-alert>
        <el-table :data="historyRows" empty-text="暂无关联授权订单">
          <el-table-column prop="orderNo" label="订单编号" min-width="170" />
          <el-table-column prop="buyerName" label="买方" min-width="120" />
          <el-table-column prop="sellerName" label="作者" min-width="120" />
          <el-table-column prop="licenseType" label="授权类型" min-width="120" />
          <el-table-column prop="totalAmount" label="订单金额" width="120" />
          <el-table-column prop="status" label="订单状态" width="120" />
          <el-table-column prop="payTime" label="付款时间" min-width="160" />
        </el-table>
        <el-pagination
          :current-page="historyQuery.pageNo"
          :page-size="historyQuery.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="historyTotal"
          @current-change="handleHistoryPageChange"
          @size-change="handleHistorySizeChange"
          style="justify-content: flex-end; margin-top: 16px"
        />
      </div>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useContactUser } from '@/composables/useContactUser'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import {
  getCopyrightAssets,
  getCopyrightAssetDetail,
  getCopyrightAuthorizationHistory,
  updateCopyrightAssetStatus
} from '@/api/copyright'


defineOptions({ name: 'CopyrightAssets' })

const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const assets = ref([])
const total = ref(0)
const detail = ref(null)
const detailFailed = ref(false)
const loadFailed = ref(false)
const historyVisible = ref(false)
const historyLoading = ref(false)
const historyFailed = ref(false)
const historyRows = ref([])
const historyTotal = ref(0)
const historyWorkId = ref(null)
const historyQuery = ref({ pageNo: 1, pageSize: 10 })
const statusUpdatingWorkId = ref(null)
const query = ref({ pageNo: 1, pageSize: 10, status: '', keyword: '' })
const emptyText = computed(() => {
  if (loadFailed.value) return '加载失败，请重试'
  if (query.value.status || query.value.keyword.trim()) return '没有符合当前筛选条件的版权资产'
  return '暂无版权资产。仅显示作品管理中标记有版权且未删除的作品。'
})
let assetsRequestId = 0
let detailRequestId = 0
let historyRequestId = 0
let selectedWorkId = null

const statusTexts = {
  on_shelf: '已上架',
  off_shelf: '已下架',
  approved: '审核通过',
  pending: '审核中',
  draft: '草稿'
}

const typeTexts = {
  script: '剧本',
  novel: '小说',
  short_drama: '短剧',
  movie: '电影剧本',
  tv_series: '电视剧剧本'
}

function statusLabel(status) {
  return statusTexts[status] || status || '未知'
}

function statusType(status) {
  if (status === 'on_shelf' || status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  return 'info'
}

function workTypeLabel(type) {
  return typeTexts[type] || type || '—'
}

async function loadAssets() {
  const requestId = ++assetsRequestId
  loading.value = true
  try {
    const result = await getCopyrightAssets({
      pageNo: query.value.pageNo,
      pageSize: query.value.pageSize,
      status: query.value.status || undefined,
      keyword: query.value.keyword.trim() || undefined
    })
    if (!Array.isArray(result?.rows) || !Number.isFinite(Number(result.total))) {
      throw new Error('版权资产接口响应格式无效')
    }
    if (requestId === assetsRequestId) {
      assets.value = result.rows
      total.value = Number(result.total)
      loadFailed.value = false
    }
  } catch {
    if (requestId === assetsRequestId) {
      assets.value = []
      total.value = 0
      loadFailed.value = true
    }
  } finally {
    if (requestId === assetsRequestId) {
      loading.value = false
    }
  }
}

function handleQuery() {
  query.value.pageNo = 1
  loadAssets()
}

function handleReset() {
  query.value = { pageNo: 1, pageSize: 10, status: '', keyword: '' }
  loadAssets()
}

async function openDetail(row) {
  selectedWorkId = row.workId
  detailVisible.value = true
  await loadDetail(selectedWorkId)
}

function retryDetail() {
  if (selectedWorkId != null) {
    loadDetail(selectedWorkId)
  }
}

async function loadDetail(workId) {
  const requestId = ++detailRequestId
  detailLoading.value = true
  detailFailed.value = false
  detail.value = null

  try {
    const result = await getCopyrightAssetDetail(workId)
    if (requestId === detailRequestId) {
      detail.value = result
    }
  } catch {
    if (requestId === detailRequestId) {
      detailFailed.value = true
    }
  } finally {
    if (requestId === detailRequestId) {
      detailLoading.value = false
    }
  }
}

async function changeAssetStatus(row) {
  if (statusUpdatingWorkId.value !== null) return
  const nextStatus = row.status === 'on_shelf' ? 'off_shelf' : 'on_shelf'
  const action = nextStatus === 'on_shelf' ? '上架' : '下架'
  statusUpdatingWorkId.value = row.workId
  try {
    await ElMessageBox.confirm(`确认${action}《${row.title}》？`, '版权资产状态变更', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    await updateCopyrightAssetStatus(row.workId, nextStatus)
    ElMessage.success(`${action}成功`)
    await loadAssets()
    if (detail.value?.workId === row.workId) {
      await loadDetail(row.workId)
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || `${action}失败`)
    }
  } finally {
    statusUpdatingWorkId.value = null
  }
}

function openHistory(row) {
  historyWorkId.value = row.workId
  historyQuery.value = { pageNo: 1, pageSize: 10 }
  historyVisible.value = true
  loadHistory()
}

// A3 联系用户（任务 26）：复用公共 composable 创建会话并跳转聊天详情
const { handleContactUser } = useContactUser({
  businessType: 'COPYRIGHT',
  extractUserId: (row) => row.userId,
  extractBusinessId: (row) => row.workId,
  extractBusinessName: (row) => row.workName || row.title,
  emptyMessage: '该版权资产暂未关联用户，无法发起沟通'
})

async function loadHistory() {
  if (historyWorkId.value == null) return
  const requestId = ++historyRequestId
  historyLoading.value = true
  historyFailed.value = false
  try {
    const result = await getCopyrightAuthorizationHistory(historyWorkId.value, historyQuery.value)
    if (!Array.isArray(result?.rows) || !Number.isFinite(Number(result.total))) {
      throw new Error('授权历史接口响应格式无效')
    }
    if (requestId === historyRequestId) {
      historyRows.value = result.rows
      historyTotal.value = Number(result.total)
    }
  } catch {
    if (requestId === historyRequestId) {
      historyRows.value = []
      historyTotal.value = 0
      historyFailed.value = true
    }
  } finally {
    if (requestId === historyRequestId) {
      historyLoading.value = false
    }
  }
}

function handleHistoryPageChange(page) {
  historyQuery.value.pageNo = page
  loadHistory()
}

function handleHistorySizeChange(size) {
  historyQuery.value.pageSize = size
  historyQuery.value.pageNo = 1
  loadHistory()
}

onMounted(loadAssets)
</script>

<style scoped>
.asset-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.asset-actions .el-button {
  margin-left: 0;
  padding: 0 4px;
}

.asset-detail {
  min-height: 160px;
}

.summary-block {
  margin-top: 24px;
}

.summary-block h3 {
  margin: 0 0 10px;
  color: #303133;
  font-size: 14px;
}

.summary-block p {
  margin: 0;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
