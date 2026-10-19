/**
 * URL 工具函数
 */

/**
 * 解析资源 URL
 * 将后端返回的相对路径转换为完整的可访问 URL
 * 
 * @param {string} raw - 原始 URL（可能是相对路径或完整 URL）
 * @returns {string} 完整的 URL
 * 
 * @example
 * resolveAssetUrl('/profile/upload/2024/12/01/image.jpg')
 * // => 'http://localhost:8080/profile/upload/2024/12/01/image.jpg'
 * 
 * resolveAssetUrl('https://cdn.example.com/image.jpg')
 * // => 'https://cdn.example.com/image.jpg' (原样返回)
 */
export function resolveAssetUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    return ''
  }

  const trimmed = raw.trim()
  
  // 已经是完整的 HTTP/HTTPS URL，直接返回
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  // 相对路径（以 / 开头），拼接后端地址
  if (trimmed.startsWith('/')) {
    // 获取后端基础地址
    const baseUrl = getBackendBaseUrl()
    return `${baseUrl}${trimmed}`
  }

  // 其他情况原样返回
  return trimmed
}

/**
 * 获取后端基础地址（不包含 /api 路径）
 * 
 * @returns {string} 后端服务器地址
 */
function getBackendBaseUrl() {
  // 开发环境
  if (import.meta.env.DEV) {
    // Vite 代理配置中的目标地址
    return 'http://localhost:8080'
  }
  
  // 生产环境：假设前后端同域名部署
  // 如果前后端分离部署，需要配置环境变量 VITE_API_BASE_URL
  return import.meta.env.VITE_API_BASE_URL || window.location.origin
}

/**
 * 批量解析资源 URL
 * 
 * @param {string[]} urls - URL 数组
 * @returns {string[]} 解析后的 URL 数组
 */
export function resolveAssetUrls(urls) {
  if (!Array.isArray(urls)) {
    return []
  }
  return urls.map(url => resolveAssetUrl(url))
}
