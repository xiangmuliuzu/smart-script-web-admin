import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DEMAND_STATUS, ENUM_REGISTRY, enumLabel, enumTagType } from '../src/constants/tradeEnum.js'

// 需求方自助发布后，任务先落在「待审核」，运营在本页审核通过才进任务广场。
// 状态值域一旦与后端 TradeDemandService 常量漂移，筛选下拉筛不出待审核的单，
// 运营就等于看不见审核队列；审核动作接错接口或漏掉驳回原因校验同样会把队列卡死。

// 与后端 DEMAND_STATUS_* 常量逐值对应（smartscript-trade/.../TradeDemandService.java）
const BACKEND_DEMAND_STATUS = {
  pending_review: '待审核',
  open: '待接单',
  selected: '已选定',
  in_progress: '进行中',
  completed: '已完成',
  failed: '已失败',
  closed: '已关闭',
  rejected: '审核未通过'
}

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const demandView = read('../src/views/trade/Demand.vue')
const demandDetailView = read('../src/views/trade/DemandDetail.vue')
const tradeApi = read('../src/api/trade.js')

test('任务状态枚举值域与后端常量逐一对应且审核态有配色', () => {
  assert.deepEqual([...DEMAND_STATUS.map((o) => o.value)].sort(), Object.keys(BACKEND_DEMAND_STATUS).sort())
  for (const [value, label] of Object.entries(BACKEND_DEMAND_STATUS)) {
    assert.equal(enumLabel('demand', value), label, `${value} 中文名漂移`)
    assert.ok(enumTagType('demand', value), `${value} 缺标签配色`)
  }
  assert.equal(ENUM_REGISTRY.demand, DEMAND_STATUS)
})

test('审核接口 PUT /trade/demand/{demandId}/audit 带 approved 与 rejectReason', () => {
  const fn = tradeApi.match(/export function auditDemand\([\s\S]*?\n\}/)[0]
  assert.match(fn, /method:\s*'put'/)
  assert.match(fn, /\/trade\/demand\/\$\{demandId\}\/audit/)
  assert.match(fn, /data/, '结论与驳回原因需随 body 上送')
})

test('待审核行才出审核入口并受 trade:demand:review 权限控制', () => {
  assert.match(demandView, /row\.status === 'pending_review'/)
  assert.match(demandView, /v-hasPermi="\['trade:demand:review'\]"/)
  assert.match(demandView, /openAudit\(row\)/)
})

test('驳回必填原因，通过时不下送驳回原因', () => {
  const submit = demandView.match(/async function submitAudit\(\) \{[\s\S]*?\n\}/)[0]
  assert.match(submit, /auditForm\.rejectReason\.trim\(\)/)
  assert.match(submit, /ElMessage\.warning\(/, '空原因要在提交前拦住')
  assert.match(submit, /auditDemand\(auditRow\.value\.demandId/)
  assert.match(submit, /approved:\s*auditForm\.approved/)
  assert.match(submit, /rejectReason:\s*auditForm\.approved \? null : /)
  assert.match(submit, /loadList\(\)/, '审核后刷新列表')
})

test('审核弹层展示需求方填的原单内容，避免只凭标题拍板', () => {
  assert.match(demandView, /auditRow\.title/)
  assert.match(demandView, /auditRow\.requirement/)
  assert.match(demandView, /auditRow\.budgetText/)
  assert.match(demandView, /getDemandStages\(row\.demandId\)/, '轮次与预算是否匹配靠轮次明细核对')
  assert.match(demandView, /auditRoundHint/)
})

test('被驳回的单在只读详情与运营详情都展示审核意见', () => {
  assert.match(demandView, /detail\.status === 'rejected'[\s\S]{0,200}detail\.auditRemark/)
  assert.match(demandDetailView, /detail\.auditRemark/)
})
