<template>
  <div class="page">
    <PageHeader title="参数设置" description="管理系统参数，包括后台登录验证码开关" />
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.configName" placeholder="参数名称" clearable style="width:180px" @keyup.enter="search" />
        <el-input v-model="query.configKey" placeholder="参数键名" clearable style="width:220px" @keyup.enter="search" />
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
        <el-button v-permission="['system:config:add']" type="success" @click="openForm()">新增参数</el-button>
        <el-button v-permission="['system:config:remove']" :loading="refreshing" @click="refresh">刷新缓存</el-button>
      </div>
      <el-table :data="rows" border v-loading="loading">
        <el-table-column prop="configId" label="ID" width="80" />
        <el-table-column prop="configName" label="名称" min-width="140" />
        <el-table-column prop="configKey" label="键名" min-width="140" />
        <el-table-column label="键值" min-width="140" show-overflow-tooltip><template #default="{ row }">{{ row.configKey === CAPTCHA_KEY ? (row.configValue === 'true' ? '开启' : '关闭') : row.configValue }}</template></el-table-column>
        <el-table-column label="类型" width="90"><template #default="{ row }">{{ row.configType === 'Y' ? '内置' : '自定义' }}</template></el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button v-permission="['system:config:edit']" size="small" @click="openForm(row)">编辑</el-button>
            <el-button v-permission="['system:config:remove']" size="small" type="danger" :disabled="row.configType === 'Y'" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination class="pager" layout="total, prev, pager, next" :total="total" :current-page="query.pageNum" :page-size="query.pageSize" @current-change="onPage" />
    </el-card>
    <el-dialog v-model="dialog" :title="form.configId ? '编辑参数' : '新增参数'" width="480px" :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving">
      <el-form :model="form" label-width="90px" :disabled="saving">
        <el-form-item label="名称" required><el-input v-model="form.configName" maxlength="100" /></el-form-item>
        <el-form-item label="键名" required><el-input v-model="form.configKey" maxlength="100" :disabled="!!form.configId && form.configType === 'Y'" /></el-form-item>
        <el-form-item label="验证码" v-if="form.configKey === CAPTCHA_KEY"><el-switch v-model="form.configValue" active-value="true" inactive-value="false" active-text="开启" inactive-text="关闭" /></el-form-item>
        <el-form-item label="键值" v-else required><el-input v-model="form.configValue" maxlength="500" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="form.configType" :disabled="!!form.configId"><el-option label="内置" value="Y" /><el-option label="自定义" value="N" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="dialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { listConfig, addConfig, updateConfig, delConfig, refreshCache } from '@/api/system/config'

const CAPTCHA_KEY = 'sys.account.captchaEnabled'
const loading = ref(false)
const saving = ref(false)
const refreshing = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 10, configName: '', configKey: '' })
const dialog = ref(false)
const form = reactive({ configId: null, configName: '', configKey: '', configValue: '', configType: 'N', remark: '' })

async function load() {
  loading.value = true
  try {
    const res = await listConfig({ ...query })
    rows.value = res?.rows || []
    total.value = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; load() }
function reset() { query.configName = ''; query.configKey = ''; search() }
function onPage(page) { query.pageNum = page; load() }
function openForm(row) {
  Object.assign(form, { configId: null, configName: '', configKey: '', configValue: '', configType: 'N', remark: '' })
  if (row) Object.assign(form, { configId: row.configId, configName: row.configName, configKey: row.configKey, configValue: row.configValue, configType: row.configType, remark: row.remark || '' })
  dialog.value = true
}
async function save() {
  if (saving.value) return
  if (!form.configName.trim() || !form.configKey.trim() || !form.configValue.trim()) {
    ElMessage.warning('请填写参数名称、键名与键值')
    return
  }
  saving.value = true
  try {
    const data = { ...form, configName: form.configName.trim(), configKey: form.configKey.trim() }
    if (form.configId) await updateConfig(data)
    else await addConfig(data)
    ElMessage.success('保存成功')
    dialog.value = false
    await load()
  } finally { saving.value = false }
}
async function onRemove(row) {
  if (row.configType === 'Y') return
  try { await ElMessageBox.confirm(`确认删除参数 ${row.configKey}？`, '提示', { type: 'warning' }) }
  catch { return }
  await delConfig(row.configId)
  ElMessage.success('已删除')
  load()
}
async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try { await refreshCache(); ElMessage.success('缓存已刷新') }
  finally { refreshing.value = false }
}
onMounted(load)
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
