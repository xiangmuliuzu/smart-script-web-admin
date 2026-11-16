import test from 'node:test'
import assert from 'node:assert/strict'
import { isRecruitExpired } from '../src/utils/recruitExpiry.js'

// 管理端的「已截止」标记必须与后端 TradeDemandService.isRecruitExpired 同口径：
// 截止日当天整天仍可接单，过完当天才算截止；否则运营会在列表里把当天还能接的单标成已截止，
// 而广场与接单接口仍放行，两边自相矛盾。
const day = offset => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const open = deadline => ({ status: 'open', deadline })

test('截止日当天与之后不过期，仅过完当天算已截止', () => {
  assert.equal(isRecruitExpired(open(day(0))), false, '截止日当天整天有效')
  assert.equal(isRecruitExpired(open(day(3))), false)
  assert.equal(isRecruitExpired(open(day(-1))), true, '昨天到期的 open 单已截止')
})

test('不限期与非 open 状态不参与截止判定', () => {
  assert.equal(isRecruitExpired(open(null)), false, 'deadline 为空即不设时限')
  assert.equal(isRecruitExpired({ status: 'in_progress', deadline: day(-5) }), false, '已接单的单一律不看征集截止')
})

test('带时间的历史格式与脏数据不误判', () => {
  assert.equal(isRecruitExpired(open(`${day(-2)} 00:00:00`)), true, '兼容 "yyyy-MM-dd HH:mm:ss"')
  assert.equal(isRecruitExpired(open(`${day(0)} 00:00:00`)), false, '按 UTC 解析会让当天中午误报已截止')
  assert.equal(isRecruitExpired(open('未填')), false)
})
