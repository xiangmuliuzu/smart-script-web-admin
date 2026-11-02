<template>
  <PageContainer>
    <PageHeader title="个人收益管理" description="只读核查：查看已有收益账户用户的余额与账单流水（sys_bill_record），不支持调账。" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-input
          v-model="query.keyword"
          clearable
          placeholder="用户ID / 昵称 / 用户名 / 手机号"
          style="width: 260px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="rows"
      :loading="loading"
      :total="total"
      :empty-text="loadFailed ? '加载失败，请重试' : '暂无收益账户'"
      @page-change="loadRows"
      @size-change="loadRows"
    >
      <template #actions>
        <el-button v-if="loadFailed" link type="primary" @click="loadRows">重试</el-button>
      </template>
      <el-table-column prop="userId" label="用户ID" width="100" />
      <el-table-column label="昵称" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.nickName || '—' }}</template>
      </el-table-column>
      <el-table-column label="用户名" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.userName || '—' }}</template>
      </el-table-column>
      <el-table-column label="手机号" width="130">
        <template #default="{ row }">{{ row.phonenumber || '—' }}</template>
      </el-table-column>
      <el-table-column label="可提现" width="120" align="right">
        <template #default="{ row }">¥{{ money(row.availableAmount) }}</template>
      </el-table-column>
      <el-table-column label="提现中" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.frozenAmount) }}</template>
      </el-table-column>
      <el-table-column label="累计已入账" width="120" align="right">
        <template #default="{ row }">¥{{ money(row.settledAmount) }}</template>
      </el-table-column>
      <el-table-column label="待确认结算" width="120" align="right">
        <template #default="{ row }">¥{{ money(row.pendingSettleAmount) }}</template>
      </el-table-column>
      <el-table-column label="已提现" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.withdrawnAmount) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ row.updatedAt || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            v-permission="'smartscript:copyright:income:query'"
            type="primary"
            size="small"
            @click="openBills(row)"
          >
            查看流水
          </el-button>
        </template>
      </el-table-column>
    </TableCard>

    <el-drawer v-model="billVisible" :title="billTitle" size="72%" @closed="onBillClosed">
      <div v-loading="summaryLoading || billLoading" class="drawer-content">
        <el-descriptions v-if="summary" :column="3" border class="summary">
          <el-descriptions-item label="用户">{{ summary.nickName || summary.userName }}（ID {{ summary.userId }}）</el-descriptions-item>
          <el-descriptions-item label="可提现">¥{{ money(summary.availableAmount) }}</el-descriptions-item>
          <el-descriptions-item label="提现中">¥{{ money(summary.frozenAmount) }}</el-descriptions-item>
          <el-descriptions-item label="累计已入账">¥{{ money(summary.settledAmount) }}</el-descriptions-item>
          <el-descriptions-item label="待确认结算">¥{{ money(summary.pendingSettleAmount) }}</el-descriptions-item>
          <el-descriptions-item label="已提现">¥{{ money(summary.withdrawnAmount) }}</el-descriptions-item>
        </el-descriptions>

        <FilterBar class="bill-filter" @query="handleBillQuery" @reset="handleBillReset">
          <el-form-item>
            <el-select v-model="billQuery.billType" clearable placeholder="全部类型" style="width: 150px">
              <el-option label="订单收入" value="income" />
              <el-option label="提现支出" value="withdraw" />
              <el-option label="资金冻结" value="freeze" />
              <el-option label="分成结算" value="settle" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="billQuery.keyword"
              clearable
              placeholder="流水号 / 备注 / 关联ID"
              style="width: 220px"
              @keyup.enter="handleBillQuery"
            />
          </el-form-item>
        </FilterBar>

        <TableCard
          v-model:page="billQuery.pageNo"
          v-model:pageSize="billQuery.pageSize"
          :data="billRows"
          :loading="billLoading"
          :total="billTotal"
          :empty-text="billFailed ? '流水加载失败' : '暂无账单流水'"
          @page-change="loadBills"
          @size-change="loadBills"
        >
          <el-table-column prop="billNo" label="流水号" min-width="160" show-overflow-tooltip />
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ row.incomeSource || billTypeLabel(row.billType) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="120" align="right">
            <template #default="{ row }">
              <span :class="Number(row.amount) < 0 ? 'neg' : 'pos'">¥{{ money(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="变动后余额" width="120" align="right">
            <template #default="{ row }">¥{{ money(row.balanceAfter) }}</template>
          </el-table-column>
          <el-table-column label="关联" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.relatedType || '—' }}{{ row.relatedId != null ? ' #' + row.relatedId : '' }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="时间" width="170" />
        </TableCard>
      </div>
    </el-drawer>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import { getIncomeAccountDetail, getIncomeAccountList, getIncomeBillList } from '@/api/copyright'

defineOptions({ name: 'IncomeManage' })

const loading = ref(false)
const loadFailed = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ keyword: '', pageNo: 1, pageSize: 10 })

const billVisible = ref(false)
const summaryLoading = ref(false)
const billLoading = ref(false)
const billFailed = ref(false)
const summary = ref(null)
const billRows = ref([])
const billTotal = ref(0)
const currentUserId = ref(null)
const billQuery = reactive({ billType: '', keyword: '', pageNo: 1, pageSize: 10 })

const billTitle = computed(() => {
  const name = summary.value?.nickName || summary.value?.userName || currentUserId.value
  return `账单流水 · ${name || ''}`
})

function money(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function billTypeLabel(type) {
  return ({ income: '订单收入', withdraw: '提现支出', freeze: '资金冻结', settle: '分成结算' })[type] || type || '—'
}

async function loadRows() {
  loading.value = true
  loadFailed.value = false
  try {
    const result = await getIncomeAccountList({ ...query })
    rows.value = result?.rows || []
    total.value = Number(result?.total) || 0
  } catch (e) {
    loadFailed.value = true
    rows.value = []
    total.value = 0
    ElMessage.error(e?.message || '加载收益账户失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.pageNo = 1
  loadRows()
}

function handleReset() {
  query.keyword = ''
  query.pageNo = 1
  query.pageSize = 10
  loadRows()
}

async function openBills(row) {
  currentUserId.value = row.userId
  billQuery.billType = ''
  billQuery.keyword = ''
  billQuery.pageNo = 1
  billQuery.pageSize = 10
  billVisible.value = true
  summaryLoading.value = true
  try {
    summary.value = await getIncomeAccountDetail(row.userId)
  } catch (e) {
    summary.value = row
    ElMessage.warning(e?.message || '摘要加载失败，已用列表数据展示')
  } finally {
    summaryLoading.value = false
  }
  await loadBills()
}

async function loadBills() {
  if (!currentUserId.value) return
  billLoading.value = true
  billFailed.value = false
  try {
    const result = await getIncomeBillList(currentUserId.value, { ...billQuery })
    billRows.value = result?.rows || []
    billTotal.value = Number(result?.total) || 0
  } catch (e) {
    billFailed.value = true
    billRows.value = []
    billTotal.value = 0
    ElMessage.error(e?.message || '加载流水失败')
  } finally {
    billLoading.value = false
  }
}

function handleBillQuery() {
  billQuery.pageNo = 1
  loadBills()
}

function handleBillReset() {
  billQuery.billType = ''
  billQuery.keyword = ''
  billQuery.pageNo = 1
  loadBills()
}

function onBillClosed() {
  currentUserId.value = null
  summary.value = null
  billRows.value = []
  billTotal.value = 0
}

onMounted(loadRows)
</script>

<style scoped>
.drawer-content { display: flex; flex-direction: column; gap: 12px; }
.summary { margin-bottom: 4px; }
.bill-filter { margin-top: 4px; }
.pos { color: #67c23a; }
.neg { color: #f56c6c; }
</style>
