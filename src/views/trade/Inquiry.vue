<template>
  <PageContainer>
    <PageHeader title="询盘管理" description="买方对交易作品发起的询盘；该询盘的全部报价记录在行内「报价记录」查看，接受报价即直接生成授权订单（订单后续交 D 接手）">

    </PageHeader>

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" placeholder="全部状态" style="width: 140px" clearable>
          <el-option
            v-for="opt in inquiryStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.licenseType" placeholder="全部授权类型" style="width: 150px" clearable>
          <el-option
            v-for="opt in licenseOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.keyword"
          placeholder="作品名称/询盘编号"
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
      <el-table-column prop="inquiryNo" label="询盘编号" width="120" />
      <el-table-column prop="workTitle" label="作品" min-width="130" />
      <el-table-column prop="buyer" label="买方" width="120" />
      <el-table-column prop="seller" label="卖方" width="100" />
      <el-table-column prop="licenseTypeLabel" label="授权类型" width="110" />
      <el-table-column prop="intendedUse" label="意向用途" min-width="130" />
      <el-table-column label="预算" width="110">
        <template #default="{ row }">
          <span class="price-text">{{ row.budgetText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <StatusTag type="inquiry" :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="expireAt" label="询盘截止" width="150" />
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleDetail(row)">详情</el-button>
          <el-button size="small" @click="handleQuotes(row)">报价记录</el-button>
        </template>
      </el-table-column>
    </TableCard>

    <!-- 询盘详情：含询盘主体 + 留言；成交走报价管理（接受报价即建单），本页不再提供转订单 -->
    <el-dialog v-model="detailVisible" title="询盘详情" width="640px">
      <div v-loading="detailLoading">
        <el-alert
          v-if="detail.status === 'deal'"
          class="deal-tip"
          type="success"
          :closable="false"
          show-icon
          title="该询盘已达成，授权订单已生成，请到「授权订单」页查看后续进展"
        />
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="询盘编号">{{ detail.inquiryNo }}</el-descriptions-item>
          <el-descriptions-item label="询盘状态">
            <StatusTag type="inquiry" :status="detail.status" />
          </el-descriptions-item>
          <el-descriptions-item label="作品名称">{{ detail.workTitle }}</el-descriptions-item>
          <el-descriptions-item label="授权类型">{{ detail.licenseTypeLabel }}</el-descriptions-item>
          <el-descriptions-item label="买方">{{ detail.buyer }}</el-descriptions-item>
          <el-descriptions-item label="卖方">{{ detail.seller }}</el-descriptions-item>
          <el-descriptions-item label="意向用途">{{ detail.intendedUse }}</el-descriptions-item>
          <el-descriptions-item label="预算">
            <span class="price-text">{{ detail.budgetText }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="询盘截止">{{ detail.expireAt }}</el-descriptions-item>
          <el-descriptions-item label="发起时间">{{ detail.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="询盘留言" :span="2">{{ detail.message || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 报价记录：原「报价管理」页并入本页，按询盘过滤，报价记录只读 -->
    <el-dialog v-model="quotesVisible" :title="`报价记录 · ${quotesInquiry.inquiryNo || ''}`" width="960px">
      <div class="quotes-head">
        <span>{{ quotesInquiry.workTitle || '-' }}</span>
        <span class="quotes-count">共 {{ quotesTotal }} 条报价</span>
      </div>
      <el-table v-loading="quotesLoading" :data="quotes" size="small" border max-height="420">
        <el-table-column prop="quoteNo" label="报价编号" width="120" />
        <el-table-column label="报价方" width="100">
          <template #default="{ row }">
            <StatusTag type="quoterRole" :status="row.quoterRole" />
          </template>
        </el-table-column>
        <el-table-column prop="quoterName" label="报价人" width="110" />
        <el-table-column label="报价金额" width="110">
          <template #default="{ row }">
            <span class="price-text">{{ row.priceText }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="licenseTypeLabel" label="授权类型" width="110" />
        <el-table-column prop="validDays" label="有效天数" width="90" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <StatusTag type="quote" :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="expireAt" label="报价截止" width="150" />
        <el-table-column prop="description" label="报价说明" min-width="160" show-overflow-tooltip />
        <template #empty>
          <span class="quotes-empty">该询盘暂无报价记录</span>
        </template>
      </el-table>
      <template #footer>
        <el-button @click="quotesVisible = false">关闭</el-button>
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
import { getInquiryList, getInquiryDetail, getQuoteList } from '@/api/trade'

defineOptions({ name: 'Inquiry' })

// 询盘状态（2026-09-29 收敛）：待回复/议价中/已拒绝/已关闭/已达成，见 constants/tradeEnum.js INQUIRY_STATUS
const inquiryStatusOptions = enumOptions('inquiry')
const licenseOptions = enumOptions('license')

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ pageNo: 1, pageSize: 10, status: '', licenseType: '', keyword: '' })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref({})

const quotesVisible = ref(false)
const quotesLoading = ref(false)
const quotesInquiry = ref({})
const quotes = ref([])
const quotesTotal = ref(0)

async function loadList() {
  loading.value = true
  try {
    const res = await getInquiryList(query.value)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
    ElMessage.error('加载询盘列表失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.value.pageNo = 1
  loadList()
}

function handleReset() {
  query.value = { pageNo: 1, pageSize: 10, status: '', licenseType: '', keyword: '' }
  loadList()
}

async function handleDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = {}
  try {
    detail.value = await getInquiryDetail(row.inquiryId)
  } catch {
    ElMessage.error('加载询盘详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 报价按询盘取全量：单个询盘的报价条数是个位数级别，一次取回不分页
async function handleQuotes(row) {
  quotesVisible.value = true
  quotesLoading.value = true
  quotesInquiry.value = row
  quotes.value = []
  quotesTotal.value = 0
  try {
    const res = await getQuoteList({ inquiryId: row.inquiryId, pageNo: 1, pageSize: 100 })
    quotes.value = res.rows || []
    quotesTotal.value = res.total || 0
  } catch {
    ElMessage.error('加载报价记录失败')
  } finally {
    quotesLoading.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.price-text {
  color: #1f2329;
  font-weight: 600;
}
.deal-tip {
  margin-bottom: 12px;
}
.quotes-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #606266;
  font-size: 13px;
}
.quotes-count {
  color: #1f2329;
  font-weight: 600;
}
.quotes-empty {
  color: #909399;
  font-size: 13px;
}
</style>
