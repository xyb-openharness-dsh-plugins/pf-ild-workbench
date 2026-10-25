/**
 * 包的入口：DSH 插件的服务端侧。
 *
 * 宿主（Harness）加载的就是这个文件，需要 `name` / `inject` / `Config` / `apply` 四样：
 * - `name` / `inject` / `apply` 的实质逻辑在 `dsh/workbench.js` 与 `dsh/server.js`（零宿主依赖、可单测）；
 * - `Config` 必须在**本文件**末尾——官方要求它是 Schemastery schema，而 Schemastery 是宿主提供的
 *   peer 依赖，本仓库里装不上。为了不让 `apply()` 跟着不可测，只把这一行留在入口。
 *
 * 独立启动：`npm start -- --root <资料目录>`（走 scripts/dev-server.mjs，同一份 handler）。
 */
import Schema from '@deepseek-ai/schemastery'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Workbench } from './workbench.js'
import { createHandler } from './server.js'
import { PLUGIN_ID, API_PREFIX } from '../lib/identity.js'
import { version, displayVersion } from '../lib/version.js'

export { Workbench } from './workbench.js'
export { createHandler, resolveStatic } from './server.js'
export { readBootstrap, readProfile } from './readmodels.js'
export { openStore, closeStore, migrate } from './store.js'
export { seedDemoData } from './demo.js'
export { PLUGIN_ID, API_PREFIX, HOME_DIR, DB_FILE, UI_ENTRY } from '../lib/identity.js'
export { PANEL, AGENT_PANE, assertPanelConfig } from '../lib/layout.js'
export { guardStartupApiBase, validateApiBase, buildApiUrl, detectForm } from '../lib/api-base.js'

export const name = PLUGIN_ID
export const inject = ['webServer', 'connection']

const HERE = dirname(fileURLToPath(import.meta.url))
export const PUBLIC_DIR = join(HERE, '..', 'public')

/**
 * 宿主挂载形态的 API_BASE。
 * 宿主把插件挂在 `/api/<slug>` 下，因此页面拼 `${API_BASE}/api/bootstrap`
 * = `/api/pf-ild/api/bootstrap`（**交界处只有一个 /api 对**，不是重复）。
 */
export const API_BASE_HOSTED = `/api/${API_PREFIX}`

/** 建一个带认证检查的 handler（宿主与独立启动共用同一份）。 */
export function createHostHandler(ctx, workbench) {
  const services = {
    version, displayVersion,
    capabilities: ['bootstrap', 'profile', 'health'],
    bootstrap: () => workbench.bootstrap(),
  }
  const inner = createHandler({ apiBase: API_BASE_HOSTED, publicDir: PUBLIC_DIR, services })
  return (req, res) => {
    /* 宿主形态：认证由 connection 能力提供；独立启动没有 ctx，直接走 inner */
    if (ctx) {
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify(body))
      }
      if (typeof ctx.connection?.requestRejection !== 'function') return send(503, { error: 'connection authentication capability unavailable' })
      const rejection = ctx.connection.requestRejection(req)
      if (rejection !== undefined) return send(rejection, { error: 'Authentication required' })
    }
    return inner(req, res)
  }
}

export function apply(ctx) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')
  const root = ctx.config?.root
  if (typeof root !== 'string' || root.trim() === '') {
    /* 不裸 throw 白屏：登记一个返回可读错误的健康接口，让前端能显示原因 */
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact', path: `${API_BASE_HOSTED}/health`,
      handler(req, res) {
        res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify({ error: 'root 未配置', detail: 'cordis.patch.yml 需要 config.root: !!js dshHomePath(...)' }))
      },
    }), 'pf-ild health (unconfigured)')
    return
  }
  const workbench = new Workbench({ root })
  workbench.open()
  ctx.effect(() => workbench.close(), 'pf-ild store close')
  const handler = createHostHandler(ctx, workbench)
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: API_BASE_HOSTED, handler }), 'pf-ild routes')
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/pf-ild', handler }), 'pf-ild ui')
}

/** UI 入口文件是否存在（装机自检用） */
export function uiReady() {
  return existsSync(join(PUBLIC_DIR, 'index.html'))
}

export const Config = Schema.object({
  root: Schema.string().required(),
})
