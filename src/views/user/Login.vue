<template>
  <div class="login-page">
    <!-- 左侧：登录表单 -->
    <div class="login-left">
      <div class="login-panel">
        <div class="brand-row">
          <div class="logo-icon">
            <el-icon :size="22"><Document /></el-icon>
          </div>
          <span class="brand-name">剧云策</span>
        </div>

        <div class="login-head">
          <h1 class="login-title">{{ isRecovery ? '找回登录密码' : '欢迎回来' }}</h1>
          <p class="login-desc">
            {{ isRecovery ? '通过账号绑定的手机号接收短信验证码，重置运维管理员登录密码' : '智能剧本创作平台，请使用运维管理员账号登录' }}
          </p>
        </div>

        <el-form
          v-if="!isRecovery"
          ref="formRef"
          :model="loginForm"
          :rules="rules"
          class="login-form"
          label-position="top"
          size="large"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              autocomplete="username"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
              autocomplete="current-password"
              :prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item v-if="captchaEnabled" label="验证码" prop="code">
            <div class="captcha-row">
              <el-input
                v-model="loginForm.code"
                placeholder="请输入验证码"
                maxlength="8"
                @keyup.enter="handleLogin"
              />
              <img
                v-if="codeUrl"
                :src="codeUrl"
                class="captcha-img"
                alt="验证码"
                title="点击刷新"
                @click="refreshCaptcha"
              />
              <div v-else class="captcha-img captcha-empty" @click="refreshCaptcha">刷新</div>
            </div>
          </el-form-item>

          <el-button v-if="!captchaReady" text @click="refreshCaptcha">验证码加载失败，点击重试</el-button>
          <div class="form-options">
            <el-checkbox v-model="rememberPassword">记住密码</el-checkbox>
            <a class="forgot-link" @click.prevent="handleForgot">忘记密码？</a>
          </div>

          <el-button
            type="primary"
            :loading="loading"
            :disabled="!captchaReady"
            class="login-button"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form>

        <PasswordRecoveryPanel v-else @back="mode = 'login'" />
      </div>
    </div>

    <!-- 右侧：品牌视觉面板 -->
    <div class="login-right">
      <div class="visual-bg"></div>
      <picture v-if="!imageFailed">
        <source :srcset="visualImage" type="image/webp" media="(min-width: 992px)" />
        <img
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          class="visual-img"
          width="1254" height="1254" fetchpriority="high" decoding="async"
          alt="运维人员监控平台运行、审核剧本内容与管理安全的卡通插画"
          @error="imageFailed = true"
        />
      </picture>
      <div class="visual-caption">
        <p class="visual-slogan">让每一个好故事，从这里开始</p>
        <p class="visual-sub">剧云策 · AI 驱动的智能剧本创作平台</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import visualImage from '@/assets/images/login-operations-v2.webp'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { getCodeImg, login } from '@/api/login'
import { safeRedirectPath } from '@/utils/ruoyi-response'
import { ElMessage } from 'element-plus'
import { Document, User, Lock } from '@element-plus/icons-vue'
import PasswordRecoveryPanel from '@/components/PasswordRecoveryPanel.vue'

// 记住密码：勾选后把账号和密码一起写进本机 localStorage，取消勾选立即清除。
const REMEMBER_KEY = 'login-remember-credential'
// 兼容早期只保存账号的键，读到后迁移为账号+密码结构。
const LEGACY_REMEMBER_KEY = 'login-remember-username'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const formRef = ref(null)
const loading = ref(false)
// login=账号密码登录；recovery=同一张卡片内切换为手机号找回密码
const mode = ref('login')
const isRecovery = computed(() => mode.value === 'recovery')
const captchaEnabled = ref(true)
const captchaReady = ref(false)
const codeUrl = ref('')
const uuid = ref('')
const rememberPassword = ref(false)
const imageFailed = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  code: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}


async function refreshCaptcha() {
  try {
    const data = await getCodeImg()
    captchaReady.value = data?.captchaEnabled === false || !!(data?.img && data?.uuid)
    captchaEnabled.value = data?.captchaEnabled !== false
    uuid.value = data?.uuid || ''
    codeUrl.value = data?.img
      ? (data.img.startsWith('data:') ? data.img : `data:image/gif;base64,${data.img}`)
      : ''
    if (!captchaEnabled.value) {
      loginForm.code = ''
    }
  } catch (error) {
    captchaReady.value = false
    codeUrl.value = ''
    uuid.value = ''
  }
}

function handleForgot() {
  mode.value = 'recovery'
}

function loadRememberedCredential() {
  let raw = ''
  try { raw = localStorage.getItem(REMEMBER_KEY) || '' } catch { return }
  if (!raw) {
    try {
      const legacy = localStorage.getItem(LEGACY_REMEMBER_KEY)
      if (legacy) {
        loginForm.username = legacy
        rememberPassword.value = true
      }
    } catch { /* localStorage 不可用时忽略 */ }
    return
  }
  try {
    const saved = JSON.parse(raw) || {}
    loginForm.username = saved.username || ''
    loginForm.password = saved.password || ''
    rememberPassword.value = Boolean(saved.username || saved.password)
  } catch { /* 结构损坏时按未记住处理 */ }
}

watch(rememberPassword, (val) => {
  if (val) return
  try {
    localStorage.removeItem(REMEMBER_KEY)
    localStorage.removeItem(LEGACY_REMEMBER_KEY)
  } catch (error) {
    /* localStorage 不可用时忽略 */
  }
})

onMounted(() => {
  refreshCaptcha()
  loadRememberedCredential()
})

const handleLogin = async () => {
  if (!formRef.value || loading.value || !captchaReady.value) return
  loading.value = true
  try {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    if (captchaEnabled.value && !loginForm.code) {
      ElMessage.warning('请输入验证码')
      return
    }
    // 清理旧管理员会话，再使用若依原生登录接口
    userStore.resetSession()
    const result = await login({
      username: loginForm.username,
      password: loginForm.password,
      code: loginForm.code,
      uuid: uuid.value
    })
    if (!result?.token) throw new Error('登录响应缺少令牌')
    // 管理员：若依管理端令牌，维持原有动态路由初始化流程
    userStore.adoptAdminToken(result.token)
    await userStore.fetchUserInfo()
    // 登录后先注册动态路由，再进入目标页，避免 /dashboard 未匹配
    await permissionStore.generateRoutes({ force: true })
    persistRememberedCredential()
    ElMessage.success('登录成功')
    const target = safeRedirectPath(route.query?.redirect)
    await router.replace(target)
    if (router.currentRoute.value.path === '/404' || router.currentRoute.value.path === '/login') {
      const first = permissionStore.sidebarRoutes?.[0]
      const firstLeaf = first?.children?.[0]?.path || first?.path || '/'
      await router.replace(firstLeaf)
    }
  } catch (error) {
    userStore.resetSession()
    ElMessage.error(error?.message || '登录失败')
    await refreshCaptcha()
    loginForm.code = ''
  } finally {
    loading.value = false
  }
}

function persistRememberedCredential() {
  try {
    if (rememberPassword.value) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: loginForm.username, password: loginForm.password }))
    } else {
      localStorage.removeItem(REMEMBER_KEY)
      localStorage.removeItem(LEGACY_REMEMBER_KEY)
    }
  } catch (error) {
    /* localStorage 不可用时忽略 */
  }
}
</script>

<style scoped>
/* ==================== 页面布局：左右分屏 ==================== */
.login-page {
  display: flex;
  min-height: 100vh;
  background-color: #ffffff;
}

.login-left {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 40px 24px;
}

.login-right {
  position: relative;
  display: none;
  width: 50%;
  overflow: hidden;
  border-left: 1px solid #e5e5e5;
}

@media (min-width: 992px) {
  .login-left {
    width: 50%;
  }

  .login-right {
    display: block;
  }
}

/* ==================== 左侧表单区 ==================== */
.login-panel {
  width: 100%;
  max-width: 400px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1f2329 0%, #3a3f47 100%);
  border-radius: 10px;
  color: #ffffff;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
  letter-spacing: 2px;
}

.login-head {
  margin-bottom: 32px;
}

.login-title {
  font-size: 26px;
  font-weight: 600;
  color: #1f2329;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.login-desc {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
  line-height: 1.6;
}

/* ==================== 表单样式 ==================== */
.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: #595959;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 6px;
  padding-bottom: 0;
}

.login-form :deep(.el-input__wrapper) {
  height: 44px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #d9d9d9 inset;
  padding: 0 14px;
  transition: box-shadow 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #1f2329 inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(31, 35, 41, 0.18) inset;
}

.login-form :deep(.el-input__inner) {
  font-size: 14px;
  color: #262626;
  height: 100%;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #bfbfbf;
}

.login-form :deep(.el-input__prefix) {
  color: #8c8c8c;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.captcha-row .el-input {
  flex: 1;
}

.captcha-img {
  width: 120px;
  height: 44px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: contain;
  background: #f5f6f8;
  box-shadow: 0 0 0 1px #e8e8e8 inset;
}

.captcha-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #8c8c8c;
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.form-options :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #595959;
}

.forgot-link {
  font-size: 13px;
  color: #1f2329;
  cursor: pointer;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-button {
  width: 100%;
  height: 44px;
  background-color: #1f2329;
  border-color: #1f2329;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 6px;
  border-radius: 8px;
  transition: background-color 0.2s ease, transform 0.15s ease;
}

.login-button:hover,
.login-button:focus {
  background-color: #000000;
  border-color: #000000;
  color: #ffffff;
}

.login-button:active {
  background-color: #000000;
  border-color: #000000;
  transform: scale(0.99);
}

/* ==================== 右侧视觉面板 ==================== */
.visual-bg {
  position: absolute;
  inset: 0;
  background: #ffffff;
}

.visual-img {
  position: absolute;
  left: 50%;
  top: 48%;
  transform: translate(-50%, -50%);
  width: 99.36%;
  height: 69%;
  max-width: 772.8px;
  object-fit: contain;
}

.visual-caption {
  position: absolute;
  left: 48px;
  right: 48px;
  bottom: 48px;
  color: #1f2329;
}

.visual-slogan {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 2px;
  margin: 0 0 10px 0;
}

.visual-sub {
  font-size: 14px;
  color: #737373;
  letter-spacing: 1px;
  margin: 0;
}

/* ==================== 入场动画 ==================== */
@media (prefers-reduced-motion: no-preference) {
  .brand-row,
  .login-head,
  .login-form {
    animation: fade-up 0.5s ease both;
  }

  .login-head {
    animation-delay: 0.08s;
  }

  .login-form {
    animation-delay: 0.16s;
  }

  .visual-caption {
    animation: fade-up 0.7s ease 0.2s both;
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
