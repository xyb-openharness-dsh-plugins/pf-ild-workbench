#!/usr/bin/env node
/**
 * public/ 定点移植：**复制原型 → 定点替换**，不手抄。
 *
 * 为什么用脚本而不是手工复制：家族规矩是"原型是唯一视觉基准，开发版与它逐字符对齐"。
 * 手工复制必然漂移，所以把"抄什么 + 改哪几处"写成可复跑的脚本，替换点全部显式列举。
 *
 * 替换点（只有这些，其它一律与原型逐字符相同）：
 *   1. 数据加载：同步 `window.DEMO_DATA` → 异步 `${API_BASE}/api/bootstrap`（含错误横幅，禁白屏）
 *   2. 启动：`render()` 同步调用 → `boot()` 异步入口
 *   3. 版本：写死 v0.1.0 → `__VERSION__` 占位（由 build-version/build-client 注入）
 *   4. API_BASE：注入 `__API_BASE__` 占位 + 交界守卫调用
 *   5. index.html：加 noindex、注入版本、去掉"仅本页演示·未接入 DSH"的原型条措辞
 *
 * 用法：node scripts/migrate-public.mjs [--check]
 *   --check  只比对不写盘；不一致退出码 1（进 check 链，防"改了原型忘了同步"）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'prototypes/v0.2');
const DST = join(ROOT, 'public');
const check = process.argv.includes('--check');

const problems = [];

function transformApp(src) {
  let out = src;

  /* 1) 数据加载：同步快照 → 异步 bootstrap */
  const syncLoad = "  const D = window.DEMO_DATA;";
  const asyncLoad = [
    '  /* ---- apiBase 契约（内联版；权威实现与测试在 lib/api-base.js + test/api-base.test.mjs）----',
    '     独立启动 API_BASE=""；宿主里 API_BASE="/api/pf-ild"。页面统一拼 `${API_BASE}/api/xxx`。',
    '     守卫只禁交界处重复 /api，**不许 includes("\/api") 一刀切**（宿主前缀含 /api 是正常的）。 */',
    '  const API_BASE = "__API_BASE__";',
    '  const VERSION_ARTIFACT = "__VERSION__";',
    '  function normalizeApiBase(raw) {',
    '    if (raw === undefined || raw === null) return "";',
    '    let v = String(raw).trim();',
    '    if (v === "" || v === "/") return "";',
    '    if (!v.startsWith("/")) v = "/" + v;',
    '    return v.replace(/\\/+$/, "");',
    '  }',
    '  function validateApiBase(raw) {',
    '    const rawText = raw === undefined || raw === null ? "" : String(raw).trim();',
    '    if (/^https?:\\/\\//i.test(rawText) || rawText.indexOf("://") >= 0) return { ok: false, base: "", reason: "API_BASE 只放挂载前缀，不放完整 URL" };',
    '    const base = normalizeApiBase(raw);',
    '    if (/(^|\\/)api$/.test(base)) return { ok: false, base, reason: "API_BASE 以 /api 结尾会让拼出的路径出现 /api/api（当前 " + base + "）" };',
    '    if (/\\s/.test(base)) return { ok: false, base, reason: "API_BASE 不得含空白字符" };',
    '    return { ok: true, base };',
    '  }',
    '  function buildApiUrl(base, path) {',
    '    const v = validateApiBase(base);',
    '    if (!v.ok) throw new Error("apiBase 非法：" + v.reason);',
    '    return v.base + (path.startsWith("/") ? path : "/" + path);',
    '  }',
    '  function guardStartupApiBase(raw) {',
    '    const v = validateApiBase(raw);',
    '    if (v.ok) return { ok: true, base: v.base, banner: null };',
    '    return { ok: false, base: "", banner: { title: "服务连接配置有问题", detail: v.reason, hint: "点「重新检查连接」重试；这通常不是你的操作问题。" } };',
    '  }',
    '',
    '  /* ---- 数据加载：开发版不读 window.DEMO_DATA 快照，唯一来源是本机服务 ---- */',
    '  let D = null;',
    '  let bootError = null;',
    '  async function loadBootstrap() {',
    '    const guard = guardStartupApiBase(API_BASE);',
    '    if (!guard.ok) { bootError = guard.banner; return false; }',
    '    try {',
    '      const response = await fetch(buildApiUrl(guard.base, "/api/bootstrap"), { credentials: "same-origin" });',
    '      if (!response.ok) throw new Error("服务返回 " + response.status);',
    '      D = await response.json();',
    '      if (!D || !D.profiles) throw new Error("返回数据缺少 profiles");',
    '      return true;',
    '    } catch (error) {',
    '      bootError = { title: "连不上本机服务", detail: String(error.message || error), hint: "数据没有上传到任何地方；可以点「重新检查连接」重试。" };',
    '      return false;',
    '    }',
    '  }',
    '',
    '  /* 启动期校验失败 → 渲染错误横幅，**不裸 throw 白屏** */',
    '  function renderBootError() {',
    '    const box = document.getElementById("main");',
    '    if (!box) return;',
    '    box.innerHTML = \'<div class="notice warn"><b>\' + esc(bootError.title) + \'</b><div style="margin-top:6px">\' + esc(bootError.detail) + \'</div>\'',
    '      + \'<div class="actions" style="margin-top:10px"><button class="primary" data-action="retry-connect">重新检查连接</button></div>\'',
    '      + \'<div class="small-note">\' + esc(bootError.hint || "") + \'</div></div>\';',
    '  }',
  ].join('\n');
  if (!out.includes(syncLoad)) problems.push('app.js 找不到数据加载行（原型结构变了？）');
  out = out.replace(syncLoad, asyncLoad);

  /* 2) 启动：同步 render() → 异步 boot() */
  const bootOld = `  applyHash();
  window.addEventListener('hashchange', () => { if (applyHash()) { render(); maybeOpenFromHash(); } });
  render();
  maybeOpenFromHash();
  if (state._wantProbe === 'resp') runResponsiveProbe();`;
  const bootNew = `  applyHash();
  window.addEventListener('hashchange', () => { if (applyHash()) { if (D) { render(); maybeOpenFromHash(); } } });

  async function boot() {
    const ok = await loadBootstrap();
    if (!ok) { renderBootError(); return; }
    render();
    maybeOpenFromHash();
    if (state._wantProbe === 'resp') runResponsiveProbe();
  }
  boot();

  /* 重新检查连接：失败态下唯一可用动作，不刷新整页 */
  window.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action="retry-connect"]');
    if (el) { bootError = null; boot(); }
  });`;
  if (!out.includes(bootOld)) problems.push('app.js 找不到启动段（原型结构变了？）');
  out = out.replace(bootOld, bootNew);

  /* 3) 版本字面量 → 注入占位 */
  out = out.replace(/v0\.1\.0/g, '__VERSION_DISPLAY__');

  /* 4) 头部注释：标明这是开发版 */
  out = out.replace(
    '/* 小呼宝 BreathPal · PF-ILD 交互原型 v0.1.0',
    '/* 小呼宝 BreathPal · PF-ILD 开发版（由 scripts/migrate-public.mjs 从原型定点移植，勿手改）\n   改视觉请改原型再跑本脚本；替换点见脚本头部注释。\n   原头部：',
  );
  return out;
}

function transformHtml(src) {
  let out = src;
  out = out.replace('<title>小呼宝 BreathPal · PF-ILD 工作台原型 v0.1.0</title>',
    '<title>小呼宝 BreathPal · PF-ILD 工作台</title>\n<meta name="robots" content="noindex,nofollow">');
  out = out.replace('<div class="prototype-bar"><span><b>交互原型 v0.1.0</b> · 全部为模拟资料（临床试验为占位，待 M4 检索填充）</span><span>仅本页演示 · 刷新重置 · 未接入 DSH / AI</span></div>',
    '<div class="prototype-bar"><span><b>__VERSION_DISPLAY__</b> · 全部为模拟资料（临床试验为占位，待 M4 检索填充）</span><span>本机数据 · 不上传 · AI 面板由宿主提供</span></div>');
  /* 其余版本字面量（版本徽标 / 页脚）一律占位：版面由服务端注入，不在页面写死
     —— 手写死版本号 = 三处版本打架的复发点（家族高频故障）。 */
  out = out.replace(/v0\.1\.0/g, '__VERSION_DISPLAY__');
  /* 构建日期同理：占位由注入器填，避免"页面显示的构建日永远是原型那天" */
  out = out.replace(/2026-10-25/g, '__BUILD_DATE__');
  return out;
}

function transformCss(src) {
  /* 原型与开发版只差"字号三处 + [hidden]"（家族口径）；这里显式确认这两条在 */
  let out = src;
  if (!/\[hidden\]\{display:none !important\}/.test(out)) problems.push('style.css 缺 [hidden]{display:none !important}');
  if (!/--font:15px/.test(out)) problems.push('style.css 字号基线不是 15px 口径');
  return out;
}

const files = [
  ['index.html', transformHtml],
  ['style.css', transformCss],
  ['app.js', transformApp],
];

if (check) {
  for (const [f, fn] of files) {
    const want = fn(readFileSync(join(SRC, f), 'utf8'));
    const target = join(DST, f);
    if (!existsSync(target)) { problems.push(`public/${f} 不存在（跑 node scripts/migrate-public.mjs）`); continue; }
    const have = readFileSync(target, 'utf8');
    /* 版本占位在 public 里会被 build-version 替换，比对时归一 */
    const norm = (t) => t.replace(/__VERSION_DISPLAY__/g, 'V').replace(/v\d+\.\d+\.\d+/g, 'vX');
    if (norm(have) !== norm(want)) problems.push(`public/${f} 与原型定点移植结果不一致（改了原型没重跑，或手改了 public/）`);
  }
  if (problems.length) { console.error('✗ public/ 移植检查失败：\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('✓ public/ 与原型定点移植一致（逐字符，忽略版本占位）');
} else {
  if (problems.length) { console.error('✗ ' + problems.join('；')); process.exit(1); }
  mkdirSync(DST, { recursive: true });
  for (const [f, fn] of files) {
    writeFileSync(join(DST, f), fn(readFileSync(join(SRC, f), 'utf8')));
  }
  console.log('✓ 已从原型定点移植 public/{index.html,style.css,app.js}（替换点 5 处，见脚本头）');
}
