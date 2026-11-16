<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-button v-permission="['system:dict:add']" type="success" @click="openForm()">新增字典类型</el-button>
      </div>
      <el-table :data="rows" border v-loading="loading">
        <el-table-column prop="dictId" label="ID" width="80" />
        <el-table-column prop="dictName" label="字典名称" min-width="140" />
        <el-table-column prop="dictType" label="字典类型" min-width="160" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button v-permission="['system:dict:edit']" size="small" @click="openForm(row)">编辑</el-button>
            <el-button size="small" @click="viewData(row)">字典数据</el-button>
            <el-button v-permission="['system:dict:remove']" size="small" type="danger" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" :title="form.dictId ? '编辑字典' : '新增字典'" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="字典名称"><el-input v-model="form.dictName" /></el-form-item>
        <el-form-item label="字典类型"><el-input v-model="form.dictType" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" active-value="0" inactive-value="1" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dataDialog" :title="`字典数据：${currentType?.dictType || ''}`" width="640px">
      <el-table :data="dataRows" border>
        <el-table-column prop="dictCode" label="编码" width="90" />
        <el-table-column prop="dictLabel" label="标签" min-width="120" />
        <el-table-column prop="dictValue" label="键值" min-width="100" />
        <el-table-column prop="dictSort" label="排序" width="80" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">{{ row.status === '0' ? '正常' : '停用' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listType, addType, updateType, delType, listData } from '@/api/system/dict'

const loading = ref(false)
const rows = ref([])
const dialog = ref(false)
const dataDialog = ref(false)
const dataRows = ref([])
const currentType = ref(null)
const form = reactive({ dictId: null, dictName: '', dictType: '', status: '0' })

async function load() {
  loading.value = true
  try {
    const res = await listType({ pageNum: 1, pageSize: 50 })
    rows.value = res?.rows || []
  } finally {
    loading.value = false
  }
}
function openForm(row) {
  Object.assign(form, { dictId: null, dictName: '', dictType: '', status: '0' })
  if (row) Object.assign(form, { dictId: row.dictId, dictName: row.dictName, dictType: row.dictType, status: row.status })
  dialog.value = true
}
async function save() {
  if (form.dictId) await updateType({ ...form })
  else await addType({ ...form })
  ElMessage.success('保存成功')
  dialog.value = false
  load()
}
async function viewData(row) {
  currentType.value = row
  const res = await listData({ dictType: row.dictType, pageNum: 1, pageSize: 50 })
  dataRows.value = res?.rows || []
  dataDialog.value = true
}
async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除字典 ${row.dictName}？`, '提示', { type: 'warning' })
  await delType(row.dictId)
  ElMessage.success('已删除')
  load()
}
onMounted(load)
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
</style>
