<template>
  <div class="welfare-container">
    <div class="page-header">
      <h2 class="page-title">福利与积分配置</h2>
    </div>

    <el-card class="table-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 任务配置 -->
        <el-tab-pane label="福利任务配置" name="task">
          <div class="card-header">
            <div class="search-bar">
              <el-input v-model="taskQuery.taskName" placeholder="任务名称" clearable style="width: 180px" @keyup.enter="fetchTasks" />
              <el-select v-model="taskQuery.taskType" placeholder="任务类型" clearable style="width: 140px">
                <el-option label="每日任务" value="DAILY" />
                <el-option label="阅读任务" value="READING" />
                <el-option label="上传任务" value="UPLOAD" />
                <el-option label="活动任务" value="ACTIVITY" />
              </el-select>
              <el-button type="primary" class="black-button" @click="fetchTasks">查询</el-button>
              <el-button type="primary" class="black-button" @click="handleAddTask">新增任务</el-button>
            </div>
          </div>
          <el-table :data="taskList" v-loading="loading" style="width: 100%">
            <el-table-column prop="taskName" label="任务名称" min-width="130" />
            <el-table-column label="任务类型" width="110">
              <template #default="{ row }">{{ taskTypeLabel(row.taskType) }}</template>
            </el-table-column>
            <el-table-column prop="taskCode" label="任务编码" width="130" />
            <el-table-column prop="description" label="任务说明" min-width="180" />
            <el-table-column label="目标次数" width="90" align="center">
              <template #default="{ row }">{{ row.targetCount }}</template>
            </el-table-column>
            <el-table-column label="奖励积分" width="100" align="center">
              <template #default="{ row }">
                <span class="points-text">{{ row.rewardPoints }}</span>
              </template>
            </el-table-column>
            <el-table-column label="排序" width="80" align="center">
              <template #default="{ row }">{{ row.sort }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button size="small" @click="handleEditTask(row)">编辑</el-button>
                  <el-button size="small" @click="handleToggleTask(row)">
                    {{ row.status === 1 ? '停用' : '启用' }}
                  </el-button>
                  <el-button size="small" type="danger" @click="handleDeleteTask(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="taskQuery.page"
              v-model:page-size="taskQuery.pageSize"
              :total="taskTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchTasks"
              @current-change="fetchTasks"
            />
          </div>
        </el-tab-pane>

        <!-- 广告福利任务 -->
        <el-tab-pane label="广告福利任务" name="ad">
          <div class="card-header">
            <div class="search-bar">
              <el-input v-model="adQuery.adName" placeholder="任务名称" clearable style="width: 180px" @keyup.enter="fetchAdTasks" />
              <el-select v-model="adQuery.adType" placeholder="广告形式" clearable style="width: 140px">
                <el-option label="激励视频" value="reward_video" />
                <el-option label="图文广告" value="reward_image" />
              </el-select>
              <el-button type="primary" class="black-button" @click="fetchAdTasks">查询</el-button>
              <el-button type="primary" class="black-button" @click="handleAddAdTask">新增广告任务</el-button>
            </div>
          </div>
          <el-table :data="adTaskList" v-loading="loading" style="width: 100%">
            <el-table-column prop="adName" label="任务名称" min-width="150" />
            <el-table-column label="广告形式" width="100">
              <template #default="{ row }">{{ adTypeLabel(row.adType) }}</template>
            </el-table-column>
            <el-table-column prop="adUnitId" label="广告位编码" width="140" />
            <el-table-column label="每日可看次数" width="110" align="center">
              <template #default="{ row }">{{ row.frequencyLimit }}</template>
            </el-table-column>
            <el-table-column label="单次奖励积分" width="120" align="center">
              <template #default="{ row }">
                <span class="points-text">{{ row.rewardPoints }}</span>
              </template>
            </el-table-column>
            <el-table-column label="生效时间" min-width="180">
              <template #default="{ row }">
                {{ row.startDate || '立即生效' }} ~ {{ row.endDate || '长期有效' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled === 1 ? 'success' : 'info'" size="small">
                  {{ row.isEnabled === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button size="small" @click="handleEditAdTask(row)">编辑</el-button>
                  <el-button size="small" @click="handleToggleAdTask(row)">
                    {{ row.isEnabled === 1 ? '停用' : '启用' }}
                  </el-button>
                  <el-button size="small" type="danger" @click="handleDeleteAdTask(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- AI 创作积分消耗配置（去次数化：1 积分 = N token） -->
        <el-tab-pane label="AI创作积分消耗" name="exchange">
          <el-alert
            type="info" :closable="false" show-icon
            title="AI 创作按实际消耗的 token 直接从用户积分中扣减（向上取整、最低 1 积分）；此处配置 1 积分可抵扣多少 token，App 端与 PC 用户端即时生效，无需发版。"
            style="margin-bottom: 16px"
          />
          <el-card shadow="never" style="max-width: 560px">
            <div class="rate-current">
              <span class="rate-label">当前换算</span>
              <span class="rate-value">1 积分 = {{ tokenPerPoint }} token</span>
            </div>
            <el-form label-width="160px" style="margin-top: 16px">
              <el-form-item label="1 积分 = N token">
                <el-input-number v-model="newTokenPerPoint" :min="1" :max="100000" :step="100" controls-position="right" />
                <span class="rate-hint">token = 1 积分（N 越大用户越省积分）</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" class="black-button" :loading="saving" @click="handleUpdateRate">保存配置</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <!-- 生成字数上限（去次数化已废除：按 token 扣积分天然控成本，不再限制单次字数） -->

        <!-- 积分账户 -->
        <el-tab-pane label="积分账户" name="account">
          <div class="card-header">
            <div class="search-bar">
              <el-input v-model="accQuery.nickname" placeholder="用户昵称" clearable style="width: 180px" @keyup.enter="fetchAccounts" />
              <el-button type="primary" class="black-button" @click="fetchAccounts">查询</el-button>
            </div>
          </div>
          <el-table :data="accountList" v-loading="loading" style="width: 100%">
            <el-table-column prop="userId" label="用户ID" width="100" />
            <el-table-column prop="nickname" label="用户昵称" min-width="140" />
            <el-table-column label="积分余额" width="110" align="center">
              <template #default="{ row }">
                <span class="points-text">{{ row.balance }}</span>
              </template>
            </el-table-column>
            <el-table-column label="累计获得" width="110" align="center">
              <template #default="{ row }">{{ row.totalEarned }}</template>
            </el-table-column>
            <el-table-column label="累计消耗" width="110" align="center">
              <template #default="{ row }">{{ row.totalSpent }}</template>
            </el-table-column>
            <el-table-column label="今日获得" width="110" align="center">
              <template #default="{ row }">{{ row.todayEarned }}</template>
            </el-table-column>
            <el-table-column prop="lastUpdateDate" label="最近变动" min-width="160">
              <template #default="{ row }">{{ formatDate(row.lastUpdateDate) }}</template>
            </el-table-column>
          </el-table>
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="accQuery.page"
              v-model:page-size="accQuery.pageSize"
              :total="accTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchAccounts"
              @current-change="fetchAccounts"
            />
          </div>
        </el-tab-pane>

        <!-- 积分流水 -->
        <el-tab-pane label="积分流水" name="record">
          <div class="card-header">
            <div class="search-bar">
              <el-select v-model="recQuery.changeType" placeholder="变动类型" clearable style="width: 130px">
                <el-option label="获得" value="EARN" />
                <el-option label="消耗" value="SPEND" />
              </el-select>
              <el-select v-model="recQuery.source" placeholder="来源" clearable style="width: 130px">
                <el-option label="任务" value="TASK" />
                <el-option label="广告" value="AD" />
                <el-option label="兑换" value="EXCHANGE" />
                <el-option label="补偿" value="REVERSAL" />
              </el-select>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="~"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 260px"
              />
              <el-button type="primary" class="black-button" @click="fetchRecords">查询</el-button>
            </div>
          </div>
          <el-table :data="recordList" v-loading="loading" style="width: 100%">
            <el-table-column prop="userId" label="用户ID" width="100" />
            <el-table-column prop="nickname" label="用户昵称" min-width="130" />
            <el-table-column label="变动类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.changeType === 'EARN' ? 'success' : 'warning'" size="small">
                  {{ row.changeType === 'EARN' ? '获得' : '消耗' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="积分变动" width="100" align="center">
              <template #default="{ row }">
                <span :class="row.changeType === 'EARN' ? 'earn-text' : 'spend-text'">
                  {{ row.changeType === 'EARN' ? '+' : '-' }}{{ row.points }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="余额" width="90" align="center">
              <template #default="{ row }">{{ row.balanceAfter }}</template>
            </el-table-column>
            <el-table-column label="来源" width="110">
              <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="说明" min-width="200" />
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="recQuery.page"
              v-model:page-size="recQuery.pageSize"
              :total="recTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchRecords"
              @current-change="fetchRecords"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 任务新增/编辑弹窗 -->
    <el-dialog v-model="taskDialogVisible" :title="isEditTask ? '编辑任务' : '新增任务'" width="520px">
      <el-form :model="taskForm" label-width="90px">
        <el-form-item label="任务名称" required>
          <el-input v-model="taskForm.taskName" placeholder="如：每日登录任务" />
        </el-form-item>
        <el-form-item label="任务类型" required>
          <el-select v-model="taskForm.taskType" placeholder="请选择" style="width: 100%">
            <el-option label="每日任务" value="DAILY" />
            <el-option label="阅读任务" value="READING" />
            <el-option label="上传任务" value="UPLOAD" />
            <el-option label="活动任务" value="ACTIVITY" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务编码">
          <el-input v-model="taskForm.taskCode" placeholder="如：DAILY_LOGIN" />
        </el-form-item>
        <el-form-item label="任务图标">
          <el-select v-model="taskForm.icon" placeholder="选择图标" clearable style="width: 100%">
            <el-option v-for="ic in ICON_OPTIONS" :key="ic" :label="ic" :value="ic" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务说明">
          <el-input v-model="taskForm.description" type="textarea" :rows="2" placeholder="任务描述" />
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker
            v-model="taskDateRange" type="daterange" range-separator="~"
            start-placeholder="开始日期" end-placeholder="结束日期(空=长期)"
            value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="目标次数">
          <el-input-number v-model="taskForm.targetCount" :min="1" :max="1000" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="每日上限">
          <el-input-number v-model="taskForm.dailyLimit" :min="0" :max="1000" controls-position="right" style="width: 100%" />
          <span class="rate-hint">0=不限；每日任务建议 1</span>
        </el-form-item>
        <el-form-item label="奖励积分">
          <el-input-number v-model="taskForm.rewardPoints" :min="0" :max="100000" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="taskForm.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="taskForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="taskForm.remark" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" class="black-button" :loading="saving" @click="handleSubmitTask">确定</el-button>
      </template>
    </el-dialog>
    <!-- 广告福利任务新增/编辑弹窗 -->
    <el-dialog v-model="adDialogVisible" :title="isEditAdTask ? '编辑广告任务' : '新增广告任务'" width="540px">
      <el-form :model="adForm" label-width="110px">
        <el-form-item label="任务名称" required>
          <el-input v-model="adForm.adName" placeholder="如：看激励视频得积分" />
        </el-form-item>
        <el-form-item label="广告形式" required>
          <el-select v-model="adForm.adType" placeholder="请选择" style="width: 100%">
            <el-option label="激励视频" value="reward_video" />
            <el-option label="图文广告" value="reward_image" />
          </el-select>
        </el-form-item>
        <el-form-item label="广告位编码">
          <el-input v-model="adForm.adUnitId" placeholder="如：REWARD_VIDEO_01" />
        </el-form-item>
        <el-form-item label="每日可看次数">
          <el-input-number v-model="adForm.frequencyLimit" :min="1" :max="100" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单次奖励积分">
          <el-input-number v-model="adForm.rewardPoints" :min="0" :max="10000" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker
            v-model="adDateRange" type="daterange" range-separator="~"
            start-placeholder="开始日期" end-placeholder="结束日期"
            value-format="YYYY-MM-DD" style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="adForm.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="adForm.isEnabled" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="adForm.remark" type="textarea" :rows="2" placeholder="任务说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adDialogVisible = false">取消</el-button>
        <el-button type="primary" class="black-button" :loading="saving" @click="handleSubmitAdTask">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminFetch from '@/utils/adminFetch'

const TASK_PREFIX = '/api/v1/admin/welfare/task'
const AD_PREFIX = '/api/v1/admin/welfare/ad'
const POINTS_PREFIX = '/api/v1/admin/welfare/points'
const RATE_URL = '/api/v1/admin/ai/quota/token-per-point'

const activeTab = ref('task')
const loading = ref(false)
const saving = ref(false)

// 任务
const taskQuery = reactive({ taskName: '', taskType: '', page: 1, pageSize: 10 })
const taskTotal = ref(0)
const taskList = ref([])
const taskDialogVisible = ref(false)
const isEditTask = ref(false)
const taskForm = reactive({
  taskId: null, taskName: '', taskType: 'DAILY', taskCode: '', description: '',
  targetCount: 1, rewardPoints: 0, icon: '', dailyLimit: 0, sort: 0, status: 1, remark: ''
})
const taskDateRange = ref(null)
const ICON_OPTIONS = ['calendar', 'book', 'upload', 'gift', 'star', 'check']

// 广告福利任务
const adQuery = reactive({ adName: '', adType: '', page: 1, pageSize: 10 })
const adTaskList = ref([])
const adDialogVisible = ref(false)
const isEditAdTask = ref(false)
const adDateRange = ref(null)
const adForm = reactive({
  adId: null, adName: '', adType: 'reward_video', adUnitId: '',
  frequencyLimit: 5, rewardPoints: 10, sort: 0, isEnabled: 1, remark: ''
})

// AI 创作积分消耗配置（去次数化：1 积分 = N token，字段 tokenPerPoint）
const tokenPerPoint = ref(1000)
const newTokenPerPoint = ref(1000)

// 积分账户
const accQuery = reactive({ nickname: '', page: 1, pageSize: 10 })
const accTotal = ref(0)
const accountList = ref([])

// 积分流水
const recQuery = reactive({ changeType: '', source: '', page: 1, pageSize: 10 })
const recTotal = ref(0)
const recordList = ref([])
const dateRange = ref(null)

const taskTypeLabel = (t) => ({ DAILY: '每日任务', READING: '阅读任务', UPLOAD: '上传任务', ACTIVITY: '活动任务' }[t] || t)
const adTypeLabel = (t) => ({ reward_video: '激励视频', reward_image: '图文广告' }[t] || t)
const sourceLabel = (s) => ({ TASK: '任务', AD: '广告', EXCHANGE: '兑换', REVERSAL: '补偿' }[s] || s)
const formatDate = (d) => (d ? String(d).replace('T', ' ').slice(0, 19) : '')

const fetchTasks = async () => {
  loading.value = true
  try {
    let url = `${TASK_PREFIX}/list?page=${taskQuery.page}&pageSize=${taskQuery.pageSize}`
    if (taskQuery.taskName) url += `&taskName=${encodeURIComponent(taskQuery.taskName)}`
    if (taskQuery.taskType) url += `&taskType=${taskQuery.taskType}`
    const res = await adminFetch(url)
    const data = await res.json()
    if (data.code === 200) {
      taskList.value = data.rows || []
      taskTotal.value = data.total || 0
    }
  } catch (e) {
    ElMessage.error('获取任务配置失败')
  } finally {
    loading.value = false
  }
}

const fetchAdTasks = async () => {
  loading.value = true
  try {
    let url = `${AD_PREFIX}/list?page=${adQuery.page}&pageSize=${adQuery.pageSize}`
    if (adQuery.adName) url += `&adName=${encodeURIComponent(adQuery.adName)}`
    if (adQuery.adType) url += `&adType=${adQuery.adType}`
    const res = await adminFetch(url)
    const data = await res.json()
    if (data.code === 200) {
      adTaskList.value = data.rows || []
    }
  } catch (e) {
    ElMessage.error('获取广告任务失败')
  } finally {
    loading.value = false
  }
}

const handleAddAdTask = () => {
  isEditAdTask.value = false
  adDateRange.value = null
  Object.assign(adForm, {
    adId: null, adName: '', adType: 'reward_video', adUnitId: '',
    frequencyLimit: 5, rewardPoints: 10, sort: 0, isEnabled: 1, remark: ''
  })
  adDialogVisible.value = true
}

const handleEditAdTask = (row) => {
  isEditAdTask.value = true
  adDateRange.value = row.startDate ? [row.startDate, row.endDate] : null
  Object.assign(adForm, {
    adId: row.adId, adName: row.adName, adType: row.adType, adUnitId: row.adUnitId,
    frequencyLimit: row.frequencyLimit, rewardPoints: row.rewardPoints,
    sort: row.sort, isEnabled: row.isEnabled, remark: row.remark
  })
  adDialogVisible.value = true
}

const handleSubmitAdTask = async () => {
  if (!adForm.adName || !adForm.adType) {
    ElMessage.warning('请填写任务名称和广告形式')
    return
  }
  saving.value = true
  try {
    const payload = { ...adForm }
    if (adDateRange.value) {
      payload.startDate = adDateRange.value[0]
      payload.endDate = adDateRange.value[1]
    } else {
      payload.startDate = null
      payload.endDate = null
    }
    const res = await adminFetch(AD_PREFIX, {
      method: isEditAdTask.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(isEditAdTask.value ? '修改成功' : '新增成功')
      adDialogVisible.value = false
      fetchAdTasks()
    } else {
      ElMessage.error(data.msg || '提交失败')
    }
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    saving.value = false
  }
}

const handleToggleAdTask = async (row) => {
  try {
    const res = await adminFetch(AD_PREFIX, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adId: row.adId, adName: row.adName, adType: row.adType,
        isEnabled: row.isEnabled === 1 ? 0 : 1
      })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(row.isEnabled === 1 ? '已停用' : '已启用')
      fetchAdTasks()
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleDeleteAdTask = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除广告任务「${row.adName}」？`, '删除确认', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    const res = await adminFetch(`${AD_PREFIX}/${row.adId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('删除成功')
      fetchAdTasks()
    } else {
      ElMessage.error(data.msg || '删除失败')
    }
  } catch (e) {
    // 取消或失败
  }
}

const fetchExchangeRate = async () => {
  try {
    const res = await adminFetch(RATE_URL)
    const data = await res.json()
    if (data.code === 200) {
      tokenPerPoint.value = data.data
      newTokenPerPoint.value = data.data
    }
  } catch (e) {
    ElMessage.error('获取积分换算配置失败')
  }
}

const handleUpdateRate = async () => {
  if (!newTokenPerPoint.value || newTokenPerPoint.value < 1) {
    ElMessage.warning('1 积分抵扣 token 数必须 >= 1')
    return
  }
  saving.value = true
  try {
    const res = await adminFetch(RATE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenPerPoint: newTokenPerPoint.value })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(`已更新：1 积分 = ${newTokenPerPoint.value} token`)
      tokenPerPoint.value = newTokenPerPoint.value
    } else {
      ElMessage.error(data.msg || '更新失败')
    }
  } catch (e) {
    ElMessage.error('更新失败')
  } finally {
    saving.value = false
  }
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    let url = `${POINTS_PREFIX}/account/list?page=${accQuery.page}&pageSize=${accQuery.pageSize}`
    if (accQuery.nickname) url += `&nickname=${encodeURIComponent(accQuery.nickname)}`
    const res = await adminFetch(url)
    const data = await res.json()
    if (data.code === 200) {
      accountList.value = data.rows || []
      accTotal.value = data.total || 0
    }
  } catch (e) {
    ElMessage.error('获取积分账户失败')
  } finally {
    loading.value = false
  }
}

const fetchRecords = async () => {
  loading.value = true
  try {
    let url = `${POINTS_PREFIX}/record/list?page=${recQuery.page}&pageSize=${recQuery.pageSize}`
    if (recQuery.changeType) url += `&changeType=${recQuery.changeType}`
    if (recQuery.source) url += `&source=${recQuery.source}`
    if (dateRange.value) {
      url += `&startDate=${dateRange.value[0]}&endDate=${dateRange.value[1]}`
    }
    const res = await adminFetch(url)
    const data = await res.json()
    if (data.code === 200) {
      recordList.value = data.rows || []
      recTotal.value = data.total || 0
    }
  } catch (e) {
    ElMessage.error('获取积分流水失败')
  } finally {
    loading.value = false
  }
}

const handleAddTask = () => {
  isEditTask.value = false
  Object.assign(taskForm, { taskId: null, taskName: '', taskType: 'DAILY', taskCode: '', description: '', targetCount: 1, rewardPoints: 0, icon: '', dailyLimit: 0, sort: 0, status: 1, remark: '' })
  taskDateRange.value = null
  taskDialogVisible.value = true
}

const handleEditTask = (row) => {
  isEditTask.value = true
  Object.assign(taskForm, {
    taskId: row.taskId, taskName: row.taskName, taskType: row.taskType, taskCode: row.taskCode,
    description: row.description, targetCount: row.targetCount, rewardPoints: row.rewardPoints,
    icon: row.icon || '', dailyLimit: row.dailyLimit || 0,
    sort: row.sort, status: row.status, remark: row.remark
  })
  taskDateRange.value = row.startTime ? [row.startTime, row.endTime] : null
  taskDialogVisible.value = true
}

const handleSubmitTask = async () => {
  if (!taskForm.taskName || !taskForm.taskType) {
    ElMessage.warning('请填写任务名称和类型')
    return
  }
  saving.value = true
  try {
    const payload = { ...taskForm }
    if (taskDateRange.value) {
      payload.startTime = taskDateRange.value[0]
      payload.endTime = taskDateRange.value[1]
    }
    const res = await adminFetch(TASK_PREFIX, {
      method: isEditTask.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(isEditTask.value ? '修改成功' : '新增成功')
      taskDialogVisible.value = false
      fetchTasks()
    } else {
      ElMessage.error(data.msg || '提交失败')
    }
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    saving.value = false
  }
}

const handleToggleTask = async (row) => {
  try {
    const res = await adminFetch(TASK_PREFIX, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: row.taskId, status: row.status === 1 ? 0 : 1 })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(row.status === 1 ? '已停用' : '已启用')
      fetchTasks()
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleDeleteTask = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除任务「${row.taskName}」？`, '删除确认', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    const res = await adminFetch(`${TASK_PREFIX}/${row.taskId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('删除成功')
      fetchTasks()
    }
  } catch (e) {
    // 取消或失败
  }
}

const handleTabChange = (name) => {
  if (name === 'task') fetchTasks()
  else if (name === 'ad') fetchAdTasks()
  else if (name === 'exchange') fetchExchangeRate()
  else if (name === 'account') fetchAccounts()
  else if (name === 'record') fetchRecords()
}

onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.welfare-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.search-bar { display: flex; gap: 10px; flex-wrap: wrap; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.action-buttons { display: flex; gap: 6px; }
.points-text { color: #e6a23c; font-weight: 600; }
.earn-text { color: #67c23a; font-weight: 600; }
.spend-text { color: #f56c6c; font-weight: 600; }
.rate-current { display: flex; align-items: baseline; gap: 12px; }
.rate-label { color: #909399; font-size: 14px; }
.rate-value { font-size: 22px; font-weight: 700; color: #303133; }
.rate-hint { margin-left: 10px; color: #909399; }
:deep(.el-tabs__nav-wrap) { margin-bottom: 8px; }
</style>
