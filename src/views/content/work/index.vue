<template>
  <PageContainer>
    <PageHeader title="作品管理" description="管理全部作品及其章节；付费推荐请前往「作品推广」页面配置" />

    <el-tabs v-model="activeTab">
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
            <el-select v-model="allQuery.channelId" placeholder="全部频道" style="width: 120px" clearable>
              <el-option label="男频" :value="146" />
              <el-option label="女频" :value="147" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="allQuery.tradeType" placeholder="全部交易类型" style="width: 160px" clearable>
              <el-option v-for="t in TRADE_TYPE" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="allQuery.tagId" placeholder="全部标签" style="width: 160px" clearable>
              <el-option v-for="t in tagOptions" :key="t.tagId" :label="t.tagName" :value="t.tagId" />
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
          row-key="workId"
          @page-change="loadAllList"
          @size-change="loadAllList"
        >
          <el-table-column label="封面" width="72">
            <template #default="{ row }">
              <CoverThumb :url="row.cover" />
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="280" show-overflow-tooltip />
          <el-table-column label="频道" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.channelId === 146" size="small" type="primary">男频</el-tag>
              <el-tag v-else-if="row.channelId === 147" size="small" type="danger">女频</el-tag>
              <el-tag v-else size="small" type="info">未设置</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="authorName" label="作者" min-width="140" show-overflow-tooltip />
          <el-table-column label="标签" min-width="220">
            <template #default="{ row }">
              <span v-if="!row.tags || row.tags.length === 0">—</span>
              <el-tag
                v-for="tag in row.tags"
                :key="tag.tagId"
                size="small"
                class="work-tag"
              >{{ tag.tagName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="viewCount" label="浏览量" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160" fixed="right">
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
            </template>
          </el-table-column>
        </TableCard>

        <el-dialog v-model="detailDialog.visible" title="作品详情" width="720px">
          <el-descriptions v-loading="detailDialog.loading" :column="2" border>
            <el-descriptions-item label="作品标题" :span="2">{{ detail.title || '—' }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ detail.authorName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="频道">
              <span v-if="detail.channelId === 146">男频</span>
              <span v-else-if="detail.channelId === 147">女频</span>
              <span v-else>未设置</span>
            </el-descriptions-item>
            <el-descriptions-item label="标签">
              <span v-if="!detail.tags || detail.tags.length === 0">—</span>
              <el-tag
                v-for="tag in detail.tags"
                :key="tag.tagId"
                size="small"
                class="work-tag"
              >{{ tag.tagName }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="价格">{{ detail.price ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="交易类型">{{ contentEnumLabel(TRADE_TYPE, detail.tradeType) }}</el-descriptions-item>
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

    </el-tabs>
  </PageContainer>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import CoverThumb from './cover-thumb.vue'
import { listWork, getWork, listWorkChapters, listTag } from '@/api/content'
import { TRADE_TYPE, contentEnumLabel } from '@/constants/contentEnum'

defineOptions({ name: 'ContentWork' })

const activeTab = ref('all')

// ============ 全部作品 ============
const allLoading = ref(false)
const allList = ref([])
const allTotal = ref(0)
const allQuery = reactive({ pageNum: 1, pageSize: 10, title: '', authorName: '', status: '', tradeType: '', tagId: null, channelId: null })
const tagOptions = ref([])

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
    tradeType: allQuery.tradeType || undefined,
    tagId: allQuery.tagId || undefined,
    channelId: allQuery.channelId || undefined
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
  allQuery.tagId = null
  allQuery.channelId = null
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

// ============ 切换 Tab ============
onMounted(() => {
  loadAllList()
  loadTagOptions()
})

async function loadTagOptions() {
  try {
    const res = await listTag({ pageNum: 1, pageSize: 1000 })
    tagOptions.value = res?.rows || []
  } catch {
    tagOptions.value = []
  }
}
</script>

<style scoped>
.chapter-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.work-tag {
  margin-right: 6px;
  margin-bottom: 2px;
}
</style>


