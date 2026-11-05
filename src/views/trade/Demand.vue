<template>
  <PageContainer>
    <PageHeader title="任务管理" description="买方发布的剧本接单任务管理（对应 sys_demand，抢单制·先到先得），本页面仅支持查看详情">
    </PageHeader>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" placeholder="全部任务状态" style="width: 150px" clearable>
          <el-option
            v-for="opt in demandStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.keyword"
          placeholder="任务标题搜索"
          style="width: 200px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      @page-change="loadList"
      @size-change="loadList"
    >
      <el-table-column prop="demandNo" label="任务编号" width="120" />
      <el-table-column prop="title" label="任务标题" min-width="160" />
      <el-table-column prop="client" label="发布方" width="120" />
      <el-table-column label="标签" min-width="140">
        <template #default="{ row }">
          <el-tag v-for="t in (row.tags || row.genre || '').split(',').filter(Boolean)" :key="t" size="small" style="margin-right:4px">{{ t }}</el-tag>
          <span v-if="!(row.tags || row.genre)" class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="预算" width="110">
        <template #default="{ row }">
          <span class="price-text">{{ row.budgetText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="托管" width="110">
        <template #default="{ row }">
          <el-tag :type="escrowTagType(row.escrowStatus)" size="small">{{ row.escrowStatusLabel || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="完成时限" width="100">
        <template #default="{ row }">{{ row.durationHours ? row.durationHours + ' 小时' : '-' }}</template>
      </el-table-column>
      <el-table-column label="接单人" width="110">
        <template #default="{ row }">
          <span v-if="row.acceptedCreatorName || row.acceptedCreatorId">{{ row.acceptedCreatorName || ('#' + row.acceptedCreatorId) }}</span>
          <span v-else class="text-muted">未接单</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.overdue" type="danger" size="small" style="margin-right:4px">逾期</el-tag>
          <StatusTag type="demand" :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleViewDetail(row)">查看详情</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <!-- 任务详情（只读） -->
    <el-dialog v-model="detailVisible" title="任务详情" width="820px">
      <div v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="任务编号">{{ detail.demandNo }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <el-tag v-if="detail.overdue" type="danger" size="small" style="margin-right:4px">逾期</el-tag>
            <StatusTag type="demand" :status="detail.status" />
          </el-descriptions-item>
          <el-descriptions-item label="任务标题">{{ detail.title }}</el-descriptions-item>
          <el-descriptions-item label="发布方">{{ detail.client }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="t in (detail.tags || detail.genre || '').split(',').filter(Boolean)" :key="t" size="small" style="margin-right:4px">{{ t }}</el-tag>
            <span v-if="!(detail.tags || detail.genre)">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="预算">
            <span class="price-text">{{ detail.budgetText }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="托管状态">
            <el-tag :type="escrowTagType(detail.escrowStatus)" size="small">{{ detail.escrowStatusLabel || '-' }}</el-tag>
            <span v-if="detail.escrowText" style="margin-left:6px">{{ detail.escrowText }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="押金状态">
            <el-tag :type="depositTagType(detail.depositStatus)" size="small">{{ detail.depositStatusLabel || '-' }}</el-tag>
            <span v-if="detail.depositText" style="margin-left:6px">{{ detail.depositText }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="押金缴纳时间">{{ detail.depositPaidAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="资金结算时间">{{ detail.depositSettledAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ detail.deadline }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ detail.contactInfo }}</el-descriptions-item>
          <el-descriptions-item label="完成时限">{{ detail.durationHours ? detail.durationHours + ' 小时' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="接单人">{{ detail.acceptedCreatorName || (detail.acceptedCreatorId ? '#' + detail.acceptedCreatorId : '-') }}</el-descriptions-item>
          <el-descriptions-item label="接单时间">{{ detail.acceptedAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应完成时间">{{ detail.dueAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否逾期">
            <el-tag v-if="detail.overdue" type="danger" size="small">已逾期</el-tag>
            <span v-else>否</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.status === 'failed'" label="失败原因" :span="2">
            <span style="color:#dc2626">{{ detail.failReason || '到点未通过验收' }}{{ detail.failAt ? '（' + detail.failAt + '）' : '' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="任务要求" :span="2">{{ detail.requirement || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enumOptions, enumTagType } from '@/constants/tradeEnum'
import { getDemandList } from '@/api/trade'

defineOptions({ name: 'Demand' })

// 任务状态枚举（接单制，见 constants/tradeEnum.js DEMAND_STATUS）
const demandStatusOptions = enumOptions('demand')

// 托管/押金 tag 颜色（入账走沙箱、出账记账，仅展示）
const escrowTagType = (v) => enumTagType('demandEscrow', v)
const depositTagType = (v) => enumTagType('demandDeposit', v)

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ pageNo: 1, pageSize: 10, status: '', keyword: '' })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref({})

async function loadList() {
  loading.value = true
  try {
    const res = await getDemandList(query.value)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.value.pageNo = 1
  loadList()
}

function handleReset() {
  query.value = { pageNo: 1, pageSize: 10, status: '', keyword: '' }
  loadList()
}

function handleViewDetail(row) {
  // 只读详情：直接使用列表行数据（含接单制新字段），不展示发布/投稿操作
  detail.value = { ...row }
  detailVisible.value = true
}

onMounted(() => { loadList() })
</script>

<style scoped>
.price-text {
  color: #1f2329;
  font-weight: 600;
}

.text-muted {
  color: #909399;
  font-size: 13px;
}
</style>
