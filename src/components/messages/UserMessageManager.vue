<template>
  <div class="messages-manager">
    <FilterBar @query="search" @reset="reset">
      <el-form-item label="类型"><el-select v-model="filters.type" clearable placeholder="全部类型" style="width:140px"><el-option v-for="item in types" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
      <el-form-item label="创建人"><el-input v-model="filters.createdBy" clearable placeholder="管理员账号" style="width:160px" /></el-form-item>
      <el-form-item label="创建时间"><el-date-picker v-model="filters.dates" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:260px" /></el-form-item>
      <template #extra><el-button v-permission="['user:message:add']" :disabled="!canSelectUsers" @click="openCreate">发送消息</el-button><span v-if="!canSelectUsers && canSend" class="hint">发送消息需要用户列表查询权限</span></template>
    </FilterBar>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="error"><template #default><el-button link @click="load">重新加载</el-button></template></el-alert>
    <TableCard title="用户消息" :data="rows" :loading="loading" :total="total" v-model:page="query.pageNum" v-model:page-size="query.pageSize" @page-change="load" @size-change="load">
      <template #actions><el-button @click="load">刷新</el-button></template>
      <el-table-column prop="notificationId" label="消息ID" width="95" />
      <el-table-column label="类型" width="95"><template #default="{ row }"><el-tag type="info">{{ typeLabel(row.type) }}</el-tag></template></el-table-column>
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="receiverCount" label="收件人数" width="100" />
      <el-table-column prop="createdBy" label="创建人" width="130" />
      <el-table-column label="创建时间" width="175"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" fixed="right" width="90"><template #default="{ row }"><el-button v-permission="['user:message:query']" link type="primary" @click="openDetail(row.notificationId)">详情</el-button></template></el-table-column>
    </TableCard>
    <el-dialog v-model="createVisible" title="发送用户消息" width="640px" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" @closed="closeDraft">
      <el-form :model="form" label-width="90px" :disabled="saving">
        <el-form-item label="消息类型"><el-tag type="info">系统消息</el-tag></el-form-item>
        <el-form-item label="标题" required><el-input v-model="form.title" maxlength="200" show-word-limit /></el-form-item>
        <el-form-item label="正文" required><el-input v-model="form.content" type="textarea" :rows="6" maxlength="2000" show-word-limit /></el-form-item>
        <el-form-item label="收件人" required><el-select v-model="form.userIds" multiple filterable remote :remote-method="searchReceivers" :loading="receiverLoading" :multiple-limit="50" placeholder="搜索昵称、账号或手机号" style="width:100%"><el-option v-for="user in receiverOptions" :key="user.userId" :value="user.userId" :label="receiverLabel(user)" /></el-select><span class="hint">已选择 {{ form.userIds.length }} 人，每次最多50人</span><span v-if="receiverError" class="form-error">{{ receiverError }} <el-button link @click="searchReceivers(receiverKeyword)">重试</el-button></span></el-form-item>
        <el-collapse><el-collapse-item title="关联业务（选填）" name="business"><el-form-item label="业务类型"><el-input v-model="form.businessType" maxlength="64" placeholder="与业务编号同时填写" /></el-form-item><el-form-item label="业务编号"><el-input v-model="form.businessId" maxlength="64" /></el-form-item></el-collapse-item></el-collapse>
      </el-form>
      <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon class="error" />
      <template #footer><el-button :disabled="saving" @click="createVisible = false">取消</el-button><el-button :disabled="saving" @click="preview">预览</el-button><el-button type="primary" :loading="saving" @click="send">发送</el-button></template>
    </el-dialog>
    <el-dialog v-model="previewVisible" title="发送预览" width="600px"><h3>{{ form.title }}</h3><p class="body-text">{{ form.content }}</p><p>收件人：{{ form.userIds.length }} 人</p><template #footer><el-button @click="previewVisible = false">返回编辑</el-button></template></el-dialog>
    <el-dialog v-model="detailVisible" title="消息详情" width="760px" @closed="invalidateDetail">
      <div v-loading="detailLoading" style="min-height:120px"><el-alert v-if="detailError" :title="detailError" type="error" :closable="false"><template #default><el-button link @click="openDetail(detailId)">重试</el-button></template></el-alert>
        <template v-if="detail"><el-descriptions :column="2" border><el-descriptions-item label="消息ID">{{ detail.notificationId }}</el-descriptions-item><el-descriptions-item label="类型">{{ typeLabel(detail.type) }}</el-descriptions-item><el-descriptions-item label="创建人">{{ detail.createdBy }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item><el-descriptions-item label="收件人数">{{ detail.receiverCount }}</el-descriptions-item><el-descriptions-item label="业务关联">{{ detail.businessType || '—' }} / {{ detail.businessId || '—' }}</el-descriptions-item></el-descriptions><h3>{{ detail.title }}</h3><p class="body-text">{{ detail.content }}</p><h4>收件人阅读情况</h4><el-table :data="detail.receivers || []" max-height="300"><el-table-column prop="userId" label="用户ID" width="90" /><el-table-column prop="nickname" label="昵称" min-width="120" /><el-table-column prop="phoneMasked" label="手机号" width="140" /><el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.readAt ? 'success' : 'info'">{{ row.readAt ? '已读' : '未读' }}</el-tag></template></el-table-column><el-table-column label="已读时间" width="175"><template #default="{ row }">{{ formatTime(row.readAt) }}</template></el-table-column></el-table></template>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import './messages.css'
import { ElMessage } from 'element-plus'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { useUserStore } from '@/stores/user'
import { listNotifications, getNotification, createNotification } from '@/api/user/message'
import { listAppUsers } from '@/api/user/appUser'
import { notificationPayload, notificationError, notificationSubmission, mergeReceiverOptions } from '@/utils/notificationDraft'
import { formatRegisteredTime as formatTime } from '@/utils/dateFormat'
const userStore = useUserStore()
const canSend = computed(() => userStore.hasPermission('user:message:add'))
const canSelectUsers = computed(() => userStore.hasPermission('user:app:list'))
const types = [{ value: 'SYSTEM', label: '系统' }, { value: 'REVIEW', label: '审核' }, { value: 'TRANSACTION', label: '交易' }, { value: 'BENEFIT', label: '权益' }]
const typeLabel = value => types.find(item => item.value === value)?.label || value || '—'
const filters = reactive({ type: '', createdBy: '', dates: [] }), query = reactive({ pageNum: 1, pageSize: 10 })
const rows = ref([]), total = ref(0), loading = ref(false), error = ref('')
let listGeneration = 0
async function load() {
  const generation = ++listGeneration
  loading.value = true; error.value = ''
  try {
    const result = await listNotifications({ ...query, orderByColumn: 'createdAt', isAsc: 'desc' })
    if (generation !== listGeneration) return
    rows.value = result.rows || []; total.value = Number(result.total || 0)
  } catch (e) { if (generation === listGeneration) { rows.value = []; total.value = 0; error.value = e?.message || '消息加载失败' } }
  finally { if (generation === listGeneration) loading.value = false }
}
function search() {
  Object.assign(query, { pageNum: 1, type: filters.type || undefined, createdBy: filters.createdBy.trim() || undefined, beginTime: filters.dates?.[0] ? `${filters.dates[0]} 00:00:00` : undefined, endTime: filters.dates?.[1] ? `${filters.dates[1]} 23:59:59` : undefined }); load()
}
function reset() { Object.assign(filters, { type: '', createdBy: '', dates: [] }); search() }
const emptyForm = () => ({ type: 'SYSTEM', title: '', content: '', userIds: [], businessType: '', businessId: '' })
const form = reactive(emptyForm()), createVisible = ref(false), previewVisible = ref(false), saving = ref(false), submitError = ref('')
const receiverOptions = ref([]), receiverLoading = ref(false), receiverError = ref(''), receiverKeyword = ref('')
let receiverGeneration = 0, submission = null
const receiverLabel = user => `${user.nickname || user.userName || '用户'}（ID ${user.userId} / ${user.phoneMasked || '无手机号'}）`
async function searchReceivers(keyword = '') {
  const generation = ++receiverGeneration
  receiverKeyword.value = keyword; receiverLoading.value = true; receiverError.value = ''
  try { const result = await listAppUsers({ keyword: keyword || undefined, pageNum: 1, pageSize: 20, status: '0' }); if (generation === receiverGeneration) receiverOptions.value = mergeReceiverOptions(receiverOptions.value, result.rows || [], form.userIds) }
  catch (e) { if (generation === receiverGeneration) receiverError.value = e?.message || '收件人加载失败' }
  finally { if (generation === receiverGeneration) receiverLoading.value = false }
}
function closeDraft() { receiverGeneration++; receiverLoading.value = false; previewVisible.value = false }
function openCreate() {
  if (!canSend.value || !canSelectUsers.value) return
  Object.assign(form, emptyForm()); submission = null; submitError.value = ''; receiverOptions.value = []; createVisible.value = true; searchReceivers()
}
function validate() { const message = notificationError(notificationPayload(form)); if (message) ElMessage.warning(message); return !message }
function preview() { if (validate()) previewVisible.value = true }
async function send() {
  if (saving.value || !validate()) return
  saving.value = true; submitError.value = ''; submission = notificationSubmission(notificationPayload(form), submission)
  try {
    const result = await createNotification(submission.data)
    ElMessage.success(`消息${result.created === false ? '已发送' : '发送成功'}，收件人 ${result.receiverCount} 人`)
    createVisible.value = false; previewVisible.value = false; query.pageNum = 1; await load()
  } catch (e) {
    if (e?.response?.status === 409) { submission = null; submitError.value = '本次发送未完成，请再次发送' }
    else submitError.value = e?.response?.data?.msg || e?.message || '发送失败，请重试'
  } finally { saving.value = false }
}
const detailVisible = ref(false), detailLoading = ref(false), detail = ref(null), detailError = ref(''), detailId = ref(null)
let detailGeneration = 0
function invalidateDetail() { detailGeneration++; detail.value = null }
async function openDetail(id) {
  const generation = ++detailGeneration
  detailId.value = id; detailVisible.value = true; detailLoading.value = true; detail.value = null; detailError.value = ''
  try { const result = await getNotification(id); if (generation === detailGeneration) detail.value = result }
  catch (e) { if (generation === detailGeneration) detailError.value = e?.message || '详情加载失败' }
  finally { if (generation === detailGeneration) detailLoading.value = false }
}
defineExpose({ refresh: load })
onMounted(load)
onBeforeUnmount(() => { listGeneration++; receiverGeneration++; detailGeneration++ })
</script>
<style scoped>
.hint{display:block;color:#909399;font-size:12px;margin-top:5px}.form-error{display:block;color:#f56c6c;font-size:12px}.body-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8}.error{margin-bottom:16px} :deep(.el-collapse){width:100%} :deep(.el-form-item__content){display:block}
</style>
