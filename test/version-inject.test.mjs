import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { injectTokens } from '../dsh/server.js';

const PUB = join(import.meta.dirname, '..', 'public');

test('public/index.html 不含写死的版本字面量与构建日（一律占位，由服务端注入）', () => {
  const html = readFileSync(join(PUB, 'index.html'), 'utf8');
  assert.equal(/v\d+\.\d+\.\d+/.test(html), false, '页面里出现写死版本号 = 三处版本打架复发点');
  assert.equal(/20\d\d-\d\d-\d\d/.test(html), false, '页面里出现写死日期');
  assert.ok(html.includes('__VERSION_DISPLAY__'));
  assert.ok(html.includes('__BUILD_DATE__'));
});

test('注入器把占位换成真实值（版本 / 构建日 / apiBase）', () => {
  const out = injectTokens('v=__VERSION_DISPLAY__ b=__BUILD_DATE__ vv=__VERSION__ base=__API_BASE__', {
    apiBase: '/api/pf-ild', version: '9.9.9', displayVersion: 'v9.9.9', buildDate: '2099-01-01',
  });
  assert.equal(out, 'v=v9.9.9 b=2099-01-01 vv=9.9.9 base=/api/pf-ild');
});

test('注入后不残留任何占位符', () => {
  const html = readFileSync(join(PUB, 'index.html'), 'utf8');
  const out = injectTokens(html, { apiBase: '', version: '0.2.0', displayVersion: 'v0.2.0', buildDate: '2026-10-25' });
  assert.equal(/__[A-Z_]+__/.test(out), false, '注入后仍有 __占位符__ 残留');
});
