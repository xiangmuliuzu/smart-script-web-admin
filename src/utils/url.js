/**
 * URL 工具函数
 *
 * 注意：管理端静态资源（/profile/**）必须走 API 前缀（/dev-api 或 /prod-api），
 * 由 Vite / Caddy 转发到后端。不要拼成站点根路径 /profile 或 localhost:8080，
 * 否则本地 Vite 的 /profile 代理能碰巧成功，服务器部署后会拿到 SPA 的 index.html。
 */

const BASE_API = import.meta.env.VITE_APP_ADMIN_BASE_API || import.meta.env.VITE_APP_BASE_API || ''
const MEDIA_PATH_PREFIX = '/profile/'

/**
 * 解析资源 URL（与 request.js 的 resolveMediaUrl 行为一致）。
 *
 * @param {string} raw - 原始 URL（相对路径或完整 URL）
 * @returns {string} 当前环境可访问的地址
 */
export function resolveAssetUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    return ''
  }
  let url = raw.trim()
  const mediaIndex = url.indexOf(MEDIA_PATH_PREFIX)
  if (mediaIndex > 0) {
    url = url.substring(mediaIndex)
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return `${BASE_API}${url}`
  }
  return url
}

/**
 * 批量解析资源 URL
 *
 * @param {string[]} urls - URL 数组
 * @returns {string[]} 解析后的 URL
 */
export function resolveAssetUrls(urls) {
  if (!Array.isArray(urls)) {
    return []
  }
  return urls.map((url) => resolveAssetUrl(url))
}
