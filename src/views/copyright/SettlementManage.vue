<template>
  <PageContainer>
    <PageHeader title="结算管理" description="与 App 同源结算单：订单完成后自动生成，作者确认入账；管理员仅处理作者异议。" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 150px">
          <el-option label="待确认" value="pending" />
          <el-option label="有异议" value="disputed" />
          <el-option label="已入账" value="confirmed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-date-picker
          v-model="query.dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item>
        <el-input v-model="query.keyword" clearable placeholder="作者 / 结算单号 / 订单号" style="width: 240px" @keyup.enter="handleQuery" />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="rows"
      :loading="loading"
      :total="total"
      :empty-text="loadFailed ? '加载失败，请重试' : '暂无结算记录'"
      @page-change="loadRows"
      @size-change="loadRows"
    >
      <template #actions>
        <el-button v-if="loadFailed" link type="primary" @click="loadRows">重试</el-button>
      </template>
      <el-table-column prop="settleNo" label="结算单号" width="180" fixed="left" show-overflow-tooltip>
        <template #default="{ row }">{{ row.settleNo || row.settlementNo || '—' }}</template>
      </el-table-column>
      <el-table-column label="作者" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.authorName || '—' }}</template>
      </el-table-column>
      <el-table-column label="订单号" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.orderNo || '—' }}</template>
      </el-table-column>
      <el-table-column label="作品" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.workTitle || '—' }}</template>
      </el-table-column>
      <el-table-column label="总金额" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column label="平台分成" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.platformFee ?? row.platformAmount) }}</template>
      </el-table-column>
      <el-table-column label="作者收益" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.sellerAmount ?? row.authorAmount) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.createdAt || '—' }}</template>
      </el-table-column>
      <el-table-column label="确认时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.confirmTime || row.settlementTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
            <el-button type="primary" size="small" @click="openDetail(row)">查看明细</el-button>
            <el-button
              v-if="row.status === 'disputed'"
              v-permission="'smartscript:copyright:settlement:handle'"
              type="danger"
              size="small"
              @click="openHandle(row)"
            >
              处理异常
            </el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <el-drawer v-model="detailVisible" title="结算明细 / 分成核算" size="70%">
      <div v-loading="detailLoading" class="drawer-content">
        <div v-if="detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="结算单号">{{ detail.settleNo || detail.settlementNo }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ detail.authorName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="订单号">{{ detail.orderNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="作品">{{ detail.workTitle || '—' }}</el-descriptions-item>
            <el-descriptions-item label="总交易额">¥{{ money(detail.totalAmount) }}</el-descriptions-item>
            <el-descriptions-item label="平台抽成比例">{{ splitPercent(detail) }}</el-descriptions-item>
            <el-descriptions-item label="平台分成">¥{{ money(detail.platformFee ?? detail.platformAmount) }}</el-descriptions-item>
            <el-descriptions-item label="作者收益">¥{{ money(detail.sellerAmount ?? detail.authorAmount) }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusType(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.createdAt || '—' }}</el-descriptions-item>
            <el-descriptions-item label="确认时间">{{ detail.confirmTime || '—' }}</el-descriptions-item>
            <el-descriptions-item label="异议时间">{{ detail.disputeTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.disputeReason" label="异议/处理说明" :span="2">
              <pre class="remark-block">{{ detail.disputeReason }}</pre>
            </el-descriptions-item>
          </el-descriptions>

          <div style="margin-top: 24px;">
            <h3 style="margin-bottom: 12px;">分成核算（按订单）</h3>
            <el-table :data="detail.orders || []" border>
              <el-table-column prop="orderNo" label="订单号" width="160" />
              <el-table-column prop="workName" label="作品" min-width="150" show-overflow-tooltip />
              <el-table-column label="订单金额" width="120" align="right">
                <template #default="{ row }">¥{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column label="平台分成" width="120" align="right">
                <template #default="{ row }">¥{{ money(row.platformFee) }}</template>
              </el-table-column>
              <el-table-column label="作者收益" width="120" align="right">
                <template #default="{ row }">¥{{ money(row.authorIncome) }}</template>
              </el-table-column>
              <el-table-column prop="orderTime" label="创建时间" width="170" />
            </el-table>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="handleVisible" title="处理异常" width="520px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        处理后将回到「待确认」，作者需在 App 再次确认入账。请填写处理说明。
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="作者异议">
          <el-input v-model="disputeReason" type="textarea" :rows="3" disabled />
        </el-form-item>
        <el-form-item label="处理说明" required>
          <el-input v-model="handleRemark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="请输入处理说明，将同步给作者" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="handleLoading" @click="submitHandle">确认处理</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { getSettlementList, getSettlementDetail, handleSettlementAbnormal } from '@/api/copyright'

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  status: '',
  dateRange: null,
  keyword: ''
})

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadFailed = ref(false)

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

const handleVisible = ref(false)
const handleLoading = ref(false)
const disputeReason = ref('')
const handleRemark = ref('')
const currentSettleId = ref(null)

const money = value => {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

const splitPercent = detail => {
  const rate = Number(detail?.splitRate)
  if (Number.isFinite(rate)) {
    const pct = rate <= 1 ? rate * 100 : rate
    return pct.toFixed(rate < 1 || !Number.isInteger(pct) ? 1 : 0) + '%'
  }
  if (detail?.platformRatio != null) return Number(detail.platformRatio) + '%'
  return '—'
}

const statusType = status => ({ pending: 'warning', disputed: 'danger', confirmed: 'success' }[status] || 'info')
const statusLabel = status => ({ pending: '待确认', disputed: '有异议', confirmed: '已入账' }[status] || status)

const handleQuery = () => {
  query.pageNo = 1
  loadRows()
}

const handleReset = () => {
  query.status = ''
  query.dateRange = null
  query.keyword = ''
  query.pageNo = 1
  loadRows()
}

async function loadRows() {
  loading.value = true
  loadFailed.value = false
  try {
    const params = {
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      status: query.status || undefined,
      keyword: query.keyword || undefined
    }
    if (query.dateRange && query.dateRange.length === 2) {
      params.startDate = query.dateRange[0]
      params.endDate = query.dateRange[1]
    }
    const result = await getSettlementList(params)
    if (result && Array.isArray(result.rows)) {
      rows.value = result.rows
      total.value = Number(result.total) || 0
    } else {
      rows.value = []
      total.value = 0
    }
  } catch (error) {
    loadFailed.value = true
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  const id = row.settleId || row.settlementId
  detailVisible.value = true
  detailLoading.value = true
  try {
    const result = await getSettlementDetail(id)
    if (!result) throw new Error('返回数据为空')
    detail.value = result
  } catch (error) {
    ElMessage.error(error?.message || '加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function openHandle(row) {
  currentSettleId.value = row.settleId || row.settlementId
  disputeReason.value = row.disputeReason || row.abnormalReason || '作者提出异议'
  handleRemark.value = ''
  handleVisible.value = true
}

async function submitHandle() {
  if (!handleRemark.value.trim()) {
    ElMessage.warning('请输入处理说明')
    return
  }
  handleLoading.value = true
  try {
    await handleSettlementAbnormal(currentSettleId.value, { remark: handleRemark.value.trim() })
    ElMessage.success('已处理，结算单回到待确认，请作者在 App 再次确认入账')
    handleVisible.value = false
    loadRows()
  } catch (error) {
    ElMessage.error(error?.message || '处理失败')
  } finally {
    handleLoading.value = false
  }
}

onMounted(loadRows)
</script>

<style scoped>
.drawer-content { padding: 0 20px; }
.remark-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}
</style>




