/**
 * 征集截止判定：与后端 TradeDemandService.isRecruitExpired 同一口径。
 * deadline 为空表示不设时限；截止日当天整天仍可被接单，过完当天才算已截止。
 *
 * 后端的 sys_demand.deadline 是 DATE 列，序列化成 "yyyy-MM-dd"；
 * 直接 new Date("yyyy-MM-dd") 会按 UTC 零点解析，东八区里截止日中午就会误报已截止，
 * 所以只取日期段、按本地零点逐日比较。
 */
export function isRecruitExpired(demand) {
  if (!demand || demand.status !== 'open' || !demand.deadline) return false
  const parts = String(demand.deadline).slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return false
  const deadlineDay = new Date(parts[0], parts[1] - 1, parts[2])
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return deadlineDay.getTime() < today.getTime()
}
