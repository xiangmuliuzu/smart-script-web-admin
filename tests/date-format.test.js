import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRegisteredTime } from '../src/utils/dateFormat.js'
test('formatRegisteredTime converts ISO offset time to Hong Kong clock', () => {
  // +08:00 与 Asia/Hong_Kong 同偏移，不应发生换算
  assert.equal(formatRegisteredTime('2026-09-30T10:00:00+08:00'), '2026-09-30 10:00:00')
  // UTC 输入换算到 +08:00
  assert.equal(formatRegisteredTime('2026-09-30T02:30:05Z'), '2026-09-30 10:30:05')
  // 跨日边界：UTC 16:00 → 香港 24:00 次日
  assert.equal(formatRegisteredTime('2026-01-01T16:00:00Z'), '2026-01-02 00:00:00')
})

test('formatRegisteredTime renders — for missing or invalid values', () => {
  assert.equal(formatRegisteredTime(null), '—')
  assert.equal(formatRegisteredTime(undefined), '—')
  assert.equal(formatRegisteredTime(''), '—')
  assert.equal(formatRegisteredTime('not-a-date'), '—')
  assert.equal(formatRegisteredTime('2026-13-40T99:00:00+08:00'), '—')
})
