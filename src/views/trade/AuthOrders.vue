<template>
  <PageContainer>
    <PageHeader title="订单管理">
      <template #actions>
        <el-button @click="handleExport">导出订单</el-button>
      </template>
    </PageHeader>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" placeholder="全部状态" style="width: 150px" clearable>
          <el-option
            v-for="opt in orderStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.orderNo"
          placeholder="订单编号"
          style="width: 160px"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.workTitle"
          placeholder="作品名称"
          style="width: 180px"
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
      <el-table-column prop="orderNo" label="订单编号" width="120" />
      <el-table-column prop="workTitle" label="作品" min-width="130" />
      <el-table-column prop="buyer" label="买家" width="120" />
      <el-table-column prop="creator" label="作者" width="110" />
      <el-table-column prop="authorizationTypeLabel" label="授权类型" width="110" />
      <el-table-column label="金额" width="120">
        <template #default="{ row }">
          <span class="price-text">{{ row.amountText }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="下单时间" width="160" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag type="order" :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <!-- 订单详情：C 只负责订单主体 + 状态流转记录；合同/托管/结算属 D，不在此展示 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="640px">
      <div v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单编号">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <StatusTag type="order" :status="detail.status" />
          </el-descriptions-item>
          <el-descriptions-item label="作品名称">{{ detail.workTitle }}</el-descriptions-item>
          <el-descriptions-item label="授权类型">{{ detail.authorizationTypeLabel }}</el-descriptions-item>
          <el-descriptions-item label="买家">{{ detail.buyer?.companyName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ detail.creator?.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">
            <span class="price-text">{{ detail.amountText }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ detail.createdAt }}</el-descriptions-item>
        </el-descriptions>

        <div class="history-title">状态流转记录</div>
        <el-timeline v-if="detail.statusHistory && detail.statusHistory.length">
          <el-timeline-item
            v-for="(item, idx) in detail.statusHistory"
            :key="idx"
            :timestamp="item.createdAt"
            placement="top"
          >
            <div class="history-line">
              <StatusTag type="order" :status="item.fromStatus" />
              <span class="arrow">→</span>
              <StatusTag type="order" :status="item.toStatus" />
              <span class="operator">{{ item.operator }}</span>
            </div>
            <div v-if="item.remark" class="remark">{{ item.remark }}</div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无状态流转记录" :image-size="60" />
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
import { enumOptions } from '@/constants/tradeEnum'
import { getOrderList, getOrderDetail } from '@/api/trade'


defineOptions({ name: 'AuthOrders' })

// 订单状态枚举取自 constants/tradeEnum.js（PRD 9.3）
const orderStatusOptions = enumOptions('order')

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ pageNo: 1, pageSize: 10, status: '', orderNo: '', workTitle: '' })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref({})
const currentOrderId = ref(null)

async function loadList() {
  loading.value = true
  try {
    const res = await getOrderList(query.value)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
    ElMessage.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.value.pageNo = 1
  loadList()
}

function handleReset() {
  query.value = { pageNo: 1, pageSize: 10, status: '', orderNo: '', workTitle: '' }
  loadList()
}

async function handleDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = {}
  currentOrderId.value = row.orderId
  try {
    detail.value = await getOrderDetail(row.orderId)
  } catch {
    ElMessage.error('加载订单详情失败')
  } finally {
    detailLoading.value = false
  }
}

function handleExport() {
  ElMessage.info('导出订单')
}

onMounted(loadList)
</script>

<style scoped>
.price-text {
  color: #1f2329;
  font-weight: 600;
}

.history-title {
  margin: 18px 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.history-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow {
  color: #8a8f99;
}

.operator {
  color: #595959;
  font-size: 12px;
}

.remark {
  margin-top: 4px;
  color: #8a8f99;
  font-size: 12px;
}
</style>
