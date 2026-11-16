<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-button v-permission="['system:role:add']" type="success" @click="openForm()">新增角色</el-button>
      </div>
      <el-table :data="rows" border v-loading="loading">
        <el-table-column prop="roleId" label="ID" width="80" />
        <el-table-column prop="roleName" label="角色名称" min-width="120" />
        <el-table-column prop="roleKey" label="权限字符" min-width="120" />
        <el-table-column prop="roleSort" label="排序" width="80" />
        <el-table-column label="可授予App用户" width="130">
          <template #default="{ row }">
            <el-tag :type="row.appGrantable ? 'success' : 'info'">
              {{ row.appGrantable ? '可授予' : '不可授予' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button v-permission="['system:role:edit']" size="small" @click="openForm(row)">编辑</el-button>
            <el-button v-permission="['system:role:remove']" size="small" type="danger" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="dialog" :title="form.roleId ? '编辑角色' : '新增角色'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="角色名称" required><el-input v-model="form.roleName" /></el-form-item>
        <el-form-item label="权限字符" required><el-input v-model="form.roleKey" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.roleSort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" active-value="0" inactive-value="1" /></el-form-item>
        <el-form-item label="可授予App用户">
          <el-switch v-model="form.appGrantable" :disabled="isProtectedRole" />
          <div class="form-hint">
            开启后该角色可被授予 App 用户；超级管理员角色不可授予。
          </div>
        </el-form-item>
        <el-form-item label="菜单权限">
          <el-tree
            ref="menuTreeRef"
            :data="menuOptions"
            node-key="id"
            show-checkbox
            default-expand-all
            :props="{ label: 'label', children: 'children' }"
          />
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
import { computed, reactive, ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRole, getRole, addRole, updateRole, delRole } from '@/api/system/role'
import { menuTreeselect, roleMenuTreeselect } from '@/api/system/menu'
import {
  collectRolePayload,
  extractRoleMenuSelection,
  mapMenuTreeSelect
} from '@/utils/ruoyi-response'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const dialog = ref(false)
const menuOptions = ref([])
const menuTreeRef = ref(null)
/**
 * 受保护角色（超级管理员）：仅用于禁用前端开关的体验层提示。
 *
 * 真正的授权硬约束在服务端：AppUserAdminMapper 对 role_id=1 / role_key='admin'
 * 无条件拒绝，SysRoleServiceImpl 也会把该角色的标记强制回 false。
 * 此处不是权限判定，不得作为任何授权依据。
 */
const isProtectedRole = computed(() =>
  form.roleId === 1 || form.roleKey === 'admin'
)
const form = reactive({
  roleId: null,
  roleName: '',
  roleKey: '',
  roleSort: 0,
  appGrantable: false,
  status: '0',
  menuIds: []
})

async function load() {
  loading.value = true
  try {
    const res = await listRole({ pageNum: 1, pageSize: 50 })
    rows.value = res?.rows || []
  } finally {
    loading.value = false
  }
}

async function openForm(row) {
  Object.assign(form, {
    roleId: null,
    roleName: '',
    roleKey: '',
    roleSort: 0,
    status: '0',
    // 新增角色必须显式复位可授予标记：遗漏会把上一次编辑的可授权状态
    // 带进新角色，破坏「默认拒绝」原则。
    appGrantable: false,
    menuIds: []
  })
  menuOptions.value = []

  if (row?.roleId) {
    // 编辑：角色信息 + 已授权菜单树（getRole 不含 menuIds，必须调 roleMenuTreeselect）
    const detail = await getRole(row.roleId)
    const role = detail?.role && typeof detail.role === 'object' ? detail.role : detail
    Object.assign(form, {
      roleId: role.roleId ?? row.roleId,
      roleName: role.roleName ?? row.roleName,
      roleKey: role.roleKey ?? row.roleKey,
      roleSort: role.roleSort ?? row.roleSort,
      appGrantable: (role.appGrantable ?? row.appGrantable) === true,
      status: role.status ?? row.status ?? '0',
      menuIds: []
    })
    const treeRaw = await roleMenuTreeselect(row.roleId)
    const { checkedKeys, menus } = extractRoleMenuSelection(treeRaw)
    menuOptions.value = mapMenuTreeSelect(menus)
    form.menuIds = checkedKeys
  } else {
    const treeRaw = await menuTreeselect()
    const list = Array.isArray(treeRaw) ? treeRaw : treeRaw?.menus || treeRaw?.data || []
    menuOptions.value = mapMenuTreeSelect(list)
    form.menuIds = []
  }

  dialog.value = true
  await nextTick()
  menuTreeRef.value?.setCheckedKeys(form.menuIds || [])
}

function collectMenuIds() {
  const checked = menuTreeRef.value?.getCheckedKeys?.() || []
  const half = menuTreeRef.value?.getHalfCheckedKeys?.() || []
  return [...checked, ...half].filter((id) => id !== null && id !== undefined)
}

async function save() {
  if (!form.roleName || !form.roleKey) {
    ElMessage.warning('请填写角色名称与权限字符')
    return
  }
  const payload = collectRolePayload(form, collectMenuIds())
  saving.value = true
  try {
    if (payload.roleId) await updateRole(payload)
    else await addRole(payload)
    ElMessage.success('保存成功')
    dialog.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除角色 ${row.roleName}？`, '提示', { type: 'warning' })
  await delRole(row.roleId)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
</style>
