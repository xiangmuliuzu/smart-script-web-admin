<template>
  <PageContainer>
    <PageHeader title="排行榜管理" description="按榜单分页签管理快照数据、触发重算，排名按实际数据自动排序">
      <template #actions>
        <BlackButton v-permission="['content:ranking:edit']" @click="openRecompute">
          重算{{ currentBoard.label }}
        </BlackButton>
      </template>
    </PageHeader>

    <!-- 四榜分页签：与 App 端榜单口径一致（view/favorite/sale/rating），指标随类型固定 -->
    <el-tabs v-model="activeType" class="board-tabs" @tab-change="handleTabChange">
      <el-tab-pane v-for="board in RANKING_TYPE" :key="board.value" :label="board.label" :name="board.value" />
    </el-tabs>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="queryParams.status" placeholder="全部状态" style="width: 140px" clearable>
          <el-option label="有效" value="0" />
          <el-option label="失效" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-date-picker
          v-model="queryParams.periodStart"
          type="date"
          placeholder="周期开始"
          value-format="YYYY-MM-DD"
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item>
        <el-date-picker
          v-model="queryParams.periodEnd"
          type="date"
          placeholder="周期结束"
          value-format="YYYY-MM-DD"
          style="width: 160px"
        />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="queryParams.pageNum"
      v-model:pageSize="queryParams.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      empty-text="暂无榜单数据"
      @page-change="loadList"
      @size-change="loadList"
    >
      <el-table-column label="排名" width="80">
        <template #default="{ $index }">
          <el-tag size="small" :type="$index < 3 ? 'danger' : 'info'" effect="plain">
            No.{{ $index + 1 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="workTitle" label="作品标题" min-width="160" show-overflow-tooltip />
      <el-table-column :label="currentBoard.metricLabel" width="110">
        <template #default="{ row }">{{ row.score ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="周期" width="210">
        <template #default="{ row }">{{ (row.periodStart || '—') + ' ~ ' + (row.periodEnd || '—') }}</template>
      </el-table-column>
      <el-table-column label="快照时间" width="170">
        <template #default="{ row }">{{ row.snapshotTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '0' || row.status === 0 ? 'success' : 'info'" size="small">
            {{ row.status === '0' || row.status === 0 ? '有效' : '失效' }}
          </el-tag>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog v-model="recomputeDialog.visible" :title="`重算${currentBoard.label}`" width="480px">
      <el-form :model="recomputeForm" label-width="100px">
        <el-form-item label="榜单类型">
          <el-input :value="`${currentBoard.label}（${currentBoard.value}）`" disabled />
        </el-form-item>
        <el-form-item label="排序指标">
          <el-input :value="currentBoard.metricLabel" disabled />
        </el-form-item>
        <el-form-item label="周期开始">
          <el-date-picker
            v-model="recomputeForm.periodStart"
            type="date"
            placeholder="选择周期开始"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="周期结束">
          <el-date-picker
            v-model="recomputeForm.periodEnd"
            type="date"
            placeholder="选择周期结束"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recomputeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="recomputing" @click="handleRecompute">确定</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import BlackButton from '@/components/BlackButton.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { listRanking, recomputeRanking } from '@/api/content'
import { RANKING_TYPE } from '@/constants/contentEnum'

defineOptions({ name: 'ContentRanking' })

const loading = ref(false)
const list = ref([])
const total = ref(0)

/** 当前榜单页签（与后端 rankingType 白名单 view/favorite/sale/rating 一致） */
const activeType = ref(RANKING_TYPE[0].value)
const currentBoard = computed(() => RANKING_TYPE.find((b) => b.value === activeType.value) || RANKING_TYPE[0])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  status: '',
  periodStart: '',
  periodEnd: ''
})

/** Tab 切换：重置分页并按当前榜单重查 */
function handleTabChange() {
  queryParams.pageNum = 1
  loadList()
}

/** GET 入参：空串不下发，让后端走“不过滤”分支 */
function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    rankingType: activeType.value,
    status: queryParams.status || undefined,
    periodStart: queryParams.periodStart || undefined,
    periodEnd: queryParams.periodEnd || undefined
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await listRanking(buildQuery())
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

/** 重置只清筛选条件，不切榜单页签 */
function handleReset() {
  queryParams.status = ''
  queryParams.periodStart = ''
  queryParams.periodEnd = ''
  handleQuery()
}

const recomputeDialog = reactive({ visible: false })
const recomputing = ref(false)
const recomputeForm = reactive({
  periodStart: '',
  periodEnd: ''
})

function openRecompute() {
  recomputeForm.periodStart = ''
  recomputeForm.periodEnd = ''
  recomputeDialog.visible = true
}

async function handleRecompute() {
  if (!recomputeForm.periodStart || !recomputeForm.periodEnd) {
    ElMessage.warning('请选择周期开始与结束时间')
    return
  }
  recomputing.value = true
  try {
    const res = await recomputeRanking({
      rankingType: activeType.value,
      periodStart: recomputeForm.periodStart,
      periodEnd: recomputeForm.periodEnd
    })
    const data = res?.data || res || {}
    ElMessage.success(
      `重算成功：新增快照 ${data.newSnapshotCount ?? 0} 条，移除旧快照 ${data.oldRemovedCount ?? 0} 条`
    )
    recomputeDialog.visible = false
    loadList()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    recomputing.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.board-tabs {
  margin-bottom: 12px;
}
</style>


