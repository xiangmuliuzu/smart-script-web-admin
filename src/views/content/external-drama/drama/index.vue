<template>
  <PageContainer>
    <PageHeader title="视频内容管理" description="管理外部视频内容，含剧集、关联剧本、上下架与播放数据">
      <template #actions>
        <BlackButton v-permission="['content:drama:add']" @click="openCreate">新增视频</BlackButton>
        <BlackButton
          v-permission="['content:dramastatus:edit']"
          :disabled="selectedIds.length === 0"
          :loading="syncing"
          @click="handleBatchSync"
        >批量同步</BlackButton>
      </template>
    </PageHeader>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-input
          v-model="queryParams.channelId"
          placeholder="渠道ID"
          style="width: 140px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="queryParams.title"
          placeholder="标题"
          style="width: 180px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-select v-model="queryParams.sourceType" placeholder="全部来源类型" style="width: 150px" clearable>
          <el-option v-for="t in DRAMA_SOURCE_TYPE" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="queryParams.authorizationStatus" placeholder="全部授权状态" style="width: 150px" clearable>
          <el-option v-for="t in DRAMA_AUTH_STATUS" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="queryParams.status" placeholder="全部状态" style="width: 140px" clearable>
          <el-option v-for="t in DRAMA_SHELF_STATUS" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="queryParams.pageNum"
      v-model:pageSize="queryParams.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      empty-text="暂无视频数据"
      row-key="dramaId"
      @page-change="loadList"
      @size-change="loadList"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="45" />
      <el-table-column prop="dramaId" label="视频ID" width="90" />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="channelId" label="渠道ID" width="90" />
      <el-table-column label="来源类型" width="100">
        <template #default="{ row }">{{ contentEnumLabel(DRAMA_SOURCE_TYPE, row.sourceType) }}</template>
      </el-table-column>
      <el-table-column label="授权状态" width="120">
        <template #default="{ row }">{{ contentEnumLabel(DRAMA_AUTH_STATUS, row.authorizationStatus) }}</template>
      </el-table-column>
      <el-table-column label="同步状态" width="120">
        <template #default="{ row }">
          <el-tag :type="syncTagType(row.syncStatus)" size="small">{{ row.syncStatus || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上下架" width="110">
        <template #default="{ row }">
          <el-switch
            v-if="isShelfStatus(row.status)"
            v-permission="['content:dramastatus:edit']"
            v-model="row.status"
            active-value="on_shelf"
            inactive-value="off_shelf"
            @change="() => handleStatusChange(row)"
          />
          <el-tag v-else type="info" size="small">{{ row.status || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联剧本" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.relatedWorkId">{{ row.relatedWorkTitle || `#${row.relatedWorkId}` }}</span>
          <el-tag v-else type="info" size="small">未关联</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ row.createTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="['content:drama:query']"
            size="small"
            link
            type="primary"
            @click="openDetail(row)"
          >详情</el-button>
          <el-button
            v-permission="['content:drama:edit']"
            size="small"
            link
            type="primary"
            @click="openEdit(row)"
          >编辑</el-button>
          <el-button
            v-permission="['content:dramastatus:edit']"
            size="small"
            link
            type="primary"
            :loading="syncingId === row.dramaId"
            @click="handleSingleSync(row)"
          >同步</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <!-- 详情弹窗：基本信息 / 关联剧本 / 播放数据 -->
    <el-dialog v-model="detailDialog.visible" title="视频详情" width="900px">
      <el-tabs v-model="detailTab">
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions v-loading="detailDialog.loading" :column="2" border>
            <el-descriptions-item label="视频ID">{{ detail.dramaId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="渠道ID">{{ detail.channelId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="标题" :span="2">{{ detail.title || '—' }}</el-descriptions-item>
            <el-descriptions-item label="外部内容ID">{{ detail.externalContentId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="来源类型">{{ contentEnumLabel(DRAMA_SOURCE_TYPE, detail.sourceType) }}</el-descriptions-item>
            <el-descriptions-item label="授权状态">{{ contentEnumLabel(DRAMA_AUTH_STATUS, detail.authorizationStatus) }}</el-descriptions-item>
            <el-descriptions-item label="同步状态">{{ detail.syncStatus || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ contentEnumLabel(DRAMA_SHELF_STATUS, detail.status) }}</el-descriptions-item>
            <el-descriptions-item label="封面文件ID">{{ detail.coverFileId ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="外部地址" :span="2">{{ detail.externalUrl || '—' }}</el-descriptions-item>
            <el-descriptions-item label="版权说明" :span="2">{{ detail.copyrightNote || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="关联剧本" name="bind">
          <el-descriptions v-loading="detailDialog.loading" :column="1" border>
            <el-descriptions-item label="关联剧本ID">{{ detail.relatedWorkId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="关联剧本标题">{{ detail.relatedWorkTitle || '—' }}</el-descriptions-item>
          </el-descriptions>
          <div class="section-actions">
            <el-button
              v-if="!detail.relatedWorkId"
              v-permission="['content:dramabind:edit']"
              type="primary"
              @click="openBind"
            >关联剧本</el-button>
            <el-button
              v-else
              v-permission="['content:dramabind:edit']"
              type="danger"
              @click="handleUnbind"
            >解除关联</el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="播放数据" name="stats">
          <template v-if="detail.relatedWorkId">
            <el-descriptions v-loading="statsLoading" :column="3" border>
              <el-descriptions-item label="剧本标题">{{ stats.workTitle || '—' }}</el-descriptions-item>
              <el-descriptions-item label="剧集数">{{ stats.episodeCount ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="总播放量">{{ stats.totalPlayCount ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="追更数">{{ stats.subscribeCount ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="剧本ID">{{ detail.relatedWorkId }}</el-descriptions-item>
              <el-descriptions-item label="渠道ID">{{ detail.channelId || '—' }}</el-descriptions-item>
            </el-descriptions>

            <div class="section-title">剧集明细</div>
            <el-table :data="statsEpisodes" border size="small" max-height="240" empty-text="暂无剧集数据">
              <el-table-column prop="episodeNo" label="集数" width="80" />
              <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
              <el-table-column prop="playCount" label="播放量" width="100" />
              <el-table-column prop="likeCount" label="点赞数" width="90" />
              <el-table-column prop="commentCount" label="评论数" width="90" />
              <el-table-column label="完播率" width="100">
                <template #default="{ row }">{{ formatRate(row.completionRate) }}</template>
              </el-table-column>
            </el-table>

            <div class="section-title">播放历史</div>
            <el-table
              v-loading="historyLoading"
              :data="historyList"
              border
              size="small"
              max-height="240"
              empty-text="暂无播放历史"
            >
              <el-table-column prop="episodeTitle" label="剧集标题" min-width="160" show-overflow-tooltip />
              <el-table-column prop="userId" label="用户ID" width="120" />
              <el-table-column label="播放时间" width="170">
                <template #default="{ row }">{{ row.playTime || '—' }}</template>
              </el-table-column>
            </el-table>
            <div class="history-pager">
              <el-pagination
                background
                layout="total, prev, pager, next"
                :total="historyTotal"
                :current-page="historyQuery.pageNum"
                :page-size="historyQuery.pageSize"
                @current-change="onHistoryPageChange"
              />
            </div>
          </template>
          <el-empty v-else description="该视频未关联剧本，暂无播放数据" :image-size="72" />
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="detailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 关联剧本弹窗 -->
    <el-dialog v-model="bindDialog.visible" title="关联剧本" width="420px" @closed="handleBindClosed">
      <el-form ref="bindFormRef" :model="bindForm" :rules="bindRules" label-width="100px">
        <el-form-item label="视频ID">
          <span>{{ bindForm.dramaId }}</span>
        </el-form-item>
        <el-form-item label="视频标题">
          <span>{{ bindForm.dramaTitle || '—' }}</span>
        </el-form-item>
        <el-form-item label="剧本ID" prop="relatedWorkId">
          <el-input-number
            v-model="bindForm.relatedWorkId"
            :min="1"
            controls-position="right"
            style="width: 200px"
            placeholder="请输入剧本ID"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="bindSubmitting" @click="handleBindSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.mode === 'create' ? '新增视频' : '编辑视频'"
      width="620px"
      @closed="handleClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="渠道ID" prop="channelId">
          <el-input v-model="form.channelId" placeholder="请输入渠道ID" />
        </el-form-item>
        <el-form-item label="外部内容ID" prop="externalContentId">
          <el-input v-model="form.externalContentId" placeholder="请输入外部内容ID" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="外部地址" prop="externalUrl">
          <el-input v-model="form.externalUrl" placeholder="请输入外部地址" />
        </el-form-item>
        <el-form-item label="来源类型" prop="sourceType">
          <el-select v-model="form.sourceType" placeholder="请选择来源类型" style="width: 100%" clearable>
            <el-option v-for="t in DRAMA_SOURCE_TYPE" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="授权状态" prop="authorizationStatus">
          <el-select v-model="form.authorizationStatus" placeholder="请选择授权状态" style="width: 100%" clearable>
            <el-option v-for="t in DRAMA_AUTH_STATUS" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="同步状态" prop="syncStatus">
          <el-input v-model="form.syncStatus" placeholder="请输入同步状态" />
        </el-form-item>
        <el-form-item label="版权说明" prop="copyrightNote">
          <el-input v-model="form.copyrightNote" type="textarea" :rows="3" placeholder="请输入版权说明（选填）" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%" clearable>
            <el-option v-for="t in DRAMA_SHELF_STATUS" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面文件ID" prop="coverFileId">
          <el-input-number v-model="form.coverFileId" :min="0" controls-position="right" style="width: 200px" />
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
import { useUserStore } from '@/stores/user'
import {
  listDrama,
  getDrama,
  addDrama,
  updateDrama,
  bindDrama,
  unbindDrama,
  getDramaStats,
  listDramaHistory,
  changeDramaStatus,
  syncDrama
} from '@/api/content'
import {
  DRAMA_SOURCE_TYPE,
  DRAMA_AUTH_STATUS,
  DRAMA_SHELF_STATUS,
  contentEnumLabel
} from '@/constants/contentEnum'

defineOptions({ name: 'ExternalDramaContent' })

const userStore = useUserStore()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  channelId: '',
  title: '',
  sourceType: '',
  authorizationStatus: '',
  status: ''
})

/** GET 入参：空串不下发，让后端走“不过滤”分支 */
function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    channelId: queryParams.channelId || undefined,
    title: queryParams.title || undefined,
    sourceType: queryParams.sourceType || undefined,
    authorizationStatus: queryParams.authorizationStatus || undefined,
    status: queryParams.status || undefined
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await listDrama(buildQuery())
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
  queryParams.channelId = ''
  queryParams.title = ''
  queryParams.sourceType = ''
  queryParams.authorizationStatus = ''
  queryParams.status = ''
  handleQuery()
}

/** 同步状态标签颜色：成功 success，失败/异常 danger，其余 info */
function syncTagType(status) {
  if (!status) return 'info'
  const s = String(status).toLowerCase()
  if (s.includes('success') || s.includes('done') || s.includes('ok')) return 'success'
  if (s.includes('fail') || s.includes('error') || s.includes('pending')) return 'danger'
  return 'info'
}

/** 仅当 status 是约定的 on_shelf/off_shelf 时才渲染开关，避免异常值触发误操作 */
function isShelfStatus(status) {
  return status === 'on_shelf' || status === 'off_shelf'
}

// ---- 上下架 / 同步 ----
const selectedIds = ref([])
const syncing = ref(false)
const syncingId = ref(null)

function handleSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.dramaId)
}

async function handleStatusChange(row) {
  const targetStatus = row.status
  const actionText = targetStatus === 'on_shelf' ? '上架' : '下架'
  try {
    await ElMessageBox.confirm(`确认${actionText}视频「${row.title}」？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    row.status = targetStatus === 'on_shelf' ? 'off_shelf' : 'on_shelf'
    return
  }
  try {
    await changeDramaStatus({ dramaId: row.dramaId, status: targetStatus })
    ElMessage.success(`${actionText}成功`)
  } catch {
    row.status = targetStatus === 'on_shelf' ? 'off_shelf' : 'on_shelf'
  }
}

async function handleSingleSync(row) {
  try {
    await ElMessageBox.confirm(`确认同步视频「${row.title}」？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  syncingId.value = row.dramaId
  try {
    await syncDrama([row.dramaId])
    ElMessage.success('同步已触发')
    loadList()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    syncingId.value = null
  }
}

async function handleBatchSync() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先勾选要同步的视频')
    return
  }
  try {
    await ElMessageBox.confirm(`确认同步选中的 ${selectedIds.value.length} 条视频？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  syncing.value = true
  try {
    await syncDrama(selectedIds.value)
    ElMessage.success('同步已触发')
    loadList()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    syncing.value = false
  }
}

// ---- 详情弹窗 ----
const detailDialog = reactive({ visible: false, loading: false })
const detailTab = ref('info')
const detail = reactive({})
const stats = reactive({})
const statsEpisodes = ref([])
const statsLoading = ref(false)

// ---- 播放历史（带分页） ----
const historyLoading = ref(false)
const historyList = ref([])
const historyTotal = ref(0)
const historyQuery = reactive({ pageNum: 1, pageSize: 5 })

function formatRate(rate) {
  if (rate === null || rate === undefined || rate === '') return '—'
  const n = Number(rate)
  if (!Number.isFinite(n)) return '—'
  // 若已是 0~1 小数则按百分比展示，否则原样展示
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(1)}%`
  return `${n}%`
}

async function openDetail(row) {
  detailDialog.visible = true
  detailTab.value = 'info'
  await reloadDetail(row.dramaId)
}

/** 拉取视频详情，并（有权限且已关联剧本时）联动拉取统计与播放历史 */
async function reloadDetail(dramaId) {
  detailDialog.loading = true
  Object.keys(detail).forEach((k) => delete detail[k])
  Object.keys(stats).forEach((k) => delete stats[k])
  statsEpisodes.value = []
  historyList.value = []
  historyTotal.value = 0
  historyQuery.pageNum = 1
  try {
    const res = await getDrama(dramaId)
    const data = res?.data || res || {}
    Object.assign(detail, data)
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    detailDialog.loading = false
  }
  const workId = detail.relatedWorkId
  if (workId) {
    await loadStats(workId)
    await loadHistory(workId)
  }
}

async function loadStats(workId) {
  if (!userStore.hasPermission('content:dramastats:query')) return
  statsLoading.value = true
  try {
    const res = await getDramaStats(workId)
    const data = res?.data || res || {}
    Object.assign(stats, data)
    statsEpisodes.value = Array.isArray(data.episodes) ? data.episodes : []
  } catch {
    statsEpisodes.value = []
  } finally {
    statsLoading.value = false
  }
}

async function loadHistory(workId) {
  if (!workId) return
  if (!userStore.hasPermission('content:dramastats:list')) return
  historyLoading.value = true
  try {
    const res = await listDramaHistory({
      workId,
      pageNum: historyQuery.pageNum,
      pageSize: historyQuery.pageSize
    })
    historyList.value = res?.rows || []
    historyTotal.value = Number(res?.total || 0)
  } catch {
    historyList.value = []
    historyTotal.value = 0
  } finally {
    historyLoading.value = false
  }
}

function onHistoryPageChange(val) {
  historyQuery.pageNum = val
  if (detail.relatedWorkId) loadHistory(detail.relatedWorkId)
}

// ---- 关联剧本弹窗 ----
const bindDialog = reactive({ visible: false })
const bindSubmitting = ref(false)
const bindFormRef = ref()
const bindForm = reactive({ dramaId: null, dramaTitle: '', relatedWorkId: null })
const bindRules = {
  relatedWorkId: [{ required: true, message: '请输入剧本ID', trigger: 'blur' }]
}

function openBind() {
  bindForm.dramaId = detail.dramaId
  bindForm.dramaTitle = detail.title || ''
  bindForm.relatedWorkId = null
  bindDialog.visible = true
}

function handleBindClosed() {
  bindFormRef.value?.clearValidate()
}

async function handleBindSubmit() {
  if (!bindFormRef.value) return
  await bindFormRef.value.validate(async (valid) => {
    if (!valid) return
    bindSubmitting.value = true
    try {
      await bindDrama({ dramaId: bindForm.dramaId, relatedWorkId: bindForm.relatedWorkId })
      ElMessage.success('关联成功')
      bindDialog.visible = false
      await reloadDetail(bindForm.dramaId)
      loadList()
    } catch {
      // 错误信息已由 request 拦截器统一提示
    } finally {
      bindSubmitting.value = false
    }
  })
}

async function handleUnbind() {
  try {
    await ElMessageBox.confirm(
      `确认解除视频「${detail.title}」与剧本「${detail.relatedWorkTitle || detail.relatedWorkId}」的关联？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await unbindDrama({ dramaId: detail.dramaId })
    ElMessage.success('解除成功')
    await reloadDetail(detail.dramaId)
    loadList()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  }
}

// ---- 新增/编辑弹窗 ----
const dialog = reactive({ visible: false, mode: 'create' })
const submitting = ref(false)
const formRef = ref()
const defaultForm = () => ({
  dramaId: null,
  channelId: '',
  externalContentId: '',
  title: '',
  externalUrl: '',
  sourceType: '',
  authorizationStatus: '',
  syncStatus: '',
  copyrightNote: '',
  status: '',
  coverFileId: 0
})
const form = reactive(defaultForm())
const rules = {
  channelId: [{ required: true, message: '请输入渠道ID', trigger: 'blur' }],
  externalContentId: [{ required: true, message: '请输入外部内容ID', trigger: 'blur' }],
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { whitespace: true, message: '标题不能为空', trigger: 'blur' }
  ],
  externalUrl: [{ required: true, message: '请输入外部地址', trigger: 'blur' }],
  sourceType: [{ required: true, message: '请输入来源类型', trigger: 'blur' }],
  authorizationStatus: [{ required: true, message: '请输入授权状态', trigger: 'blur' }],
  syncStatus: [{ required: true, message: '请输入同步状态', trigger: 'blur' }]
}

function openCreate() {
  Object.assign(form, defaultForm())
  dialog.mode = 'create'
  dialog.visible = true
}

async function openEdit(row) {
  Object.assign(form, defaultForm())
  try {
    const res = await getDrama(row.dramaId)
    const data = res?.data || res || {}
    Object.assign(form, {
      dramaId: data.dramaId ?? row.dramaId,
      channelId: String(data.channelId ?? row.channelId ?? ''),
      externalContentId: data.externalContentId || row.externalContentId || '',
      title: data.title || row.title || '',
      externalUrl: data.externalUrl || row.externalUrl || '',
      sourceType: data.sourceType || row.sourceType || '',
      authorizationStatus: data.authorizationStatus || row.authorizationStatus || '',
      syncStatus: data.syncStatus || row.syncStatus || '',
      copyrightNote: data.copyrightNote || row.copyrightNote || '',
      status: data.status || row.status || '',
      coverFileId: data.coverFileId ?? row.coverFileId ?? 0
    })
  } catch {
    Object.assign(form, {
      dramaId: row.dramaId,
      channelId: String(row.channelId ?? ''),
      externalContentId: row.externalContentId || '',
      title: row.title || '',
      externalUrl: row.externalUrl || '',
      sourceType: row.sourceType || '',
      authorizationStatus: row.authorizationStatus || '',
      syncStatus: row.syncStatus || '',
      copyrightNote: row.copyrightNote || '',
      status: row.status || '',
      coverFileId: row.coverFileId ?? 0
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
      channelId: form.channelId.trim(),
      externalContentId: form.externalContentId.trim(),
      title: form.title.trim(),
      externalUrl: form.externalUrl.trim(),
      sourceType: form.sourceType.trim(),
      authorizationStatus: form.authorizationStatus.trim(),
      syncStatus: form.syncStatus.trim(),
      copyrightNote: form.copyrightNote || '',
      status: form.status || '',
      coverFileId: form.coverFileId ?? 0
    }
    try {
      if (dialog.mode === 'create') {
        await addDrama(payload)
        ElMessage.success('新增成功')
      } else {
        await updateDrama({ ...payload, dramaId: form.dramaId })
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

onMounted(loadList)
</script>

<style scoped>
.section-title {
  margin: 16px 0 8px;
  font-weight: 600;
}
.section-actions {
  margin-top: 16px;
}
.history-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
