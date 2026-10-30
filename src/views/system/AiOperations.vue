<template>
  <div class="ai-skill-container">
    <div class="page-header">
      <h2 class="page-title">AI Skill 配置</h2>
      <el-button type="primary" class="black-button" @click="openAdd">新增 Skill</el-button>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-input
          v-model="query.skillName"
          placeholder="Skill 名称"
          clearable
          style="width: 200px"
          @keyup.enter="fetchList"
        />
        <el-select v-model="query.skillType" placeholder="类型" clearable style="width: 160px">
          <el-option label="剧本/写作/润色" value="write" />
          <el-option label="分镜" value="storyboard" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px">
          <el-option label="启用" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
        <el-button type="primary" class="black-button" @click="fetchList">查询</el-button>
      </div>

      <el-table :data="list" v-loading="loading" style="width: 100%" class="table-margin">
        <el-table-column prop="skillName" label="Skill 名称" min-width="160" />
        <el-table-column label="类型" width="150">
          <template #default="{ row }">
            <el-tag :type="row.skillType === 'storyboard' ? 'warning' : 'primary'" size="small">
              {{ row.skillType === 'storyboard' ? '分镜' : '剧本/写作/润色' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'info'" size="small">
              {{ row.status === '0' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ row.createTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDetail(row)">预览</el-button>
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" @click="toggleStatus(row)">
              {{ row.status === '0' ? '停用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 Skill' : '新增 Skill'" width="520px" destroy-on-close>
      <el-form :model="form" label-width="90px">
        <el-form-item label="Skill 名称" required>
          <el-input v-model="form.skillName" placeholder="如：悬疑烧脑导演" maxlength="50" />
        </el-form-item>
        <el-form-item label="Skill 类型" required>
          <el-select v-model="form.skillType" placeholder="选择用途" style="width: 100%">
            <el-option label="剧本 / 写作 / 润色" value="write" />
            <el-option label="分镜" value="storyboard" />
          </el-select>
          <div class="file-hint">分镜 skill 与其他三个用途不同：剧本/写作/润色可共用，分镜单独一类（镜头语言/画面拆解）。</div>
        </el-form-item>
        <el-form-item label="Skill 文件" :required="!editingId">
          <div class="file-row">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".md,.txt,.skill"
              :on-change="handleFileChange"
            >
              <el-button>选择文件</el-button>
            </el-upload>
            <span class="file-name">{{ form.fileName || (editingId ? '不修改则保留原文件' : '未选择') }}</span>
          </div>
          <div class="file-hint">直接上传 skill 文件（md/txt），内容将作为 AI 导演指令生效；文件不超过 200KB。</div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="'0'" :inactive-value="'1'" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="black-button" :loading="submitting" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog v-model="detailVisible" title="Skill 内容预览" width="680px">
      <div class="detail-meta">
        <span><b>{{ detail.skillName }}</b></span>
        <span class="detail-file">{{ detail.fileName }}</span>
      </div>
      <pre class="detail-content">{{ detail.fileContent || '（空）' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminFetch from '@/utils/adminFetch'

const BASE = '/api/v1/admin/content/ai-skill'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ skillName: '', skillType: '', status: '', pageNum: 1, pageSize: 10 })

const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const form = reactive({ skillName: '', skillType: 'write', status: '0', file: null, fileName: '' })

const detailVisible = ref(false)
const detail = reactive({ skillName: '', fileName: '', fileContent: '' })

async function fetchList() {
  loading.value = true
  try {
    const params = new URLSearchParams({ pageNum: query.pageNum, pageSize: query.pageSize })
    if (query.skillName) params.set('skillName', query.skillName)
    if (query.skillType !== '') params.set('skillType', query.skillType)
    if (query.status !== '') params.set('status', query.status)
    const resp = await adminFetch(`${BASE}/list?${params.toString()}`)
    const json = await resp.json()
    if (json.code !== 200) {
      ElMessage.error(json.msg || '加载失败')
      return
    }
    list.value = json.rows || []
    total.value = json.total || 0
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingId.value = null
  form.skillName = ''
  form.skillType = 'write'
  form.status = '0'
  form.file = null
  form.fileName = ''
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.skillName = row.skillName
  form.skillType = row.skillType === 'storyboard' ? 'storyboard' : 'write'
  form.status = row.status
  form.file = null
  form.fileName = ''
  dialogVisible.value = true
}

function handleFileChange(file) {
  const raw = file.raw
  if (!raw) return
  if (raw.size > 200 * 1024) {
    ElMessage.error('文件过大，请控制在 200KB 以内')
    form.file = null
    form.fileName = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    // 重建为纯文本 File，随 FormData 上传（后端按 UTF-8 文本读取）
    form.file = new File([reader.result], raw.name, { type: 'text/plain' })
    form.fileName = raw.name
  }
  reader.readAsText(raw, 'utf-8')
}

async function handleSave() {
  if (!form.skillName || !form.skillName.trim()) {
    ElMessage.error('请填写 Skill 名称')
    return
  }
  if (!editingId.value && !form.file) {
    ElMessage.error('请选择 Skill 文件')
    return
  }
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('skillName', form.skillName.trim())
    fd.append('skillType', form.skillType || 'write')
    if (editingId.value) fd.append('id', editingId.value)
    if (form.file) fd.append('file', form.file)
    fd.append('status', form.status)
    const resp = await adminFetch(BASE, {
      method: editingId.value ? 'PUT' : 'POST',
      body: fd,
      headers: {} // FormData 由浏览器自动设置 Content-Type
    })
    const json = await resp.json()
    if (json.code !== 200) {
      ElMessage.error(json.msg || '保存失败')
      return
    }
    ElMessage.success(editingId.value ? '修改成功' : '新增成功')
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row) {
  const next = row.status === '0' ? '1' : '0'
  try {
    await ElMessageBox.confirm(`确定要${next === '1' ? '停用' : '启用'}「${row.skillName}」吗？`, '提示')
  } catch {
    return
  }
  const fd = new FormData()
  fd.append('id', row.id)
  fd.append('skillName', row.skillName)
  fd.append('status', next)
  const resp = await adminFetch(BASE, { method: 'PUT', body: fd, headers: {} })
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '操作失败')
    return
  }
  ElMessage.success('操作成功')
  fetchList()
}

async function openDetail(row) {
  const resp = await adminFetch(`${BASE}/${row.id}`)
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '预览失败')
    return
  }
  detail.skillName = json.data.skillName
  detail.fileName = json.data.fileName
  detail.fileContent = json.data.fileContent
  detailVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.skillName}」吗？删除后不可恢复。`, '警告', { type: 'warning' })
  } catch {
    return
  }
  const resp = await adminFetch(`${BASE}/${row.id}`, { method: 'DELETE' })
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '删除失败')
    return
  }
  ElMessage.success('删除成功')
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.ai-skill-container { padding: 8px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #303133; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.table-margin { margin-top: 4px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.black-button { background: #1f1f1f; border-color: #1f1f1f; }
.file-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.file-name { color: #606266; font-size: 13px; }
.file-hint { color: #909399; font-size: 12px; line-height: 1.5; margin-top: 6px; }
.detail-meta { margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
.detail-file { color: #909399; font-size: 13px; }
.detail-content {
  margin: 0; padding: 12px; max-height: 420px; overflow: auto;
  background: #f5f7fa; border-radius: 6px; white-space: pre-wrap;
  font-size: 13px; color: #303133; line-height: 1.7;
}
</style>
