#!/usr/bin/env node
/**
 * Web 契约门禁：检查生产页面是否调用真实契约（非测试副本）。
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const checks = []

function check(name, fn) {
  try {
    const result = fn()
    checks.push({ name, ok: true, ...(result?.skip ? { skipped: result.skip } : {}) })
  } catch (e) {
    checks.push({ name, ok: false, err: e.message })
  }
}

check('request.js uses shared unwrapRuoYiResponse', () => {
  const src = readFileSync(join(webRoot, 'src/utils/request.js'), 'utf8')
  if (!src.includes("from '@/utils/ruoyi-response'")) throw new Error('request must import ruoyi-response')
  if (!src.includes('unwrapRuoYiResponse')) throw new Error('request must call unwrapRuoYiResponse')
})

// 系统管理恢复为独立目录，必须登记全部七个页面。
check('component-map declares whitelist keys', () => {
  const src = readFileSync(join(webRoot, 'src/router/component-map.js'), 'utf8')
  if (!src.includes('export const componentMap')) throw new Error('missing componentMap')
  for (const key of ['Layout', 'dashboard/Dashboard', 'monitor/operlog/index',
    ...['user', 'role', 'menu', 'dept', 'post', 'dict', 'config'].map(name => `system/${name}/index`)]) {
    const quoted = src.includes(`'${key}'`) || src.includes(`"${key}"`)
    const bare = new RegExp(`(^|[\\n\\s,{])${key}\\s*:`).test(src)
    if (!quoted && !bare) throw new Error(`missing map key ${key}`)
  }
})

check('login api ruoyi endpoints only', () => {
  const src = readFileSync(join(webRoot, 'src/api/login.js'), 'utf8')
  for (const p of ['/captchaImage', '/login', '/getInfo', '/logout']) {
    if (!src.includes(`url: '${p}'`) && !src.includes(`url: "${p}"`)) throw new Error(`missing ${p}`)
  }
  if (/url:\s*['"]\/api\/v1\/admin/.test(src)) throw new Error('login api must not use product prefix')
})

check('unwrap prefers top-level non-null over data null', () => {
  const src = readFileSync(join(webRoot, 'src/utils/ruoyi-response.js'), 'utf8')
  if (src.includes('{ ...rest, ...data }')) {
    throw new Error('data null must not clobber top-level postIds; use data first + topDefined')
  }
  if (!src.includes('topDefined') && !src.includes('value !== undefined && value !== null')) {
    throw new Error('unwrap must filter null top-level overwrite from data')
  }
})

check('role payload carries appGrantable (A4 grantable marker maintenance path)', () => {
  const src = readFileSync(join(webRoot, 'src/utils/ruoyi-response.js'), 'utf8')
  if (!src.includes('appGrantable')) {
    throw new Error('collectRolePayload must include appGrantable, otherwise the role page switch never persists')
  }
})

check('material download avoids same-origin script execution', () => {
  // 材料是用户上传内容，可能是 HTML/SVG。若在页面源内打开（createObjectURL +
  // window.open），脚本会在同源下执行并读取管理后台凭证。
  // 必须走下载路径（download 属性），且不得出现 window.open 打开材料。
  for (const f of ['src/api/user/realName.js', 'src/api/user/feedback.js']) {
    const src = readFileSync(join(webRoot, f), 'utf8')
    if (src.includes('window.open(url')) {
      throw new Error(f + ': material must not be opened in-page (same-origin script execution risk)')
    }
    if (!src.includes('a.download =')) {
      throw new Error(f + ': material must be delivered as a download')
    }
    if (!src.includes("type: 'application/octet-stream'")) {
      throw new Error(f + ': material blob must be forced to octet-stream')
    }
  }
})

check('A4 detail buttons gated by query permission', () => {
  const files = [
    'src/views/user/UserManage.vue',
    'src/views/user/realname/index.vue',
    'src/components/messages/UserMessageManager.vue',
    'src/views/user/feedback/index.vue'
  ]
  const missing = []
  for (const f of files) {
    const src = readFileSync(join(webRoot, f), 'utf8')
    if (!/v-permission=\"\['user:[a-z]+:query'\]\"/.test(src)) missing.push(f)
  }
  if (missing.length) {
    throw new Error('detail buttons must be hidden by query permission: ' + missing.join(', '))
  }
})

const failed = checks.filter((c) => !c.ok)
for (const c of checks) {
  if (c.skipped) console.log(`[typecheck-static] SKIP ${c.name}: ${c.skipped}`)
  else if (c.ok) console.log(`[typecheck-static] PASS ${c.name}`)
  else console.error(`[typecheck-static] FAIL ${c.name}: ${c.err}`)
}

import(pathToFileURL(join(webRoot, 'src/utils/ruoyi-response.js')).href)
  .then((mod) => {
    if (typeof mod.unwrapRuoYiResponse !== 'function') throw new Error('unwrap missing')
    console.log('[typecheck-static] PASS production ruoyi-response importable')
    if (failed.length) process.exit(1)
  })
  .catch((e) => {
    console.error('[typecheck-static] FAIL production import:', e.message)
    process.exit(1)
  })
