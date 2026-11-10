<template>
  <div class="ai-skill-container">
    <div class="page-header">
      <h2 class="page-title">ai创作skill和模型配置</h2>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- ==================== Tab 1：Skill 配置 ==================== -->
      <el-tab-pane label="Skill 配置" name="skill">
        <div class="tab-head">
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

        <!-- 新增 / 编辑 Skill 对话框 -->
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
            <el-form-item label="Skill 内容" :required="!editingId">
              <div class="file-row">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  accept=".md,.txt,.skill"
                  :on-change="handleFileChange"
                >
                  <el-button>选择单文件</el-button>
                </el-upload>
                <el-button @click="pickFolder">选择整个文件夹</el-button>
                <input
                  ref="folderInput"
                  type="file"
                  webkitdirectory
                  multiple
                  class="hidden-input"
                  @change="handleFolderChange"
                />
              </div>
              <div class="file-hint">
                支持整个 skill 文件夹（SKILL.md + references/ 等），按原目录结构整体保存、整体注入，无需合并成一个文件；
                单个文件 ≤300KB、整包 ≤2MB。
              </div>
              <div v-if="form.files.length" class="folder-preview">
                <div class="folder-title">
                  已选文件夹：{{ form.folderName }}（{{ form.files.length }} 个文件）
                </div>
                <div class="folder-list">
                  <span v-for="f in form.files" :key="f.path" class="folder-item">{{ f.path }}</span>
                </div>
              </div>
              <div v-else class="file-row">
                <span class="file-name">{{ form.fileName || (editingId ? '不修改则保留原内容' : '未选择') }}</span>
              </div>
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
        <el-dialog v-model="detailVisible" title="Skill 内容预览" width="760px">
          <div class="detail-meta">
            <span><b>{{ detail.skillName }}</b></span>
            <span class="detail-file">{{ detail.fileName }}</span>
            <span v-if="detailFiles.length" class="detail-file">共 {{ detailFiles.length }} 个文件</span>
          </div>
          <div v-if="detailFiles.length">
            <div class="folder-list">
              <span v-for="f in detailFiles" :key="f.path" class="folder-item">{{ f.path }}</span>
            </div>
            <el-collapse v-model="detailActive">
              <el-collapse-item v-for="(f, i) in detailFiles" :key="f.path" :name="String(i)">
                <template #title>
                  <span class="detail-file-title">{{ f.path }}</span>
                  <span class="detail-file-size">{{ f.content.length }} 字符</span>
                </template>
                <pre class="detail-content">{{ f.content }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>
          <pre v-else class="detail-content">{{ detail.fileContent || '（空）' }}</pre>
        </el-dialog>
      </el-tab-pane>

      <!-- ==================== Tab 2：AI 渠道 / 模型配置 ==================== -->
      <el-tab-pane label="AI 渠道/模型配置" name="channel">
        <div class="tab-head">
          <el-button type="primary" class="black-button" @click="openChannelAdd">新增渠道</el-button>
        </div>
        <el-card shadow="never">
          <div class="toolbar">
            <el-input
              v-model="channelQuery.channelName"
              placeholder="渠道名称"
              clearable
              style="width: 200px"
              @keyup.enter="fetchChannelList"
            />
            <el-select v-model="channelQuery.status" placeholder="状态" clearable style="width: 130px">
              <el-option label="启用" value="0" />
              <el-option label="停用" value="1" />
            </el-select>
            <el-button type="primary" class="black-button" @click="fetchChannelList">查询</el-button>
            <span class="toolbar-tip">配置后，用户端 / App 端将可按模型调用各渠道 AI（未配置模型时回退默认环境）。</span>
          </div>

          <el-table :data="channelList" v-loading="channelLoading" style="width: 100%" class="table-margin">
            <el-table-column prop="channelName" label="渠道名称" min-width="120" />
            <el-table-column prop="provider" label="服务商" min-width="100">
              <template #default="{ row }">{{ row.provider || '-' }}</template>
            </el-table-column>
            <el-table-column prop="baseUrl" label="API 基址" min-width="200" show-overflow-tooltip />
            <el-table-column label="模型列表" min-width="200">
              <template #default="{ row }">
                <el-tag v-for="m in splitModels(row.models)" :key="m" size="small" class="model-tag">{{ m }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="defaultModel" label="默认模型" width="130" />
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
            <el-table-column label="操作" width="210" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openChannelEdit(row)">编辑</el-button>
                <el-button size="small" @click="toggleChannelStatus(row)">
                  {{ row.status === '0' ? '停用' : '启用' }}
                </el-button>
                <el-button size="small" type="danger" @click="handleChannelDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <el-pagination
              v-model:current-page="channelQuery.pageNum"
              v-model:page-size="channelQuery.pageSize"
              :total="channelTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchChannelList"
              @current-change="fetchChannelList"
            />
          </div>
        </el-card>

        <!-- 新增 / 编辑渠道对话框 -->
        <el-dialog v-model="channelDialogVisible" :title="channelEditingId ? '编辑渠道' : '新增渠道'" width="560px" destroy-on-close>
          <el-form :model="channelForm" label-width="100px">
            <el-form-item label="渠道名称" required>
              <el-input v-model="channelForm.channelName" placeholder="如：DeepSeek" maxlength="50" />
            </el-form-item>
            <el-form-item label="服务商">
              <el-input v-model="channelForm.provider" placeholder="如：deepseek / openai（选填）" maxlength="50" />
            </el-form-item>
            <el-form-item label="API 基址" required>
              <el-input v-model="channelForm.baseUrl" placeholder="如：https://api.deepseek.com" />
              <div class="file-hint">调用将请求 {基址}/v1/chat/completions。</div>
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="channelForm.apiKey" placeholder="渠道密钥" show-password :clearable="false" />
              <div class="file-hint">{{ channelEditingId ? '留空表示不修改；新增时必填，否则该渠道不参与调用路由。' : '必填，否则该渠道不参与调用路由（调用回退默认环境）。' }}</div>
            </el-form-item>
            <el-form-item label="模型列表" required>
              <el-input v-model="channelForm.models" placeholder="逗号分隔，如：deepseek-chat,deepseek-reasoner,deepseek-flash" />
            </el-form-item>
            <el-form-item label="默认模型" required>
              <el-select v-model="channelForm.defaultModel" placeholder="从模型列表中选择" style="width: 100%" filterable>
                <el-option v-for="m in channelModelOptions" :key="m" :label="m" :value="m" />
              </el-select>
              <div class="file-hint">默认模型必须属于上方模型列表；用户端未指定模型时使用该模型。</div>
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="channelForm.status" :active-value="'0'" :inactive-value="'1'" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="channelDialogVisible = false">取消</el-button>
            <el-button type="primary" class="black-button" :loading="channelSubmitting" @click="handleChannelSave">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminFetch from '@/utils/adminFetch'

const SKILL_BASE = '/api/v1/admin/content/ai-skill'
const CHANNEL_BASE = '/api/v1/admin/content/ai-channel'

const activeTab = ref('skill')

/* ==================== Skill 配置 ==================== */
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ skillName: '', skillType: '', status: '', pageNum: 1, pageSize: 10 })

const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const form = reactive({ skillName: '', skillType: 'write', status: '0', file: null, fileName: '', files: [], folderName: '' })
const folderInput = ref(null)

/** 文件夹上传约束（与后端 BUNDLE_* 常量一致） */
const BUNDLE_FILE_MAX_BYTES = 300 * 1024
const BUNDLE_TOTAL_MAX_BYTES = 2 * 1024 * 1024
const BUNDLE_MAX_FILES = 200
const TEXT_SUFFIXES = ['.md', '.markdown', '.txt', '.skill', '.json', '.yaml', '.yml', '.csv']

const detailVisible = ref(false)
const detail = reactive({ skillName: '', fileName: '', fileContent: '', fileTree: '' })
const detailActive = ref(['0'])

async function fetchList() {
  loading.value = true
  try {
    const params = new URLSearchParams({ pageNum: query.pageNum, pageSize: query.pageSize })
    if (query.skillName) params.set('skillName', query.skillName)
    if (query.skillType !== '') params.set('skillType', query.skillType)
    if (query.status !== '') params.set('status', query.status)
    const resp = await adminFetch(`${SKILL_BASE}/list?${params.toString()}`)
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

/** 预览用：把 file_tree（@@@FILE:路径@@@ 分段）解析成文件列表 */
const detailFiles = computed(() => parseFileTree(detail.fileTree))

function parseFileTree(tree) {
  if (!tree) return []
  const files = []
  let current = null
  tree.split('\n').forEach((line) => {
    if (line.startsWith('@@@FILE:') && line.endsWith('@@@') && line.length > 11) {
      current = { path: line.slice(8, -3), content: '' }
      files.push(current)
    } else if (current) {
      current.content = current.content === '' ? line : `${current.content}\n${line}`
    }
  })
  return files
}

function openAdd() {
  editingId.value = null
  form.skillName = ''
  form.skillType = 'write'
  form.status = '0'
  form.file = null
  form.fileName = ''
  form.files = []
  form.folderName = ''
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.skillName = row.skillName
  form.skillType = row.skillType === 'storyboard' ? 'storyboard' : 'write'
  form.status = row.status
  form.file = null
  form.fileName = ''
  form.files = []
  form.folderName = ''
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
    form.files = []
    form.folderName = ''
  }
  reader.readAsText(raw, 'utf-8')
}

/** 打开系统目录选择（webkitdirectory，按相对路径批量上传） */
function pickFolder() {
  folderInput.value?.click()
}

function handleFolderChange(event) {
  const picked = Array.from(event.target.files || [])
  // 清空以便重复选择同一文件夹时仍触发 change
  event.target.value = ''
  if (!picked.length) return
  const items = []
  const rootNames = new Set()
  let total = 0
  let skipped = 0
  for (const f of picked) {
    const path = (f.webkitRelativePath || f.name).replace(/\\/g, '/')
    const lower = path.toLowerCase()
    if (!TEXT_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
      skipped++
      continue
    }
    if (f.size > BUNDLE_FILE_MAX_BYTES) {
      ElMessage.error(`文件「${path}」超过 300KB，请精简后再上传`)
      return
    }
    total += f.size
    if (total > BUNDLE_TOTAL_MAX_BYTES) {
      ElMessage.error('文件夹总大小超过 2MB，请精简后再上传')
      return
    }
    if (items.length >= BUNDLE_MAX_FILES) {
      ElMessage.error(`文件数超过上限 ${BUNDLE_MAX_FILES} 个`)
      return
    }
    items.push({ path, file: f })
    const root = path.includes('/') ? path.split('/')[0] : ''
    if (root) rootNames.add(root)
  }
  if (!items.length) {
    ElMessage.error('该文件夹内没有可用的文本 skill 文件（md/markdown/txt/skill/json/yaml/yml/csv）')
    return
  }
  form.files = items
  form.folderName = rootNames.size === 1 ? [...rootNames][0] : 'skill 包'
  form.file = null
  form.fileName = ''
  if (skipped > 0) ElMessage.info(`已忽略 ${skipped} 个非文本文件`)
}

async function handleSave() {
  if (!form.skillName || !form.skillName.trim()) {
    ElMessage.error('请填写 Skill 名称')
    return
  }
  if (!editingId.value && !form.file && form.files.length === 0) {
    ElMessage.error('请选择 skill 文件，或选择整个 skill 文件夹')
    return
  }
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('skillName', form.skillName.trim())
    fd.append('skillType', form.skillType || 'write')
    if (editingId.value) fd.append('id', editingId.value)
    if (form.files.length) {
      // 整目录上传：files 与 paths 一一对应，后端按原目录结构落库
      form.files.forEach((item) => {
        fd.append('files', item.file)
        fd.append('paths', item.path)
      })
    } else if (form.file) {
      fd.append('file', form.file)
    }
    fd.append('status', form.status)
    const resp = await adminFetch(SKILL_BASE, {
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
  const resp = await adminFetch(SKILL_BASE, { method: 'PUT', body: fd, headers: {} })
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '操作失败')
    return
  }
  ElMessage.success('操作成功')
  fetchList()
}

async function openDetail(row) {
  const resp = await adminFetch(`${SKILL_BASE}/${row.id}`)
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '预览失败')
    return
  }
  detail.skillName = json.data.skillName
  detail.fileName = json.data.fileName
  detail.fileContent = json.data.fileContent
  detail.fileTree = json.data.fileTree || ''
  detailActive.value = ['0']
  detailVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.skillName}」吗？删除后不可恢复。`, '警告', { type: 'warning' })
  } catch {
    return
  }
  const resp = await adminFetch(`${SKILL_BASE}/${row.id}`, { method: 'DELETE' })
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '删除失败')
    return
  }
  ElMessage.success('删除成功')
  fetchList()
}

/* ==================== AI 渠道 / 模型配置 ==================== */
const channelLoading = ref(false)
const channelList = ref([])
const channelTotal = ref(0)
const channelQuery = reactive({ channelName: '', status: '', pageNum: 1, pageSize: 10 })

const channelDialogVisible = ref(false)
const channelEditingId = ref(null)
const channelSubmitting = ref(false)
const channelForm = reactive({ channelName: '', provider: '', baseUrl: '', apiKey: '', models: '', defaultModel: '', status: '0' })

/** 模型列表输入 → 默认模型下拉选项（实时跟随） */
const channelModelOptions = computed(() =>
  (channelForm.models || '').split(',').map((s) => s.trim()).filter(Boolean)
)

function splitModels(models) {
  return (models || '').split(',').map((s) => s.trim()).filter(Boolean)
}

async function fetchChannelList() {
  channelLoading.value = true
  try {
    const params = new URLSearchParams({ pageNum: channelQuery.pageNum, pageSize: channelQuery.pageSize })
    if (channelQuery.channelName) params.set('channelName', channelQuery.channelName)
    if (channelQuery.status !== '') params.set('status', channelQuery.status)
    const resp = await adminFetch(`${CHANNEL_BASE}/list?${params.toString()}`)
    const json = await resp.json()
    if (json.code !== 200) {
      ElMessage.error(json.msg || '加载失败')
      return
    }
    channelList.value = json.rows || []
    channelTotal.value = json.total || 0
  } finally {
    channelLoading.value = false
  }
}

function resetChannelForm() {
  channelForm.channelName = ''
  channelForm.provider = ''
  channelForm.baseUrl = ''
  channelForm.apiKey = ''
  channelForm.models = ''
  channelForm.defaultModel = ''
  channelForm.status = '0'
}

function openChannelAdd() {
  channelEditingId.value = null
  resetChannelForm()
  channelDialogVisible.value = true
}

async function openChannelEdit(row) {
  channelEditingId.value = row.channelId
  resetChannelForm()
  channelForm.channelName = row.channelName || ''
  channelForm.provider = row.provider || ''
  channelForm.baseUrl = row.baseUrl || ''
  channelForm.models = row.models || ''
  channelForm.defaultModel = row.defaultModel || ''
  channelForm.status = row.status || '0'
  channelDialogVisible.value = true
  // 拉详情回显 apiKey（列表接口不含密钥）
  try {
    const resp = await adminFetch(`${CHANNEL_BASE}/${row.channelId}`)
    const json = await resp.json()
    if (json.code === 200 && json.data) {
      channelForm.apiKey = json.data.apiKey || ''
    }
  } catch {
    // 回显失败不阻塞编辑
  }
}

async function handleChannelSave() {
  if (!channelForm.channelName || !channelForm.channelName.trim()) {
    ElMessage.error('请填写渠道名称')
    return
  }
  if (!channelForm.baseUrl || !channelForm.baseUrl.trim()) {
    ElMessage.error('请填写 API 基址')
    return
  }
  if (!channelForm.models || !channelForm.models.trim()) {
    ElMessage.error('请填写模型列表')
    return
  }
  if (!channelForm.defaultModel || !channelForm.defaultModel.trim()) {
    ElMessage.error('请选择默认模型')
    return
  }
  if (!channelModelOptions.value.includes(channelForm.defaultModel.trim())) {
    ElMessage.error('默认模型必须属于模型列表')
    return
  }
  if (!channelEditingId.value && !channelForm.apiKey.trim()) {
    ElMessage.error('新增渠道必须填写 API Key')
    return
  }
  const body = {
    channelName: channelForm.channelName.trim(),
    provider: channelForm.provider.trim() || null,
    baseUrl: channelForm.baseUrl.trim(),
    models: channelForm.models.trim(),
    defaultModel: channelForm.defaultModel.trim(),
    status: channelForm.status
  }
  if (channelEditingId.value) {
    body.channelId = channelEditingId.value
    if (channelForm.apiKey && channelForm.apiKey.trim()) body.apiKey = channelForm.apiKey.trim()
  } else {
    body.apiKey = channelForm.apiKey.trim()
  }
  channelSubmitting.value = true
  try {
    const resp = await adminFetch(CHANNEL_BASE, {
      method: channelEditingId.value ? 'PUT' : 'POST',
      body: JSON.stringify(body)
    })
    const json = await resp.json()
    if (json.code !== 200) {
      ElMessage.error(json.msg || '保存失败')
      return
    }
    ElMessage.success(channelEditingId.value ? '修改成功' : '新增成功')
    channelDialogVisible.value = false
    fetchChannelList()
  } finally {
    channelSubmitting.value = false
  }
}

async function toggleChannelStatus(row) {
  const next = row.status === '0' ? '1' : '0'
  try {
    await ElMessageBox.confirm(`确定要${next === '1' ? '停用' : '启用'}「${row.channelName}」吗？`, '提示')
  } catch {
    return
  }
  const resp = await adminFetch(CHANNEL_BASE, {
    method: 'PUT',
    body: JSON.stringify({ channelId: row.channelId, status: next })
  })
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '操作失败')
    return
  }
  ElMessage.success('操作成功')
  fetchChannelList()
}

async function handleChannelDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除渠道「${row.channelName}」吗？删除后不可恢复。`, '警告', { type: 'warning' })
  } catch {
    return
  }
  const resp = await adminFetch(`${CHANNEL_BASE}/${row.channelId}`, { method: 'DELETE' })
  const json = await resp.json()
  if (json.code !== 200) {
    ElMessage.error(json.msg || '删除失败')
    return
  }
  ElMessage.success('删除成功')
  fetchChannelList()
}

onMounted(() => {
  fetchList()
  fetchChannelList()
})
</script>

<style scoped>
.ai-skill-container { padding: 8px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #303133; }
.tab-head { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; }
.toolbar-tip { color: #909399; font-size: 12px; margin-left: 4px; }
.table-margin { margin-top: 4px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.black-button { background: #1f1f1f; border-color: #1f1f1f; }
.file-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.file-name { color: #606266; font-size: 13px; }
.file-hint { color: #909399; font-size: 12px; line-height: 1.5; margin-top: 6px; }
.detail-meta { margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
.detail-file { color: #909399; font-size: 13px; }
.hidden-input { display: none; }
.folder-preview { width: 100%; margin-top: 8px; }
.folder-title { color: #303133; font-size: 13px; margin-bottom: 6px; }
.folder-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.folder-item {
  padding: 2px 8px; background: #f2f3f5; border-radius: 4px;
  color: #606266; font-size: 12px; font-family: Consolas, monospace; word-break: break-all;
}
.detail-file-title { color: #303133; font-size: 13px; }
.detail-file-size { color: #a8abb2; font-size: 12px; margin-left: 8px; }
.detail-content {
  margin: 0; padding: 12px; max-height: 420px; overflow: auto;
  background: #f5f7fa; border-radius: 6px; white-space: pre-wrap;
  font-size: 13px; color: #303133; line-height: 1.7;
}
.model-tag { margin-right: 6px; margin-bottom: 4px; }
</style>
