<template>
  <PageContainer>
    <PageHeader title="任务运营详情" description="任务全貌、逐轮验收、资金流水与延时记录（均为只读，资金入账走支付宝沙箱、出账为平台记账）">
      <template #actions>
        <el-button @click="goBack">返回任务列表</el-button>
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="section-card">
      <template #header>任务概览</template>
      <div v-loading="loading">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="任务编号">{{ detail.demandNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="任务标题">{{ detail.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <el-tag v-if="detail.isOverdue" type="danger" size="small" style="margin-right:4px">逾期</el-tag>
            <StatusTag type="demand" :status="detail.status" />
          </el-descriptions-item>
          <el-descriptions-item label="任务类型">
            <el-tag :type="taskTypeTagType(detail.taskType)" size="small">{{ detail.taskTypeLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="交付要求" :span="2">{{ taskTypeHint(detail.taskType) }}</el-descriptions-item>
          <el-descriptions-item label="发布方">{{ detail.clientName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="接单人">
            <span v-if="detail.acceptedCreatorName || detail.acceptedCreatorId">{{ detail.acceptedCreatorName || ('#' + detail.acceptedCreatorId) }}</span>
            <span v-else class="text-muted">未接单</span>
          </el-descriptions-item>
          <el-descriptions-item label="接单时间">{{ detail.acceptedAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预算">{{ money(detail.budget) }}</el-descriptions-item>
          <el-descriptions-item label="托管状态">
            <el-tag :type="escrowTagType(detail.escrowStatus)" size="small">{{ enumLabel('demandEscrow', detail.escrowStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="押金状态">
            <el-tag :type="depositTagType(detail.depositStatus)" size="small">{{ enumLabel('demandDeposit', detail.depositStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总集数">{{ detail.totalEpisodes ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成时限">{{ detail.durationHours ? detail.durationHours + ' 小时' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前截止">{{ detail.dueAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="源剧本" :span="3">
            <span v-if="detail.sourceWorkTitle">《{{ detail.sourceWorkTitle }}》</span>
            <a v-if="detail.sourceScriptUrl" :href="resolveMediaUrl(detail.sourceScriptUrl)" target="_blank" rel="noopener">{{ detail.sourceScriptName || '剧本文件' }}</a>
            <span v-if="!detail.sourceWorkTitle && !detail.sourceScriptUrl" class="text-muted">-</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.failReason" label="失败原因" :span="3">
            <span class="danger-text">{{ detail.failReason }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header>逐轮验收（{{ stages.length }} 轮）</template>
      <el-alert
        v-if="stalledRounds.length"
        type="warning"
        :closable="false"
        show-icon
        class="round-alert"
        :title="`第 ${stalledRounds.join('、')} 轮已交付但计时已暂停，等待发布者验收；发布者不处理不会自动通过，也不会判失败`"
      />
      <el-table :data="stages" v-loading="loading" size="small" border>
        <el-table-column label="轮次" width="70">
          <template #default="{ row }">第 {{ row.stageOrder }} 轮</template>
        </el-table-column>
        <el-table-column label="验收集数" width="90">
          <template #default="{ row }">至第 {{ row.episodeTo }} 集</template>
        </el-table-column>
        <el-table-column label="本轮放款" width="110">
          <template #default="{ row }">{{ money(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.overdue" type="danger" size="small" style="margin-right:4px">逾期</el-tag>
            <el-tag :type="stageTagType(row.status)" size="small">{{ enumLabel('demandStage', row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="计时" width="180">
          <template #default="{ row }">
            <div>起：{{ row.startedAt || '-' }}</div>
            <div>止：{{ row.dueAt || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="交付物" min-width="180">
          <template #default="{ row }">
            <span v-if="row.workTitle">《{{ row.workTitle }}》</span>
            <a v-if="row.deliverableUrl" :href="resolveMediaUrl(row.deliverableUrl)" target="_blank" rel="noopener" style="margin-left:6px">附件</a>
            <span v-if="!row.workTitle && !row.deliverableUrl" class="text-muted">未交付</span>
            <div v-if="row.deliverableDesc" class="sub-text">{{ row.deliverableDesc }}</div>
          </template>
        </el-table-column>
        <el-table-column label="AI 审核" min-width="160">
          <template #default="{ row }">
            <span v-if="row.aiScore == null" class="text-muted">未走 AI 审核</span>
            <template v-else>
              <div>{{ row.aiScore }} 分 · {{ row.aiReviewedAt || '-' }}</div>
              <div v-if="row.aiResult" class="sub-text">{{ row.aiResult }}</div>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="验收结论" min-width="160">
          <template #default="{ row }">
            <div>{{ row.reviewedAt || '-' }}</div>
            <div v-if="row.rejectReason" class="danger-text sub-text">驳回：{{ row.rejectReason }}</div>
          </template>
        </el-table-column>
        <el-table-column label="放款" width="90">
          <template #default="{ row }">
            <el-tag :type="row.releaseFlag === 1 ? 'success' : 'info'" size="small">{{ row.releaseFlag === 1 ? '已放款' : '未放款' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="延时" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.extendStatus" :type="extendTagType(row.extendStatus)" size="small">{{ enumLabel('demandExtendStatus', row.extendStatus) }}</el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header>资金流水</template>
      <div class="sub-title">沙箱实收（托管 / 押金，按任务唯一，换号后只保留当前码）</div>
      <el-table :data="sandboxPayments" v-loading="loading" size="small" border empty-text="尚未发起沙箱收款">
        <el-table-column label="款项" width="120">
          <template #default="{ row }">
            <el-tag :type="purposeTagType(row.purpose)" size="small">{{ enumLabel('demandSandboxPurpose', row.purpose) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">{{ money(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="付款人" width="110">
          <template #default="{ row }">#{{ row.payerId }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="sandboxTagType(row.status)" size="small">{{ enumLabel('demandSandboxStatus', row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="outTradeNo" label="商户单号" min-width="240" />
        <el-table-column prop="tradeNo" label="支付宝交易号" min-width="180">
          <template #default="{ row }">{{ row.tradeNo || '-' }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="最近更新" width="160" />
      </el-table>

      <div class="sub-title">逐轮放款结算（出账为记账，确认入账由创作者完成）</div>
      <el-table :data="stageSettles" v-loading="loading" size="small" border empty-text="尚无放款结算单">
        <el-table-column label="轮次" width="80">
          <template #default="{ row }">第 {{ row.stageOrder }} 轮</template>
        </el-table-column>
        <el-table-column prop="settleNo" label="结算单号" min-width="180" />
        <el-table-column label="收款创作者" width="120">
          <template #default="{ row }">#{{ row.userId }}</template>
        </el-table-column>
        <el-table-column label="本轮金额" width="120">
          <template #default="{ row }">{{ money(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="平台服务费" width="120">
          <template #default="{ row }">{{ money(row.platformFee) }}</template>
        </el-table-column>
        <el-table-column label="创作者到账" width="120">
          <template #default="{ row }">{{ money(row.sellerAmount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="settleTagType(row.status)" size="small">{{ enumLabel('settleStatus', row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="confirmTime" label="确认时间" width="160">
          <template #default="{ row }">{{ row.confirmTime || '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header>延时记录（{{ extendApplies.length }} 条）</template>
      <el-table :data="extendApplies" v-loading="loading" size="small" border empty-text="无延时记录">
        <el-table-column label="轮次" width="80">
          <template #default="{ row }">第 {{ row.stageOrder }} 轮</template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">
            <el-tag :type="applyTypeTagType(row.applyType)" size="small">{{ enumLabel('demandExtendApplyType', row.applyType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="110">
          <template #default="{ row }">{{ extendLength(row) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="200">
          <template #default="{ row }">{{ row.reason || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="extendTagType(row.status)" size="small">{{ enumLabel('demandExtendStatus', row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="100">
          <template #default="{ row }">#{{ row.creatorId }}</template>
        </el-table-column>
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">{{ row.decidedBy ? '#' + row.decidedBy : '-' }}</template>
        </el-table-column>
        <el-table-column prop="appliedAt" label="申请时间" width="160" />
        <el-table-column prop="dueAfter" label="新截止" width="160">
          <template #default="{ row }">{{ row.dueAfter || '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enumLabel, enumTagType, DEMAND_TASK_TYPE_HINT, normalizeDemandTaskType } from '@/constants/tradeEnum'
import { resolveMediaUrl } from '@/utils/request'
import {
  getDemandDetail, getDemandStages, getDemandPayments, getDemandExtendApplies
} from '@/api/trade'

defineOptions({ name: 'DemandDetail' })

const route = useRoute()
const router = useRouter()
const demandId = route.query.demandId

const loading = ref(false)
const detail = ref({})
const stages = ref([])
const sandboxPayments = ref([])
const stageSettles = ref([])
const extendApplies = ref([])

const escrowTagType = (v) => enumTagType('demandEscrow', v)
const depositTagType = (v) => enumTagType('demandDeposit', v)
const stageTagType = (v) => enumTagType('demandStage', v)
const extendTagType = (v) => enumTagType('demandExtendStatus', v)
const applyTypeTagType = (v) => enumTagType('demandExtendApplyType', v)
const purposeTagType = (v) => enumTagType('demandSandboxPurpose', v)
const sandboxTagType = (v) => enumTagType('demandSandboxStatus', v)
const settleTagType = (v) => enumTagType('settleStatus', v)
const taskTypeTagType = (v) => enumTagType('demandTaskType', normalizeDemandTaskType(v))
const taskTypeHint = (v) => DEMAND_TASK_TYPE_HINT[normalizeDemandTaskType(v)]

// 管理端只读端点回传库内原值（元），与 App 出参的分口径不同，这里统一按元渲染
function money(val) {
  const n = Number(val)
  if (val == null || val === '' || Number.isNaN(n)) return '-'
  return '¥' + n.toFixed(2)
}

function extendLength(row) {
  const parts = []
  if (row.days) parts.push(`${row.days} 天`)
  if (row.hours) parts.push(`${row.hours} 小时`)
  return parts.length ? parts.join(' ') : '-'
}

/** 已交付但仍在等发布者验收的轮次：这些轮计时暂停，是任务卡死的高发位置 */
const stalledRounds = computed(() =>
  stages.value
    .filter((s) => s.status === 'submitted' || s.status === 'ai_reviewing')
    .map((s) => s.stageOrder)
)

async function loadAll() {
  if (!demandId) {
    ElMessage.error('缺少任务编号')
    return
  }
  loading.value = true
  try {
    const [detailRes, stageRes, paymentRes, extendRes] = await Promise.all([
      getDemandDetail(demandId),
      getDemandStages(demandId),
      getDemandPayments(demandId),
      getDemandExtendApplies(demandId)
    ])
    detail.value = detailRes.data || {}
    stages.value = stageRes.data || []
    sandboxPayments.value = paymentRes.data?.sandboxPayments || []
    stageSettles.value = paymentRes.data?.stageSettles || []
    extendApplies.value = extendRes.data || []
  } catch {
    ElMessage.error('加载任务运营详情失败')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ path: '/trade/demand' })
}

onMounted(loadAll)
</script>

<style scoped>
.section-card {
  margin-bottom: 16px;
}

.sub-title {
  margin: 12px 0 8px;
  font-size: 13px;
  color: #606266;
}

.sub-text {
  font-size: 12px;
  color: #909399;
}

.danger-text {
  color: #f56c6c;
}

.round-alert {
  margin-bottom: 12px;
}
</style>
