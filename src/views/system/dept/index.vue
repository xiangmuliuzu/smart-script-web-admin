<template>
  <PageContainer>
    <PageHeader title="部门管理" description="维护组织结构与部门负责人">
      <template #actions><el-button v-permission="['system:dept:add']" type="primary" @click="openForm()">新增部门</el-button></template>
    </PageHeader>
    <FilterBar @query="load" @reset="reset">
      <el-form-item label="部门名称"><el-input v-model="query.deptName" clearable @keyup.enter="load" /></el-form-item>
    </FilterBar>
    <el-card>
      <el-table :data="rows" row-key="deptId" default-expand-all v-loading="loading">
        <el-table-column prop="deptName" label="部门名称" min-width="200" />
        <el-table-column prop="orderNum" label="排序" width="80" />
        <el-table-column prop="leader" label="负责人" width="120" />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="状态" width="100"><template #default="{ row }">{{ row.status === '0' ? '正常' : '停用' }}</template></el-table-column>
        <el-table-column label="操作" width="220"><template #default="{ row }">
          <el-button v-permission="['system:dept:add']" size="small" @click="openForm(null, row)">新增</el-button>
          <el-button v-permission="['system:dept:edit']" size="small" @click="openForm(row)">编辑</el-button>
          <el-button v-permission="['system:dept:remove']" size="small" type="danger" @click="remove(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="dialog" :title="form.deptId ? '编辑部门' : '新增部门'" width="520px" :close-on-click-modal="!saving">
      <el-form label-width="90px" :disabled="saving">
        <el-form-item label="上级部门"><el-tree-select v-model="form.parentId" :data="parents" node-key="deptId" :props="{ label: 'deptName' }" check-strictly style="width:100%" /></el-form-item>
        <el-form-item label="部门名称" required><el-input v-model="form.deptName" maxlength="30" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.orderNum" :min="0" /></el-form-item>
        <el-form-item label="负责人"><el-input v-model="form.leader" maxlength="20" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" maxlength="11" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" maxlength="50" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" active-value="0" inactive-value="1" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="dialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </PageContainer>
</template>
<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import { buildTree } from '@/utils/tree'
import { listDept, getDept, listDeptExclude, addDept, updateDept, delDept } from '@/api/system/dept'

const rows = ref([])
const parents = ref([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const query = reactive({ deptName: '' })
const emptyForm = () => ({ deptId: null, parentId: 0, deptName: '', orderNum: 0, leader: '', phone: '', email: '', status: '0' })
const form = reactive(emptyForm())
async function load() {
  loading.value = true
  try { rows.value = buildTree(await listDept({ deptName: query.deptName.trim() || undefined }), 'deptId') }
  finally { loading.value = false }
}
function reset() { query.deptName = ''; load() }
async function openForm(row, parent) {
  Object.assign(form, emptyForm(), { parentId: parent?.deptId ?? 0 })
  const options = row ? await listDeptExclude(row.deptId) : await listDept()
  parents.value = [{ deptId: 0, deptName: '根部门', children: buildTree(options, 'deptId') }]
  if (row) Object.assign(form, await getDept(row.deptId))
  dialog.value = true
}
async function save() {
  if (saving.value) return
  if (!form.deptName.trim()) { ElMessage.warning('请填写部门名称'); return }
  saving.value = true
  try {
    const payload = { ...form, deptName: form.deptName.trim() }
    if (form.deptId) await updateDept(payload)
    else await addDept(payload)
    ElMessage.success('保存成功')
    dialog.value = false
    await load()
  } finally { saving.value = false }
}
async function remove(row) {
  try { await ElMessageBox.confirm(`确认删除部门「${row.deptName}」？`, '提示', { type: 'warning' }) }
  catch { return }
  await delDept(row.deptId)
  ElMessage.success('已删除')
  await load()
}
onMounted(load)
</script>
