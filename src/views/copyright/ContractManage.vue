<template>
  <PageContainer>
    <PageHeader title="合同管理" description="查看版权交易电子合同，支持预览与归档。编辑、签署由买卖双方在业务端完成。" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 150px">
          <el-option label="待签署" value="pending" />
          <el-option label="部分签署" value="partial_signed" />
          <el-option label="已完成" value="completed" />
          <el-option label="已归档" value="archived" />
          <el-option label="已作废" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input v-model="query.keyword" clearable placeholder="合同编号 / 订单编号" style="width: 240px" @keyup.enter="handleQuery" />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="rows"
      :loading="loading"
      :total="total"
      :empty-text="loadFailed ? '加载失败，请重试' : '暂无合同记录'"
      @page-change="loadRows"
      @size-change="loadRows"
    >
      <template #actions>
        <el-button v-if="loadFailed" link type="primary" @click="loadRows">重试</el-button>
      </template>
      <el-table-column prop="contractNo" label="合同编号" width="160" />
      <el-table-column prop="orderNo" label="订单编号" width="160" />
      <el-table-column label="买方" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.buyerName || '—' }}</template>
      </el-table-column>
      <el-table-column label="卖方" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.sellerName || '—' }}</template>
      </el-table-column>
      <el-table-column label="合同金额" width="120" align="right">
        <template #default="{ row }">¥{{ row.amount?.toFixed(2) || '0.00' }}</template>
      </el-table-column>
      <el-table-column label="签署状态" width="150">
        <template #default="{ row }">
          <div style="font-size: 12px;">
            <div>买方：<el-tag :type="row.buyerSignStatus ? 'success' : 'info'" size="small">{{ row.buyerSignStatus ? '已签署' : '未签署' }}</el-tag></div>
            <div style="margin-top: 4px;">卖方：<el-tag :type="row.sellerSignStatus ? 'success' : 'info'" size="small">{{ row.sellerSignStatus ? '已签署' : '未签署' }}</el-tag></div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="合同状态" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="createdAt" label="生成时间" width="170" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <div class="contract-actions">
            <el-button link type="primary" size="small" @click="preview(row)">预览</el-button>
            <el-button v-if="row.status === 'completed'" v-permission="'smartscript:copyright:contract:archive'" type="info" size="small" @click="archive(row)">归档</el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog v-model="previewVisible" title="合同预览" width="900px" top="5vh">
      <div v-if="previewContent" class="preview-content">
        <div class="contract-header">
          <h2>{{ previewTitle }}</h2>
          <p>合同编号：{{ previewData?.contractNo }}</p>
        </div>
        <div class="contract-body" v-html="previewContent"></div>
      </div>
      <div v-else class="preview-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <p>加载中...</p>
      </div>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { getContractList, previewContract, archiveContract } from '@/api/copyright'

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
const previewVisible = ref(false)
const previewContent = ref('')
const previewData = ref(null)
const previewTitle = computed(() => previewData.value?.contractType === 'transfer' ? '版权转让合同' : '版权授权合同')

const statusType = (status) => {
  const map = { pending: 'warning', partial_signed: 'primary', completed: 'success', archived: 'info', cancelled: 'danger' }
  return map[status] || ''
}

const statusLabel = (status) => {
  const map = { pending: '待签署', partial_signed: '部分签署', completed: '已完成', archived: '已归档', cancelled: '已作废' }
  return map[status] || status
}

const loadRows = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    const res = await getContractList(query)
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

const preview = async (row) => {
  previewData.value = row
  previewContent.value = ''
  previewVisible.value = true

  try {
    const res = await previewContract(row.contractId)
    let html = res?.content || res?.data?.content || ''
    // 签名/印章等 /profile/ 静态资源需经 API 代理前缀访问
    const apiBase = import.meta.env.VITE_APP_BASE_API || '/dev-api'
    html = html.replace(/src="\/profile\//g, `src="${apiBase}/profile/`)
    previewContent.value = html
  } catch {
    ElMessage.error('预览加载失败')
    previewContent.value = '<p style="color: red;">加载失败</p>'
  }
}

const archive = async (row) => {
  try {
    await ElMessageBox.confirm('确认归档该合同？归档后合同将不可修改。', '提示', { type: 'warning' })
    await archiveContract(row.contractId)
    ElMessage.success('归档成功')
    loadRows()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

onMounted(() => {
  loadRows()
})
</script>

<style scoped>
.preview-content {
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.contract-header {
  text-align: center;
  padding: 20px;
  border-bottom: 2px solid var(--el-border-color);
  background: var(--el-fill-color-light);
}

.contract-header h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.contract-body {
  padding: 20px;
}

.preview-loading {
  text-align: center;
  padding: 60px 0;
  color: var(--el-text-color-secondary);
}

.contract-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.contract-actions :deep(.el-button) {
  margin-left: 0 !important;
  padding: 5px 12px;
  font-weight: 500;
}

.preview-loading .el-icon {
  font-size: 40px;
  margin-bottom: 10px;
}
</style>
