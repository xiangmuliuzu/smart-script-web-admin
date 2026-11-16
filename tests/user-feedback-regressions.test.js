import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { reactive, ref, computed } from 'vue'
import { materialImageBlob } from '../src/utils/material-preview.js'

async function setup(file, exports, overrides = {}) {
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const code = descriptor.scriptSetup.content.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '')
  const context = { reactive, ref, computed, onMounted() {}, onBeforeUnmount() {}, defineExpose() {}, ElMessage: { error() {}, warning() {}, info() {} }, ...overrides }
  runInNewContext(`${code}\nthis.page = { ${exports} }`, context)
  return context.page
}

for (const [view, api] of [['UserManage.vue', 'listAppUsers'], ['creator-apply/index.vue', 'listCreatorApplications'], ['feedback/index.vue', 'listFeedback']]) {
  test(`${view}: search, pagination and reset no longer include a nickname filter`, async () => {
    const requests = []
    const page = await setup(`views/user/${view}`, 'query, filterForm, handleSearch, handleReset, onPageChange', {
      [api]: async params => { requests.push(params); return { rows: [], total: 0 } }
    })
    page.query.pageNum = 5
    assert.equal(Object.hasOwn(page.filterForm, 'nickname'), false)
    assert.equal(Object.hasOwn(page.query, 'nickname'), false)
    page.filterForm.keyword = '14786152186'
    page.handleSearch()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(Object.hasOwn(requests[0], 'nickname'), false)
    assert.equal(requests[0].keyword, '14786152186')
    assert.equal(requests[0].pageNum, 1)
    page.onPageChange(2)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(Object.hasOwn(requests[1], 'nickname'), false)
    assert.equal(requests[1].keyword, '14786152186')
    assert.equal(requests[1].pageNum, 2)
    page.handleReset()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(Object.hasOwn(requests[2], 'nickname'), false)
    assert.equal(requests[2].keyword, undefined)
  })
}

test('feedback categories use the App enums and never display raw unexpected values', async () => {
  const page = await setup('views/user/feedback/index.vue', 'categoryLabel, feedbackCategories')
  assert.deepEqual(Object.keys(page.feedbackCategories), ['FEATURE', 'EXPERIENCE', 'BUG', 'COMPLAINT', 'OTHER'])
  assert.equal(page.categoryLabel('FEATURE'), '功能建议')
  assert.equal(page.categoryLabel('COMPLAINT'), '投诉')
  assert.equal(page.categoryLabel('unexpected'), '其他')
})

test('rejected application is blocked before opening capability dialog; resubmission allows it', async () => {
  const page = await setup('views/user/UserManage.vue', 'openCapabilityDialog, capabilityDialogVisible')
  page.openCapabilityDialog({ userId: 1, authorCapability: false, creatorApplicationStatus: 'REJECTED' })
  assert.equal(page.capabilityDialogVisible.value, false)
  page.openCapabilityDialog({ userId: 1, authorCapability: false, creatorApplicationStatus: 'PENDING' })
  assert.equal(page.capabilityDialogVisible.value, true)
})

test('material preview accepts the real unwrapped redeem response and releases image URLs', async () => {
  const png = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])])
  const calls = []
  const revoked = []
  const page = await setup('components/MaterialPreview.vue', 'open, clear, visible, imageUrl', {
    Blob, materialImageBlob,
    redeemMaterialToken: async token => { assert.equal(token, 'one-time-token'); return { accessUrl: '/api/v1/admin/material/content/access' } },
    request: async config => { calls.push(config); return png },
    URL: { createObjectURL: () => 'blob:preview', revokeObjectURL: url => revoked.push(url) }
  })
  await page.open('one-time-token')
  assert.equal(calls[0].url, '/api/v1/admin/material/content/access')
  assert.equal(calls[0].responseType, 'blob')
  assert.equal(page.visible.value, true)
  assert.equal(page.imageUrl.value, 'blob:preview')
  page.clear()
  assert.deepEqual(revoked, ['blob:preview'])
  assert.equal(page.visible.value, false)
})

test('HTML/SVG disguised as images are never previewed', async () => {
  for (const body of ['<svg onload="alert(1)"></svg>', '<html><script>alert(1)</script></html>', '']) {
    assert.equal(await materialImageBlob(new Blob([body], { type: 'image/png' })), null)
  }
})

test('real-name record details remain available without material viewing', async () => {
  const record = { applicationId: 3, status: 'APPROVED', realNameMasked: '张*' }
  const page = await setup('views/user/realname/index.vue', 'openDetail, detail, detailVisible', {
    getRealNameApplication: async id => { assert.equal(id, 3); return { data: record } }
  })
  await page.openDetail({ applicationId: 3 })
  assert.equal(page.detailVisible.value, true)
  assert.equal(page.detail.value.realNameMasked, '张*')
  const source = await readFile(new URL('../src/views/user/realname/index.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /MaterialPreview|viewMaterial|查看材料|查看报告|label="材料"/)
})
