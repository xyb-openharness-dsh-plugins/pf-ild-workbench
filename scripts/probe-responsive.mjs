#!/usr/bin/env node
/**
 * 窄宽自适应探针（30 号）：真实 Chrome 逐页渲染 + 横向溢出/竖排单字测量。
 * 用法：node scripts/probe-responsive.mjs [宽度...]   默认 1440 1180 900 760 600
 * 退出码：0 = 全部页面在全部档位无横向溢出、无竖排单字。
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE = 'file://' + join(ROOT, 'prototypes/v0.2/index.html') + '#dashboard?probe=resp';
const widths = process.argv.slice(2).length ? process.argv.slice(2) : ['1440', '1180', '900', '760', '600'];

if (!existsSync(CHROME)) { console.log('跳过：未找到 Chrome（设 CHROME_PATH 指定）'); process.exit(0); }

let failed = 0;
for (const w of widths) {
  let dom = '';
  try {
    dom = execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      `--window-size=${w},1200`, '--virtual-time-budget=9000', '--dump-dom', PAGE],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch (error) { dom = String(error.stdout || ''); }
  const m = dom.match(/<pre id="probe-result">([\s\S]*?)<\/pre>/);
  if (!m) { console.error(`✗ ${w}px：探针未产生结果（页面未渲染完或脚本报错）`); failed++; continue; }
  const json = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  if (json.bad.length) {
    failed++;
    console.error(`✗ ${w}px：${json.bad.length} 个页面异常`);
    for (const b of json.bad.slice(0, 8)) console.error(`    ${b.page}  横向溢出 ${b.overflow}px，竖排单字 ${b.squeezed} 处`);
  } else {
    console.log(`✓ ${w}px：${json.pages.length} 个页面全部无横向溢出、无竖排单字`);
  }
}
process.exitCode = failed ? 1 : 0;
