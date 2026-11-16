import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, removeToken } from '@/utils/auth'
import { unwrapRuoYiResponse } from '@/utils/ruoyi-response'

/**
 * 管理端旧接口（/getInfo、/getRouters、/system、/monitor 等若依原生接口）统一入口。
 * 生产/服务器按运维规范走 /prod-api（Caddy 转发时去掉该前缀）；
 * 本地开发走 /dev-api 由 Vite 代理转发。
 */
const BASE_API = import.meta.env.VITE_APP_ADMIN_BASE_API || import.meta.env.VITE_APP_BASE_API || ''

/** 后端公开静态资源前缀（ResourcesConfig 将 /profile/** 映射到 ruoyi.profile 目录） */
const MEDIA_PATH_PREFIX = '/profile/'

/**
 * 管理端新接口（/api/v1/admin/*、/api/v1/pc-auth/* 等自建路径）统一入口。
 * 生产/服务器：baseURL 为空，API 文件 url 保留完整 /api/v1 前缀，
 *   最终请求形如 /api/v1/admin/...，由 Caddy 原样转发到后端（避免 /api/v1/api/v1 双前缀）；
 * 本地开发走 /dev-api 由 Vite 代理转发（剥前缀后落到 /api/v1/...）。
 */
const V1_BASE_API = import.meta.env.PROD
  ? ''
  : import.meta.env.VITE_APP_PC_BASE_API || import.meta.env.VITE_APP_BASE_API || ''

/**
 * 把后端下发的媒体地址归一为「当前环境可直接访问」的地址。
 *
 * 处理两类值：
 *  1. 相对路径（`/profile/upload/2026/10/12/xxx.jpg`）——补上 API 前缀，交给 Vite / 网关代理到后端；
 *  2. 历史绝对地址（`http://localhost:8080/profile/...`、`http://<内网IP>:8080/profile/...`）——
 *     截取 `/profile/` 之后的部分再按方案 1 拼接。
 *
 * 背景：早期通用上传接口（POST /common/upload）返回的是 `serverConfig.getUrl() + 文件名`，
 * 会把「上传那一刻的 host」写进库；在共享库与服务器环境下这些地址必然不可达。
 * 此处统一归一，使存量数据无需刷库即可恢复显示。
 */
export function resolveMediaUrl(raw) {
  if (!raw) {
    return ''
  }
  let url = String(raw)
  const mediaIndex = url.indexOf(MEDIA_PATH_PREFIX)
  if (mediaIndex > 0) {
    url = url.substring(mediaIndex)
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return `${BASE_API}${url}`
  }
  return url
}

function createInstance(baseURL) {
  return axios.create({
    baseURL,
    timeout: 15000
  })
}

/** 管理端旧接口实例（生产 /prod-api，Caddy 剥离前缀转发） */
const request = createInstance(BASE_API)

/** 管理端新接口实例（生产 /api/v1，Caddy 原样转发）；共用下方同一套拦截器与若依令牌注入 */
export const adminV1Request = createInstance(V1_BASE_API)

let redirectingToLogin = false

function toLogin(message) {
  if (message) {
    ElMessage.error(message)
  }
  if (redirectingToLogin) {
    return
  }
  redirectingToLogin = true
  removeToken()
  const current = window.location.pathname + window.location.search
  const target = current && !current.startsWith('/login')
    ? `/login?redirect=${encodeURIComponent(current)}`
    : '/login'
  window.location.href = target
}

const requestInterceptor = config => {
  const isToken = config.headers?.isToken !== false
  const token = getToken()
  if (token && isToken) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}

const responseInterceptor = response => {
  const res = response.data
  if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
    return res
  }

  const code = res?.code
  if (code === 401) {
    toLogin(res?.msg || '登录状态已过期，请重新登录')
    return Promise.reject(new Error(res?.msg || 'Unauthorized'))
  }
  if (code !== undefined && code !== 200 && code !== 0) {
    const message = res.msg || res.message || '请求失败'
    if (!response.config?.silent) {
      ElMessage.error(message)
    }
    return Promise.reject(new Error(message))
  }

  // 与 utils/ruoyi-response.js 同一契约：保留顶层 postIds/roleIds/checkedKeys 等
  return unwrapRuoYiResponse(res)
}

const responseErrorInterceptor = error => {
  const status = error.response?.status
  const msg = error.response?.data?.msg || error.response?.data?.message
  if (status === 401) {
    toLogin(msg || '未授权，请重新登录')
  } else if (error.config?.silent) {
    // 静默角标轮询失败由调用方恢复，认证失效仍按上面的逻辑处理。
  } else if (status === 403) {
    ElMessage.error(msg || '权限不足')
  } else if (status === 404) {
    ElMessage.error(msg || '请求的资源不存在')
  } else if (status === 500) {
    ElMessage.error(msg || '服务器错误')
  } else {
    ElMessage.error(msg || error.message || '网络错误，请检查网络连接')
  }
  return Promise.reject(error)
}

;[request, adminV1Request].forEach(instance => {
  instance.interceptors.request.use(requestInterceptor, error => Promise.reject(error))
  instance.interceptors.response.use(responseInterceptor, responseErrorInterceptor)
})

export function resetLoginRedirectFlag() {
  redirectingToLogin = false
}

export default request
