import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { reactive, ref } from 'vue'
import { buildTree } from '../src/utils/tree.js'

test('menu and department trees retain parent relationships and disconnected roots', () => {
  const items = [{ deptId: 2, parentId: 1 }, { deptId: 1, parentId: 0 }, { deptId: 3, parentId: 99 }]
  const tree = buildTree(items, 'deptId')
  assert.deepEqual(tree.map(item => item.deptId), [1, 3])
  assert.equal(tree[0].children[0].deptId, 2)
  assert.equal(items[0].children, undefined)
  assert.deepEqual(buildTree([]), [])
})

const source = await readFile(new URL('../src/views/system/config/index.vue', import.meta.url), 'utf8')
const setup = parse(source).descriptor.scriptSetup.content.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
function configPage(update = async () => {}) {
  const writes = []
  const requests = []
  const context = { reactive, ref, onMounted() {}, ElMessage: { success() {}, warning() {} },
    listConfig: async query => { requests.push(query); return { rows: [], total: 0 } },
    updateConfig: async data => { writes.push(data); await update(data) },
    addConfig: async data => { writes.push(data) }, delConfig: async () => {}, refreshCache: async () => {} }
  runInNewContext(`${setup}\nthis.page = { form, dialog, saving, query, openForm, save, search, reset, onRemove }`, context)
  return { ...context.page, writes, requests }
}

test('captcha saves true/false strings without changing built-in parameter metadata', async () => {
  const page = configPage()
  page.openForm({ configId: 4, configName: '验证码开关', configKey: 'sys.account.captchaEnabled', configValue: 'false', configType: 'Y', remark: '保留备注' })
  page.form.configValue = 'true'
  await page.save()
  assert.equal(page.writes[0].configValue, 'true')
  assert.equal(page.writes[0].configKey, 'sys.account.captchaEnabled')
  assert.equal(page.writes[0].remark, '保留备注')
  assert.equal(page.dialog.value, false)
  assert.equal(page.requests.length, 1)
})

test('failed config saves retain input and dialog while clearing saving state', async () => {
  const page = configPage(async () => { throw new Error('request failed') })
  page.openForm({ configId: 4, configName: '验证码开关', configKey: 'sys.account.captchaEnabled', configValue: 'true', configType: 'Y' })
  await assert.rejects(page.save(), /request failed/)
  assert.equal(page.form.configValue, 'true')
  assert.equal(page.dialog.value, true)
  assert.equal(page.saving.value, false)
  assert.equal(page.requests.length, 0)
})
