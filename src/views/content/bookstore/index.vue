<template>
  <PageContainer>
    <PageHeader title="书城作品管理" description="管理作品展示范围、推荐状态与上下架" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-input
          v-model="queryParams.title"
          placeholder="作品标题"
          style="width: 180px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-select v-model="queryParams.recommendStatus" placeholder="推荐状态" style="width: 150px" clearable>
          <el-option label="首页热门" value="home_hot" />
          <el-option label="分类推荐" value="category_rec" />
          <el-option label="无推荐" value="none" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="queryParams.status" placeholder="全部上下架" style="width: 150px" clearable>
          <el-option label="已上架" value="on_shelf" />
          <el-option label="已下架" value="off_shelf" />
        </el-select>
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="queryParams.pageNum"
      v-model:pageSize="queryParams.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      empty-text="暂无书城作品数据"
      @page-change="loadList"
      @size-change="loadList"
    >
      <el-table-column prop="workId" label="作品ID" width="90" />
      <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
      <el-table-column prop="authorName" label="作者" width="120" show-overflow-tooltip />
      <el-table-column label="推荐状态" width="120">
        <template #default="{ row }">
          <el-tag :type="recommendTagType(row.recommendStatus)" size="small">
            {{ recommendText(row.recommendStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上下架" width="100">
        <template #default="{ row }">
          <el-switch
            v-permission="['content:bookstore:edit']"
            v-model="row.status"
            active-value="on_shelf"
            inactive-value="off_shelf"
            @change="() => handleStatusChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="阅读量" width="90" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ row.createTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="['content:bookstore:edit']"
            size="small"
            link
            type="primary"
            @click="openEditExt(row)"
          >编辑推荐</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog v-model="dialog.visible" title="编辑推荐" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="推荐状态">
          <el-select v-model="form.recommendStatus" style="width: 100%" @change="handleRecommendChange">
            <el-option label="首页热门" value="home_hot" />
            <el-option label="分类推荐" value="category_rec" />
            <el-option label="无推荐" value="none" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示位">
          <el-checkbox-group v-model="form.showScope" :disabled="form.recommendStatus === 'none'">
            <el-checkbox label="bookstore">书城</el-checkbox>
            <el-checkbox label="category_page">分类页</el-checkbox>
            <el-checkbox label="search">搜索页</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="推荐权重">
          <el-input-number v-model="form.recommendWeight" :min="0" :max="9999" :disabled="form.recommendStatus === 'none'" />
        </el-form-item>
        <el-form-item label="失效时间">
          <el-date-picker
            v-model="form.recommendExpireAt"
            type="datetime"
            placeholder="选择推荐失效时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            :disabled="form.recommendStatus === 'none'"
          />
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
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import {
  listBookstore,
  getBookstore,
  changeBookstoreStatus,
  updateBookstoreExt
} from '@/api/content'

defineOptions({ name: 'ContentBookstore' })

const loading = ref(false)
const list = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  title: '',
  recommendStatus: '',
  status: ''
})

const RECOMMEND_TAG_MAP = {
  home_hot: { text: '首页热门', type: 'warning' },
  category_rec: { text: '分类推荐', type: 'success' },
  none: { text: '无推荐', type: 'info' }
}
function recommendText(status) {
  return RECOMMEND_TAG_MAP[status]?.text || status || '—'
}
function recommendTagType(status) {
  return RECOMMEND_TAG_MAP[status]?.type || 'info'
}

/** GET 入参：空串不下发，让后端走"不过滤"分支 */
function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    title: queryParams.title || undefined,
    recommendStatus: queryParams.recommendStatus || undefined,
    status: queryParams.status || undefined
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await listBookstore(buildQuery())
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
  queryParams.title = ''
  queryParams.recommendStatus = ''
  queryParams.status = ''
  handleQuery()
}

async function handleStatusChange(row) {
  const targetStatus = row.status
  const actionText = targetStatus === 'on_shelf' ? '上架' : '下架'
  try {
    await changeBookstoreStatus({ workId: row.workId, status: targetStatus })
    ElMessage.success(`${actionText}成功`)
  } catch {
    // 失败回滚开关，错误信息已由 request 拦截器统一提示
    row.status = targetStatus === 'on_shelf' ? 'off_shelf' : 'on_shelf'
  }
}

const dialog = reactive({ visible: false })
const submitting = ref(false)
const SCOPE_OPTIONS = ['bookstore', 'category_page', 'search']

/** 推荐状态 → 默认展示位联动映射 */
const RECOMMEND_DEFAULT_SCOPE = {
  home_hot: ['bookstore'],
  category_rec: ['category_page'],
  none: []
}

/** 暂存 ext_json 中表单未覆盖的键，提交时合并写回，避免丢数据 */
const extraExtKeys = ref({})

const form = reactive({
  workId: null,
  recommendStatus: 'none',
  showScope: [],
  recommendWeight: 0,
  recommendExpireAt: ''
})

/** 重置推荐相关字段（不触碰 workId——它由 openEditExt 单独维护，误重置会导致提交丢 workId） */
function resetRecommendFields() {
  form.recommendStatus = 'none'
  form.showScope = []
  form.recommendWeight = 0
  form.recommendExpireAt = ''
}

/** 推荐状态切换：联动展示位，"无推荐"或清空（val 为空）时清空所有字段 */
function handleRecommendChange(val) {
  if (!val || val === 'none') {
    form.showScope = []
    form.recommendWeight = 0
    form.recommendExpireAt = ''
  } else {
    form.showScope = [...RECOMMEND_DEFAULT_SCOPE[val]]
  }
}

/** 从 ext_json 解析到表单字段回显，同时暂存表单未覆盖的键 */
function parseExtJsonToForm(extJsonStr) {
  resetRecommendFields()
  extraExtKeys.value = {}
  if (!extJsonStr) return
  try {
    const obj = JSON.parse(extJsonStr)
    form.recommendStatus = obj.recommendStatus || 'none'
    form.showScope = Array.isArray(obj.showScope)
      ? obj.showScope.filter((s) => SCOPE_OPTIONS.includes(s))
      : []
    form.recommendWeight = typeof obj.recommendWeight === 'number' ? obj.recommendWeight : 0
    form.recommendExpireAt = obj.recommendExpireAt || ''
    // 暂存表单未覆盖的键，提交时合并写回
    const known = ['recommendStatus', 'showScope', 'recommendWeight', 'recommendExpireAt']
    for (const [k, v] of Object.entries(obj)) {
      if (!known.includes(k)) extraExtKeys.value[k] = v
    }
  } catch {
    // 既有 extJson 非合法 JSON：按默认值打开，不丢数据但需重新填写
  }
}

async function openEditExt(row) {
  // workId 先落定；parseExtJsonToForm 只重置推荐字段，不会覆盖 workId
  form.workId = row.workId
  try {
    const res = await getBookstore(row.workId)
    const data = res?.data || res || {}
    parseExtJsonToForm(data.extJson || row.extJson || '')
  } catch {
    parseExtJsonToForm(row.extJson || '')
  }
  dialog.visible = true
}

async function handleSubmit() {
  // 表单为唯一数据源，直接序列化——不再依赖手动同步 extJsonRaw
  const extObj = {
    ...extraExtKeys.value,
    recommendStatus: form.recommendStatus || 'none',
    showScope: Array.isArray(form.showScope) ? form.showScope : [],
    recommendWeight: form.recommendWeight ?? 0
  }
  if (form.recommendExpireAt) {
    extObj.recommendExpireAt = form.recommendExpireAt
  }
  submitting.value = true
  try {
    await updateBookstoreExt({
      workId: form.workId,
      extJson: JSON.stringify(extObj)
    })
    ElMessage.success('推荐信息已更新')
    dialog.visible = false
    loadList()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    submitting.value = false
  }
}

onMounted(loadList)
</script>
