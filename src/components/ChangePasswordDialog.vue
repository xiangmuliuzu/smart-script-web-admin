<template>
  <el-dialog
    v-model="visible"
    title="修改密码"
    width="420px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="88px"
      @submit.prevent
    >
      <el-form-item label="当前密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          show-password
          autocomplete="current-password"
          placeholder="请输入当前密码"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="8–64 位，需同时包含字母和数字"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="请再次输入新密码"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateProfilePwd } from '@/api/system/profile'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, (value) => { visible.value = value })
watch(visible, (value) => { emit('update:modelValue', value) })

const formRef = ref()
const saving = ref(false)
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

/** 与后端一致：8–64 位，且同时包含字母和数字 */
function checkNewPassword(rule, value, callback) {
  if (!value) {
    callback(new Error('请输入新密码'))
  } else if (value.length < 8 || value.length > 64) {
    callback(new Error('密码长度需为 8–64 位'))
  } else if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    callback(new Error('密码需同时包含字母和数字'))
  } else {
    callback()
  }
}

const rules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, validator: checkNewPassword, trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && value === form.oldPassword) {
          callback(new Error('新密码不能与当前密码相同'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

function resetForm() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  formRef.value?.clearValidate()
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await updateProfilePwd({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    })
    ElMessage.success('密码修改成功，请使用新密码重新登录')
    visible.value = false
    emit('success')
  } catch (error) {
    // 失败文案（旧密码错误等）已由请求拦截器统一提示
  } finally {
    saving.value = false
  }
}
</script>
