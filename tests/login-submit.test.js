import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { computed, ref, reactive } from 'vue'

test('admin login cannot submit twice while form validation is pending', async () => {
  const source = await readFile(new URL('../src/views/user/Login.vue', import.meta.url), 'utf8')
  const setup = source.split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm, '')
  let release
  const validation = new Promise(resolve => { release = resolve })
  let requests = 0
  const context = { computed, ref, reactive, watch() {}, onMounted() {},
    localStorage: { getItem() {}, removeItem() {} },
    useRoute: () => ({ query: { redirect: '/system/user' } }),
    useRouter: () => ({ replace: async () => {}, currentRoute: { value: { path: '/system/user' } } }),
    useUserStore: () => ({ resetSession() {}, adoptAdminToken() {}, fetchUserInfo: async () => {} }),
    usePermissionStore: () => ({ generateRoutes: async () => {} }),
    login: async () => { requests++; return { token: 'test-only-token' } },
    safeRedirectPath: path => path, getCodeImg: async () => ({ captchaEnabled: false }),
    ElMessage: { info() {}, warning() {}, success() {}, error() {} }
  }
  runInNewContext(setup + '\nglobalThis.page = { handleLogin, formRef, captchaReady, loading, loginForm }', context)
  const page = context.page
  page.formRef.value = { validate: callback => validation.then(valid => callback ? callback(valid) : valid) }
  page.captchaReady.value = true
  page.loginForm.code = '1234'
  const first = page.handleLogin()
  const second = page.handleLogin()
  release(true)
  await Promise.all([first, second])
  assert.equal(requests, 1)
  assert.equal(page.loading.value, false)
})
