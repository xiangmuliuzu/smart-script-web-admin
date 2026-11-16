import request from '@/utils/request'

export function listRole(query) {
  return request({ url: '/system/role/list', method: 'get', params: query })
}
export function getRole(roleId) {
  return request({ url: `/system/role/${roleId}`, method: 'get' })
}
export function addRole(data) {
  return request({ url: '/system/role', method: 'post', data })
}
export function updateRole(data) {
  return request({ url: '/system/role', method: 'put', data })
}
export function delRole(roleId) {
  return request({ url: `/system/role/${roleId}`, method: 'delete' })
}
export function changeRoleStatus(roleId, status) {
  return request({ url: `/system/role/changeStatus`, method: 'put', data: { roleId, status } })
}
export function dataScope(roleId) {
  return request({ url: `/system/role/dataScope`, method: 'put', data: roleId })
}
export function allocatedUsers(query) {
  return request({ url: `/system/role/authUser/allocatedList`, method: 'get', params: query })
}
