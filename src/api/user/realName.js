import { adminV1Request as request } from '@/utils/request'

/**
 * A4 实名认证记录查询 API。
 *
 * 列表不返回材料引用；详情才按详情权限返回短时引用。
 */

const PREFIX = '/api/v1/admin'

/** 实名申请分页。params: status/keyword/beginTime/endTime/pageNum/pageSize */
export function listRealNameApplications(params) {
  return request({ url: `${PREFIX}/real-name-applications`, method: 'get', params })
}

/** 实名申请详情（需要 user:realname:query）。 */
export function getRealNameApplication(applicationId) {
  return request({ url: `${PREFIX}/real-name-applications/${applicationId}`, method: 'get' })
}

/**
 * 兑换短时材料令牌，返回一次性访问链接。
 *
 * 令牌来自详情接口的 materialRefs / attachmentRefs；兑换后得到 accessUrl，
 * 页面请求该 URL 即可读到真实材料内容（短时且只能用一次）。
 */
export function redeemMaterialToken(token) {
  return request({ url: `${PREFIX}/material-refs/redeem`, method: 'post', data: { token } })
}

/**
 * 下载材料内容。
 *
 * 安全约束（同源脚本执行风险）：材料由用户上传，可能是 HTML/SVG 等可执行内容。
 * 若用 createObjectURL + window.open 打开，浏览器会在**同源**下渲染它，
 * 其中的脚本即可读取管理后台的凭证。因此这里改为：
 *   1. 以 blob 取回字节（后端已强制 octet-stream + attachment）；
 *   2. 用带 download 属性的临时链接触发下载，不在当前源内渲染；
 *   3. 通过 Blob 类型覆盖再兜一层，避免浏览器按内容嗅探为可执行类型。
 */
export async function downloadMaterialContent(accessUrl, fileName) {
  const res = await request({
    url: accessUrl,
    method: 'get',
    responseType: 'blob',
    headers: { isToken: true }
  })
  const raw = res instanceof Blob ? res : new Blob([res])
  // 强制为不可执行的通用类型，杜绝浏览器按 HTML/SVG 解析
  const blob = new Blob([raw], { type: 'application/octet-stream' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'material'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export function decideRealNameApplication(applicationId, data) {
  return request({ url: `${PREFIX}/real-name-applications/${applicationId}/decision`, method: 'put', data })
}
