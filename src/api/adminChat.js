import { adminV1Request as request } from '@/utils/request'

/**
 * 管理端聊天（A3 用户沟通，若依 Token 域）。
 * 前缀 /api/v1/admin/chat，走 @/utils/request：
 *   - 会话列表为 TableDataInfo，解包后整体透传 { code, msg, rows, total }；
 *   - 会话详情为 AjaxResult，解包后只返回 data 实体（会话 VO）；
 *   - 历史消息 AjaxResult.data 为分页载荷 { total, list }，解包后返回 { total, list }。
 */
const PREFIX = '/api/v1/admin/chat'

/** 全部会话列表（分页 + 筛选）：params = { status?, businessType?, keyword?, pageNum, pageSize } */
export function listSessions(params, options) {
  return request({ url: `${PREFIX}/sessions`, method: 'get', params, ...options })
}

/** 当前管理员作为会话参与方收到的未读总数，不受列表分页限制。 */
export function getChatUnreadCount(options) {
  return request({ url: `${PREFIX}/unread-count`, method: 'get', ...options })
}

/** 会话详情（含双方用户信息），返回会话 VO */
export function getSession(sessionId) {
  return request({ url: `${PREFIX}/sessions/${sessionId}`, method: 'get' })
}

/** 显式打开详情，当前管理员接手，只将已展示的消息标为已读。 */
export function openSession(sessionId, throughMessageId) {
  return request({ url: `${PREFIX}/sessions/${sessionId}/open`, method: 'put', params: { throughMessageId } })
}

/** 会话内历史消息（时间正序），返回 { total, list } */
export function listMessages(sessionId) {
  return request({ url: `${PREFIX}/sessions/${sessionId}/messages`, method: 'get' })
}

/** 管理端发起会话：data = { targetUserId, businessType, businessId, businessName } */
export function createSession(data) {
  return request({ url: `${PREFIX}/sessions`, method: 'post', data })
}

/**
 * createSession 的别名导出：版权审核（ReviewWorkbench/CopyrightAssets/SealReview）
 * 与授权订单（AuthOrders）等管理页以 adminCreateSession 命名发起「联系用户」会话，
 * 与 createSession 同一端点、同一入参，仅为调用方命名习惯提供兼容。
 */
export const adminCreateSession = createSession

/** 管理员回复消息：data = { content, msgType? }，返回消息 VO */
export function sendMessage(sessionId, data) {
  return request({ url: `${PREFIX}/sessions/${sessionId}/messages`, method: 'post', data })
}

/** 管理员标记会话已读 */
export function markSessionRead(sessionId, throughMessageId) {
  return request({ url: `${PREFIX}/sessions/${sessionId}/read`, method: 'put', params: { throughMessageId } })
}

/** 变更会话状态：action = 'close' | 'reopen' */
export function changeStatus(sessionId, action) {
  return request({ url: `${PREFIX}/sessions/${sessionId}/status`, method: 'put', params: { action } })
}
