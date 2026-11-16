import request from '@/utils/request'

export function listMenu(query) {
  return request({ url: '/system/menu/list', method: 'get', params: query })
}
export function getMenu(menuId) {
  return request({ url: `/system/menu/${menuId}`, method: 'get' })
}
export function addMenu(data) {
  return request({ url: '/system/menu', method: 'post', data })
}
export function updateMenu(data) {
  return request({ url: '/system/menu', method: 'put', data })
}
export function delMenu(menuId) {
  return request({ url: `/system/menu/${menuId}`, method: 'delete' })
}
export function menuTreeselect() {
  return request({ url: '/system/menu/treeselect', method: 'get' })
}

/** 若依：加载角色已授权菜单树 + checkedKeys（不得只用 getRole） */
export function roleMenuTreeselect(roleId) {
  return request({
    url: `/system/menu/roleMenuTreeselect/${roleId}`,
    method: 'get'
  })
}
