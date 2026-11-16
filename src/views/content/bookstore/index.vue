<template>
  <PageContainer>
    <PageHeader title="书城作品管理" description="管理作品展示范围与上下架；付费推荐请前往「作品推广」页面配置" />

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
      row-key="workId"
      @page-change="loadList"
      @size-change="loadList"
    >
      <el-table-column prop="workId" label="作品ID" width="90" />
      <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
      <el-table-column prop="authorName" label="作者" width="120" show-overflow-tooltip />
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
            v-permission="['content:promotion:list']"
            size="small"
            link
            type="primary"
            @click="goPromotion(row)"
          >查看推荐位</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <div class="bookstore-notice">
      推荐位已迁移至「作品推广」，本页仅维护上下架状态，不再写入旧推荐字段。
    </div>
  </PageContainer>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { listBookstore, changeBookstoreStatus } from '@/api/content'

defineOptions({ name: 'ContentBookstore' })

const router = useRouter()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  title: '',
  status: ''
})

/** GET 入参：空串不下发，让后端走"不过滤"分支 */
function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    title: queryParams.title || undefined,
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
  queryParams.status = ''
  handleQuery()
}

function goPromotion() {
  router.push('/content/promotion')
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

onMounted(loadList)
</script>

<style scoped>
.bookstore-notice {
  margin-top: 12px;
  padding: 9px 12px;
  border: 1px solid #e3ecf8;
  border-radius: 9px;
  background: #f7fafe;
  color: #254e90;
  font-size: 11px;
  line-height: 1.5;
}
</style>
