<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-form inline>
          <el-form-item label="用户名">
            <el-input v-model="query.userName" placeholder="用户名" clearable style="width:160px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width:120px">
              <el-option label="正常" value="0" />
              <el-option label="停用" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">搜索</el-button>
            <el-button v-permission="['system:user:add']" type="success" @click="openForm()">新增</el-button>
            <el-tooltip content="在表格勾选多个账号后批量授予角色" placement="top">
              <span>
                <el-button
                  v-permission="['system:user:edit']"
                  type="warning"
                  plain
                  :disabled="selection.length === 0"
                  @click="openGrant"
                >
                  批量授权
                </el-button>
              </span>
            </el-tooltip>
          </el-form-item>
        </el-form>
      </div>
      <el-table :data="rows" border v-loading="loading" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="46" :selectable="(row) => row.userType === '00'" />
        <el-table-column prop="userId" label="ID" width="80" />
        <el-table-column prop="userName" label="用户名" min-width="120" />
        <el-table-column label="账号域" width="100">
          <template #default="{ row }">
            <el-tag :type="row.userType === '00' ? 'primary' : 'info'" effect="plain">
              {{ row.userType === '00' ? 'PC 管理员' : 'APP 账号' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nickName" label="昵称" min-width="120" />
        <el-table-column prop="phonenumber" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.email || '—' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['system:user:edit']" size="small" @click="openForm(row)">编辑</el-button>
            <el-button v-permission="['system:user:remove']" size="small" type="danger" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pager"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="query.pageSize || 10"
        :current-page="query.pageNum || 1"
        @current-change="onPage"
      />
    </el-card>

    <el-dialog v-model="dialog" :title="form.userId ? '编辑用户' : '新增用户'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="用户名" required><el-input v-model="form.userName" :disabled="!!form.userId" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phonenumber" /></el-form-item>
        <el-form-item label="密码" v-if="!form.userId" required>
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.roleIds" multiple placeholder="请选择角色" style="width:100%">
            <el-option v-for="r in roleOptions" :key="r.roleId" :label="r.roleName" :value="r.roleId" />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位">
          <el-select v-model="form.postIds" multiple clearable placeholder="请选择岗位" style="width:100%">
            <el-option v-for="p in postOptions" :key="p.postId" :label="p.postName" :value="p.postId" />
          </el-select>
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

    <!-- 批量授权对话框：给多个 PC 管理员账号增量授予已有角色 -->
    <el-dialog v-model="grantDialog" title="批量授权角色" width="560px">
      <el-alert type="info" :closable="false" class="grant-tip">
        将为选中的 {{ selection.length }} 个 PC 管理员账号授予所选角色；只新增授权，不收回已有角色。
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="目标账号">
          <div class="grant-users">
            <el-tag v-for="u in selection" :key="u.userId" class="grant-user-tag">
              {{ u.userName }}（{{ u.nickName || u.userId }}）
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="grantForm.roleIds" multiple placeholder="请选择要授予的角色" style="width:100%">
            <el-option v-for="r in grantableRoleOptions" :key="r.roleId" :label="r.roleName" :value="r.roleId" />
          </el-select>
          <div class="grant-hint">超级管理员角色及停用/已删除角色不可授予；APP 账号不能在批量授权中勾选。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantDialog=false">取消</el-button>
        <el-button type="primary" :loading="grantSubmitting" @click="submitGrant">确认授权</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listUser, getUser, addUser, updateUser, delUser, batchGrantRoles } from '@/api/system/user'
import { listRole } from '@/api/system/role'
import { listPost } from '@/api/system/post'
import {
  collectUserUpdatePayload,
  extractUserAssociations
} from '@/utils/ruoyi-response'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const total = ref(0)
const dialog = ref(false)
const roleOptions = ref([])
const postOptions = ref([])
const selection = ref([])
const grantDialog = ref(false)
const grantSubmitting = ref(false)
const grantForm = reactive({ roleIds: [] })
const query = reactive({ pageNum: 1, pageSize: 10, userName: '', status: '' })
const form = reactive({
  userId: null,
  userName: '',
  nickName: '',
  phonenumber: '',
  password: '',
  status: '0',
  deptId: null,
  roleIds: [],
  postIds: []
})
let lastAssociations = { roleIds: [], postIds: [], deptId: null }

async function loadOptions() {
  try {
    const [roles, posts] = await Promise.all([
      listRole({ pageNum: 1, pageSize: 50 }),
      listPost({ pageNum: 1, pageSize: 50 })
    ])
    roleOptions.value = roles?.rows || []
    postOptions.value = posts?.rows || []
  } catch (e) {
    roleOptions.value = []
    postOptions.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const res = await listUser({ ...query })
    rows.value = res?.rows || []
    total.value = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

function onPage(p) {
  query.pageNum = p
  load()
}

async function openForm(row) {
  await loadOptions()
  Object.assign(form, {
    userId: null,
    userName: '',
    nickName: '',
    phonenumber: '',
    password: '',
    status: '0',
    deptId: null,
    roleIds: [],
    postIds: []
  })
  lastAssociations = { roleIds: [], postIds: [], deptId: null }

  if (row?.userId) {
    const raw = await getUser(row.userId)
    const assoc = extractUserAssociations(raw)
    lastAssociations = {
      roleIds: [...assoc.roleIds],
      postIds: [...assoc.postIds],
      deptId: assoc.deptId
    }
    if (assoc.roleOptions.length) roleOptions.value = assoc.roleOptions
    if (assoc.postOptions.length) postOptions.value = assoc.postOptions
    Object.assign(form, {
      userId: assoc.user.userId ?? row.userId,
      userName: assoc.user.userName ?? row.userName,
      nickName: assoc.user.nickName ?? row.nickName,
      phonenumber: assoc.user.phonenumber ?? row.phonenumber,
      status: assoc.user.status ?? row.status ?? '0',
      deptId: assoc.deptId,
      roleIds: [...assoc.roleIds],
      postIds: [...assoc.postIds],
      password: ''
    })
  }
  dialog.value = true
}

async function save() {
  if (!form.userName) {
    ElMessage.warning('请填写用户名')
    return
  }
  if (form.userId && (!Array.isArray(form.roleIds) || form.roleIds.length === 0)) {
    ElMessage.warning('请至少保留一个角色，避免清空用户角色关联')
    return
  }
  if (!form.userId && (!form.password || !Array.isArray(form.roleIds) || form.roleIds.length === 0)) {
    ElMessage.warning('新增用户需要密码并选择角色')
    return
  }

  // 编辑：已从 getUser 回填时 formHydrated=true，提交表单值；角色空数组仍回退关联
  const payload = collectUserUpdatePayload(form, lastAssociations, {
    formHydrated: !!form.userId
  })

  saving.value = true
  try {
    if (payload.userId) {
      await updateUser(payload)
    } else {
      await addUser({ ...payload, password: form.password })
    }
    ElMessage.success('保存成功')
    dialog.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function onRemove(row) {
  await ElMessageBox.confirm(`确认删除用户 ${row.userName}？`, '提示', { type: 'warning' })
  await delUser(row.userId)
  ElMessage.success('已删除')
  load()
}

function onSelectionChange(rows) {
  selection.value = rows
}

// 可批量授予的角色：排除超级管理员角色（roleId=1 / roleKey=admin）与停用角色；
// 服务端会再校验一次，前端过滤只用于减少误操作
const grantableRoleOptions = computed(() =>
  (roleOptions.value || []).filter(
    (r) => r.roleId !== 1 && r.roleKey !== 'admin' && r.status === '0' && r.delFlag !== '2'
  )
)

async function openGrant() {
  if (!selection.value.length) return
  // 目标账号域前端预检：混入 APP 账号直接拦截，不给提交机会
  const nonAdmin = selection.value.filter((u) => u.userType !== '00')
  if (nonAdmin.length) {
    ElMessage.warning('批量授权仅支持 PC 管理员账号，请取消勾选 APP 账号')
    return
  }
  grantForm.roleIds = []
  try {
    const res = await listRole({ pageNum: 1, pageSize: 100, status: '0' })
    roleOptions.value = res?.rows || []
  } catch (e) {
    roleOptions.value = []
  }
  grantDialog.value = true
}

async function submitGrant() {
  if (!grantForm.roleIds.length) {
    ElMessage.warning('请至少选择一个角色')
    return
  }
  const userIds = selection.value.map((u) => u.userId)
  const roleNames = grantableRoleOptions.value
    .filter((r) => grantForm.roleIds.includes(r.roleId))
    .map((r) => r.roleName)
  // 二次确认：展示影响范围（账号 × 角色）
  await ElMessageBox.confirm(
    `将为 ${userIds.length} 个账号授予 ${roleNames.length} 个角色（${roleNames.join('、')}），共 ${userIds.length * roleNames.length} 条授权关联。是否继续？`,
    '确认批量授权',
    { type: 'warning', confirmButtonText: '确认授权', cancelButtonText: '取消' }
  )
  grantSubmitting.value = true
  try {
    const res = await batchGrantRoles({ userIds, roleIds: grantForm.roleIds })
    const granted = Number(res?.grantedCount ?? 0)
    const skipped = Number(res?.skippedCount ?? 0)
    ElMessage.success(`授权完成：新增 ${granted} 条授权，${skipped} 条已持有跳过`)
    grantDialog.value = false
    load()
  } finally {
    grantSubmitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { margin-bottom: 8px; }
.pager { margin-top: 12px; justify-content: flex-end; display: flex; }
.grant-users { display: flex; flex-wrap: wrap; gap: 6px; }
.grant-user-tag { margin: 0; }
.grant-hint { font-size: 12px; color: #8c8c8c; line-height: 1.6; margin-top: 4px; }
.grant-tip { margin-bottom: 12px; }
</style>
