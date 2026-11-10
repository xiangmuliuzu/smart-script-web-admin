<template>
  <PageContainer>
    <PageHeader title="版权中心配置" description="管理版权登记中心对接参数与登记费价目；申请付费后自动提交第三方，本页仅作监控与失败补推" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-input
          v-model="query.centerName"
          clearable
          placeholder="中心名称"
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 160px">
          <el-option label="启用" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="configList"
      :loading="loading"
      :total="total"
      :empty-text="emptyText"
      @page-change="loadConfigs"
      @size-change="loadConfigs"
    >
      <template #actions>
        <el-button v-permission="'smartscript:copyright:centerConfig:add'" type="primary" @click="handleAdd">
          新增配置
        </el-button>
      </template>

      <el-table-column prop="centerCode" label="中心代码" width="150" />
      <el-table-column prop="centerName" label="中心名称" min-width="180" />
      <el-table-column prop="apiUrl" label="API地址" min-width="200" show-overflow-tooltip />
      <el-table-column prop="appId" label="应用ID" width="150" />
      <el-table-column label="计费方式" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ feeSummary(row.configJson) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            v-model="row.status"
            active-value="enabled"
            inactive-value="disabled"
            @change="handleStatusChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <div style="display: flex; gap: 8px;">
            <el-button
              type="primary"
              size="small"
              @click="handleTestConnection(row)"
            >
              测试连接
            </el-button>
            <el-button
              type="success"
              size="small"
              @click="viewApplications(row)"
            >
              查看申请
            </el-button>
            <el-button
              v-permission="'smartscript:copyright:centerConfig:edit'"
              type="warning"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="中心代码" prop="centerCode">
          <el-input v-model="formData.centerCode" placeholder="请输入中心代码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="中心名称" prop="centerName">
          <el-input v-model="formData.centerName" placeholder="请输入中心名称" />
        </el-form-item>
        <el-form-item label="API地址" prop="apiUrl">
          <el-input v-model="formData.apiUrl" placeholder="请输入API地址" />
        </el-form-item>
        <el-form-item label="API密钥" prop="apiKey">
          <el-input v-model="formData.apiKey" type="password" show-password placeholder="请输入API密钥" />
        </el-form-item>
        <el-form-item label="应用ID" prop="appId">
          <el-input v-model="formData.appId" placeholder="请输入应用ID" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="formData.priority" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="计费类型" prop="feeType">
          <el-radio-group v-model="formData.feeType">
            <el-radio value="national_word">国版按字数</el-radio>
            <el-radio value="local_flat">地方一口价</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="formData.feeType === 'local_flat'">
          <el-form-item label="一口价(元)" prop="flatFee">
            <el-input-number v-model="formData.flatFee" :min="0" :precision="2" :step="10" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="≤100字">
            <el-input-number v-model="formData.tier1" :min="0" :precision="2" :step="10" />
          </el-form-item>
          <el-form-item label="101～5000字">
            <el-input-number v-model="formData.tier2" :min="0" :precision="2" :step="10" />
          </el-form-item>
          <el-form-item label="5001～1万字">
            <el-input-number v-model="formData.tier3" :min="0" :precision="2" :step="10" />
          </el-form-item>
          <el-form-item label="＞1万字">
            <el-input-number v-model="formData.tier4" :min="0" :precision="2" :step="10" />
          </el-form-item>
        </template>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 查看该版权中心的申请列表对话框 -->
    <el-dialog
      v-model="applicationsDialogVisible"
      :title="`${currentCenter?.centerName || '版权中心'} - 申请列表`"
      width="1000px"
    >
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          仅监控申请进度。「补推第三方」只在已付款但提交第三方失败时出现，其它情况不可干预申请。
        </template>
      </el-alert>
      
      <el-table
        v-loading="applicationsLoading"
        :data="centerApplications"
        border
        max-height="500"
      >
        <el-table-column prop="applyNo" label="申请编号" width="180" />
        <el-table-column prop="workName" label="作品名称" width="200" show-overflow-tooltip />
        <el-table-column prop="externalApplyNo" label="外部申请号" width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.statusText || getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitTime" label="提交时间" width="170" />
        <el-table-column prop="certNo" label="证书编号" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.certNo || '—' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remark || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div style="display: flex; gap: 4px;">
              <!-- 仅：已付款 + 提交第三方失败（submitted 且无外部号） -->
              <el-button
                v-if="canRetryThirdParty(row)"
                v-permission="'smartscript:copyright:application:submit'"
                type="danger"
                size="small"
                @click="submitToThirdParty(row)"
              >
                补推第三方
              </el-button>
              <el-button
                v-if="canQueryStatus(row)"
                type="info"
                size="small"
                @click="syncApplicationStatus(row)"
              >
                状态查询
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <template #footer>
        <el-button type="primary" @click="applicationsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 状态查询详情弹窗 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="状态查询结果"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="申请编号">
          {{ statusDialogData.applyNo }}
        </el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getStatusType(statusDialogData.status)" size="small">
            {{ statusDialogData.statusLabel }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="外部申请号">
          {{ statusDialogData.externalApplyNo }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ statusDialogData.submitTime }}
        </el-descriptions-item>
        <el-descriptions-item label="证书编号">
          {{ statusDialogData.certNo }}
        </el-descriptions-item>
        <el-descriptions-item label="同步时间">
          {{ statusDialogData.syncTime }}
        </el-descriptions-item>
        <el-descriptions-item label="进度说明">
          {{ statusDialogData.progressDesc }}
        </el-descriptions-item>
      </el-descriptions>
      
      <template #footer>
        <el-button type="primary" @click="statusDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import {
  getCopyrightCenterConfigList,
  getCopyrightCenterConfigDetail,
  addCopyrightCenterConfig,
  updateCopyrightCenterConfig,
  deleteCopyrightCenterConfig,
  exportCopyrightCenterConfig,
  testCopyrightCenterConnection,
  changeCopyrightCenterStatus,
  getCopyrightApplicationList,
  syncCopyrightApplicationStatus,
  submitApplicationToThirdParty
} from '@/api/copyright'

const loading = ref(false)
const configList = ref([])
const total = ref(0)
const emptyText = ref('暂无数据')

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  centerName: '',
  status: ''
})

const dialogVisible = ref(false)
const dialogTitle = computed(() => isEdit.value ? '编辑配置' : '新增配置')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)

const formData = reactive({
  configId: null,
  centerCode: '',
  centerName: '',
  apiUrl: '',
  apiKey: '',
  appId: '',
  status: 'enabled',
  priority: 0,
  remark: '',
  configJson: '',
  feeType: 'national_word',
  flatFee: 50,
  tier1: 100,
  tier2: 150,
  tier3: 200,
  tier4: 300
})

const defaultFeeForm = () => ({
  feeType: 'national_word',
  flatFee: 50,
  tier1: 100,
  tier2: 150,
  tier3: 200,
  tier4: 300
})

const parseFeeForm = (configJson) => {
  const defaults = defaultFeeForm()
  if (!configJson) return defaults
  try {
    const json = typeof configJson === 'string' ? JSON.parse(configJson) : configJson
    const feeType = json.feeType === 'local_flat' ? 'local_flat' : 'national_word'
    const flatFee = Number(json.flatFee ?? 50)
    const tiers = Array.isArray(json.wordTiers) ? json.wordTiers : []
    const feeAt = (idx, fallback) => {
      const n = Number(tiers[idx]?.fee)
      return Number.isFinite(n) ? n : fallback
    }
    return {
      feeType,
      flatFee: Number.isFinite(flatFee) ? flatFee : 50,
      tier1: feeAt(0, 100),
      tier2: feeAt(1, 150),
      tier3: feeAt(2, 200),
      tier4: feeAt(3, 300)
    }
  } catch (e) {
    return defaults
  }
}

const buildConfigJson = () => {
  if (formData.feeType === 'local_flat') {
    return JSON.stringify({
      feeType: 'local_flat',
      flatFee: Number(formData.flatFee || 0)
    })
  }
  return JSON.stringify({
    feeType: 'national_word',
    wordTiers: [
      { max: 100, fee: Number(formData.tier1 || 0) },
      { max: 5000, fee: Number(formData.tier2 || 0) },
      { max: 10000, fee: Number(formData.tier3 || 0) },
      { max: null, fee: Number(formData.tier4 || 0) }
    ]
  })
}

const feeSummary = (configJson) => {
  const fee = parseFeeForm(configJson)
  if (fee.feeType === 'local_flat') {
    return `一口价 ¥${Number(fee.flatFee).toFixed(2)}`
  }
  return `按字数 ¥${fee.tier1}/${fee.tier2}/${fee.tier3}/${fee.tier4}`
}

/** 已付款但提交第三方失败：有支付单、状态 submitted、尚无外部申请号 */
const canRetryThirdParty = (row) => {
  return row?.status === 'submitted'
    && !!row?.payOrderId
    && !row?.externalApplyNo
}

const canQueryStatus = (row) => {
  const s = row?.status
  return s === 'submitted' || s === 'reviewing' || s === 'pending' || s === 'approved'
}

const applicationsDialogVisible = ref(false)
const applicationsLoading = ref(false)
const centerApplications = ref([])
const currentCenter = ref(null)

const formRules = {
  centerCode: [{ required: true, message: '请输入中心代码', trigger: 'blur' }],
  centerName: [{ required: true, message: '请输入中心名称', trigger: 'blur' }],
  apiUrl: [{ required: true, message: '请输入API地址', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const loadConfigs = async () => {
  loading.value = true
  try {
    const res = await getCopyrightCenterConfigList(query)
    configList.value = res.rows || []
    total.value = res.total || 0
    emptyText.value = '暂无数据'
  } catch (error) {
    configList.value = []
    total.value = 0
    console.error('加载配置列表失败:', error)
    emptyText.value = '加载失败'
    ElMessage.error('加载配置列表失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  query.pageNo = 1
  loadConfigs()
}

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 10,
    centerName: '',
    status: ''
  })
  loadConfigs()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, defaultFeeForm())
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  try {
    const res = await getCopyrightCenterConfigDetail(row.configId)
    const data = res.data || res
    Object.assign(formData, data)
    Object.assign(formData, parseFeeForm(data.configJson))
    isEdit.value = true
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取配置详情失败')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除配置"${row.centerName}"吗？`, '删除确认', {
      type: 'warning'
    })
    await deleteCopyrightCenterConfig(row.configId)
    ElMessage.success('删除成功')
    loadConfigs()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    formData.configJson = buildConfigJson()
    const payload = { ...formData }
    delete payload.feeType
    delete payload.flatFee
    delete payload.tier1
    delete payload.tier2
    delete payload.tier3
    delete payload.tier4

    if (isEdit.value) {
      await updateCopyrightCenterConfig(payload)
      ElMessage.success('更新成功')
    } else {
      await addCopyrightCenterConfig(payload)
      ElMessage.success('新增成功')
    }
    
    dialogVisible.value = false
    loadConfigs()
  } catch (error) {
    if (error !== false) {
      ElMessage.error(isEdit.value ? '更新失败' : '新增失败')
    }
  } finally {
    submitLoading.value = false
  }
}

const handleDialogClose = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    configId: null,
    centerCode: '',
    centerName: '',
    apiUrl: '',
    apiKey: '',
    appId: '',
    status: 'enabled',
    priority: 0,
    remark: '',
    configJson: '',
    ...defaultFeeForm()
  })
}

const handleExport = async () => {
  try {
    const res = await exportCopyrightCenterConfig(query)
    const blob = new Blob([res], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `版权中心配置_${new Date().getTime()}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

/**
 * 测试版权中心连接
 * @param {Object} row - 配置行数据
 */
const handleTestConnection = async (row) => {
  // 检查配置状态
  if (row.status !== 'enabled') {
    ElMessage.warning('该版权中心配置已停用，无法测试连接')
    return
  }
  
  const loadingMsg = ElMessage({
    message: '正在测试连接...',
    type: 'info',
    duration: 0
  })
  
  try {
    await testCopyrightCenterConnection(row.configId)
    loadingMsg.close()
    ElMessage.success('连接测试成功')
  } catch (error) {
    loadingMsg.close()
    ElMessage.error(error.msg || '连接测试失败，请检查配置参数')
  }
}

/**
 * 处理配置状态变更
 * @param {Object} row - 配置行数据
 */
const handleStatusChange = async (row) => {
  const newStatus = row.status
  const oldStatus = newStatus === 'enabled' ? 'disabled' : 'enabled'
  const statusText = newStatus === 'enabled' ? '启用' : '停用'
  
  try {
    await changeCopyrightCenterStatus({
      configId: row.configId,
      status: newStatus
    })
    ElMessage.success(`已${statusText}`)
    loadConfigs()
  } catch (error) {
    // 恢复原状态
    row.status = oldStatus
    ElMessage.error(error.msg || `${statusText}失败`)
  }
}

const viewApplications = async (row) => {
  // 检查配置状态
  if (row.status !== 'enabled') {
    ElMessage.warning('该版权中心配置已停用，无法查看申请')
    return
  }
  
  currentCenter.value = row
  applicationsDialogVisible.value = true
  applicationsLoading.value = true
  
  try {
    // 监控该中心下申请；补推仅针对「已付款但第三方提交失败」
    const res = await getCopyrightApplicationList({
      configId: row.configId,
      statusList: 'submitted,reviewing,certificated,rejected,pending,approved',
      pageNo: 1,
      pageSize: 100
    })
    centerApplications.value = res.rows || []
  } catch (error) {
    ElMessage.error('加载申请列表失败')
    centerApplications.value = []
  } finally {
    applicationsLoading.value = false
  }
}

// 状态查询详情弹窗
const statusDialogVisible = ref(false)
const statusDialogData = ref({})

const syncApplicationStatus = async (application) => {
  try {
    const res = await syncCopyrightApplicationStatus(application.applyId)
    
    // 准备展示数据
    statusDialogData.value = {
      applyNo: application.applyNo,
      status: res.data?.status || application.status,
      statusLabel: getStatusLabel(res.data?.status || application.status),
      externalApplyNo: res.data?.externalApplyNo || application.externalApplyNo || '—',
      submitTime: res.data?.submitTime || application.submitTime || '—',
      certNo: res.data?.certNo || application.certNo || '—',
      syncTime: res.data?.syncTime || new Date().toLocaleString('zh-CN'),
      progressDesc: res.msg || getProgressDescription(res.data?.status || application.status)
    }
    
    // 显示详情弹窗
    statusDialogVisible.value = true
    
    // 重新加载该版权中心的申请列表
    viewApplications(currentCenter.value)
  } catch (error) {
    ElMessage.error(error.msg || '状态查询失败')
  }
}

// 获取状态进度描述
const getProgressDescription = (status) => {
  const descriptions = {
    pending: '审核中（历史单）',
    approved: '审核中（历史单）',
    submitted: '已付款后提交第三方失败或处理中，可补推',
    reviewing: '已提交到第三方版权中心，正在审核中',
    certificated: '审核通过，证书已颁发',
    rejected: '审核未通过，申请已被驳回'
  }
  return descriptions[status] || '状态未知'
}

// 仅失败补偿：补推到第三方
const submitToThirdParty = async (application) => {
  if (!canRetryThirdParty(application)) {
    ElMessage.warning('当前申请不可补推（仅已付款且第三方提交失败时可操作）')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认将申请「${application.applyNo}」补推到第三方版权中心吗？仅用于付款成功但提交第三方失败的补偿。`,
      '补推确认',
      {
        confirmButtonText: '确定补推',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await submitApplicationToThirdParty(application.applyId)
    ElMessage.success('补推成功')
    viewApplications(currentCenter.value)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('补推第三方失败:', error)
      const errorMsg = error.response?.data?.msg || error.message || '补推失败'
      ElMessage.error(errorMsg)
    }
  }
}

const getStatusLabel = (status) => {
  const map = {
    pending: '审核中',
    approved: '审核中',
    submitted: '审核中',
    reviewing: '审核中',
    certificated: '已发证',
    rejected: '已驳回'
  }
  return map[status] || status
}

const getStatusType = (status) => {
  const map = {
    pending: 'primary',
    approved: 'primary',
    submitted: 'primary',
    reviewing: 'primary',
    certificated: 'success',
    rejected: 'danger'
  }
  return map[status] || ''
}

loadConfigs()
</script>
