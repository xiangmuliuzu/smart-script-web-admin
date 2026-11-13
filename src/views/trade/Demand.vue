<template>
  <PageContainer>
    <PageHeader
      title="任务管理"
      description="平台代需求方发布的剧本/分镜接单任务（对应 sys_demand，接单制·先到先得）。发布、编辑、关闭与逐轮验收均在本页/运营详情页完成，用户端只能查看与接单"
    >
      <template #actions>
        <BlackButton v-hasPermi="['trade:demand:add']" @click="openCreate">发布任务</BlackButton>
      </template>
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
        <el-select v-model="query.taskType" placeholder="全部任务类型" style="width: 170px" clearable>
          <el-option
            v-for="opt in demandTaskTypeOptions"
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
      <el-table-column label="任务类型" width="130">
        <template #default="{ row }">
          <el-tag :type="taskTypeTagType(row.taskType)" size="small">{{ row.taskTypeLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="client" label="需求方" width="120" />
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
      <el-table-column label="总集数" width="80">
        <template #default="{ row }">{{ row.totalEpisodes ?? '-' }}</template>
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
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleViewDetail(row)">查看详情</el-button>
          <el-button size="small" @click="handleOpenOperation(row)">运营详情</el-button>
          <el-button
            v-if="isEditable(row)"
            v-hasPermi="['trade:demand:edit']"
            size="small"
            @click="openEdit(row)"
          >编辑</el-button>
          <el-button
            v-if="isEditable(row)"
            v-hasPermi="['trade:demand:edit']"
            size="small"
            type="danger"
            plain
            @click="handleClose(row)"
          >关闭</el-button>
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
          <el-descriptions-item label="需求方">{{ detail.client }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">
            <el-tag :type="taskTypeTagType(detail.taskType)" size="small">{{ detail.taskTypeLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="交付要求">{{ taskTypeHint(detail.taskType) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.taskType === 'storyboard'" label="源剧本" :span="2">
            <span v-if="detail.sourceWorkTitle">《{{ detail.sourceWorkTitle }}》</span>
            <a v-if="detail.sourceScriptUrl" :href="resolveMediaUrl(detail.sourceScriptUrl)" target="_blank" rel="noopener" style="margin-left:6px">{{ detail.sourceScriptName || '剧本文件' }}</a>
            <span v-if="!detail.sourceWorkTitle && !detail.sourceScriptUrl" class="text-muted">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="t in (detail.tags || detail.genre || '').split(',').filter(Boolean)" :key="t" size="small" style="margin-right:4px">{{ t }}</el-tag>
            <span v-if="!(detail.tags || detail.genre)">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="预算">
            <span class="price-text">{{ detail.budgetText }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="总集数">{{ detail.totalEpisodes ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ detail.deadline }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ detail.contactInfo }}</el-descriptions-item>
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

    <!-- 发布 / 编辑任务：代需求方发布，款项在站外与平台结算，表单不涉及收款 -->
    <el-dialog
      v-model="publishVisible"
      :title="publishMode === 'create' ? '发布任务' : '编辑任务'"
      width="920px"
      top="6vh"
      @closed="formRef?.clearValidate()"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="任务标题" prop="title">
              <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="需求方要什么，一句话说清" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务类型" prop="taskType">
              <el-select v-model="form.taskType" style="width: 100%">
                <el-option
                  v-for="opt in demandTaskTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="题材">
              <el-select v-model="form.genreId" style="width: 100%" clearable placeholder="可留空">
                <el-option v-for="g in genreOptions" :key="g.value" :label="g.label" :value="g.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="交付口径">
              <span class="form-tip">{{ taskTypeHint(form.taskType) }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预算（元）" prop="budget">
              <el-input-number v-model="form.budget" :min="0.01" :precision="2" :step="100" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总集数" prop="totalEpisodes">
              <el-input-number v-model="form.totalEpisodes" :min="1" :precision="0" controls-position="right" style="width: 100%" @change="clampRounds" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="征集截止">
              <el-date-picker
                v-model="form.deadline"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="留空为不限"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系方式">
              <el-input v-model="form.contactInfo" placeholder="需求方电话/微信（填电话须符合格式）" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="标签">
              <el-input v-model="form.tags" placeholder="多个标签用英文逗号分隔，如：都市,短剧,竖屏" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="任务要求" prop="requirement">
              <el-input v-model="form.requirement" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="风格、篇幅、交付格式、参考样例等" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 源剧本：仅「提供剧本做分镜」需要，选作品与上传文件二选一 -->
        <template v-if="form.taskType === 'storyboard'">
          <el-divider content-position="left">源剧本（必填其一）</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="取创作者作品">
                <div class="inline-actions">
                  <el-input v-model="sourceAuthorId" placeholder="创作者用户编号" style="width: 150px" />
                  <el-button :loading="sourceWorksLoading" @click="loadSourceWorks">查询作品</el-button>
                </div>
                <el-select
                  v-model="form.sourceWorkId"
                  placeholder="选择一部作品作为源剧本"
                  style="width: 100%; margin-top: 8px"
                  clearable
                  :disabled="!sourceWorks.length"
                >
                  <el-option
                    v-for="w in sourceWorks"
                    :key="w.workId"
                    :label="`#${w.workId} ${w.title}`"
                    :value="w.workId"
                  />
                </el-select>
                <span class="form-tip">源剧本仅作参考，按需求方授权代选，不要求作品已上架</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="上传剧本文件">
                <el-upload :show-file-list="false" :http-request="handleUploadScript">
                  <el-button :loading="uploading">选择 txt/doc/docx/pdf</el-button>
                </el-upload>
                <div v-if="form.sourceScriptUrl" class="form-tip">
                  已上传：
                  <a :href="resolveMediaUrl(form.sourceScriptUrl)" target="_blank" rel="noopener">{{ form.sourceScriptName || '剧本文件' }}</a>
                  <el-button link type="danger" size="small" @click="clearUploadedScript">移除</el-button>
                </div>
                <span v-else class="form-tip">建议上传剧本文件，创作者接单后可在任务详情查看</span>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 验收轮次：末轮固定验收全部集数，金额=预算-其余轮之和 -->
        <el-divider content-position="left">验收轮次</el-divider>
        <el-table :data="rounds" size="small" border>
          <el-table-column label="轮次" width="80">
            <template #default="{ $index }">第 {{ $index + 1 }} 轮</template>
          </el-table-column>
          <el-table-column label="验收集数（至第 N 集）" min-width="170">
            <template #default="{ row, $index }">
              <el-input-number
                v-if="$index < rounds.length - 1"
                v-model="row.episodeTo"
                :min="1"
                :max="Math.max(1, (form.totalEpisodes || 1) - 1)"
                :precision="0"
                size="small"
                controls-position="right"
                style="width: 140px"
              />
              <span v-else>{{ form.totalEpisodes || '-' }} 集（全部）</span>
            </template>
          </el-table-column>
          <el-table-column label="本轮金额（元）" min-width="170">
            <template #default="{ row, $index }">
              <el-input-number
                v-if="$index < rounds.length - 1"
                v-model="row.amount"
                :min="0.01"
                :precision="2"
                :step="100"
                size="small"
                controls-position="right"
                style="width: 150px"
              />
              <span v-else class="price-text">{{ finalAmountText }}</span>
            </template>
          </el-table-column>
          <el-table-column label="时限（天）" width="130">
            <template #default="{ row }">
              <el-input-number v-model="row.durationDays" :min="0" :max="365" :precision="0" size="small" controls-position="right" style="width: 100px" />
            </template>
          </el-table-column>
          <el-table-column label="时限（小时）" width="130">
            <template #default="{ row }">
              <el-input-number v-model="row.durationHours" :min="0" :max="720" :precision="0" size="small" controls-position="right" style="width: 100px" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ $index }">
              <el-button
                v-if="$index < rounds.length - 1"
                link
                type="danger"
                size="small"
                @click="rounds.splice($index, 1)"
              >删除</el-button>
              <span v-else class="text-muted">末轮</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="rounds-toolbar">
          <el-button size="small" @click="addRound">添加中间轮次</el-button>
          <span class="form-tip">
            创作者逐轮交付、平台逐轮验收放款；最后一轮固定验收全部集数，金额自动为预算减去其余轮次之和
            （当前 {{ finalAmountText }}），不可单独改动。
          </span>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ publishMode === 'create' ? '确认发布' : '保存修改' }}
        </el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import BlackButton from '@/components/BlackButton.vue'
import {
  enumOptions, enumTagType, DEMAND_TASK_TYPE_HINT, DEMAND_GENRE_OPTIONS, normalizeDemandTaskType
} from '@/constants/tradeEnum'
import { resolveMediaUrl } from '@/utils/request'
import {
  getDemandList, getDemandStages, createDemand, updateDemand, closeDemand,
  getDemandSourceWorks, uploadDemandScript
} from '@/api/trade'

defineOptions({ name: 'Demand' })

const router = useRouter()

// 任务状态枚举（接单制，见 constants/tradeEnum.js DEMAND_STATUS）
const demandStatusOptions = enumOptions('demand')
// 任务类型枚举（sys_demand.task_type）
const demandTaskTypeOptions = enumOptions('demandTaskType')
const genreOptions = DEMAND_GENRE_OPTIONS

const taskTypeTagType = (v) => enumTagType('demandTaskType', normalizeDemandTaskType(v))
const taskTypeHint = (v) => DEMAND_TASK_TYPE_HINT[normalizeDemandTaskType(v)]

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ pageNo: 1, pageSize: 10, status: '', taskType: '', keyword: '' })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref({})

/* ==================== 发布 / 编辑 ==================== */

const DEFAULT_ROUND_DAYS = 7

function emptyRound() {
  return { episodeTo: null, amount: null, durationDays: DEFAULT_ROUND_DAYS, durationHours: 0 }
}

/** 后端轮次实体 → 表单行 */
function toRound(stage) {
  return {
    episodeTo: stage?.episodeTo ?? null,
    amount: stage?.amount != null ? Number(stage.amount) : null,
    durationDays: stage?.durationDays ?? DEFAULT_ROUND_DAYS,
    durationHours: stage?.durationHours ?? 0
  }
}

const publishVisible = ref(false)
const publishMode = ref('create')
const editingId = ref(null)
const submitting = ref(false)
const formRef = ref()
const rounds = ref([emptyRound()])

const form = reactive({
  title: '',
  taskType: 'script',
  genreId: null,
  tags: '',
  budget: null,
  totalEpisodes: null,
  deadline: '',
  contactInfo: '',
  requirement: '',
  sourceWorkId: null,
  sourceScriptUrl: '',
  sourceScriptName: ''
})

const rules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  taskType: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  budget: [{ required: true, message: '请输入预算', trigger: 'blur' }],
  totalEpisodes: [{ required: true, message: '请输入总集数', trigger: 'blur' }],
  requirement: [{ required: true, message: '请填写任务要求，创作者据此判断能否接单', trigger: 'blur' }]
}

const sourceAuthorId = ref('')
const sourceWorks = ref([])
const sourceWorksLoading = ref(false)
const uploading = ref(false)

const sumMiddle = computed(() =>
  rounds.value.slice(0, -1).reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
)
/** 末轮金额=预算余额：后端强制各轮金额之和等于预算，故此处只读展示 */
const finalAmount = computed(() => Number(((Number(form.budget) || 0) - sumMiddle.value).toFixed(2)))
const finalAmountText = computed(() => '¥' + finalAmount.value.toFixed(2))

function resetForm() {
  Object.assign(form, {
    title: '',
    taskType: 'script',
    genreId: null,
    tags: '',
    budget: null,
    totalEpisodes: null,
    deadline: '',
    contactInfo: '',
    requirement: '',
    sourceWorkId: null,
    sourceScriptUrl: '',
    sourceScriptName: ''
  })
  rounds.value = [emptyRound()]
  sourceWorks.value = []
  sourceAuthorId.value = ''
}

function openCreate() {
  resetForm()
  publishMode.value = 'create'
  editingId.value = null
  publishVisible.value = true
}

async function openEdit(row) {
  resetForm()
  publishMode.value = 'edit'
  editingId.value = row.demandId
  Object.assign(form, {
    title: row.title || '',
    taskType: normalizeDemandTaskType(row.taskType),
    genreId: row.genreId ?? null,
    tags: row.tags || '',
    budget: row.budget != null ? Number(row.budget) : null,
    totalEpisodes: row.totalEpisodes ?? null,
    deadline: row.deadline || '',
    contactInfo: row.contactInfo || '',
    requirement: row.requirement || '',
    sourceWorkId: row.sourceWorkId ?? null,
    sourceScriptUrl: row.sourceScriptUrl || '',
    sourceScriptName: row.sourceScriptName || ''
  })
  publishVisible.value = true
  try {
    const res = await getDemandStages(row.demandId)
    const stages = (res?.data ?? res ?? []).slice().sort((a, b) => a.stageOrder - b.stageOrder)
    // 中间轮逐条回填；末轮只回填时限，集数与金额恒由总集数/预算余额推出
    rounds.value = stages.length
      ? [
          ...stages.slice(0, -1).map(toRound),
          { ...toRound(stages[stages.length - 1]), episodeTo: null, amount: null }
        ]
      : [emptyRound()]
  } catch {
    rounds.value = [emptyRound()]
  }
}

function addRound() {
  const maxEpisode = Math.max(1, (Number(form.totalEpisodes) || 1) - 1)
  const prevMax = rounds.value.slice(0, -1).reduce((m, r) => Math.max(m, Number(r.episodeTo) || 0), 0)
  rounds.value.splice(rounds.value.length - 1, 0, {
    ...emptyRound(),
    episodeTo: Math.min(prevMax + 1, maxEpisode)
  })
}

/** 总集数改小时把越界的中间轮收回范围内，避免提交时才报错 */
function clampRounds() {
  const maxEpisode = Math.max(1, (Number(form.totalEpisodes) || 1) - 1)
  rounds.value.slice(0, -1).forEach((r) => {
    if (r.episodeTo != null && r.episodeTo > maxEpisode) r.episodeTo = maxEpisode
  })
}

async function loadSourceWorks() {
  const authorId = Number(sourceAuthorId.value)
  if (!authorId || authorId <= 0) {
    ElMessage.warning('请先填写创作者用户编号')
    return
  }
  sourceWorksLoading.value = true
  try {
    const res = await getDemandSourceWorks(authorId)
    sourceWorks.value = res?.data ?? res ?? []
    if (!sourceWorks.value.length) ElMessage.info('该创作者名下暂无可选作品')
  } catch {
    sourceWorks.value = []
  } finally {
    sourceWorksLoading.value = false
  }
}

async function handleUploadScript({ file }) {
  uploading.value = true
  try {
    const res = await uploadDemandScript(file)
    const data = res?.data ?? res ?? {}
    form.sourceScriptUrl = data.url || ''
    form.sourceScriptName = data.fileName || file.name
    ElMessage.success('源剧本已上传，保存任务后生效')
  } catch {
    // 错误已由 request 拦截器统一提示
  } finally {
    uploading.value = false
  }
}

function clearUploadedScript() {
  form.sourceScriptUrl = ''
  form.sourceScriptName = ''
}

/** 轮次是可编辑子表格，表格内 prop 校验本项目无先例，统一在提交前手工校验 */
function validateRounds() {
  const episodes = Number(form.totalEpisodes)
  const budget = Number(form.budget)
  if (!episodes || episodes <= 0) return '请填写总集数'
  if (!budget || budget <= 0) return '请填写正确的预算'
  if (form.taskType === 'storyboard' && !form.sourceWorkId && !form.sourceScriptUrl) {
    return '提供剧本做分镜的任务，请选择源剧本作品或上传剧本文件'
  }
  let prev = 0
  for (let i = 0; i < rounds.value.length - 1; i++) {
    const r = rounds.value[i]
    const label = `第 ${i + 1} 轮`
    if (!r.episodeTo || r.episodeTo <= prev) return `${label}验收集数必须大于上一轮`
    if (r.episodeTo >= episodes) return `${label}验收集数必须小于总集数（末轮验收全部集数）`
    if (!r.amount || Number(r.amount) <= 0) return `${label}金额必须大于 0`
    if ((r.durationDays || 0) + (r.durationHours || 0) <= 0) return `${label}交付时限必须大于 0`
    prev = r.episodeTo
  }
  const last = rounds.value[rounds.value.length - 1]
  if ((last.durationDays || 0) + (last.durationHours || 0) <= 0) return '末轮交付时限必须大于 0'
  if (finalAmount.value < 0) return '各中间轮金额之和已超过预算'
  return ''
}

function buildPayload() {
  const stages = rounds.value.map((r, i) => {
    const isLast = i === rounds.value.length - 1
    return {
      stageOrder: i + 1,
      episodeTo: isLast ? Number(form.totalEpisodes) : Number(r.episodeTo),
      amount: isLast ? finalAmount.value : Number(r.amount),
      durationDays: Number(r.durationDays) || 0,
      durationHours: Number(r.durationHours) || 0
    }
  })
  const first = stages[0]
  return {
    demand: {
      title: form.title.trim(),
      taskType: form.taskType,
      genreId: form.genreId ?? null,
      tags: (form.tags || '').trim(),
      budget: Number(form.budget),
      totalEpisodes: Number(form.totalEpisodes),
      deadline: form.deadline || null,
      contactInfo: (form.contactInfo || '').trim(),
      requirement: form.requirement.trim(),
      sourceWorkId: form.taskType === 'storyboard' ? form.sourceWorkId : null,
      sourceScriptUrl: form.taskType === 'storyboard' ? form.sourceScriptUrl : null,
      sourceScriptName: form.taskType === 'storyboard' ? form.sourceScriptName : null,
      // sys_demand.duration_hours 是首轮时限的镜像列（接单前卡片与逾期兜底都读它）
      durationHours: first.durationDays * 24 + first.durationHours
    },
    stages
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    const roundError = validateRounds()
    if (roundError) {
      ElMessage.warning(roundError)
      return
    }
    submitting.value = true
    const payload = buildPayload()
    try {
      if (publishMode.value === 'create') {
        await createDemand(payload)
        ElMessage.success('任务已发布，创作者可在任务广场接单')
      } else {
        await updateDemand(editingId.value, payload)
        ElMessage.success('任务已更新')
      }
      publishVisible.value = false
      loadList()
    } catch {
      // 错误已由 request 拦截器统一提示
    } finally {
      submitting.value = false
    }
  })
}

/** 仅未接单的任务可编辑/关闭（服务层同样按状态机兜底） */
function isEditable(row) {
  return row.status === 'open' && !row.acceptedCreatorId
}

async function handleClose(row) {
  try {
    await ElMessageBox.confirm(
      `关闭后任务「${row.title}」将从任务广场下架，创作者不可再接单。是否继续？`,
      '关闭征集',
      { confirmButtonText: '确定关闭', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await closeDemand(row.demandId)
    ElMessage.success('已关闭')
    loadList()
  } catch {
    // 错误已由 request 拦截器统一提示
  }
}

/* ==================== 列表 ==================== */

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
  query.value = { pageNo: 1, pageSize: 10, status: '', taskType: '', keyword: '' }
  loadList()
}

function handleViewDetail(row) {
  // 只读详情：直接使用列表行数据，不为看一眼再打一次接口
  detail.value = { ...row }
  detailVisible.value = true
}

function handleOpenOperation(row) {
  // 逐轮验收、交付正文与延时审批数据量大，走独立运营详情页按需拉取
  router.push({ path: '/trade/demand-detail', query: { demandId: row.demandId } })
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

.form-tip {
  display: block;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.inline-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.rounds-toolbar {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
