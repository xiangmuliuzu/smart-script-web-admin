<template>
  <div class="ad-config-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">广告运营配置</h2>
      <el-button type="primary" class="black-button" @click="handleAdd">新增广告位</el-button>
    </div>

    <!-- 左右分栏布局 -->
    <div class="layout-wrapper">
      <!-- 左侧内容区 -->
      <div class="left-content">
        <!-- 广告位管理 -->
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">广告位管理</span>
              <div class="search-bar">
                <el-input v-model="query.adName" placeholder="广告位名称" clearable style="width: 160px" @keyup.enter="handleQuery" />
                <el-input v-model="query.adSource" placeholder="广告源" clearable style="width: 140px" @keyup.enter="handleQuery" />
                <el-button type="primary" class="black-button" @click="handleQuery">查询</el-button>
              </div>
            </div>
          </template>
          <el-table :data="placementList" v-loading="loading" style="width: 100%" @row-click="handleRowClick">
            <el-table-column prop="adName" label="广告位" min-width="140" />
            <el-table-column prop="adPosition" label="位置" width="120" />
            <el-table-column prop="adSource" label="广告源" width="120" />
            <el-table-column label="频次/天" width="100" align="center">
              <template #default="{ row }">{{ row.frequencyLimit }}</template>
            </el-table-column>
            <el-table-column label="每日上限" width="100" align="center">
              <template #default="{ row }">{{ row.dailyCap }}</template>
            </el-table-column>
            <el-table-column label="观看上限" width="100" align="center">
              <template #default="{ row }">{{ row.watchLimit }}</template>
            </el-table-column>
            <el-table-column label="奖励积分" width="100" align="center">
              <template #default="{ row }">{{ row.rewardPoints }}</template>
            </el-table-column>
            <el-table-column label="人群定向" width="160">
              <template #default="{ row }">
                <el-tag v-for="tag in parseAudience(row.targetAudience)" :key="tag" size="small" style="margin-right: 4px">
                  {{ tag }}
                </el-tag>
                <span v-if="!row.targetAudience">全部用户</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled === 1 ? 'success' : 'danger'" size="small">
                  {{ row.isEnabled === 1 ? '开启' : '关闭' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button size="small" @click.stop="handleEdit(row)">编辑</el-button>
                  <el-button size="small" @click.stop="handleToggle(row)">
                    {{ row.isEnabled === 1 ? '停用' : '启用' }}
                  </el-button>
                  <el-button size="small" type="danger" @click.stop="handleDelete(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="query.page"
              v-model:page-size="query.pageSize"
              :total="total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="handleQuery"
              @current-change="handleQuery"
            />
          </div>
        </el-card>
      </div>

      <!-- 右侧配置栏 -->
      <div class="right-sidebar">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">人群定向配置</span>
            </div>
          </template>
          <template v-if="currentRow">
            <div class="current-ad-name">{{ currentRow.adName }}</div>
            <el-form :model="targetConfig" label-position="top" class="config-form">
              <el-form-item label="目标人群">
                <el-select v-model="targetConfig.targetAudience" multiple placeholder="选择人群（不选=全部）" style="width: 100%">
                  <el-option label="全部用户" value="all" />
                  <el-option label="新用户" value="new" />
                  <el-option label="活跃用户" value="active" />
                  <el-option label="付费用户" value="paid" />
                </el-select>
              </el-form-item>
              <el-form-item label="每日观看上限">
                <el-input-number v-model="targetConfig.dailyLimit" :min="0" :max="1000" controls-position="right" style="width: 100%" />
              </el-form-item>
              <el-form-item label="观看奖励积分">
                <el-input-number v-model="targetConfig.rewardPoints" :min="0" :max="10000" controls-position="right" style="width: 100%" />
              </el-form-item>
              <el-button type="primary" class="black-button save-button" :loading="saving" @click="handleSaveConfig">
                保存配置
              </el-button>
            </el-form>
          </template>
          <el-empty v-else description="点击左侧广告位行进行人群定向配置" :image-size="60" />
        </el-card>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑广告位' : '新增广告位'" width="560px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="广告位名称" required>
          <el-input v-model="form.adName" placeholder="如：开屏广告" />
        </el-form-item>
        <el-form-item label="广告位置" required>
          <el-select v-model="form.adPosition" placeholder="请选择位置" style="width: 100%">
            <el-option label="开屏" value="splash" />
            <el-option label="插屏" value="interstitial" />
            <el-option label="视频前贴片" value="pre-roll" />
            <el-option label="信息流" value="feed" />
            <el-option label="激励视频" value="rewarded" />
            <el-option label="Banner" value="banner" />
          </el-select>
        </el-form-item>
        <el-form-item label="广告源" required>
          <el-select v-model="form.adSource" placeholder="请选择广告源" style="width: 100%">
            <el-option label="穿山甲" value="csj" />
            <el-option label="优量汇" value="ylh" />
            <el-option label="百青藤" value="bqt" />
            <el-option label="快手联盟" value="ks" />
            <el-option label="自建" value="self" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isSelfSplash" label="素材形式">
          <span>图片</span>
        </el-form-item>
        <template v-if="isSelfSplash">
          <el-form-item label="开屏图片" required>
            <div class="splash-media">
              <img v-if="form.imageUrl" :src="resolveMediaUrl(form.imageUrl)" alt="开屏广告预览" class="splash-preview" />
              <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp" :before-upload="beforeSplashUpload" :http-request="uploadSplashImage" :disabled="uploading">
                <el-button :loading="uploading">{{ form.imageUrl ? '更换图片' : '上传图片' }}</el-button>
              </el-upload>
              <span>建议竖版图片，JPG、PNG 或 WebP，最大 5 MB</span>
            </div>
          </el-form-item>
          <el-form-item label="跳转链接">
            <el-input v-model="form.linkUrl" placeholder="选填，HTTP 或 HTTPS 链接" />
          </el-form-item>
          <el-form-item label="展示时长">
            <el-input-number v-model="form.durationSeconds" :min="1" :max="10" controls-position="right" /> <span>秒，可随时跳过</span>
          </el-form-item>
          <el-alert title="自建开屏按排序和生效日期选择，暂不应用人群定向及曝光次数限制。" type="info" :closable="false" />
        </template>
        <el-form-item label="广告单元ID">
          <el-input v-model="form.adUnitId" placeholder="广告单元 ID" />
        </el-form-item>
        <el-form-item label="频次限制/天">
          <el-input-number v-model="form.frequencyLimit" :min="0" :max="100" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="每日曝光上限">
          <el-input-number v-model="form.dailyCap" :min="0" :max="100000" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="观看上限/人">
          <el-input-number v-model="form.watchLimit" :min="0" :max="1000" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="观看奖励积分">
          <el-input-number v-model="form.rewardPoints" :min="0" :max="10000" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="black-button" :loading="saving" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminFetch from '@/utils/adminFetch'
import { uploadFile } from '@/api/content'
import { resolveMediaUrl } from '@/utils/request'

const AD_PREFIX = '/api/v1/admin/operation/ad-config'

// 加载状态
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)

// 查询条件
const query = reactive({ adName: '', adSource: '', page: 1, pageSize: 10 })
const total = ref(0)

// 广告位列表数据
const placementList = ref([])

// 当前选中行（人群定向配置）
const currentRow = ref(null)

// 人群定向配置数据
const targetConfig = reactive({ targetAudience: [], dailyLimit: 0, rewardPoints: 0 })

// 弹窗状态
const dialogVisible = ref(false)
const isEdit = ref(false)

// 表单默认值
const defaultForm = () => ({
  adId: null,
  adName: '',
  adPosition: '',
  adType: '',
  adSource: '',
  adUnitId: '',
  imageUrl: '',
  linkUrl: '',
  durationSeconds: 5,
  frequencyLimit: 1,
  dailyCap: 1000,
  watchLimit: 5,
  rewardPoints: 10,
  sort: 0,
  dateRange: null,
  remark: ''
})
const form = reactive(defaultForm())
const isSelfSplash = computed(() => form.adPosition === 'splash' && form.adSource === 'self')
// 历史类型仍保留；新建或更换位置时根据位置填写兼容值。
const typeByPosition = { splash: 'splash_ad', interstitial: 'interstitial', 'pre-roll': 'pre_roll', feed: 'native_feed', rewarded: 'rewarded_video', banner: 'banner' }
let originalPosition = ''

// 解析人群定向 JSON
const parseAudience = (json) => {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    const map = { all: '全部用户', new: '新用户', active: '活跃用户', paid: '付费用户' }
    return arr.map(v => map[v] || v)
  } catch (e) {
    return []
  }
}

// 获取列表
const fetchList = async () => {
  loading.value = true
  try {
    const res = await adminFetch(`${AD_PREFIX}/list?page=${query.page}&pageSize=${query.pageSize}${query.adName ? `&adName=${encodeURIComponent(query.adName)}` : ''}${query.adSource ? `&adSource=${encodeURIComponent(query.adSource)}` : ''}`)
    const data = await res.json()
    if (data.code === 200) {
      placementList.value = data.rows || []
      total.value = data.total || 0
    }
  } catch (e) {
    console.error('获取广告配置失败:', e)
    ElMessage.error('获取广告配置失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  query.page = 1
  fetchList()
}

// 点击行 → 加载人群定向配置
const handleRowClick = (row) => {
  currentRow.value = row
  try {
    targetConfig.targetAudience = row.targetAudience ? JSON.parse(row.targetAudience) : []
  } catch (e) {
    targetConfig.targetAudience = []
  }
  targetConfig.dailyLimit = row.dailyCap
  targetConfig.rewardPoints = row.rewardPoints
}

// 保存人群定向配置
const handleSaveConfig = async () => {
  if (!currentRow.value) return
  saving.value = true
  try {
    const res = await adminFetch(AD_PREFIX, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adId: currentRow.value.adId,
        targetAudience: targetConfig.targetAudience.length ? JSON.stringify(targetConfig.targetAudience) : null,
        dailyCap: targetConfig.dailyLimit,
        watchLimit: currentRow.value.watchLimit,
        rewardPoints: targetConfig.rewardPoints
      })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('配置已保存')
      fetchList()
    } else {
      ElMessage.error(data.msg || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function beforeSplashUpload(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    ElMessage.error('请选择不超过 5 MB 的 JPG、PNG 或 WebP 图片')
    return false
  }
  return true
}

async function uploadSplashImage(options) {
  uploading.value = true
  try {
    const result = await uploadFile(options.file)
    const url = result?.url || result?.data?.url
    if (!url) throw new Error('上传未返回图片地址')
    form.imageUrl = url
    options.onSuccess(result)
  } catch (error) {
    ElMessage.error(error.message || '图片上传失败')
    options.onError(error)
  } finally { uploading.value = false }
}

// 新增
const handleAdd = () => {
  isEdit.value = false
  originalPosition = ''
  Object.assign(form, defaultForm())
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  isEdit.value = true
  originalPosition = row.adPosition
  Object.assign(form, {
    adId: row.adId,
    adName: row.adName,
    adPosition: row.adPosition,
    adType: row.adType,
    adSource: row.adSource,
    adUnitId: row.adUnitId,
    imageUrl: row.imageUrl || '',
    linkUrl: row.linkUrl || '',
    durationSeconds: row.durationSeconds ?? 5,
    frequencyLimit: row.frequencyLimit,
    dailyCap: row.dailyCap,
    watchLimit: row.watchLimit,
    rewardPoints: row.rewardPoints,
    sort: row.sort,
    dateRange: row.startDate ? [row.startDate, row.endDate] : null,
    remark: row.remark
  })
  dialogVisible.value = true
}

// 提交新增/编辑
const handleSubmit = async () => {
  if (!form.adName || !form.adPosition || !form.adSource) {
    ElMessage.warning('请填写名称、位置和来源')
    return
  }
  if (isSelfSplash.value && !form.imageUrl) {
    ElMessage.warning('请上传开屏图片')
    return
  }
  if (form.linkUrl && !/^https?:\/\//i.test(form.linkUrl)) {
    ElMessage.warning('跳转地址必须是 HTTP 或 HTTPS 链接')
    return
  }
  if (uploading.value) return
  saving.value = true
  try {
    const payload = {
      adId: form.adId,
      adName: form.adName,
      adPosition: form.adPosition,
      adType: isSelfSplash.value ? 'splash_ad' : isEdit.value && form.adPosition === originalPosition && form.adType ? form.adType : typeByPosition[form.adPosition],
      adSource: form.adSource,
      adUnitId: form.adUnitId,
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl,
      durationSeconds: form.durationSeconds,
      frequencyLimit: form.frequencyLimit,
      dailyCap: form.dailyCap,
      watchLimit: form.watchLimit,
      rewardPoints: form.rewardPoints,
      sort: form.sort,
      startDate: form.dateRange ? form.dateRange[0] : null,
      endDate: form.dateRange ? form.dateRange[1] : null,
      remark: form.remark
    }
    const res = await adminFetch(AD_PREFIX, {
      method: isEdit.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
      dialogVisible.value = false
      fetchList()
    } else {
      ElMessage.error(data.msg || '提交失败')
    }
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    saving.value = false
  }
}

// 启用/停用
const handleToggle = async (row) => {
  try {
    const res = await adminFetch(AD_PREFIX, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId: row.adId, isEnabled: row.isEnabled === 1 ? 0 : 1 })
    })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(row.isEnabled === 1 ? '已停用' : '已启用')
      fetchList()
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// 删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除广告位「${row.adName}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await adminFetch(`${AD_PREFIX}/${row.adId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (e) {
    // 取消或失败
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.ad-config-container {
  padding: 20px;
  background-color: #f7f8fa;
  min-height: calc(100vh - 60px);
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
  margin: 0;
}

/* 左右分栏布局 */
.layout-wrapper {
  display: flex;
  gap: 20px;
}

/* 左侧内容区 */
.left-content {
  flex: 1;
  min-width: 0;
}

/* 右侧配置栏 */
.right-sidebar {
  width: 320px;
  flex-shrink: 0;
}

/* 表格卡片 */
.table-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
}

.table-card:last-child {
  margin-bottom: 0;
}

.table-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.table-card :deep(.el-card__body) {
  padding: 20px;
}

/* 配置卡片 */
.config-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
  position: sticky;
  top: 20px;
  height: fit-content;
}

.config-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.config-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.card-title {
  font-size: 14px;
  color: #1f2329;
  font-weight: 600;
}

/* 配置表单 */
.config-form {
  margin: 0;
}

.config-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.config-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: #595959;
  font-weight: 500;
  padding-bottom: 8px;
  line-height: 1.5;
}

.config-form :deep(.el-form-item:last-of-type) {
  margin-bottom: 0;
}

.save-button {
  width: 100%;
  margin-top: 20px;
  height: 36px;
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
  cursor: pointer;
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

/* 表单控件样式 */
:deep(.el-select .el-input__wrapper),
:deep(.el-input-number .el-input__wrapper) {
  border-radius: 4px;
  border-color: #d9d9d9;
}

:deep(.el-input__inner) {
  font-size: 13px;
  color: #262626;
}

:deep(.el-input__inner::placeholder) {
  color: #bfbfbf;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
}

/* 分页 */
.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.current-ad-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 14px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.search-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>

<style scoped>
.splash-media { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; color: #8a8a8a; font-size: 12px; }
.splash-preview { width: 100px; aspect-ratio: 9 / 16; object-fit: cover; border-radius: 4px; background: #f4f4f4; }
</style>
