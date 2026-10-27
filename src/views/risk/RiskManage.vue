<template>
  <div class="risk-manage-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">全局风控管理</h2>
    </div>

    <!-- 顶部统计卡片区 -->
    <div class="stats-row">
      <el-card class="stat-card" v-for="stat in statsData" :key="stat.label">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value">{{ stat.value }}</div>
      </el-card>
    </div>

    <!-- 上半部分左右两栏布局 -->
    <div class="layout-wrapper">
      <!-- 左侧：违规内容处理 -->
      <div class="left-content">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">违规内容处理</span>
            </div>
          </template>
          <el-table :data="violationList" style="width: 100%">
            <el-table-column prop="description" label="内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="类型" width="140">
              <template #default="{ row }">
                {{ getTargetTypeText(row.targetType) }}
              </template>
            </el-table-column>
            <el-table-column label="举报原因" width="120">
              <template #default="{ row }">
                <el-tag :type="getSeverityType(row.reason)" size="small">
                  {{ row.reason || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">
                  {{ row.status === 'pending' ? '待处理' : '已处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button size="small" @click="handleProcess(row)">处理</el-button>
                  <el-button size="small" @click="handleDetail(row)">详情</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- 右侧：风控规则配置 -->
      <div class="right-content">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">风控规则配置</span>
              <el-button type="primary" size="default" class="black-button" @click="handleAddRule">新增规则</el-button>
            </div>
          </template>
          <el-table :data="ruleList" style="width: 100%">
            <el-table-column prop="ruleName" label="规则" min-width="160" />
            <el-table-column prop="ruleContent" label="触发条件" width="140" />
            <el-table-column prop="action" label="处理方式" width="140" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === 'enabled' ? 'success' : 'danger'" size="small">{{ row.status === 'enabled' ? '生效' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button size="small" :type="row.status === 'enabled' ? 'warning' : 'success'" @click="handleToggleRule(row)">{{ row.status === 'enabled' ? '停用' : '启用' }}</el-button>
                <el-button size="small" type="danger" @click="handleDeleteRule(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>

    <!-- 下半部分通栏：黑名单维护 -->
    <el-card class="table-card full-width">
      <template #header>
        <div class="card-header">
          <span class="card-title">黑名单维护</span>
          <el-button type="primary" size="default" class="black-button" @click="handleAddBlacklist">添加黑名单</el-button>
        </div>
      </template>
      <el-table :data="blacklistData" style="width: 100%">
        <el-table-column prop="targetValue" label="对象" min-width="180" />
        <el-table-column label="类型" width="140">
          <template #default="{ row }">
            <el-tag type="danger" size="small">
              {{ getTargetTypeText(row.targetType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="200" />
        <el-table-column prop="createTime" label="加入时间" width="160" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'danger'" size="small">{{ row.status === 'enabled' ? '生效' : '失效' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="handleRemove(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 异常账号处理 -->
    <el-card class="table-card full-width abnormal-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">异常账号处理</span>
        </div>
      </template>
      <el-table :data="abnormalList" style="width: 100%">
        <el-table-column prop="account" label="账号" min-width="160" />
        <el-table-column prop="targetType" label="类型" width="120">
          <template #default="{ row }">
            {{ getTargetTypeText(row.targetType) }}
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="拉黑原因" min-width="200" />
        <el-table-column prop="createTime" label="加入时间" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag type="danger" size="small">异常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="handleReleaseAbnormal(row)">解除拉黑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增规则弹窗 -->
    <el-dialog v-model="ruleDialogVisible" title="新增风控规则" width="500px">
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="规则名称">
          <el-input v-model="ruleForm.rule_name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="规则类型">
          <el-select v-model="ruleForm.rule_type" placeholder="请选择规则类型" style="width: 100%">
            <el-option label="敏感词检测" value="sensitive" />
            <el-option label="登录频控" value="login" />
            <el-option label="操作频控" value="operation" />
            <el-option label="IP频控" value="ip" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发条件">
          <el-input v-model="ruleForm.trigger_condition"
                    type="textarea" :rows="2"
                    placeholder="JSON格式；敏感词：{&quot;words&quot;:[&quot;词1&quot;,&quot;词2&quot;]}；频控：{&quot;times&quot;:5,&quot;window&quot;:&quot;1h&quot;}" />
        </el-form-item>
        <el-form-item label="处理方式">
          <el-select v-model="ruleForm.action" placeholder="请选择处理方式" style="width: 100%">
            <el-option label="拦截" value="block" />
            <el-option label="禁止" value="ban" />
            <el-option label="验证码" value="captcha" />
            <el-option label="驳回" value="reject" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值">
          <el-input v-model="ruleForm.threshold" placeholder="展示字段；频控阈值请在触发条件 JSON 的 times 中配置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitRule">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加黑名单弹窗 -->
    <el-dialog v-model="blacklistDialogVisible" title="添加黑名单" width="500px">
      <el-form :model="blacklistForm" label-width="100px">
        <el-form-item label="类型">
          <el-select v-model="blacklistForm.targetType" placeholder="请选择类型" style="width: 100%">
            <el-option label="用户" value="user" />
            <el-option label="IP地址" value="ip" />
            <el-option label="设备" value="device" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标值">
          <el-input v-model="blacklistForm.targetValue" placeholder="请输入目标值" />
        </el-form-item>
        <el-form-item label="加入原因">
          <el-input v-model="blacklistForm.reason" type="textarea" placeholder="请输入加入黑名单的原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blacklistDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitBlacklist">确定</el-button>
      </template>
    </el-dialog>

    <!-- 违规内容详情弹窗 -->
    <el-dialog v-model="reportDetailVisible" title="违规内容详情" width="520px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="举报ID">{{ reportDetail.reportId }}</el-descriptions-item>
        <el-descriptions-item label="举报人ID">{{ reportDetail.userId }}</el-descriptions-item>
        <el-descriptions-item label="内容类型">{{ reportDetail.targetType }}</el-descriptions-item>
        <el-descriptions-item label="目标ID">{{ reportDetail.targetId }}</el-descriptions-item>
        <el-descriptions-item label="举报原因">{{ reportDetail.reason }}</el-descriptions-item>
        <el-descriptions-item label="内容描述">{{ reportDetail.description }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">{{ reportDetail.status === 'pending' ? '待处理' : '已处理' }}</el-descriptions-item>
        <el-descriptions-item label="处理结果">{{ reportDetail.handleResult || '-' }}</el-descriptions-item>
        <el-descriptions-item label="举报时间">{{ reportDetail.createTime || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="reportDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 加载状态
const loading = ref(false)

// 顶部统计数据
const statsData = ref([])

// 违规内容列表数据
const violationList = ref([])

// 风控规则列表数据
const ruleList = ref([])

// 黑名单数据
const blacklistData = ref([])

// 异常账号数据
const abnormalList = ref([])

// 违规类型映射
const getTargetTypeText = (type) => {
  const typeMap = {
    work: '作品',
    user: '用户',
    comment: '评论',
    chapter: '章节',
    ip: 'IP地址',
    device: '设备',
    user: '用户'
  }
  return typeMap[type] || type || '-'
}

// 页面加载时获取数据
import { onMounted } from 'vue'
import adminFetch from '@/utils/adminFetch'

onMounted(async () => {
  try {
    // 获取风控规则列表
    const ruleRes = await adminFetch('/api/v1/admin/review/risk-rule/list?page=1&pageSize=10')
    const ruleData = await ruleRes.json()
    if (ruleData.code === 200) {
      ruleList.value = ruleData.rows || []
    }

    // 获取违规内容列表（举报记录）
    const vRes = await adminFetch('/api/v1/admin/review/report/list?page=1&pageSize=10')
    const vData = await vRes.json()
    if (vData.code === 200) {
      violationList.value = vData.rows || []
    }

    // 获取黑名单列表
    const blRes = await adminFetch('/api/v1/admin/review/blacklist/list?page=1&pageSize=10')
    const blData = await blRes.json()
    if (blData.code === 200) {
      blacklistData.value = blData.rows || []
    }

    // 获取异常账号列表
    await loadAbnormal()
  } catch (e) {
    console.error('获取风控数据失败:', e)
  }
})

// 加载异常账号列表
const loadAbnormal = async () => {
  try {
    const res = await adminFetch('/api/v1/admin/review/abnormal/list')
    const data = await res.json()
    if (data.code === 200) {
      abnormalList.value = data.rows || []
    }
  } catch (e) {
    console.error('获取异常账号失败:', e)
  }
}

// 解除异常账号拉黑
const handleReleaseAbnormal = async (row) => {
  try {
    await ElMessageBox.confirm(`确认解除账号 "${row.account}" 的黑名单吗？`, '解除确认', {
      confirmButtonText: '确认解除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminFetch('/api/v1/admin/review/abnormal/handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action: 'release' })
    })
    ElMessage.success(`已解除：${row.account}`)
    await loadAbnormal()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败，请重试')
    }
  }
}

// 获取严重度标签类型
const getSeverityType = (severity) => {
  if (severity === '高') return 'danger'
  if (severity === '中') return 'warning'
  return 'info'
}

// 处理违规内容
const handleProcess = async (row) => {
  try {
    await ElMessageBox.confirm(`确认处理该违规内容：${row.description || row.targetId}？`, '处理确认', {
      confirmButtonText: '确认处理',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminFetch('/api/v1/admin/review/report/handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: row.reportId, status: 'handled', handleResult: '已人工处理' })
    })
    ElMessage.success(`已处理：${row.description || row.targetId}`)
    const res = await adminFetch('/api/v1/admin/review/report/list?page=1&pageSize=10')
    const data = await res.json()
    if (data.code === 200) {
      violationList.value = data.rows || []
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('处理失败，请重试')
    }
  }
}

// 查看详情（弹窗展示，调详情接口）
const reportDetailVisible = ref(false)
const reportDetail = ref({})
const handleDetail = async (row) => {
  try {
    const res = await adminFetch(`/api/v1/admin/review/report/detail/${row.reportId}`)
    const data = await res.json()
    if (data.code === 200) {
      reportDetail.value = data.data || row
    } else {
      reportDetail.value = row
    }
    reportDetailVisible.value = true
  } catch (e) {
    reportDetail.value = row
    reportDetailVisible.value = true
  }
}

// 移除黑名单
const handleRemove = async (row) => {
  try {
    await ElMessageBox.confirm(`确认移除黑名单 "${row.targetValue}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminFetch(`/api/v1/admin/review/blacklist/${row.id}`, { method: 'DELETE' })
    ElMessage.success(`已移除：${row.targetValue}`)
    const res = await adminFetch('/api/v1/admin/review/blacklist/list?page=1&pageSize=10')
    const data = await res.json()
    if (data.code === 200) {
      blacklistData.value = data.rows || []
    }
  } catch {
    // 用户取消操作
  }
}

// 删除风控规则
const handleDeleteRule = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除风控规则 "${row.ruleName || row.rule_name}" 吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    const res = await adminFetch(`/api/v1/admin/review/risk-rule/${row.ruleId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('删除成功')
      ruleList.value = ruleList.value.filter(item => item.ruleId !== row.ruleId)
    } else {
      ElMessage.error(data.msg || '删除失败')
    }
  } catch (e) {
    ElMessage.error('删除失败，请检查后端服务')
  }
}

// 停用/启用风控规则（复用 PUT 更新接口，只改 status）
const handleToggleRule = async (row) => {
  const target = row.status === 'enabled' ? 'disabled' : 'enabled'
  try {
    await ElMessageBox.confirm(`确认${target === 'enabled' ? '启用' : '停用'}风控规则 "${row.ruleName || row.rule_name}" 吗？`, '状态确认', {
      confirmButtonText: target === 'enabled' ? '启用' : '停用',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    const res = await adminFetch('/api/v1/admin/review/risk-rule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId: row.ruleId, status: target })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(target === 'enabled' ? '已启用' : '已停用')
      row.status = target
    } else {
      ElMessage.error(data.msg || '操作失败')
    }
  } catch (e) {
    ElMessage.error('操作失败，请检查后端服务')
  }
}

// 新增规则弹窗
const ruleDialogVisible = ref(false)
const ruleForm = ref({
  rule_name: '',
  rule_type: '',
  trigger_condition: '',
  action: '',
  threshold: 80
})

const handleAddRule = () => {
  ruleForm.value = { rule_name: '', rule_type: '', trigger_condition: '', action: '', threshold: 80 }
  ruleDialogVisible.value = true
}

const handleSubmitRule = async () => {
  try {
    await adminFetch('/api/v1/admin/review/risk-rule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleName: ruleForm.value.rule_name,
        ruleType: ruleForm.value.rule_type,
        ruleContent: ruleForm.value.trigger_condition,
        threshold: ruleForm.value.threshold,
        action: ruleForm.value.action,
        status: 'enabled'
      })
    })
    ElMessage.success('新增规则成功')
    ruleDialogVisible.value = false
    // 刷新列表
    const res = await adminFetch('/api/v1/admin/review/risk-rule/list?page=1&pageSize=10')
    const data = await res.json()
    if (data.code === 200) {
      ruleList.value = data.rows || []
    }
  } catch (e) {
    ElMessage.error('提交失败，请重试')
  }
}

// 添加黑名单弹窗
const blacklistDialogVisible = ref(false)
const blacklistForm = ref({
  targetType: 'user',
  targetValue: '',
  reason: ''
})

const handleAddBlacklist = () => {
  blacklistForm.value = { targetType: 'user', targetValue: '', reason: '' }
  blacklistDialogVisible.value = true
}

const handleSubmitBlacklist = async () => {
  try {
    await adminFetch('/api/v1/admin/review/blacklist/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blacklistForm.value)
    })
    ElMessage.success('添加黑名单成功')
    blacklistDialogVisible.value = false
    // 刷新列表
    const res = await adminFetch('/api/v1/admin/review/blacklist/list?page=1&pageSize=10')
    const data = await res.json()
    if (data.code === 200) {
      blacklistData.value = data.rows || []
    }
  } catch (e) {
    ElMessage.error('提交失败，请重试')
  }
}
</script>

<style scoped>
.risk-manage-container {
  padding: 20px;
  background-color: #f7f8fa;
  min-height: calc(100vh - 60px);
}

/* 页面标题 */
.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
  margin: 0;
}

/* 顶部统计卡片区 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
  text-align: center;
}

.stat-card :deep(.el-card__body) {
  padding: 24px 20px;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #1f2329;
}

/* 上半部分左右两栏布局 */
.layout-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.left-content,
.right-content {
  min-width: 0;
}

/* 表格卡片 */
.table-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
}

.table-card.full-width {
  margin-bottom: 0;
}

.abnormal-card {
  margin-top: 20px;
}

.table-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.table-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 14px;
  color: #1f2329;
  font-weight: 600;
}

/* 操作按钮容器 */
.action-buttons {
  display: flex;
  gap: 8px;
}

/* 黑色主按钮 */
.black-button {
  background-color: #1f2329;
  border-color: #1f2329;
  color: #ffffff;
}

.black-button:hover {
  background-color: #000000;
  border-color: #000000;
}

.black-button:active {
  background-color: #000000;
  border-color: #000000;
}

/* 表格样式统一 */
:deep(.el-table) {
  font-size: 13px;
  color: #262626;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #595959;
  font-weight: 500;
  font-size: 12px;
  padding: 12px 0;
}

:deep(.el-table td) {
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}

:deep(.el-table tr:hover > td) {
  background-color: #fafafa !important;
}

:deep(.el-table .cell) {
  padding-left: 16px;
  padding-right: 16px;
}

/* 按钮样式统一 */
:deep(.el-button) {
  font-size: 13px;
  border-radius: 4px;
  padding: 7px 15px;
}

:deep(.el-button--small) {
  font-size: 12px;
  padding: 5px 12px;
}

:deep(.el-button--default) {
  color: #595959;
  border-color: #d9d9d9;
  background: #ffffff;
}

:deep(.el-button--default:hover) {
  color: #1f2329;
  border-color: #1f2329;
}

/* 标签样式 */
:deep(.el-tag) {
  border: none;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
}

:deep(.el-tag.el-tag--success) {
  background-color: #f6ffed;
  color: #389e0d;
}

:deep(.el-tag.el-tag--danger) {
  background-color: #fff1f0;
  color: #cf1322;
}

:deep(.el-tag.el-tag--warning) {
  background-color: #fff7e6;
  color: #d48806;
}
</style>









