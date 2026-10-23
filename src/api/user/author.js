import { adminV1Request as request } from '@/utils/request'

/**
 * A4 作者能力 API（契约 §4 / §5.3）。
 *
 * 作者能力与账号类型（user_type）是两个独立维度，本接口不修改 user_type。
 */

const PREFIX = '/api/v1/admin'

/** 开通/关闭作者能力。data: { enabled: boolean, reason: string }，reason 必填。 */
export function updateAuthorCapability(userId, data) {
  return request({ url: `${PREFIX}/author-capabilities/${userId}`, method: 'put', data })
}
