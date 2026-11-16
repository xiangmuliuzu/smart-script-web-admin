<template>
  <PageContainer>
    <PageHeader title="任务运营详情" description="任务全貌、逐轮验收、交付正文核对与延时处理（发布权已收归平台，验收/延时审批/自主延时在本页操作）">
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
          <el-descriptions-item label="需求方电话">{{ detail.contactInfo || '-' }}</el-descriptions-item>
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
        :title="`第 ${stalledRounds.join('、')} 轮已交付且计时已暂停，等待平台验收；不处理不会自动通过，也不会判失败`"
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasDeliverable(row)"
              size="small"
              link
              type="primary"
              @click="openDeliverable(row)"
            >查看交付</el-button>
            <template v-if="row.status === 'submitted' && canReview">
              <el-button size="small" link type="success" @click="openReview(row, true)">通过验收</el-button>
              <el-button size="small" link type="danger" @click="openReview(row, false)">驳回重交</el-button>
            </template>
            <template v-if="row.extendStatus === 'pending' && canEdit">
              <el-button size="small" link type="success" @click="handleDecideExtend(row, true)">同意延时</el-button>
              <el-button size="small" link type="danger" @click="handleDecideExtend(row, false)">驳回延时</el-button>
            </template>
            <el-button
              v-if="canSelfExtend(row)"
              size="small"
              link
              type="warning"
              @click="openSelfExtend(row)"
            >自主延时</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header>资金流水</template>
      <div class="sub-title">历史沙箱流水（仅存量任务留档；新单款项在站外与平台结算，不再产生托管/押金收款）</div>
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

    <!-- 交付正文核对：只下发本轮 episodeTo 内的章节，其后章节 readable=false -->
    <el-dialog v-model="deliverableVisible" title="本轮交付内容" width="860px" top="6vh">
      <div v-loading="deliverableLoading">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="轮次">第 {{ deliverable.stageOrder }} 轮</el-descriptions-item>
          <el-descriptions-item label="验收集数">至第 {{ deliverable.episodeTo }} 集</el-descriptions-item>
          <el-descriptions-item label="交付时间">{{ deliverable.submittedAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="交付作品" :span="2">
            <span v-if="deliverable.title">《{{ deliverable.title }}》</span>
            <span v-else class="text-muted">本轮未关联作品（分镜任务允许纯文件/说明交付）</span>
          </el-descriptions-item>
          <el-descriptions-item label="作品总集数">{{ deliverable.episodeCount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="交付附件" :span="3">
            <a
              v-if="deliverable.deliverableUrl"
              :href="resolveMediaUrl(deliverable.deliverableUrl)"
              target="_blank"
              rel="noopener"
            >{{ deliverable.deliverableUrl }}</a>
            <span v-else class="text-muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="交付说明" :span="3">{{ deliverable.deliverableDesc || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="deliverable.episodeCount > deliverable.episodeTo"
          type="info"
          :closable="false"
          show-icon
          class="deliverable-alert"
          :title="`作品共 ${deliverable.episodeCount} 集，本轮只验收前 ${deliverable.episodeTo} 集；其后章节后端不下发正文`"
        />

        <div v-for="c in deliverable.chapters || []" :key="c.chapterId" class="chapter">
          <div class="chapter-head">
            <span class="chapter-title">第 {{ c.chapterNo }} 章 {{ c.chapterTitle }}</span>
            <span class="text-muted">{{ c.wordCount ?? 0 }} 字</span>
          </div>
          <pre v-if="c.readable" class="chapter-body">{{ c.content }}</pre>
          <div v-else class="text-muted chapter-body">超出本轮验收集范围，不下发正文</div>
        </div>
        <div v-if="!deliverable.chapters || !deliverable.chapters.length" class="text-muted">
          本轮没有可核对的剧本正文，请依据上方交付说明与附件验收。
        </div>
      </div>
      <template #footer>
        <el-button @click="deliverableVisible = false">关闭</el-button>
        <template v-if="deliverable.stageStatus === 'submitted' && canReview">
          <el-button type="danger" plain @click="deliverableVisible = false; openReview(deliverableRow, false)">驳回重交</el-button>
          <el-button type="primary" @click="deliverableVisible = false; openReview(deliverableRow, true)">通过验收</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 逐轮验收：通过即本轮放款并激活下一轮；驳回恢复计时等待重交 -->
    <el-dialog v-model="reviewVisible" :title="reviewApproved ? '通过本轮验收' : '驳回本轮交付'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="轮次">第 {{ reviewRow?.stageOrder }} 轮（至第 {{ reviewRow?.episodeTo }} 集）</el-form-item>
        <el-form-item label="本轮金额">{{ money(reviewRow?.amount) }}</el-form-item>
        <el-form-item v-if="!reviewApproved" label="驳回原因">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="写清要改什么，创作者据此重交"
          />
        </el-form-item>
      </el-form>
      <div class="text-muted">
        {{ reviewApproved
          ? '通过后本轮款项生成结算单（创作者确认后入可提现），并激活下一轮计时；无下一轮则整单完成。'
          : '驳回后本轮恢复计时并顺延审核耗时，等待创作者修改重交。' }}
      </div>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewApproved ? 'primary' : 'danger'" :loading="acting" @click="submitReview">
          {{ reviewApproved ? '确认通过' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 自主延时：不经申请直接顺延本轮截止 -->
    <el-dialog v-model="extendVisible" title="自主延长本轮时限" width="460px">
      <el-form label-width="90px">
        <el-form-item label="轮次">第 {{ extendRow?.stageOrder }} 轮</el-form-item>
        <el-form-item label="当前截止">{{ extendRow?.dueAt || '-' }}</el-form-item>
        <el-form-item label="延长小时">
          <el-input-number v-model="extendHours" :min="1" :max="8760" controls-position="right" />
        </el-form-item>
      </el-form>
      <div class="text-muted">延长后同时落一条「自主延时」记录，无需创作者确认。</div>
      <template #footer>
        <el-button @click="extendVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="submitSelfExtend">确定</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enumLabel, enumTagType, DEMAND_TASK_TYPE_HINT, normalizeDemandTaskType } from '@/constants/tradeEnum'
import { resolveMediaUrl } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import {
  getDemandDetail, getDemandStages, getDemandPayments, getDemandExtendApplies,
  reviewDemandStage, getStageDeliverableWork, decideStageExtend, selfExtendStage
} from '@/api/trade'

defineOptions({ name: 'DemandDetail' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const demandId = route.query.demandId

const canReview = computed(() => userStore.hasPermission('trade:demand:review'))
const canEdit = computed(() => userStore.hasPermission('trade:demand:edit'))

const loading = ref(false)
const acting = ref(false)
const detail = ref({})
const stages = ref([])
const sandboxPayments = ref([])
const stageSettles = ref([])
const extendApplies = ref([])

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

/** 已交付但仍在等平台验收的轮次：这些轮计时暂停，是任务卡死的高发位置 */
const stalledRounds = computed(() =>
  stages.value
    .filter((s) => s.status === 'submitted' || s.status === 'ai_reviewing')
    .map((s) => s.stageOrder)
)

/* ==================== 交付核对 / 验收 / 延时 ==================== */

const deliverableVisible = ref(false)
const deliverableLoading = ref(false)
const deliverable = ref({})
const deliverableRow = ref(null)

const reviewVisible = ref(false)
const reviewApproved = ref(true)
const rejectReason = ref('')
const reviewRow = ref(null)

const extendVisible = ref(false)
const extendHours = ref(24)
const extendRow = ref(null)

function hasDeliverable(row) {
  return !!(row.workId || row.deliverableUrl || row.deliverableDesc)
}

/** 自主延时只对「已激活计时且无待处理申请」的进行中轮次开放 */
function canSelfExtend(row) {
  return canEdit.value
    && detail.value.status === 'in_progress'
    && row.status === 'pending'
    && !!row.startedAt
    && !row.extendStatus
}

async function openDeliverable(row) {
  deliverableRow.value = row
  deliverable.value = { stageOrder: row.stageOrder, episodeTo: row.episodeTo, chapters: [] }
  deliverableVisible.value = true
  deliverableLoading.value = true
  try {
    const res = await getStageDeliverableWork(demandId, row.stageId)
    deliverable.value = res?.data ?? res ?? {}
  } catch {
    // 无作品交付（分镜纯文件轮）后端会抛业务错，拦截器已提示，此处保留上方轮次信息
    deliverable.value.chapters = []
  } finally {
    deliverableLoading.value = false
  }
}

function openReview(row, approved) {
  reviewRow.value = row
  reviewApproved.value = approved
  rejectReason.value = ''
  reviewVisible.value = true
}

async function submitReview() {
  if (!reviewApproved.value && !rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  acting.value = true
  try {
    await reviewDemandStage(demandId, reviewRow.value.stageId, {
      approved: reviewApproved.value,
      rejectReason: reviewApproved.value ? null : rejectReason.value.trim()
    })
    ElMessage.success(reviewApproved.value ? '本轮已通过验收并放款' : '已驳回，本轮恢复计时等待重交')
    reviewVisible.value = false
    loadAll()
  } catch {
    // 错误已由 request 拦截器统一提示（含「本轮已被处理」并发冲突）
  } finally {
    acting.value = false
  }
}

async function handleDecideExtend(row, approved) {
  try {
    await ElMessageBox.confirm(
      approved
        ? `同意第 ${row.stageOrder} 轮延时申请后，本轮截止时间按申请时长顺延，创作者会收到通知。`
        : `驳回后本轮保持原截止时间，创作者会收到通知；如已逾期将按超时终止。`,
      approved ? '同意延时' : '驳回延时',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await decideStageExtend(demandId, row.stageId, approved)
    ElMessage.success(approved ? '已同意延时' : '已驳回延时申请')
    loadAll()
  } catch {
    // 错误已由 request 拦截器统一提示
  }
}

function openSelfExtend(row) {
  extendRow.value = row
  extendHours.value = 24
  extendVisible.value = true
}

async function submitSelfExtend() {
  if (!extendHours.value || extendHours.value <= 0) {
    ElMessage.warning('请填写延长小时数')
    return
  }
  acting.value = true
  try {
    await selfExtendStage(demandId, extendRow.value.stageId, extendHours.value)
    ElMessage.success('已延长本轮交付时限')
    extendVisible.value = false
    loadAll()
  } catch {
    // 错误已由 request 拦截器统一提示
  } finally {
    acting.value = false
  }
}

/* ==================== 数据加载 ==================== */

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
    // adminV1Request 已按若依契约解包：实体直接是对象、列表直接是数组
    detail.value = detailRes?.data ?? detailRes ?? {}
    stages.value = (stageRes?.data ?? stageRes ?? []).slice().sort((a, b) => a.stageOrder - b.stageOrder)
    const payments = paymentRes?.data ?? paymentRes ?? {}
    sandboxPayments.value = payments.sandboxPayments || []
    stageSettles.value = payments.stageSettles || []
    extendApplies.value = extendRes?.data ?? extendRes ?? []
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

.deliverable-alert {
  margin: 12px 0;
}

.chapter {
  margin-top: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px 12px;
}

.chapter-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.chapter-title {
  font-weight: 600;
  color: #1f2329;
}

.chapter-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}
</style>
