<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-button v-permission="['system:post:add']" type="success" @click="openForm()">新增岗位</el-button>
      </div>
      <el-table :data="rows" border v-loading="loading">
        <el-table-column prop="postId" label="ID" width="80" />
        <el-table-column prop="postCode" label="编码" min-width="120" />
        <el-table-column prop="postName" label="名称" min-width="120" />
        <el-table-column prop="postSort" label="排序" width="80" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button v-permission="['system:post:edit']" size="small" @click="openForm(row)">编辑</el-button>
            <el-button v-permission="['system:post:remove']" size="small" type="danger" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="dialog" :title="form.postId ? '编辑岗位' : '新增岗位'" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="编码"><el-input v-model="form.postCode" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.postName" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.postSort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" active-value="0" inactive-value="1" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPost, addPost, updatePost, delPost } from '@/api/system/post'

const loading = ref(false)
const rows = ref([])
const dialog = ref(false)
const form = reactive({ postId: null, postCode: '', postName: '', postSort: 0, status: '0' })

async function load() {
  loading.value = true
  try {
    const res = await listPost({ pageNum: 1, pageSize: 50 })
    rows.value = res?.rows || []
  } finally {
    loading.value = false
  }
}
function openForm(row) {
  Object.assign(form, { postId: null, postCode: '', postName: '', postSort: 0, status: '0' })
  if (row) Object.assign(form, { postId: row.postId, postCode: row.postCode, postName: row.postName, postSort: row.postSort, status: row.status })
  dialog.value = true
}
async function save() {
  if (form.postId) await updatePost({ ...form })
  else await addPost({ ...form })
  ElMessage.success('保存成功')
  dialog.value = false
  load()
}
async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除岗位 ${row.postName}？`, '提示', { type: 'warning' })
  await delPost(row.postId)
  ElMessage.success('已删除')
  load()
}
onMounted(load)
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
</style>
