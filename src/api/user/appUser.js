import { adminV1Request as request } from '@/utils/request'

/**
 * A4 App 用户管理 API（契约 A4-PC-ADMIN-CONTRACT-v1 §4）。
 *
 * 统一使用若依 PC Token；响应封装沿用若依 AjaxResult / TableDataInfo。
 * 列表类接口返回 { rows, total }，写接口返回 { data }。
 */

const PREFIX = '/api/v1/admin'

/** App 用户分页筛选。列表行包含作者能力及最近变更的 reason/operatorName/updatedAt。
 * keyword 仅按手机号模糊匹配。
 * params: keyword/status/userType/roleCode/realNameStatus/authorCapability/beginTime/endTime/pageNum/pageSize */
export function listAppUsers(params) {
  return request({ url: `${PREFIX}/app-users`, method: 'get', params })
}

/** App 用户详情。 */
export function getAppUser(userId) {
  return request({ url: `${PREFIX}/app-users/${userId}`, method: 'get' })
}

/** 启用/停用 App 用户。status: "0" 正常，"1" 停用。reason 必填。 */
export function changeAppUserStatus(userId, data) {
  return request({ url: `${PREFIX}/app-users/${userId}/status`, method: 'put', data })
}
