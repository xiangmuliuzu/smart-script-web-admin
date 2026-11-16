<template>
  <PageContainer>
    <PageHeader title="渠道管理" description="管理外部视频发行渠道及其接口参数">
      <template #actions>
        <BlackButton v-permission="['content:channel:add']" @click="openCreate">新增渠道</BlackButton>
      </template>
    </PageHeader>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-input
          v-model="queryParams.channelName"
          placeholder="渠道名称"
          style="width: 180px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <!-- 平台枚举值暂无文档依据，先按自由文本精确查询，文档补齐后改下拉 -->
        <el-input
          v-model="queryParams.platform"
          placeholder="平台"
          style="width: 160px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-select v-model="queryParams.status" placeholder="全部状态" style="width: 140px" clearable>
          <el-option label="正常" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="queryParams.pageNum"
      v-model:pageSize="queryParams.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      empty-text="暂无渠道数据"
      row-key="channelId"
      @page-change="loadList"
      @size-change="loadList"
    >
      <el-table-column prop="channelId" label="渠道ID" width="90" />
      <el-table-column prop="channelName" label="渠道名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="channelCode" label="渠道编码" width="120" show-overflow-tooltip />
      <el-table-column prop="platform" label="平台" width="100" />
      <el-table-column prop="accountName" label="账号名称" width="120" show-overflow-tooltip />
      <el-table-column label="自动分发" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isAutoDistribute === 1 ? 'success' : 'info'" size="small">
            {{ row.isAutoDistribute === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            v-permission="['content:channel:edit']"
            v-model="row.status"
            active-value="0"
            inactive-value="1"
            @change="() => handleStatusChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ row.createTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="['content:channel:edit']"
            size="small"
            @click="openEdit(row)"
          >编辑</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.mode === 'create' ? '新增渠道' : '编辑渠道'"
      width="560px"
      @closed="handleClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="渠道名称" prop="channelName">
          <el-input v-model="form.channelName" placeholder="请输入渠道名称" />
        </el-form-item>
        <el-form-item label="渠道编码" prop="channelCode">
          <el-input v-model="form.channelCode" placeholder="请输入渠道编码" />
        </el-form-item>
        <el-form-item label="平台" prop="platform">
          <el-input v-model="form.platform" placeholder="请输入平台" />
        </el-form-item>
        <el-form-item label="账号名称" prop="accountName">
          <el-input v-model="form.accountName" placeholder="请输入账号名称" />
        </el-form-item>
        <el-form-item label="账号ID" prop="accountId">
          <el-input v-model="form.accountId" placeholder="请输入账号ID" />
        </el-form-item>
        <el-form-item label="接口配置" prop="apiConfig">
          <el-input
            v-model="form.apiConfig"
            type="textarea"
            :rows="4"
            placeholder='{"baseUrl":"","apiKey":""}'
          />
        </el-form-item>
        <el-form-item label="自动分发" prop="isAutoDistribute">
          <el-switch
            v-model="form.isAutoDistribute"
            :active-value="1"
            :inactive-value="0"
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="form.status"
            active-value="0"
            inactive-value="1"
            active-text="正常"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import BlackButton from '@/components/BlackButton.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import {
  listDramaChannel,
  getDramaChannel,
  addDramaChannel,
  updateDramaChannel,
  changeDramaChannelStatus
} from '@/api/content'

defineOptions({ name: 'ExternalDramaChannel' })

const loading = ref(false)
const list = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  channelName: '',
  platform: '',
  status: ''
})

const dialog = reactive({ visible: false, mode: 'create' })
const submitting = ref(false)
const formRef = ref()
const defaultForm = () => ({
  channelId: null,
  channelName: '',
  channelCode: '',
  platform: '',
  accountName: '',
  accountId: '',
  apiConfig: '',
  isAutoDistribute: 0,
  sort: 0,
  status: '0',
  remark: ''
})
const form = reactive(defaultForm())
const rules = {
  channelName: [
    { required: true, message: '请输入渠道名称', trigger: 'blur' },
    { whitespace: true, message: '渠道名称不能为空', trigger: 'blur' }
  ],
  channelCode: [{ required: true, message: '请输入渠道编码', trigger: 'blur' }],
  platform: [{ required: true, message: '请输入平台', trigger: 'blur' }],
  accountName: [{ required: true, message: '请输入账号名称', trigger: 'blur' }],
  accountId: [{ required: true, message: '请输入账号ID', trigger: 'blur' }]
}

/** GET 入参：空串不下发，让后端走“不过滤”分支 */
function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    channelName: queryParams.channelName || undefined,
    platform: queryParams.platform || undefined,
    status: queryParams.status || undefined
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await listDramaChannel(buildQuery())
    list.value = res?.rows || []
    total.value = Number(res?.total || 0)
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  loadList()
}

function handleReset() {
  queryParams.channelName = ''
  queryParams.platform = ''
  queryParams.status = ''
  handleQuery()
}

function openCreate() {
  Object.assign(form, defaultForm())
  dialog.mode = 'create'
  dialog.visible = true
}

async function openEdit(row) {
  Object.assign(form, defaultForm())
  try {
    const res = await getDramaChannel(row.channelId)
    const data = res?.data || res || {}
    Object.assign(form, {
      channelId: data.channelId ?? row.channelId,
      channelName: data.channelName || row.channelName || '',
      channelCode: data.channelCode || row.channelCode || '',
      platform: data.platform || row.platform || '',
      accountName: data.accountName || row.accountName || '',
      accountId: data.accountId || row.accountId || '',
      apiConfig: data.apiConfig || '',
      isAutoDistribute: data.isAutoDistribute ?? row.isAutoDistribute ?? 0,
      sort: data.sort ?? row.sort ?? 0,
      status: data.status || row.status || '0',
      remark: data.remark || row.remark || ''
    })
  } catch {
    Object.assign(form, {
      channelId: row.channelId,
      channelName: row.channelName || '',
      channelCode: row.channelCode || '',
      platform: row.platform || '',
      accountName: row.accountName || '',
      accountId: row.accountId || '',
      apiConfig: row.apiConfig || '',
      isAutoDistribute: row.isAutoDistribute ?? 0,
      sort: row.sort ?? 0,
      status: row.status || '0',
      remark: row.remark || ''
    })
  }
  dialog.mode = 'edit'
  dialog.visible = true
}

function handleClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    const payload = {
      channelName: form.channelName.trim(),
      channelCode: form.channelCode.trim(),
      platform: form.platform.trim(),
      accountName: form.accountName.trim(),
      accountId: form.accountId.trim(),
      apiConfig: form.apiConfig || '',
      isAutoDistribute: form.isAutoDistribute,
      sort: form.sort,
      status: form.status,
      remark: form.remark || ''
    }
    try {
      if (dialog.mode === 'create') {
        await addDramaChannel(payload)
        ElMessage.success('新增成功')
      } else {
        await updateDramaChannel({ ...payload, channelId: form.channelId })
        ElMessage.success('编辑成功')
      }
      dialog.visible = false
      loadList()
    } catch {
      // 错误信息已由 request 拦截器统一提示
    } finally {
      submitting.value = false
    }
  })
}

async function handleStatusChange(row) {
  const targetStatus = row.status
  const actionText = targetStatus === '0' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认${actionText}渠道「${row.channelName}」？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    row.status = targetStatus === '0' ? '1' : '0'
    return
  }
  try {
    await changeDramaChannelStatus({ channelId: row.channelId, status: targetStatus })
    ElMessage.success(`${actionText}成功`)
  } catch {
    row.status = targetStatus === '0' ? '1' : '0'
  }
}

onMounted(loadList)
</script>
