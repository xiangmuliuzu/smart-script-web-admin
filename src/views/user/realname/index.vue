<template>
  <div class="a4-page">
    <el-alert
      title="阿里云核验通过后，由运维审核身份证材料。"
      type="info"
      :closable="false"
      show-icon
      class="records-notice"
    />
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item>
          <el-select v-model="filterForm.status" placeholder="全部状态" style="width: 150px" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="未通过" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="filterForm.keyword" placeholder="昵称/账号/手机号" style="width: 200px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="black-button" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="rows" style="width: 100%" v-loading="loading">
        <el-table-column prop="applicationId" label="认证编号" width="110" />
        <el-table-column prop="userId" label="用户 ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="phoneMasked" label="手机号" width="130">
          <template #default="{ row }">{{ row.phoneMasked || '—' }}</template>
        </el-table-column>
        <el-table-column prop="realNameMasked" label="姓名" width="100">
          <template #default="{ row }">{{ row.realNameMasked || '—' }}</template>
        </el-table-column>
        <el-table-column prop="idNumberMasked" label="证件号" width="180">
          <template #default="{ row }">{{ row.idNumberMasked || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="认证时间" width="170">
          <template #default="{ row }">{{ formatTime(row.reviewedAt) }}</template>
        </el-table-column>
        <el-table-column prop="rejectReason" label="未通过原因" min-width="200" show-overflow-tooltip />
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="['user:realname:query']"
              size="small"
              @click="openDetail(row)"
            >详情</el-button>
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

    <el-dialog v-model="detailVisible" title="实名认证记录详情" width="560px">
      <div v-if="detailForbidden" class="forbidden-hint">无详情权限，无法查看认证详情</div>
      <el-descriptions v-else-if="detail" :column="1" border>
        <el-descriptions-item label="认证编号">{{ detail.applicationId }}</el-descriptions-item>
        <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ detail.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.phoneMasked || '—' }}</el-descriptions-item>
        <el-descriptions-item label="姓名（掩码）">{{ detail.realNameMasked || '—' }}</el-descriptions-item>
        <el-descriptions-item label="证件号（掩码）">{{ detail.idNumberMasked || '—' }}</el-descriptions-item>
        <el-descriptions-item label="身份证材料"><template v-if="detail.materialRefs?.length"><el-button v-for="(token, index) in detail.materialRefs" :key="index" link type="primary" @click="downloadMaterial(token, index)">{{ detail.materialRefs.length === 1 ? '下载历史材料' : index === 0 ? '下载正面' : '下载反面' }}</el-button></template><span v-else>无材料</span></el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatTime(detail.submittedAt) }}</el-descriptions-item>
        <el-descriptions-item label="认证时间">{{ formatTime(detail.reviewedAt) }}</el-descriptions-item>
        <el-descriptions-item label="未通过原因">{{ detail.rejectReason || '—' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="detail?.status === 'PENDING'" v-permission="['user:realname:audit']" type="danger" :loading="saving" @click="decide('REJECT')">驳回</el-button>
        <el-button v-if="detail?.status === 'PENDING'" v-permission="['user:realname:audit']" type="primary" :loading="saving" @click="decide('APPROVE')">通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listRealNameApplications,
  getRealNameApplication, decideRealNameApplication, redeemMaterialToken, downloadMaterialContent
} from '@/api/user/realName'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const errorText = ref('')
const query = reactive({ pageNum: 1, pageSize: 10, status: '', keyword: '' })
const filterForm = reactive({ status: '', keyword: '' })

const detailVisible = ref(false)
const detail = ref(null)
const detailForbidden = ref(false)
const saving = ref(false)


function statusLabel(status) {
  if (status === 'PENDING') return '待审核'
  if (status === 'APPROVED') return '已通过'
  if (status === 'REJECTED') return '未通过'
  return status || '—'
}

function statusTagType(status) {
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

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listRealNameApplications({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      status: query.status || undefined,
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
  query.keyword = filterForm.keyword
  query.pageNum = 1
  load()
}

function handleReset() {
  filterForm.status = ''
  filterForm.keyword = ''
  handleSearch()
}

function onPageChange(page) {
  query.pageNum = page
  load()
}

async function openDetail(row) {
  detail.value = null
  detailForbidden.value = false
  detailVisible.value = true
  try {
    const res = await getRealNameApplication(row.applicationId)
    detail.value = res?.data || res
  } catch (e) {
    // 后端仍是最终边界：权限不足时只展示受限提示，不弹出误导性错误
    detailForbidden.value = true
  }
}

async function downloadMaterial(token, index) {
  try {
    const result = await redeemMaterialToken(token)
    const url = (result?.data || result)?.accessUrl
    if (!url) throw new Error('材料访问链接不可用')
    await downloadMaterialContent(url, detail.value.materialRefs.length === 1 ? '历史实名材料' : index === 0 ? '身份证正面.png' : '身份证反面.png')
    await openDetail(detail.value)
  } catch (e) { ElMessage.error(e?.message || '材料下载失败，请重试') }
}
async function decide(decision) {
  if (saving.value) return
  let reason = ''
  try {
    if (decision === 'REJECT') {
      const result = await ElMessageBox.prompt('请填写驳回原因', '驳回申请', { inputValidator: value => value?.trim() && value.trim().length <= 500 || '请填写不超过 500 字的原因' })
      reason = result.value.trim()
    } else await ElMessageBox.confirm('确认通过该实名认证申请？', '审核确认', { type: 'warning' })
  } catch { return }
  saving.value = true
  try {
    await decideRealNameApplication(detail.value.applicationId, { decision, rejectReason: reason || undefined, expectedStatus: 'PENDING' })
    ElMessage.success('审核已完成')
    detailVisible.value = false
    await load()
  } catch (e) { ElMessage.error(e?.message || '审核失败，请刷新后重试'); await load() }
  finally { saving.value = false }
}
onMounted(load)
</script>

<style scoped>
.a4-page {
  padding: 20px;
  background-color: #f7f8fa;
}

.records-notice {
  margin-bottom: 16px;
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

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 0;
  color: #8c8c8c;
  font-size: 13px;
}

.forbidden-hint {
  padding: 16px;
  color: #8c8c8c;
  font-size: 13px;
  text-align: center;
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

:deep(.el-tag.el-tag--danger) {
  background-color: #fff1f0;
  color: #cf1322;
}

:deep(.el-tag.el-tag--warning) {
  background-color: #fff7e6;
  color: #d48806;
}
</style>
