import request, { adminV1Request } from '@/utils/request'

/** 若依原生认证接口，不使用 /api/v1/admin 自建路径 */

export function getCodeImg() {
  return request({
    url: '/captchaImage',
    method: 'get',
    headers: { isToken: false },
    timeout: 20000
  })
}

export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    headers: { isToken: false },
    data
  })
}

export function getInfo() {
  return request({
    url: '/getInfo',
    method: 'get'
  })
}

export function logout() {
  return request({
    url: '/logout',
    method: 'post'
  })
}

/**
 * 运维端忘记密码：发送短信验证码。
 * 走 App 凭证域的新接口（/api/v1/pc-auth/admin/**），匿名可访问；后端只对 user_type='00' 且状态正常的账号真正下发。
 * silent：失败文案由登录页内的找回面板展示，避免与拦截器的全局 ElMessage 重复提示。
 */
export function sendAdminRecoveryCode(phone) {
  return adminV1Request({
    url: '/api/v1/pc-auth/admin/sms/send',
    method: 'post',
    headers: { isToken: false },
    silent: true,
    data: { phone }
  })
}

/** 运维端忘记密码：校验短信验证码并重置登录密码。 */
export function resetAdminPasswordByPhone(data) {
  return adminV1Request({
    url: '/api/v1/pc-auth/admin/password/reset',
    method: 'post',
    headers: { isToken: false },
    silent: true,
    data
  })
}
