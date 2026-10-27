<template>
  <PageContainer>
    <PageHeader title="提现审核" description="超过 1 万元的申请需人工审核（通过/驳回）；1 万元及以下申请自动通过，仅可查看记录。" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 150px">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
          <el-option label="已打款" value="paid" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input v-model="query.keyword" clearable placeholder="用户名 / 提现编号" style="width: 230px" @keyup.enter="handleQuery" />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="rows"
      :loading="loading"
      :total="total"
      :empty-text="loadFailed ? '加载失败，请重试' : '暂无提现申请'"
      @page-change="loadRows"
      @size-change="loadRows"
    >
      <template #actions>
        <el-button v-if="loadFailed" link type="primary" @click="loadRows">重试</el-button>
        <el-button v-permission="'smartscript:copyright:withdraw:export'" type="primary" @click="exportRecords">导出记录</el-button>
      </template>
      <el-table-column prop="withdrawNo" label="提现编号" width="160" />
      <el-table-column label="申请人" min-width="150">
        <template #default="{ row }">
          <span>{{ row.userName || '—' }}</span>
          <span v-if="row.userAccount" class="muted">（{{ row.userAccount }}）</span>
        </template>
      </el-table-column>
      <el-table-column label="提现金额" width="120" align="right">
        <template #default="{ row }">¥{{ row.amount?.toFixed(2) || '0.00' }}</template>
      </el-table-column>
      <el-table-column label="手续费" width="100" align="right">
        <template #default="{ row }">¥{{ row.fee?.toFixed(2) || '0.00' }}</template>
      </el-table-column>
      <el-table-column label="实际到账" width="120" align="right">
        <template #default="{ row }">¥{{ row.actualAmount?.toFixed(2) || '0.00' }}</template>
      </el-table-column>
      <el-table-column label="账户信息" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.accountName }} / {{ row.accountNo }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" width="170" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <div class="withdraw-actions">
            <el-button v-permission="'smartscript:copyright:withdraw:query'" link type="primary" @click="openDetail(row)">查看</el-button>
            <el-button v-if="row.status === 'pending'" v-permission="'smartscript:copyright:withdraw:approve'" type="success" @click="approve(row)">通过</el-button>
            <el-button v-if="row.status === 'pending'" v-permission="'smartscript:copyright:withdraw:reject'" type="danger" @click="openReject(row)">驳回</el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog v-model="rejectVisible" title="驳回提现" width="500px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectForm.opinion" type="textarea" :rows="4" placeholder="请输入驳回原因" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmReject">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="提现详情" size="560px">
      <div v-if="detail" class="drawer-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="提现编号">{{ detail.withdrawNo }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ detail.userName }}（{{ detail.userAccount }}）</el-descriptions-item>
          <el-descriptions-item label="提现金额">¥{{ detail.amount?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="手续费">¥{{ detail.fee?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="实际到账">¥{{ detail.actualAmount?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="提现方式">{{ withdrawTypeLabel(detail.withdrawType) }}</el-descriptions-item>
          <el-descriptions-item label="账户名">{{ detail.accountName }}</el-descriptions-item>
          <el-descriptions-item label="账号">{{ detail.accountNo }}</el-descriptions-item>
          <el-descriptions-item label="开户行">{{ detail.bankName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ detail.createdAt }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.reviewTime" label="审核时间">{{ detail.reviewTime }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.reviewOpinion" label="审核意见">{{ detail.reviewOpinion }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.payTime" label="打款时间">{{ detail.payTime }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { getWithdrawList, getWithdrawDetail, approveWithdraw, rejectWithdraw, exportWithdrawRecords } from '@/api/copyright'

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  status: '',
  keyword: ''
})

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadFailed = ref(false)
const detail = ref(null)
const detailVisible = ref(false)
const rejectVisible = ref(false)
const rejectForm = reactive({ opinion: '', withdrawId: null })
const submitting = ref(false)

const statusType = (status) => {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger', frozen: 'info', paid: '' }
  return map[status] || ''
}

const statusLabel = (status) => {
  const map = { pending: '待审核', approved: '已通过', rejected: '已驳回', frozen: '已冻结', paid: '已打款' }
  return map[status] || status
}

const withdrawTypeLabel = (type) => {
  const map = { bank: '银行卡', alipay: '支付宝', wechat: '微信' }
  return map[type] || type
}

const loadRows = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    const res = await getWithdrawList(query)
    rows.value = res.rows || []
    total.value = res.total || 0
  } catch (error) {
    loadFailed.value = true
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  query.pageNo = 1
  loadRows()
}

const handleReset = () => {
  query.status = ''
  query.keyword = ''
  handleQuery()
}

const openDetail = async row => {
  detail.value = null
  detailVisible.value = true
  try {
    detail.value = await getWithdrawDetail(row.withdrawId)
  } catch {
    detailVisible.value = false
    ElMessage.error('提现详情加载失败')
  }
}

const approve = async (row) => {
  try {
    await ElMessageBox.confirm('确认通过该提现申请？', '提示', { type: 'warning' })
    await approveWithdraw(row.withdrawId)
    ElMessage.success('审核通过')
    loadRows()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const openReject = (row) => {
  rejectForm.opinion = ''
  rejectForm.withdrawId = row.withdrawId
  rejectVisible.value = true
}

const confirmReject = async () => {
  if (!rejectForm.opinion.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectWithdraw(rejectForm.withdrawId, rejectForm.opinion)
    ElMessage.success('驳回成功')
    rejectVisible.value = false
    loadRows()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const exportRecords = async () => {
  try {
    const result = await exportWithdrawRecords({ status: query.status, keyword: query.keyword })
    const blob = result instanceof Blob ? result : new Blob([result], { type: 'text/csv;charset=utf-8' })
    if (blob.type.includes('application/json')) {
      const payload = await blob.text()
      throw new Error(JSON.parse(payload)?.msg || '导出失败')
    }
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `提现记录_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    ElMessage.success('提现记录已导出')
  } catch (error) {
    ElMessage.error(error?.message || '导出失败')
  }
}

onMounted(() => {
  loadRows()
})
</script>

<style scoped>
.drawer-content {
  padding: 0 20px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.withdraw-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.withdraw-actions :deep(.el-button) {
  margin-left: 0;
  min-width: 48px;
}
</style>
