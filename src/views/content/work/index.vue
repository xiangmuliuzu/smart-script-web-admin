<template>
  <PageContainer>
    <PageHeader title="作品管理" description="管理全部作品及其章节、书城展示作品与推荐；书城作品仅列出被推荐到首页热门或搜索页的作品" />

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- ============ 全部作品 ============ -->
      <el-tab-pane label="全部作品" name="all">
        <FilterBar @query="handleAllQuery" @reset="handleAllReset">
          <el-form-item>
            <el-input
              v-model="allQuery.title"
              placeholder="作品标题"
              style="width: 180px"
              clearable
              @keyup.enter="handleAllQuery"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="allQuery.authorName"
              placeholder="作者昵称"
              style="width: 160px"
              clearable
              @keyup.enter="handleAllQuery"
            />
          </el-form-item>
          <el-form-item>
            <el-select v-model="allQuery.status" placeholder="全部状态" style="width: 140px" clearable>
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="已上架" value="on_shelf" />
              <el-option label="已下架" value="off_shelf" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="allQuery.tradeType" placeholder="全部交易类型" style="width: 160px" clearable>
              <el-option v-for="t in TRADE_TYPE" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
        </FilterBar>

        <TableCard
          v-model:page="allQuery.pageNum"
          v-model:pageSize="allQuery.pageSize"
          :data="allList"
          :loading="allLoading"
          :total="allTotal"
          empty-text="暂无作品数据"
          @page-change="loadAllList"
          @size-change="loadAllList"
        >
          <el-table-column label="封面" width="72">
            <template #default="{ row }">
              <CoverThumb :url="row.cover" />
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="280" show-overflow-tooltip />
          <el-table-column prop="authorName" label="作者" min-width="140" show-overflow-tooltip />
          <el-table-column prop="genreName" label="分类" min-width="140" show-overflow-tooltip />
          <el-table-column prop="viewCount" label="浏览量" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="推荐状态" min-width="130">
            <template #default="{ row }">
              <el-tag :type="recommendTagType(row.recommendStatus)" size="small">
                {{ recommendText(row.recommendStatus) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="['content:work:query']"
                size="small"
                @click="openDetail(row)"
              >详情</el-button>
              <el-button
                v-permission="['content:work:list']"
                size="small"
                @click="openChapters(row)"
              >章节</el-button>
              <el-button
                v-permission="['content:bookstore:edit']"
                size="small"
                type="primary"
                :disabled="row.status !== 'on_shelf'"
                :title="row.status !== 'on_shelf' ? '请先上架作品再设置推荐' : ''"
                @click="openEditExt(row)"
              >编辑推荐</el-button>
            </template>
          </el-table-column>
        </TableCard>

        <el-dialog v-model="detailDialog.visible" title="作品详情" width="720px">
          <el-descriptions v-loading="detailDialog.loading" :column="2" border>
            <el-descriptions-item label="作品标题" :span="2">{{ detail.title || '—' }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ detail.authorName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ detail.genreName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="价格">{{ detail.price ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="交易类型">{{ contentEnumLabel(TRADE_TYPE, detail.tradeType) }}</el-descriptions-item>
            <el-descriptions-item label="交易状态">
              <!-- tradeEnabled 实体为 String（"1"/"0"），"0" 是 truthy，须按字符串判断 -->
              <el-tag :type="detail.tradeEnabled === '1' ? 'success' : 'info'" size="small">
                {{ detail.tradeEnabled === '1' ? '已开启' : '未开启' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="作品状态">
              <el-tag :type="statusTagType(detail.status)" size="small">
                {{ statusText(detail.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="字数">{{ detail.wordCount ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="章节数">{{ detail.episodeCount ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="阅读量">{{ detail.viewCount ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="收藏量">{{ detail.favoriteCount ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="销售量">{{ detail.saleCount ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="评分">{{ detail.rating ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.createTime || '—' }}</el-descriptions-item>
            <el-descriptions-item label="驳回理由" :span="2">{{ detail.rejectReason || '—' }}</el-descriptions-item>
            <el-descriptions-item label="作品简介" :span="2">{{ detail.summary || '—' }}</el-descriptions-item>
          </el-descriptions>
          <template #footer>
            <el-button @click="detailDialog.visible = false">关闭</el-button>
          </template>
        </el-dialog>

        <el-dialog v-model="chapterDialog.visible" :title="`「${chapterDialog.title}」章节列表`" width="780px">
          <el-table v-loading="chapterDialog.loading" :data="chapterDialog.list" style="width: 100%">
            <el-table-column prop="chapterNo" label="章节号" width="100" />
            <el-table-column prop="chapterTitle" label="章节标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="wordCount" label="字数" width="100" />
            <el-table-column label="免费" width="100">
              <template #default="{ row }">
                <!-- is_free 为 tinyint，后端实体 String 返回字符串 "1"/"0"，须按字符串比较 -->
                <el-tag :type="row.isFree === '1' ? 'success' : 'warning'" size="small">
                  {{ row.isFree === '1' ? '免费' : '付费' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <!-- 章节 status：0=正常 1=停用 -->
                <el-tag :type="row.status === '1' ? 'danger' : 'success'" size="small">
                  {{ row.status === '1' ? '停用' : '正常' }}
                </el-tag>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无章节数据" :image-size="80" />
            </template>
          </el-table>
          <div class="chapter-pager">
            <el-pagination
              background
              layout="total, prev, pager, next"
              :total="chapterDialog.total"
              :current-page="chapterDialog.pageNum"
              :page-size="chapterDialog.pageSize"
              @current-change="onChapterPageChange"
            />
          </div>
          <template #footer>
            <el-button @click="chapterDialog.visible = false">关闭</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ============ 书城作品（仅已上架，即出现在书城里的作品） ============ -->
      <el-tab-pane label="书城作品" name="bookstore">
        <FilterBar @query="handleBookQuery" @reset="handleBookReset">
          <el-form-item>
            <el-input
              v-model="bookQuery.title"
              placeholder="作品标题"
              style="width: 180px"
              clearable
              @keyup.enter="handleBookQuery"
            />
          </el-form-item>
          <el-form-item>
            <el-select v-model="bookQuery.recommendStatus" placeholder="推荐位置" style="width: 150px" clearable>
              <el-option label="首页热门" value="home_hot" />
              <el-option label="搜索页" value="search" />
            </el-select>
          </el-form-item>
        </FilterBar>

        <TableCard
          v-model:page="bookQuery.pageNum"
          v-model:pageSize="bookQuery.pageSize"
          :data="bookList"
          :loading="bookLoading"
          :total="bookTotal"
          empty-text="书城暂无已上架作品"
          @page-change="loadBookList"
          @size-change="loadBookList"
        >
          <el-table-column label="位次" width="80">
            <template #default="{ row }">
              <span v-if="bookQuery.recommendStatus === 'search'">{{ row.searchWeight || '—' }}</span>
              <span v-else>{{ row.recommendWeight || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="封面" width="72">
            <template #default="{ row }">
              <CoverThumb :url="row.cover" />
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip />
          <el-table-column prop="authorName" label="作者" min-width="140" show-overflow-tooltip />
          <el-table-column prop="genreName" label="分类" min-width="140" show-overflow-tooltip />
          <el-table-column label="推荐状态" width="120">
            <template #default="{ row }">
              <el-tag :type="recommendTagType(row.recommendStatus)" size="small">
                {{ recommendText(row.recommendStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="可见性" width="100">
            <template #default="{ row }">
              <el-tag :type="isRecommendExpired(row.recommendExpireAt) ? 'info' : 'success'" size="small">
                {{ isRecommendExpired(row.recommendExpireAt) ? '已过期' : '生效中' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="['content:bookstore:edit']"
                size="small"
                link
                type="primary"
                :disabled="row.status !== 'on_shelf'"
                :title="row.status !== 'on_shelf' ? '请先上架作品再设置推荐' : ''"
                @click="openEditExt(row)"
              >编辑推荐</el-button>
            </template>
          </el-table-column>
        </TableCard>

      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="extDialog.visible" :title="extDialogTitle" width="520px">
      <el-form :model="form" label-width="110px">
        <!-- 搜索页上下文：这些书必在首页热门；此处仅管理是否保留在搜索页及搜索位次 -->
        <template v-if="bookQuery.recommendStatus === 'search'">
          <el-form-item label="推荐到搜索页">
            <el-switch v-model="form.isSearch" />
            <span style="margin-left: 12px; font-size: 13px; color: #606266;">
              {{ form.isSearch ? '保留在搜索页「为你推荐」' : '取消后从搜索页移除（仍保留在首页热门）' }}
            </span>
          </el-form-item>
          <el-form-item v-if="form.isSearch" label="搜索位次">
            <el-input-number v-model="form.searchWeight" :min="1" :max="6" />
            <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px;">
              搜索页「为你推荐」最多 6 本；数字越小越靠前，改为已存在位次时其他作品自动顺延
            </div>
          </el-form-item>
        </template>
        <!-- 首页热门上下文：主开关=首页热门；其上可附加"同时上搜索页"（搜索推荐从属于首页热门） -->
        <template v-else-if="bookQuery.recommendStatus === 'home_hot'">
          <el-form-item label="推荐到首页">
            <el-switch v-model="form.isHomeHot" @change="onHomeHotSwitchChange" />
            <span style="margin-left: 12px; font-size: 13px; color: #606266;">
              {{ form.isHomeHot ? '已推荐到书城首页热门' : '取消后将退出所有推荐（含搜索页）' }}
            </span>
          </el-form-item>
          <el-form-item v-if="form.isHomeHot" label="首页位次">
            <el-input-number v-model="form.recommendWeight" :min="1" :max="30" />
            <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px;">
              首页热门最多 30 本，书城首页展示前 6 本；数字越小越靠前，改为已存在位次时其他作品自动顺延
            </div>
          </el-form-item>
          <el-form-item v-if="form.isHomeHot" label="同时上搜索页">
            <el-checkbox v-model="form.isSearch">在搜索页「为你推荐」中同时展示</el-checkbox>
          </el-form-item>
          <el-form-item v-if="form.isHomeHot && form.isSearch" label="搜索位次">
            <el-input-number v-model="form.searchWeight" :min="1" :max="6" />
            <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px;">
              搜索页「为你推荐」最多 6 本；数字越小越靠前，改为已存在位次时其他作品自动顺延
            </div>
          </el-form-item>
        </template>
        <!-- 未筛选（全部）：保留双开关，可同时管理两个位置 -->
        <template v-else>
          <el-form-item label="推荐到">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <el-checkbox v-model="form.isHomeHot" @change="onHomeHotSwitchChange">首页热门（书城首页）</el-checkbox>
              <el-checkbox v-model="form.isSearch" :disabled="!form.isHomeHot">搜索页（搜索结果中）</el-checkbox>
            </div>
            <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px;">
              搜索页推荐需先加入首页热门；两个都不勾选即为取消推荐
            </div>
          </el-form-item>
          <el-form-item v-if="form.isHomeHot" label="首页位次">
            <el-input-number v-model="form.recommendWeight" :min="1" :max="30" />
            <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px;">
              首页热门最多 30 本，书城首页展示前 6 本；数字越小越靠前，改为已存在位次时其他作品自动顺延
            </div>
          </el-form-item>
          <el-form-item v-if="form.isSearch" label="搜索位次">
            <el-input-number v-model="form.searchWeight" :min="1" :max="6" />
            <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px;">
              搜索页「为你推荐」最多 6 本；数字越小越靠前，改为已存在位次时其他作品自动顺延
            </div>
          </el-form-item>
        </template>
        <el-form-item label="失效时间" required>
          <el-date-picker
            v-model="form.recommendExpireAt"
            type="datetime"
            placeholder="选择推荐失效时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            :disabled="!form.isHomeHot && !form.isSearch"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="extDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleExtSubmit">确定</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import CoverThumb from './cover-thumb.vue'
import {
  listWork, getWork, listWorkChapters,
  listBookstore, getBookstore, updateBookstoreExt
} from '@/api/content'
import { TRADE_TYPE, contentEnumLabel } from '@/constants/contentEnum'

defineOptions({ name: 'ContentWork' })

const activeTab = ref('all')

// ============ 全部作品 ============
const allLoading = ref(false)
const allList = ref([])
const allTotal = ref(0)
const allQuery = reactive({ pageNum: 1, pageSize: 10, title: '', authorName: '', status: '', tradeType: '' })

const STATUS_LABEL_MAP = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  on_shelf: '已上架',
  off_shelf: '已下架'
}
const STATUS_TAG_TYPE_MAP = {
  draft: 'info',
  pending: 'warning',
  approved: 'primary',
  rejected: 'danger',
  on_shelf: 'success',
  off_shelf: 'danger'
}
function statusText(status) {
  return STATUS_LABEL_MAP[status] || status || '—'
}
function statusTagType(status) {
  return STATUS_TAG_TYPE_MAP[status] || 'info'
}

function buildAllQuery() {
  return {
    pageNum: allQuery.pageNum,
    pageSize: allQuery.pageSize,
    title: allQuery.title || undefined,
    status: allQuery.status || undefined,
    authorName: allQuery.authorName || undefined,
    tradeType: allQuery.tradeType || undefined
  }
}

async function loadAllList() {
  allLoading.value = true
  try {
    const res = await listWork(buildAllQuery())
    allList.value = res?.rows || []
    allTotal.value = Number(res?.total || 0)
  } catch {
    allList.value = []
    allTotal.value = 0
  } finally {
    allLoading.value = false
  }
}

function handleAllQuery() {
  allQuery.pageNum = 1
  loadAllList()
}

function handleAllReset() {
  allQuery.title = ''
  allQuery.status = ''
  allQuery.authorName = ''
  allQuery.tradeType = ''
  handleAllQuery()
}

const detailDialog = reactive({ visible: false, loading: false })
const detail = reactive({})
async function openDetail(row) {
  detailDialog.visible = true
  detailDialog.loading = true
  Object.keys(detail).forEach((k) => delete detail[k])
  try {
    const res = await getWork(row.workId)
    const data = res?.data || res || {}
    Object.assign(detail, data)
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    detailDialog.loading = false
  }
}

const chapterDialog = reactive({
  visible: false,
  loading: false,
  workId: null,
  title: '',
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 10
})
async function loadChapters() {
  chapterDialog.loading = true
  try {
    const res = await listWorkChapters(chapterDialog.workId, {
      pageNum: chapterDialog.pageNum,
      pageSize: chapterDialog.pageSize
    })
    chapterDialog.list = res?.rows || []
    chapterDialog.total = Number(res?.total || 0)
  } catch {
    chapterDialog.list = []
    chapterDialog.total = 0
  } finally {
    chapterDialog.loading = false
  }
}
function openChapters(row) {
  chapterDialog.workId = row.workId
  chapterDialog.title = row.title || ''
  chapterDialog.pageNum = 1
  chapterDialog.list = []
  chapterDialog.total = 0
  chapterDialog.visible = true
  loadChapters()
}
function onChapterPageChange(pageNum) {
  chapterDialog.pageNum = pageNum
  loadChapters()
}

// ============ 书城作品（仅已上架） ============
const bookLoading = ref(false)
const bookList = ref([])
const bookTotal = ref(0)
const bookQuery = reactive({ pageNum: 1, pageSize: 10, title: '', recommendStatus: '' })

const RECOMMEND_TAG_MAP = {
  home_hot: { text: '首页热门', type: 'warning' },
  search: { text: '搜索页', type: 'success' },
  none: { text: '无推荐', type: 'info' }
}
function isRecommendExpired(expireAt) {
  if (!expireAt) return false // 没设过期时间 = 永久生效
  return new Date(expireAt.replace(' ', 'T')) < new Date()
}

function recommendText(status) {
  return RECOMMEND_TAG_MAP[status]?.text || status || '—'
}
function recommendTagType(status) {
  return RECOMMEND_TAG_MAP[status]?.type || 'info'
}

/** 书城作品 Tab：只显示「被推荐到书城展示位的作品」（recommendStatus 不为 none） */
function buildBookQuery() {
  return {
    pageNum: bookQuery.pageNum,
    pageSize: bookQuery.pageSize,
    title: bookQuery.title || undefined,
    recommendStatus: bookQuery.recommendStatus || undefined,
    hasRecommend: true
  }
}

async function loadBookList() {
  bookLoading.value = true
  try {
    const res = await listBookstore(buildBookQuery())
    bookList.value = res?.rows || []
    bookTotal.value = Number(res?.total || 0)
  } catch {
    bookList.value = []
    bookTotal.value = 0
  } finally {
    bookLoading.value = false
  }
}

function handleBookQuery() {
  bookQuery.pageNum = 1
  loadBookList()
}

function handleBookReset() {
  bookQuery.title = ''
  bookQuery.recommendStatus = ''
  handleBookQuery()
}

const extDialog = reactive({ visible: false })

// 弹窗标题随当前推荐位置筛选变化：在哪个位置的列表里编辑，就只管理哪个位置
const extDialogTitle = computed(() => {
  if (bookQuery.recommendStatus === 'search') return '编辑搜索页推荐'
  if (bookQuery.recommendStatus === 'home_hot') return '编辑首页热门推荐'
  return '编辑推荐'
})
const submitting = ref(false)
const extraExtKeys = ref({})
const form = reactive({
  workId: null,
  recommendStatus: 'none',
  isHomeHot: false,
  isSearch: false,
  recommendWeight: 1,
  searchWeight: 1,
  recommendExpireAt: ''
})

function resetRecommendFields() {
  form.recommendStatus = 'none'
  form.isHomeHot = false
  form.isSearch = false
  form.recommendWeight = 1
  form.searchWeight = 1
  form.recommendExpireAt = ''
}

function parseExtJsonToForm(extJsonStr) {
  resetRecommendFields()
  extraExtKeys.value = {}
  if (!extJsonStr) return
  try {
    const obj = JSON.parse(extJsonStr)
    form.recommendStatus = obj.recommendStatus || 'none'
    const scope = Array.isArray(obj.showScope) ? obj.showScope : []
    form.isHomeHot = scope.includes('bookstore')
    form.isSearch = scope.includes('search')
    form.recommendWeight = typeof obj.recommendWeight === 'number' ? obj.recommendWeight : 1
    form.searchWeight = typeof obj.searchWeight === 'number' ? obj.searchWeight : 1
    form.recommendExpireAt = obj.recommendExpireAt || ''
    const known = ['recommendStatus', 'showScope', 'recommendWeight', 'searchWeight', 'recommendExpireAt']
    for (const [k, v] of Object.entries(obj)) {
      if (!known.includes(k)) extraExtKeys.value[k] = v
    }
  } catch {
    // 既有 extJson 非合法 JSON：按默认值打开，不丢数据但需重新填写
  }
}

// 取消首页热门时联动取消搜索页（搜索推荐以首页热门为前提）
function onHomeHotSwitchChange(val) {
  if (!val) form.isSearch = false
}

async function openEditExt(row) {
  form.workId = row.workId
  try {
    const res = await getBookstore(row.workId)
    const data = res?.data || res || {}
    parseExtJsonToForm(data.extJson || row.extJson || '')
  } catch {
    parseExtJsonToForm(row.extJson || '')
  }
  extDialog.visible = true
}

async function handleExtSubmit() {
  const isRecommended = !!(form.isHomeHot || form.isSearch)

  // 校验：勾选了推荐时，失效时间必填
  if (isRecommended && !form.recommendExpireAt) {
    ElMessage.warning('请选择推荐失效时间')
    return
  }

  // 根据两个开关拼接展示位
  const showScope = []
  if (form.isHomeHot) showScope.push('bookstore')
  if (form.isSearch) showScope.push('search')

  const extObj = {
    ...extraExtKeys.value,
    recommendStatus: isRecommended ? 'home_hot' : 'none',
    showScope: showScope,
  }
  // 两个展示位各自独立的位次；数量上限（首页30/搜索6）与自动重排由后端强校验
  if (form.isHomeHot) {
    extObj.recommendWeight = form.recommendWeight ?? 1
  }
  if (form.isSearch) {
    extObj.searchWeight = form.searchWeight ?? 1
  }
  // 失效时间两个展示位共用
  if (isRecommended && form.recommendExpireAt) {
    extObj.recommendExpireAt = form.recommendExpireAt
  }
  submitting.value = true
  try {
    await updateBookstoreExt({
      workId: form.workId,
      extJson: JSON.stringify(extObj)
    })
    ElMessage.success('推荐信息已更新')
    extDialog.visible = false
    // 根据当前所在Tab刷新对应列表
    if (activeTab.value === 'bookstore') {
      loadBookList()
    } else {
      loadAllList()
    }
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    submitting.value = false
  }
}

// ============ 切换 Tab：懒加载首次列表 ============
let allLoaded = false
let bookLoaded = false
function handleTabChange(name) {
  if (name === 'bookstore' && !bookLoaded) {
    bookLoaded = true
    loadBookList()
  } else if (name === 'all' && !allLoaded) {
    allLoaded = true
    loadAllList()
  }
}

onMounted(() => {
  allLoaded = true
  loadAllList()
})
</script>

<style scoped>
.chapter-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>


