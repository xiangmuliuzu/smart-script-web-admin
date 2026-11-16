<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-form inline>
          <el-form-item label="菜单名称">
            <el-input v-model="query.menuName" clearable style="width:160px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">搜索</el-button>
            <el-button v-permission="['system:menu:add']" type="success" @click="openForm()">新增菜单</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-table
        :data="rows"
        border
        row-key="menuId"
        default-expand-all
        :tree-props="{ children: 'children' }"
        v-loading="loading"
      >
        <el-table-column prop="menuName" label="菜单名称" min-width="160" />
        <el-table-column prop="orderNum" label="排序" width="80" />
        <el-table-column prop="path" label="路径" min-width="120" />
        <el-table-column prop="component" label="组件" min-width="140" />
        <el-table-column prop="perms" label="权限标识" min-width="140" />
        <el-table-column prop="menuType" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ ({ M: '目录', C: '菜单', F: '按钮' })[row.menuType] || row.menuType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="visible" label="可见" width="70">
          <template #default="{ row }">{{ row.visible === '0' ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.menuType !== 'F'" v-permission="['system:menu:add']" size="small" @click="openForm(null, row)">新增</el-button>
            <el-button v-permission="['system:menu:edit']" size="small" @click="openForm(row)">编辑</el-button>
            <el-button v-permission="['system:menu:remove']" size="small" type="danger" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" :title="form.menuId ? '编辑菜单' : '新增菜单'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            node-key="menuId"
            check-strictly
            :props="{ label: 'menuName', children: 'children' }"
            clearable
            placeholder="根目录"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="菜单类型" required>
          <el-radio-group v-model="form.menuType">
            <el-radio value="M">目录</el-radio>
            <el-radio value="C">菜单</el-radio>
            <el-radio value="F">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" required><el-input v-model="form.menuName" /></el-form-item>
        <el-form-item label="路由地址" required><el-input v-model="form.path" placeholder="不以 / 开头时按父级拼接" /></el-form-item>
        <el-form-item v-if="form.menuType === 'C'" label="组件标识" required>
          <el-input v-model="form.component" placeholder="须命中前端 component 白名单，如 system/user/index" />
        </el-form-item>
        <el-form-item v-if="form.menuType === 'F'" label="权限标识" required>
          <el-input v-model="form.perms" placeholder="如 system:user:add" />
        </el-form-item>
        <el-form-item v-if="form.menuType !== 'F'" label="权限标识">
          <el-input v-model="form.perms" placeholder="可选，如 smartscript:dashboard:view" />
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.orderNum" :min="0" /></el-form-item>
        <el-form-item label="可见">
          <el-switch v-model="form.visible" active-value="0" inactive-value="1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="0" inactive-value="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listMenu, getMenu, addMenu, updateMenu, delMenu } from '@/api/system/menu'
import { buildTree } from '@/utils/tree'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const dialog = ref(false)
const query = reactive({ menuName: '' })
const form = reactive({
  menuId: null,
  parentId: 0,
  menuName: '',
  path: '',
  component: '',
  perms: '',
  menuType: 'C',
  orderNum: 0,
  visible: '0',
  status: '0'
})


const parentOptions = computed(() => [{ menuId: 0, menuName: '根目录', children: rows.value }])

async function load() {
  loading.value = true
  try {
    const res = await listMenu({ menuName: query.menuName || undefined })
    const list = res?.rows || res || []
    rows.value = buildTree(Array.isArray(list) ? list : [])
  } finally {
    loading.value = false
  }
}

function openForm(row, parent) {
  Object.assign(form, {
    menuId: null,
    parentId: parent?.menuId ?? 0,
    menuName: '',
    path: '',
    component: '',
    perms: '',
    menuType: parent?.menuType === 'F' ? 'C' : 'C',
    orderNum: 0,
    visible: '0',
    status: '0'
  })
  if (row?.menuId) {
    Object.assign(form, {
      menuId: row.menuId,
      parentId: row.parentId ?? 0,
      menuName: row.menuName || '',
      path: row.path || '',
      component: row.component || '',
      perms: row.perms || '',
      menuType: row.menuType || 'C',
      orderNum: row.orderNum ?? 0,
      visible: row.visible ?? '0',
      status: row.status ?? '0'
    })
  } else if (parent?.menuId) {
    form.parentId = parent.menuId
  }
  dialog.value = true
}

async function save() {
  if (!form.menuName || !form.path) {
    ElMessage.warning('请填写菜单名称与路由地址')
    return
  }
  if (form.menuType === 'C' && !form.component) {
    ElMessage.warning('菜单类型需填写组件标识')
    return
  }
  if (form.menuType === 'F' && !form.perms) {
    ElMessage.warning('按钮类型需填写权限标识')
    return
  }
  const payload = {
    menuId: form.menuId,
    parentId: form.parentId ?? 0,
    menuName: form.menuName,
    path: form.path,
    component: form.menuType === 'C' ? form.component : form.menuType === 'M' ? null : null,
    perms: form.perms || null,
    menuType: form.menuType,
    orderNum: form.orderNum,
    visible: form.visible,
    status: form.status,
    isFrame: '1',
    isCache: '0'
  }
  saving.value = true
  try {
    if (payload.menuId) await updateMenu(payload)
    else await addMenu(payload)
    ElMessage.success('保存成功')
    dialog.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除菜单「${row.menuName}」？子菜单将一并受影响，请确认。`, '提示', { type: 'warning' })
  await delMenu(row.menuId)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
</style>
