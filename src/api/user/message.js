import { adminV1Request as request } from '@/utils/request'

/**
 * A4 用户消息 API（契约 §4 / §5.4）。
 *
 * v1 只接受明确的 userIds，不支持人群圈选表达式。
 * 创建使用 requestId 作为幂等键：等价重试复用既有消息，同键不同内容返回 409。
 */

const PREFIX = '/api/v1/admin'

/** 消息分页。params: type/createdBy/beginTime/endTime/pageNum/pageSize */
export function listNotifications(params) {
  return request({ url: `${PREFIX}/notifications`, method: 'get', params })
}

/** 消息详情（脱敏收件人摘要）。 */
export function getNotification(notificationId) {
  return request({ url: `${PREFIX}/notifications/${notificationId}`, method: 'get' })
}

/**
 * 创建消息。
 * data: { requestId, type, title, content, businessType?, businessId?, userIds: number[] }
 * businessType 与 businessId 必须成对提供。
 */
export function createNotification(data) {
  return request({ url: `${PREFIX}/notifications`, method: 'post', data })
}
