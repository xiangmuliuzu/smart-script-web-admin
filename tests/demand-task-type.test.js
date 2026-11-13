import test from 'node:test'
import assert from 'node:assert/strict'
import { DEMAND_TASK_TYPE, DEMAND_TASK_TYPE_HINT, enumLabel, enumTagType, normalizeDemandTaskType } from '../src/constants/tradeEnum.js'

// 任务三分类在四端（APP/企业/创作者/管理端）共用同一份值域与文案：
// 管理端是运营核查口径，值域缺一就筛不出该类任务，文案漂移会与发布者看到的说明自相矛盾。
const TASK_TYPE_TEXTS = {
  script: '只征集剧本',
  script_storyboard: '剧本+分镜',
  storyboard: '提供剧本做分镜'
}
const TASK_TYPE_HINTS = {
  script: '逐轮交付本人未上架的剧本作品，AI 剧本审核通过后进入平台人工验收',
  script_storyboard: '逐轮交付剧本作品，分镜以文件链接或交付说明随本轮一并提交，AI 剧本审核通过后进入人工验收',
  storyboard: '按平台提供的源剧本产出分镜：交付分镜文件或填写交付说明即可（作品可选），提交后直接进入人工验收'
}

test('任务类型枚举值域与标签与后端常量逐一对应', () => {
  assert.deepEqual(DEMAND_TASK_TYPE.map(o => o.value), Object.keys(TASK_TYPE_TEXTS))
  for (const [value, label] of Object.entries(TASK_TYPE_TEXTS)) {
    assert.equal(enumLabel('demandTaskType', value), label)
    assert.notEqual(enumTagType('demandTaskType', value), undefined, `${value} 缺标签配色`)
  }
})

test('交付口径文案逐字对齐 APP，分镜类不提 AI 剧本审核', () => {
  for (const [value, hint] of Object.entries(TASK_TYPE_HINTS)) {
    assert.equal(DEMAND_TASK_TYPE_HINT[value], hint)
  }
  assert.doesNotMatch(DEMAND_TASK_TYPE_HINT.storyboard, /AI 剧本审核/)
  assert.match(DEMAND_TASK_TYPE_HINT.storyboard, /源剧本/)
})

test('历史任务不带或带脏 taskType 时回落只征集剧本', () => {
  for (const blank of [undefined, null, '', 'unknown_type']) {
    assert.equal(normalizeDemandTaskType(blank), 'script')
    assert.equal(enumLabel('demandTaskType', normalizeDemandTaskType(blank)), '只征集剧本')
    assert.equal(DEMAND_TASK_TYPE_HINT[normalizeDemandTaskType(blank)], TASK_TYPE_HINTS.script)
  }
})
