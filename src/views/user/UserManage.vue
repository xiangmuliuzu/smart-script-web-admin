<template>
  <div class="user-manage-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">用户与创作者管理</h2>
      <!-- 契约未定义添加/导出接口，故不显示对应按钮，避免出现无效入口 -->
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item>
          <el-select v-model="filterForm.authorCapability" placeholder="全部作者能力" style="width: 150px" clearable @change="handleSearch">
            <el-option label="全部作者能力" value="" />
            <el-option label="已开通" :value="true" />
            <el-option label="未开通" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="filterForm.status" placeholder="全部状态" style="width: 140px" clearable @change="handleSearch">
            <el-option label="全部状态" value="" />
            <el-option label="正常" value="0" />
            <el-option label="停用" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="filterForm.realNameStatus" placeholder="全部实名状态" style="width: 150px" clearable @change="handleSearch">
            <el-option label="全部实名状态" value="" />
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="filterForm.keyword"
            placeholder="手机号"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="black-button" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表：真实接口 -->
    <el-card class="table-card">
      <el-table :data="userList" style="width: 100%" v-loading="loading">
        <el-table-column prop="userId" label="ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="150" show-overflow-tooltip />
        <el-table-column label="用户角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.authorCapability ? 'success' : 'info'" size="small">
              {{ row.authorCapability ? '创作者' : '收购方' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phoneMasked" label="手机号" width="130">
          <template #default="{ row }">{{ row.phoneMasked || '—' }}</template>
        </el-table-column>
        <el-table-column label="实名" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.realNameStatus" :type="realNameTagType(row.realNameStatus)" size="small">
              {{ realNameLabel(row.realNameStatus) }}
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">
              {{ row.status === '0' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="120">
          <template #default="{ row }">{{ row.operatorName || '—' }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                v-permission="['user:app:query']"
                size="small"
                @click="handleDetail(row)"
              >详情</el-button>
              <el-button
                v-permission="['user:creator:update']"
                size="small"
                :loading="creatorBusyId === row.userId"
                :disabled="!row.authorCapability && row.creatorApplicationStatus === 'REJECTED'"
                :title="row.creatorApplicationStatus === 'REJECTED' ? '申请已驳回，请用户重新提交申请' : ''"
                @click="openCapabilityDialog(row)"
              >{{ row.authorCapability ? '关闭' : row.creatorApplicationStatus === 'REJECTED' ? '已驳回' : '开通' }}</el-button>
              <el-button
                v-permission="['user:app:status']"
                :type="row.status === '0' ? 'danger' : 'success'"
                size="small"
                :loading="statusBusyId === row.userId"
                @click="handleToggleStatus(row)"
              >
                {{ row.status === '0' ? '停用' : '启用' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <span v-if="errorText">{{ errorText }}</span>
            <span v-else>暂无数据</span>
            <el-button v-if="errorText" size="small" type="primary" link @click="loadUsers">重试</el-button>
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

    <!-- 用户详情 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="560px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ detail.nickname }}</el-descriptions-item>
        <el-descriptions-item label="用户角色">{{ detail.authorCapability ? '创作者' : '收购方' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.phoneMasked || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ detail.status === '0' ? '正常' : '停用' }}
        </el-descriptions-item>
        <el-descriptions-item label="实名状态">
          {{ detail.realNameStatus ? realNameLabel(detail.realNameStatus) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="作者能力">
          {{ detail.authorCapability ? '已开通' : '未开通' }}
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatTime(detail.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="最近登录">{{ formatTime(detail.lastLoginTime) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 作者能力变更 -->
    <el-dialog v-model="capabilityDialogVisible" title="作者能力变更" width="480px" :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving">
      <el-form label-width="80px">
        <el-form-item label="用户">
          {{ capabilityTarget ? `${capabilityTarget.nickname}（ID ${capabilityTarget.userId}）` : '' }}
        </el-form-item>
        <el-form-item label="操作">
          {{ capabilityForm.enabled ? '开通作者能力' : '关闭作者能力' }}
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="capabilityForm.reason" type="textarea" :rows="2" placeholder="请填写变更原因" maxlength="255" show-word-limit :disabled="saving" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="capabilityDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCapability">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAppUsers,
  getAppUser,
  changeAppUserStatus
} from '@/api/user/appUser'
import { updateAuthorCapability } from '@/api/user/author'

/* ---------------- 用户列表 ---------------- */
const loading = ref(false)
const saving = ref(false)
const userList = ref([])
const total = ref(0)
const errorText = ref('')
const statusBusyId = ref(null)
let loadRequestId = 0
const query = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  realNameStatus: '',
  authorCapability: ''
})
const filterForm = reactive({
  keyword: '',
  status: '',
  realNameStatus: '',
  authorCapability: ''
})

/* ---------------- 创作者能力 ---------------- */
const creatorBusyId = ref(null)

/* ---------------- 弹窗状态 ---------------- */
const detailVisible = ref(false)
const detail = ref(null)
const capabilityDialogVisible = ref(false)
const capabilityTarget = ref(null)
const capabilityForm = reactive({ enabled: true, reason: '' })

function realNameLabel(status) {
  if (status === 'PENDING') return '待审核'
  if (status === 'APPROVED') return '已通过'
  if (status === 'REJECTED') return '已驳回'
  return status || '—'
}

function realNameTagType(status) {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}

function formatTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadUsers() {
  const requestId = ++loadRequestId
  loading.value = true
  errorText.value = ''
  try {
    const res = await listAppUsers({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      realNameStatus: query.realNameStatus || undefined,
      authorCapability: query.authorCapability === '' ? undefined : query.authorCapability
    })
    if (requestId !== loadRequestId) return
    userList.value = res?.rows || []
    total.value = Number(res?.total || 0)
  } catch (e) {
    if (requestId !== loadRequestId) return
    userList.value = []
    total.value = 0
    errorText.value = e?.message || '加载失败，请重试'
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

function handleSearch() {
  query.keyword = filterForm.keyword.trim()
  query.status = filterForm.status
  query.realNameStatus = filterForm.realNameStatus
  query.authorCapability = filterForm.authorCapability ?? ''
  query.pageNum = 1
  loadUsers()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.status = ''
  filterForm.realNameStatus = ''
  filterForm.authorCapability = ''
  handleSearch()
}

function onPageChange(page) {
  query.pageNum = page
  loadUsers()
}

async function handleDetail(row) {
  try {
    const res = await getAppUser(row.userId)
    detail.value = res?.data || res
    detailVisible.value = true
  } catch (e) {
    ElMessage.error(e?.message || '详情加载失败')
  }
}

async function handleToggleStatus(row) {
  const action = row.status === '0' ? '停用' : '启用'
  let reason = ''
  try {
    const { value } = await ElMessageBox.prompt(
      `${action}后该用户的全部 App 会话将立即失效，请填写原因。`,
      `确认${action}`,
      { confirmButtonText: '确定', cancelButtonText: '取消', inputPlaceholder: '必填', type: 'warning' }
    )
    reason = (value || '').trim()
  } catch {
    return
  }
  if (!reason) {
    ElMessage.warning('原因必填')
    return
  }
  statusBusyId.value = row.userId
  try {
    const res = await changeAppUserStatus(row.userId, {
      status: row.status === '0' ? '1' : '0',
      reason
    })
    const changed = res?.data?.changed
    ElMessage.success(changed === false ? `状态已为${action}状态，无重复变更` : `已${action}用户`)
    await loadUsers()
  } catch (e) {
    ElMessage.error(e?.message || `${action}失败`)
  } finally {
    statusBusyId.value = null
  }
}

function openCapabilityDialog(row) {
  if (saving.value) return
  if (!row.authorCapability && row.creatorApplicationStatus === 'REJECTED') {
    ElMessage.warning('申请已驳回，请用户重新提交申请')
    return
  }
  capabilityTarget.value = row
  capabilityForm.enabled = !row.authorCapability
  capabilityForm.reason = ''
  capabilityDialogVisible.value = true
}

async function submitCapability() {
  if (saving.value) return
  if (!capabilityForm.reason.trim()) {
    ElMessage.warning('原因必填')
    return
  }
  saving.value = true
  creatorBusyId.value = capabilityTarget.value.userId
  try {
    const res = await updateAuthorCapability(capabilityTarget.value.userId, {
      enabled: capabilityForm.enabled,
      reason: capabilityForm.reason.trim()
    })
    const changed = res?.data?.changed
    ElMessage.success(changed === false ? '状态未变化，无重复变更' : '作者能力已更新')
    capabilityDialogVisible.value = false
    await loadUsers()
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    saving.value = false
    creatorBusyId.value = null
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.user-manage-container {
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
  margin-bottom: 8px;
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

/* 操作按钮容器 */
.action-buttons {
  display: flex;
  gap: 8px;
}

/* 分页 */
.pager-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px;
  border-top: 1px solid #f0f0f0;
}

/* 空/错误状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 0;
  color: #8c8c8c;
  font-size: 13px;
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

/* 按钮样式统一 */
:deep(.el-button) {
  font-size: 12px;
  border-radius: 4px;
  padding: 5px 12px;
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

:deep(.el-button--danger) {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
  color: #ffffff;
}

:deep(.el-button--danger:hover) {
  background-color: #ff7875;
  border-color: #ff7875;
}

:deep(.el-button--success) {
  background-color: #52c41a;
  border-color: #52c41a;
  color: #ffffff;
}

:deep(.el-button--success:hover) {
  background-color: #73d13d;
  border-color: #73d13d;
}

/* 标签样式 */
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

:deep(.el-tag.el-tag--danger) {
  background-color: #fff1f0;
  color: #cf1322;
}

:deep(.el-tag.el-tag--warning) {
  background-color: #fff7e6;
  color: #d48806;
}

:deep(.el-tag.el-tag--info) {
  background-color: #fafafa;
  color: #8c8c8c;
}

:deep(.el-tag:not(.el-tag--success):not(.el-tag--danger):not(.el-tag--warning):not(.el-tag--info)) {
  background-color: #f5f5f5;
  color: #8c8c8c;
}

/* 表单控件样式 */
:deep(.el-select .el-input__wrapper) {
  border-radius: 4px;
  border-color: #d9d9d9;
}

:deep(.el-input__wrapper) {
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
