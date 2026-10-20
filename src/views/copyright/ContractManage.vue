<template>
  <PageContainer>
    <PageHeader title="合同管理" description="管理版权交易电子合同，支持生成、预览、下载和归档操作。" />

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
        <el-button v-permission="'smartscript:copyright:contract:generate'" type="primary" @click="openGenerate">生成合同</el-button>
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
      <el-table-column label="操作" width="400" fixed="right">
        <template #default="{ row }">
          <div class="contract-actions">
            <el-button link type="primary" size="small" @click="preview(row)">预览</el-button>
            <el-button link type="primary" size="small" @click="download(row)">下载</el-button>
            <template v-if="row.status === 'pending' && !row.buyerSignStatus && !row.sellerSignStatus">
              <el-button v-permission="'smartscript:copyright:contract:edit'" type="warning" size="small" @click="edit(row)">编辑</el-button>
            </template>
            <template v-if="['pending', 'partial_signed'].includes(row.status)">
              <el-button v-if="!row.buyerSignStatus" v-permission="'smartscript:copyright:contract:sign'" type="success" size="small" @click="sign(row, 'buyer')">买方签署</el-button>
              <el-button v-if="!row.sellerSignStatus" v-permission="'smartscript:copyright:contract:sign'" type="success" size="small" @click="sign(row, 'seller')">卖方签署</el-button>
            </template>
            <el-button v-if="row.status === 'completed'" v-permission="'smartscript:copyright:contract:archive'" type="info" size="small" @click="archive(row)">归档</el-button>
            <el-button v-if="['completed', 'archived'].includes(row.status)" v-permission="'smartscript:copyright:contract:list'" type="primary" size="small" @click="regeneratePdf(row)">重建PDF</el-button>
            <el-button v-if="['pending', 'partial_signed'].includes(row.status)" v-permission="'smartscript:copyright:contract:cancel'" type="danger" size="small" @click="cancel(row)">作废</el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog v-model="generateVisible" title="生成合同" width="600px">
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="关联订单" required>
          <el-select v-model="generateForm.orderId" placeholder="请选择待签约订单" style="width: 100%" :loading="ordersLoading" @change="handleOrderChange">
            <el-option
              v-for="order in availableOrders"
              :key="order.orderId"
              :label="`订单 ${order.orderNo} - ${order.workTitle || '未命名作品'}（${order.buyerName || '买方'} → ${order.sellerName || '卖方'}）`"
              :value="order.orderId"
            />
          </el-select>
          <div v-if="!ordersLoading && availableOrders.length === 0" class="muted">当前没有可生成合同的待签约订单</div>
        </el-form-item>
        <el-form-item label="合同模板" required>
          <el-select v-model="generateForm.templateId" placeholder="请选择模板" style="width: 100%">
            <el-option label="版权转让合同模板" value="TPL_COPYRIGHT_TRANSFER" />
            <el-option label="版权授权合同模板" value="TPL_COPYRIGHT_LICENSE" />
          </el-select>
        </el-form-item>
        <el-form-item label="合同金额" required>
          <el-input :model-value="selectedOrder ? `¥${Number(selectedOrder.amount).toFixed(2)}` : ''" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="confirmGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" title="编辑合同" width="600px">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
        <template #title>
          <div style="font-size: 13px;">编辑说明：只能修改合同模板类型。一旦有任何一方签署，合同将无法编辑，只能作废。</div>
        </template>
      </el-alert>
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="合同编号">
          <el-input v-model="editForm.contractNo" disabled />
        </el-form-item>
        <el-form-item label="订单编号">
          <el-input v-model="editForm.orderNo" disabled />
        </el-form-item>
        <el-form-item label="作品名称">
          <el-input v-model="editForm.workTitle" disabled />
        </el-form-item>
        <el-form-item label="合同模板" required>
          <el-select v-model="editForm.templateId" placeholder="请选择模板" style="width: 100%">
            <el-option label="版权转让合同模板" value="TPL_COPYRIGHT_TRANSFER" />
            <el-option label="版权授权合同模板" value="TPL_COPYRIGHT_LICENSE" />
          </el-select>
        </el-form-item>
        <el-form-item label="合同金额" required>
          <el-input-number v-model="editForm.amount" :min="0" :precision="2" :step="100" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="confirmEdit">保存</el-button>
      </template>
    </el-dialog>

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
import { getContractList, getAvailableContractOrders, generateContract, previewContract, downloadContract, archiveContract, cancelContract, signContract, updateContract, regenerateContractPdf } from '@/api/copyright'

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
const generateVisible = ref(false)
const generateForm = reactive({ orderId: null, templateId: '', amount: 0 })
const availableOrders = ref([])
const ordersLoading = ref(false)
const selectedOrder = computed(() => availableOrders.value.find(order => order.orderId === generateForm.orderId))
const generating = ref(false)
const previewVisible = ref(false)
const previewContent = ref('')
const previewData = ref(null)
const editVisible = ref(false)
const editForm = reactive({ 
  contractId: null, 
  contractNo: '',
  templateId: '', 
  orderId: null,
  orderNo: '',
  workTitle: '',
  buyerName: '',
  sellerName: '',
  amount: 0,
  licenseType: ''
})
const editLoading = ref(false)
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

const openGenerate = async () => {
  generateForm.orderId = null
  generateForm.templateId = ''
  generateForm.amount = 0
  generateVisible.value = true
  ordersLoading.value = true
  try {
    const result = await getAvailableContractOrders()
    availableOrders.value = Array.isArray(result) ? result : []
  } catch {
    availableOrders.value = []
    ElMessage.error('可签约订单加载失败')
  } finally {
    ordersLoading.value = false
  }
}

const handleOrderChange = orderId => {
  const order = availableOrders.value.find(item => item.orderId === orderId)
  generateForm.amount = Number(order?.amount || 0)
}

const confirmGenerate = async () => {
  if (!generateForm.orderId || !generateForm.templateId || !selectedOrder.value || generateForm.amount <= 0) {
    ElMessage.warning('请完整选择待签约订单和合同模板')
    return
  }
  generating.value = true
  try {
    await generateContract(generateForm)
    ElMessage.success('合同生成成功')
    generateVisible.value = false
    loadRows()
  } catch {
    ElMessage.error('生成失败')
  } finally {
    generating.value = false
  }
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

const download = async (row) => {
  try {
    const response = await downloadContract(row.contractId)
    const blob = response instanceof Blob ? response : new Blob([response])
    const signature = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer())
    if (signature !== '%PDF-') {
      throw new Error('下载内容不是有效的 PDF 文件')
    }

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${row.contractNo || `contract-${row.contractId}`}.pdf`
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    ElMessage.success(`合同 ${row.contractNo} 下载成功`)
  } catch (error) {
    ElMessage.error(error?.message || '合同下载失败')
  }
}

const sign = async (row, party) => {
  const partyLabel = party === 'buyer' ? '买方' : '卖方'
  try {
    await ElMessageBox.confirm(`确认登记${partyLabel}已线下完成签署？此操作仅记录签署状态，不代表第三方电子签名。`, '登记签署', { type: 'warning' })
    await signContract(row.contractId, party)
    ElMessage.success(`${partyLabel}签署状态已登记`)
    loadRows()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '签署状态登记失败')
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

const edit = async (row) => {
  if (row.buyerSignStatus || row.sellerSignStatus) {
    ElMessage.warning('已有签署记录的合同不可编辑，只能作废')
    return
  }
  
  Object.assign(editForm, {
    contractId: row.contractId,
    contractNo: row.contractNo,
    templateId: row.templateId || 'TPL_COPYRIGHT_TRANSFER',
    orderId: row.orderId,
    orderNo: row.orderNo,
    workTitle: row.workTitle || '',
    buyerName: row.buyerName || '',
    sellerName: row.sellerName || '',
    amount: row.amount || 0,
    licenseType: row.licenseType || ''
  })
  editVisible.value = true
}

const confirmEdit = async () => {
  if (!editForm.templateId) {
    ElMessage.warning('请选择合同模板')
    return
  }
  
  if (!editForm.amount || editForm.amount <= 0) {
    ElMessage.warning('请输入有效的合同金额')
    return
  }
  
  editLoading.value = true
  try {
    // 走统一封装（PUT /api/v1/admin/copyright/contract/{id}），自动携带 token 并解析 body.code
    await updateContract(editForm.contractId, {
      templateId: editForm.templateId,
      amount: editForm.amount
    })
    ElMessage.success('合同已更新')
    editVisible.value = false
    loadRows()
  } catch (error) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    editLoading.value = false
  }
}

const regeneratePdf = async (row) => {
  try {
    await ElMessageBox.confirm(`确认重建合同 ${row.contractNo} 的签署完成 PDF？适用于 PDF 生成失败或未生成的旧数据。`, '重建PDF', { type: 'warning' })
    await regenerateContractPdf(row.contractId)
    ElMessage.success('PDF 已重建')
    loadRows()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || 'PDF 重建失败')
  }
}

const cancel = async (row) => {
  try {
    await ElMessageBox.confirm('确认作废该合同？作废后合同将失效。', '提示', { type: 'warning' })
    await cancelContract(row.contractId)
    ElMessage.success('作废成功')
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
