import request from '@/utils/request'

/** 当前登录管理员的个人信息（若依原生接口） */
export function getProfile() {
  return request({ url: '/system/user/profile', method: 'get' })
}

/** 修改当前登录管理员的登录密码 */
export function updateProfilePwd(data) {
  return request({ url: '/system/user/profile/updatePwd', method: 'put', data })
}
