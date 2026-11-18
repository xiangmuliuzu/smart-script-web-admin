/** 消息发送的实际校验和幂等重试口径，供管理表单复用。 */
export function notificationPayload(form) {
  const payload = { type: form.type, title: String(form.title || '').trim(), content: String(form.content || '').trim(), userIds: [...new Set(form.userIds || [])].sort((a, b) => a - b) }
  const businessType = String(form.businessType || '').trim(), businessId = String(form.businessId || '').trim()
  if (businessType) payload.businessType = businessType
  if (businessId) payload.businessId = businessId
  return payload
}
export function notificationError(payload) {
  if (!['SYSTEM', 'TRANSACTION', 'BENEFIT'].includes(payload.type)) return '请选择消息类型'
  if (!payload.title || payload.title.length > 200) return '标题必填，最多200个字符'
  if (!payload.content || payload.content.length > 2000) return '正文必填，最多2000个字符'
  if (!payload.userIds.length || payload.userIds.length > 50) return '请选择1至50名收件人'
  if (payload.userIds.some(id => !Number.isSafeInteger(id) || id <= 0)) return '收件人无效，请重新选择'
  if (!!payload.businessType !== !!payload.businessId) return '业务类型与业务编号必须同时填写'
  if ((payload.businessType?.length || 0) > 64 || (payload.businessId?.length || 0) > 64) return '业务引用最多64个字符'
  return ''
}
function requestId() {
  // getRandomValues 也能用于未启用 HTTPS 的局域网开发地址。
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return `msg-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`
}
export function notificationSubmission(payload, previous, createId = requestId) {
  const signature = JSON.stringify(payload)
  return { signature, data: { ...payload, userIds: [...payload.userIds], requestId: previous?.signature === signature ? previous.data.requestId : createId() } }
}
export function mergeReceiverOptions(previous, incoming, selectedIds) {
  const selected = new Set(selectedIds)
  const options = new Map(previous.filter(item => selected.has(item.userId)).map(item => [item.userId, item]))
  for (const item of incoming) options.set(item.userId, item)
  return [...options.values()]
}
/** 三个来源均成功时才显示数字合计；失败来源保留上次值。 */
export function unreadSources(results, previous) {
  let complete = true
  const counts = results.map((result, index) => {
    if (result.status === 'fulfilled' && Number.isInteger(result.value) && result.value >= 0) return result.value
    complete = false
    return previous[index]
  })
  return { counts, complete, total: counts.reduce((sum, count) => sum + count, 0) }
}
