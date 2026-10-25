/**
 * 宿主挂载形态（apiBase 非空）的静态资源必须能被找到。
 *
 * 为什么单列：dev-server 挂在根上，`/app.js` 直接命中 public/app.js，
 * 所以「不剥前缀」这个缺陷**在本地一条测试都碰不到**，只有装进 Desktop 才表现为
 * 业务区全白 + 控制台一句 `Unexpected token '<'`（宿主的 SPA 兜底把 index.html 当 JS 递回）。
 * 2026-10-25 装机前实测确认过：修之前 `/pf-ild/app.js` 返回 text/html。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHandler } from '../dsh/server.js'

function startHosted() {
  const dir = mkdtempSync(join(tmpdir(), 'host-'))
  const pub = join(dir, 'public')
  mkdirSync(pub, { recursive: true })
  writeFileSync(join(pub, 'index.html'), '<!doctype html><html><body><script src="app.js"></script></body></html>')
  writeFileSync(join(pub, 'app.js'), 'console.log("ui")')
  writeFileSync(join(pub, 'style.css'), '.x{color:red}')
  const handler = createHandler({
    apiBase: '/api/pf-ild',
    publicDir: pub,
    services: { version: '9.9.9', displayVersion: 'v9.9.9', buildDate: '2026-10-25', capabilities: [], bootstrap: () => ({ ok: true }) },
  })
  return new Promise((resolve) => {
    const srv = createServer(handler).listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }))
  })
}

const get = async (port, path) => {
  const r = await fetch(`http://127.0.0.1:${port}${path}`)
  const text = await r.text()
  return { status: r.status, type: r.headers.get('content-type') || '', text }
}

test('宿主前缀下 UI 入口与静态资源都能命中（不是被 SPA 兜底成 HTML）', async () => {
  const { srv, port } = await startHosted()
  try {
    for (const base of ['/pf-ild', '/api/pf-ild']) {
      const page = await get(port, base + '/')
      assert.equal(page.status, 200)
      assert.match(page.type, /text\/html/, `${base}/ 应是 HTML`)

      const js = await get(port, base + '/app.js')
      assert.equal(js.status, 200)
      assert.match(js.type, /javascript/, `${base}/app.js 必须返回 JS，不能是 html 兜底`)
      assert.match(js.text, /console\.log/, '必须是真实的 app.js 内容')

      const css = await get(port, base + '/style.css')
      assert.match(css.type, /text\/css/, `${base}/style.css 必须是 CSS`)
    }
  } finally { srv.close() }
})

test('独立启动（apiBase 为空）路径不受影响', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'host-'))
  const pub = join(dir, 'public')
  mkdirSync(pub, { recursive: true })
  writeFileSync(join(pub, 'index.html'), '<!doctype html><html></html>')
  writeFileSync(join(pub, 'app.js'), 'console.log(1)')
  const handler = createHandler({ apiBase: '', publicDir: pub, services: { version: '1', displayVersion: 'v1', buildDate: '', capabilities: [], bootstrap: () => ({}) } })
  const srv = createServer(handler).listen(0, '127.0.0.1')
  await new Promise((r) => srv.once('listening', r))
  try {
    const js = await get(srv.address().port, '/app.js')
    assert.match(js.type, /javascript/)
  } finally { srv.close() }
})

test('路径穿越仍被拒绝', async () => {
  const { srv, port } = await startHosted()
  try {
    const r = await get(port, '/pf-ild/../../etc/passwd')
    assert.equal(r.status, 200)
    assert.match(r.type, /text\/html/, '穿越请求应落到兜底页，不能读到包外文件')
  } finally { srv.close() }
})
