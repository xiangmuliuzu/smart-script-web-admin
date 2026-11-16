<template>
  <PageContainer>
    <PageHeader title="报价管理" description="甲方 PC 端：卖方报价为「待买方确认」，本端可议价/接受/拒绝，接受即直接生成授权订单；买方议价为「待卖方确认」，需卖方在客户端处理">

    </PageHeader>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" placeholder="全部报价状态" style="width: 150px" clearable>
          <el-option
            v-for="opt in quoteStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.quoterRole" placeholder="全部报价方" style="width: 140px" clearable>
          <el-option
            v-for="opt in quoterRoleOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.keyword"
          placeholder="报价编号/关联询盘/作品"
          style="width: 220px"
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
      <el-table-column prop="quoteNo" label="报价编号" width="120" />
      <el-table-column prop="inquiryNo" label="关联询盘" width="120" />
      <el-table-column prop="workTitle" label="作品" min-width="130" />
      <el-table-column label="报价方" width="110">
        <template #default="{ row }">
          <StatusTag type="quoterRole" :status="row.quoterRole" />
        </template>
      </el-table-column>
      <el-table-column prop="quoterName" label="报价人" width="110" />
      <el-table-column label="报价金额" width="120">
        <template #default="{ row }">
          <span class="price-text">{{ row.priceText }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="validDays" label="有效天数" width="90" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <StatusTag type="quote" :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="expireAt" label="报价截止" width="150" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <el-dialog v-model="detailVisible" title="报价详情" width="620px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="报价编号">{{ detail.quoteNo }}</el-descriptions-item>
        <el-descriptions-item label="报价状态">
          <StatusTag type="quote" :status="detail.status" />
        </el-descriptions-item>
        <el-descriptions-item label="关联询盘">{{ detail.inquiryNo }}</el-descriptions-item>
        <el-descriptions-item label="作品名称">{{ detail.workTitle }}</el-descriptions-item>
        <el-descriptions-item label="报价方">
          <StatusTag type="quoterRole" :status="detail.quoterRole" />
        </el-descriptions-item>
        <el-descriptions-item label="报价人">{{ detail.quoterName }}</el-descriptions-item>
        <el-descriptions-item label="报价金额">
          <span class="price-text">{{ detail.priceText }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="授权类型">{{ detail.licenseTypeLabel }}</el-descriptions-item>
        <el-descriptions-item label="有效天数">{{ detail.validDays }} 天</el-descriptions-item>
        <el-descriptions-item label="报价截止">{{ detail.expireAt }}</el-descriptions-item>
        <el-descriptions-item label="报价时间" :span="2">{{ detail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="报价说明" :span="2">{{ detail.description || '-' }}</el-descriptions-item>
      </el-descriptions>
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
import { getQuoteList } from '@/api/trade'

defineOptions({ name: 'Quote' })

// 报价状态已定稿（见 constants/tradeEnum.js QUOTE_STATUS）：
// pending=待买方确认（卖方报价）、pending_seller=待卖方确认（买方议价）
const quoteStatusOptions = enumOptions('quote')
const quoterRoleOptions = enumOptions('quoterRole')

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ pageNo: 1, pageSize: 10, status: '', quoterRole: '', keyword: '' })

const detailVisible = ref(false)
const detail = ref({})

async function loadList() {
  loading.value = true
  try {
    const res = await getQuoteList(query.value)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
    ElMessage.error('加载报价记录失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.value.pageNo = 1
  loadList()
}

function handleReset() {
  query.value = { pageNo: 1, pageSize: 10, status: '', quoterRole: '', keyword: '' }
  loadList()
}

function handleDetail(row) {
  detail.value = { ...row }
  detailVisible.value = true
}

onMounted(loadList)
</script>

<style scoped>
.price-text {
  color: #1f2329;
  font-weight: 600;
}
</style>
