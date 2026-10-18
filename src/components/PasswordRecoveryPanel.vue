<template>
  <div class="recovery-panel">
    <div v-if="success" class="recovery-result">
      <p class="result-title">密码已重置</p>
      <p class="result-desc">请返回登录页使用新密码登录，原密码立即失效。</p>
      <el-button type="primary" class="result-back" @click="emit('back')">返回登录</el-button>
    </div>
    <el-form v-else ref="formRef" :model="form" :rules="rules" label-position="top" class="recovery-form" size="large" @submit.prevent="submit">
      <el-alert type="info" :closable="false" show-icon class="recovery-tip" title="仅支持已绑定手机号的运维管理员账号，验证码 5 分钟内有效。" />
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="11" placeholder="请输入账号绑定的手机号" autocomplete="tel" />
      </el-form-item>
      <el-form-item label="短信验证码" prop="code">
        <div class="code-row">
          <el-input v-model="form.code" maxlength="8" placeholder="请输入验证码" autocomplete="one-time-code" />
          <el-button class="code-button" :disabled="countdown > 0 || sending" :loading="sending" @click="sendCode">
            {{ countdown > 0 ? countdown + 's 后重发' : '获取验证码' }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="form.newPassword" type="password" show-password placeholder="8–64 位，需同时包含字母和数字" autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirm">
        <el-input v-model="form.confirm" type="password" show-password placeholder="请再次输入新密码" autocomplete="new-password" @keyup.enter="submit" />
      </el-form-item>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="recovery-error" />
      <el-button type="primary" native-type="submit" class="recovery-submit" :loading="submitting">重置密码</el-button>
    </el-form>
    <p v-if="!success" class="recovery-switch">
      <a class="recovery-back" @click.prevent="emit('back')">返回登录</a>
    </p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { resetAdminPasswordByPhone, sendAdminRecoveryCode } from '@/api/login'

const emit = defineEmits(['back'])

const formRef = ref(null)
const form = reactive({ phone: '', code: '', newPassword: '', confirm: '' })
const error = ref('')
const sending = ref(false)
const submitting = ref(false)
const success = ref(false)
const countdown = ref(0)
let timer = null

function passwordError(value) {
  const text = value || ''
  if (text.length < 8 || text.length > 64) return '密码需为 8–64 位'
  if (new TextEncoder().encode(text).length > 72) return '密码过长，请缩短后重试'
  if (!/\p{L}/u.test(text) || !/\p{Nd}/u.test(text)) return '密码需同时包含字母和数字'
  return ''
}

const rules = {
  phone: [{ validator: (rule, value, callback) => (/^1\d{10}$/.test((value || '').trim()) ? callback() : callback(new Error('请输入 11 位手机号'))), trigger: 'blur' }],
  code: [{ validator: (rule, value, callback) => (/^\d{4,8}$/.test((value || '').trim()) ? callback() : callback(new Error('请输入 4–8 位短信验证码'))), trigger: 'blur' }],
  newPassword: [{ validator: (rule, value, callback) => (passwordError(value) ? callback(new Error(passwordError(value))) : callback()), trigger: 'blur' }],
  confirm: [{ validator: (rule, value, callback) => (value && value === form.newPassword ? callback() : callback(new Error('两次输入的密码不一致'))), trigger: 'blur' }]
}

function startCountdown(seconds) {
  stopCountdown()
  countdown.value = seconds > 0 ? seconds : 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) stopCountdown()
  }, 1000)
}

function stopCountdown() {
  if (timer) clearInterval(timer)
  timer = null
  countdown.value = 0
}

async function sendCode() {
  if (countdown.value > 0 || sending.value) return
  const valid = await formRef.value?.validateField('phone').then(() => true).catch(() => false)
  if (!valid) return
  sending.value = true
  error.value = ''
  try {
    await sendAdminRecoveryCode(form.phone.trim())
    startCountdown(60)
    ElMessage.success('验证码已发送，请查收短信')
  } catch (failure) {
    error.value = failure.message || '验证码发送失败，请稍后重试'
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (submitting.value) return
  error.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await resetAdminPasswordByPhone({ phone: form.phone.trim(), code: form.code.trim(), newPassword: form.newPassword })
    success.value = true
    form.code = ''
    form.newPassword = ''
    form.confirm = ''
    stopCountdown()
  } catch (failure) {
    error.value = failure.message || '密码重置失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(stopCountdown)
</script>

<style scoped>
.recovery-form :deep(.el-form-item) { margin-bottom: 16px; }
.recovery-tip { margin-bottom: 16px; }
.code-row { display: flex; gap: 10px; width: 100%; }
.code-row .el-input { flex: 1; }
.code-button { flex: none; width: 116px; }
.recovery-submit { width: 100%; margin-top: 4px; }
.recovery-switch { margin: 14px 0 0; text-align: center; }
.recovery-back { font-size: 13px; color: var(--el-color-primary); cursor: pointer; }
.recovery-result { padding: 4px 0 0; }
.result-title { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
.result-desc { margin: 0 0 20px; font-size: 13px; line-height: 1.9; color: var(--el-text-color-secondary); }
.result-back { width: 100%; }
</style>
