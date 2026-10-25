/**
 * HTTP 层：API + 静态资源 + 路径穿越拦截。
 *
 * 边界（DEV-REQUIREMENTS §三）：
 *   - API 前缀由调用方给（宿主里 `/api/pf-ild`，独立启动空串）；
 *   - 静态资源只从 `public/` 出，**任何**路径穿越（`..`、绝对路径、符号链接逃逸）都拒绝；
 *   - 错误一律走 JSON（API）或纯文本（静态），**不留裸 throw 白屏**；
 *   - 本文件不碰 AI、不存会话：会话由宿主管理。
 */
import { readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** 静态根必须落在包内：解析后仍以 root 为前缀，否则拒绝。 */
export function resolveStatic(root, urlPath) {
  const clean = decodeURIComponent(String(urlPath).split('?')[0].split('#')[0]);
  if (clean.includes('\0')) return null;
  const rel = normalize(clean).replace(/^([/\\])+/, '');
  if (rel.split(/[/\\]/).includes('..')) return null;
  const abs = resolve(root, rel === '' ? 'index.html' : rel);
  const rootReal = realpathSync(root);
  let absReal;
  try { absReal = realpathSync(abs); } catch { return null; }
  const r = relative(rootReal, absReal);
  if (r === '' || r.startsWith('..' + sep) || r === '..' || r.startsWith(sep)) return null;
  try { if (!statSync(absReal).isFile()) return null; } catch { return null; }
  return absReal;
}

export function contentType(file) {
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

export function createHandler({ apiBase = '', publicDir, services }) {
  const sendJson = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  return function handle(req, res) {
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { return sendJson(res, 400, { error: 'Bad request' }); }

    /* ---------- API ---------- */
    const apiPrefix = apiBase === '' ? '/api' : apiBase + '/api';
    if (pathname === apiPrefix + '/bootstrap' || pathname === apiPrefix + '/health') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
      try {
        if (pathname.endsWith('/health')) {
          return sendJson(res, 200, { ok: true, version: services.version, apiVersion: 'v1', capabilities: services.capabilities });
        }
        return sendJson(res, 200, services.bootstrap());
      } catch (error) {
        /* 不裸 throw：把原因交给前端渲染错误横幅（禁白屏） */
        return sendJson(res, 500, { error: 'bootstrap failed', detail: String(error.message || error) });
      }
    }
    if (pathname.startsWith(apiPrefix + '/')) return sendJson(res, 404, { error: 'Unknown API route' });

    /* ---------- 静态 ---------- */
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
    if (!publicDir || !existsSync(publicDir)) { res.writeHead(500); return res.end('public dir missing'); }
    const file = resolveStatic(publicDir, pathname === '/' ? '/index.html' : pathname);
    if (!file) {
      /* SPA 兜底：未知路径回 index.html（但 API 已在上方拦掉） */
      const index = resolveStatic(publicDir, '/index.html');
      if (!index) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      return res.end(readFileSync(index));
    }
    res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    res.end(readFileSync(file));
  };
}

/** 独立启动用（宿主里由 webServer.register 接）。 */
export function serveStandalone({ port, host = '127.0.0.1', handler }) {
  return import('node:http').then(({ createServer }) => new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(port, host, () => resolve(server));
  }));
}
