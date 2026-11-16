import request from '@/utils/request'

export function listUser(query) {
  return request({ url: '/system/user/list', method: 'get', params: query })
}
export function getUser(userId) {
  return request({ url: `/system/user/${userId ?? ''}`, method: 'get' })
}
export function addUser(data) {
  return request({ url: '/system/user', method: 'post', data })
}
export function updateUser(data) {
  return request({ url: '/system/user', method: 'put', data })
}
export function delUser(userId) {
  return request({ url: `/system/user/${userId}`, method: 'delete' })
}
export function resetUserPwd(userId, password) {
  return request({ url: `/system/user/resetPwd`, method: 'put', data: { userId, password } })
}
export function changeUserStatus(userId, status) {
  return request({ url: `/system/user/changeStatus`, method: 'put', data: { userId, status } })
}
export function getUserAuthRole(userId) {
  return request({ url: `/system/user/authRole/${userId}`, method: 'get' })
}

/**
 * 批量授权：给多个 PC 管理员账号（user_type=00）增量授予已有角色。
 * 服务端校验账号域、受保护账号/角色，事务内全量成功或整体失败；
 * 返回 { userCount, roleCount, grantedCount, skippedCount }。
 */
export function batchGrantRoles(data) {
  return request({ url: '/system/user/batchGrantRoles', method: 'put', data })
}
