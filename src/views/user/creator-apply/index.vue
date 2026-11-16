<template>
  <div class="a4-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item>
          <el-select v-model="filterForm.status" placeholder="全部状态" style="width: 150px" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="filterForm.keyword" placeholder="昵称/账号/笔名/手机号" style="width: 220px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="black-button" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="rows" style="width: 100%" v-loading="loading">
        <el-table-column prop="applicationId" label="申请编号" width="110" />
        <el-table-column prop="userId" label="用户 ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="penName" label="笔名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="direction" label="创作方向" min-width="150" show-overflow-tooltip />
        <el-table-column prop="phoneMasked" label="手机号" width="130">
          <template #default="{ row }">{{ row.phoneMasked || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewerName" label="审核人" width="110">
          <template #default="{ row }">{{ row.reviewerName || '—' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="['user:creatorapp:query']"
              size="small"
              @click="openDetail(row)"
            >详情</el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              v-permission="['user:creatorapp:audit']"
              type="primary"
              size="small"
              @click="openDecide(row)"
            >审核</el-button>
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

    <el-dialog v-model="detailVisible" title="创作者申请详情" width="560px">
      <div v-if="detailForbidden" class="forbidden-hint">无详情权限，无法查看申请信息</div>
      <el-descriptions v-else-if="detail" :column="1" border>
        <el-descriptions-item label="申请编号">{{ detail.applicationId }}</el-descriptions-item>
        <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ detail.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.phoneMasked || '—' }}</el-descriptions-item>
        <el-descriptions-item label="笔名">{{ detail.penName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创作方向">{{ detail.direction || '—' }}</el-descriptions-item>
        <el-descriptions-item label="代表作品">{{ detail.portfolio || '—' }}</el-descriptions-item>
        <el-descriptions-item label="申请说明">{{ detail.intro || '—' }}</el-descriptions-item>
        <el-descriptions-item label="联系方式">{{ detail.contact || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
        <el-descriptions-item label="审核人">{{ detail.reviewerName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatTime(detail.submittedAt) }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ formatTime(detail.reviewedAt) }}</el-descriptions-item>
        <el-descriptions-item label="驳回原因">{{ detail.rejectReason || '—' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="decideVisible" title="创作者申请审核决定" width="480px">
      <el-form label-width="90px">
        <el-form-item label="申请人">
          {{ decideTarget ? `${decideTarget.nickname}（ID ${decideTarget.userId}）` : '' }}
        </el-form-item>
        <el-form-item label="决定">
          <el-radio-group v-model="decideForm.decision">
            <el-radio label="APPROVE">通过</el-radio>
            <el-radio label="REJECT">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="decideForm.decision === 'APPROVE'" label="提示">
          <span class="approve-hint">通过后将自动开通该用户的作者能力。</span>
        </el-form-item>
        <el-form-item v-if="decideForm.decision === 'REJECT'" label="驳回原因" required>
          <el-input v-model="decideForm.rejectReason" type="textarea" :rows="3" placeholder="驳回时必填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="decideVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitDecide">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listCreatorApplications,
  getCreatorApplication,
  decideCreatorApplication
} from '@/api/user/creatorApply'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const total = ref(0)
const errorText = ref('')
const query = reactive({ pageNum: 1, pageSize: 10, status: '', keyword: '' })
const filterForm = reactive({ status: '', keyword: '' })

const detailVisible = ref(false)
const detail = ref(null)
const detailForbidden = ref(false)
const decideVisible = ref(false)
const decideTarget = ref(null)
const decideForm = reactive({ decision: 'APPROVE', rejectReason: '' })

function statusLabel(status) {
  if (status === 'PENDING') return '待审核'
  if (status === 'APPROVED') return '已通过'
  if (status === 'REJECTED') return '已驳回'
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
    const res = await listCreatorApplications({
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
    const res = await getCreatorApplication(row.applicationId)
    detail.value = res?.data || res
  } catch (e) {
    // 后端仍是最终边界：权限不足时只展示受限提示，不弹出误导性错误
    detailForbidden.value = true
  }
}

function openDecide(row) {
  decideTarget.value = row
  decideForm.decision = 'APPROVE'
  decideForm.rejectReason = ''
  decideVisible.value = true
}

async function submitDecide() {
  const reject = decideForm.decision === 'REJECT'
  if (reject && !decideForm.rejectReason.trim()) {
    ElMessage.warning('驳回原因必填')
    return
  }
  try {
    await ElMessageBox.confirm(
      reject ? '确认驳回该创作者申请？' : '确认通过该创作者申请？通过后自动开通其作者能力。',
      '审核确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  saving.value = true
  try {
    await decideCreatorApplication(decideTarget.value.applicationId, {
      decision: decideForm.decision,
      rejectReason: reject ? decideForm.rejectReason.trim() : undefined,
      expectedStatus: 'PENDING'
    })
    ElMessage.success('审核已完成')
    decideVisible.value = false
    await load()
  } catch (e) {
    // 409 = 并发审核或状态已变化，提示刷新而不是重复提交
    const status = e?.response?.status
    if (status === 409) {
      ElMessage.error('该申请已被处理或状态已变化，请刷新后查看')
      await load()
    } else {
      ElMessage.error(e?.message || '审核失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.a4-page {
  padding: 20px;
  background-color: #f7f8fa;
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

.approve-hint {
  color: #d48806;
  font-size: 12px;
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
