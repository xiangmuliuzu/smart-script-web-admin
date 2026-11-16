import { adminV1Request as request } from '@/utils/request'

/**
 * A4 创作者申请审核 API（契约 §4 / §5.6）。
 *
 * 列表与详情都返回申请人填写的字段（笔名/方向/代表作品/申请说明/联系方式）。
 */

const PREFIX = '/api/v1/admin'

/** 创作者申请分页。params: status/keyword/beginTime/endTime/pageNum/pageSize */
export function listCreatorApplications(params) {
  return request({ url: `${PREFIX}/creator-applications`, method: 'get', params })
}

/** 创作者申请详情（需要 user:creatorapp:query）。 */
export function getCreatorApplication(applicationId) {
  return request({ url: `${PREFIX}/creator-applications/${applicationId}`, method: 'get' })
}

/**
 * 审核决定。data: { decision: 'APPROVE'|'REJECT', rejectReason?, expectedStatus: 'PENDING' }
 * 驳回时 rejectReason 必填，通过时必须为空；通过后自动开通该用户的作者能力。
 */
export function decideCreatorApplication(applicationId, data) {
  return request({ url: `${PREFIX}/creator-applications/${applicationId}/decision`, method: 'put', data })
}
