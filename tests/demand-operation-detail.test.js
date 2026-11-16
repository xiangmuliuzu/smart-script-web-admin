import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ENUM_REGISTRY, DEMAND_STAGE_STATUS, DEMAND_EXTEND_APPLY_TYPE, DEMAND_EXTEND_STATUS,
  DEMAND_SANDBOX_PURPOSE, DEMAND_SANDBOX_STATUS, SETTLE_STATUS, enumLabel, enumTagType
} from '../src/constants/tradeEnum.js'

// 运营详情页把「轮次/资金/延时」三张后端表摊在同一屏，标签全靠这几个枚举翻译。
// 值域一旦与后端常量漂移，页面对同一行数据要么显示原始英文要么回落成 info 灰标签，
// 运营据此判断资金状态就会读错，所以这里按后端源码逐值锁死。
const BACKEND_VALUES = {
  demandStage: ['pending', 'ai_reviewing', 'submitted', 'approved', 'rejected'],
  demandExtendApplyType: ['request', 'self'],
  demandExtendStatus: ['pending', 'approved', 'rejected'],
  demandSandboxPurpose: ['escrow', 'deposit'],
  // 沙箱状态是大写，轮次/延时是小写：两套都直接来自库内列值，不是笔误，不能"顺手统一"
  demandSandboxStatus: ['PENDING', 'PAID', 'CLOSED'],
  settleStatus: ['pending', 'confirmed', 'disputed']
}

test('运营详情页六个枚举值域与后端常量逐一对应且已注册', () => {
  for (const [type, values] of Object.entries(BACKEND_VALUES)) {
    const list = ENUM_REGISTRY[type]
    assert.ok(list && list.length, `${type} 未注册进 ENUM_REGISTRY`)
    assert.deepEqual(list.map((o) => o.value), values, `${type} 值域漂移`)
    for (const item of list) {
      assert.ok(item.label, `${type}.${item.value} 缺中文名`)
      assert.ok(item.tagType, `${type}.${item.value} 缺标签配色`)
    }
  }
})

test('托管款与押金的读法不同：PENDING 只表示当前码待支付', () => {
  assert.equal(enumLabel('demandSandboxStatus', 'PENDING'), '待支付')
  assert.equal(enumLabel('demandSandboxStatus', 'PAID'), '已入账')
  assert.equal(enumLabel('demandSandboxPurpose', 'escrow'), '任务托管款')
  assert.equal(enumLabel('demandSandboxPurpose', 'deposit'), '接单押金')
  // 换号只覆盖 (demand_id, purpose) 那一行，历史码不进列表，运营读到的是每种用途的最终态
  assert.equal(enumTagType('demandSandboxStatus', 'CLOSED'), 'info')
})

test('逾期靠标记不靠状态：脏值原样回显不加糖衣', () => {
  assert.equal(enumLabel('demandStage', 'overdue'), 'overdue')
  assert.equal(enumTagType('demandStage', 'overdue'), 'info')
  assert.equal(enumLabel('demandStage', undefined), '-')
})

test('四个只读端点走管理端前缀且路径与后端 @GetMapping 一致', (t) => {
  const file = fileURLToPath(new URL('../src/api/trade.js', import.meta.url))
  const src = readFileSync(file, 'utf8')
  const expected = {
    getDemandDetail: '/trade/demand/${demandId}',
    getDemandStages: '/trade/demand/${demandId}/stages',
    getDemandPayments: '/trade/demand/${demandId}/payments',
    getDemandExtendApplies: '/trade/demand/${demandId}/extend-applies'
  }
  for (const [fn, path] of Object.entries(expected)) {
    const start = src.indexOf(`export function ${fn}`)
    assert.ok(start >= 0, `${fn} 未导出`)
    const body = src.slice(start, start + 200)
    assert.ok(body.includes(`url: \`\${PREFIX}${path}\``), `${fn} URL 应为 ${path}，实为：${body}`)
    assert.match(body, /method: 'get'/)
  }
  t.diagnostic('端点全部只读，资金写操作仍只在 App/交易侧发起')
})

test('运营详情页可路由、有入口、金额按元渲染且不加图标', () => {
  const pageUrl = new URL('../src/views/trade/DemandDetail.vue', import.meta.url)
  assert.ok(existsSync(pageUrl), 'DemandDetail.vue 缺失')
  const page = readFileSync(pageUrl, 'utf8')
  const componentMap = readFileSync(fileURLToPath(new URL('../src/router/component-map.js', import.meta.url)), 'utf8')
  assert.match(componentMap, /'trade\/DemandDetail':\s*DemandDetail/, '组件未加入动态路由白名单')

  const demandList = readFileSync(fileURLToPath(new URL('../src/views/trade/Demand.vue', import.meta.url)), 'utf8')
  assert.match(demandList, /path: '\/trade\/demand-detail', query: \{ demandId: row\.demandId \}/,
    '列表页跳转未携带 demandId')

  // 管理端只读端点回传库内原值（元），与 App 出参的分口径不同，除以 100 会把金额缩小百倍
  assert.doesNotMatch(page, /\/\s*100\b/, '管理端详情按元渲染，不应除以 100')
  // 用户明确要求页面不加莫名其妙的图标
  assert.doesNotMatch(page, /el-icon|Icon\b|@element-plus\/icons-vue/, '运营详情页不应出现图标组件')
})
