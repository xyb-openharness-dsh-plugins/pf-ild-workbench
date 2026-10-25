/* apiBase 契约测试（五套之三）：交界守卫 + **双形态回归**。
   背景（GBM 踩 4）：有人用 includes('/api') 一刀切"防重复"，把宿主正常前缀
   `/api/pf-ild` 判成错误；或没防住拼出 /api/api。这里把两种形态都钉死。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBase, validateApiBase, buildApiUrl, guardStartupApiBase, detectForm } from '../lib/api-base.js';

test('独立形态：API_BASE 为空串合法，拼出 /api/bootstrap', () => {
  const v = validateApiBase('');
  assert.equal(v.ok, true, v.reason);
  assert.equal(buildApiUrl('', '/api/bootstrap'), '/api/bootstrap');
  assert.equal(detectForm(''), 'standalone');
});

test('宿主形态：/api/pf-ild 合法（含 /api 是正常的，不许一刀切）', () => {
  const v = validateApiBase('/api/pf-ild');
  assert.equal(v.ok, true, '宿主前缀含 /api 属正常，不该被拒：' + v.reason);
  assert.equal(buildApiUrl('/api/pf-ild', '/api/bootstrap'), '/api/pf-ild/api/bootstrap');
  assert.equal(detectForm('/api/pf-ild'), 'hosted');
});

test('交界守卫：只禁以 /api 结尾（会产生 /api/api）', () => {
  for (const bad of ['/api', '/pf-ild/api', 'api']) {
    const v = validateApiBase(bad);
    assert.equal(v.ok, false, `${bad} 应被判非法`);
    assert.match(v.reason, /api\/api/);
  }
});

test('规范化：补前导斜杠、去尾斜杠、空/根归一为空串', () => {
  assert.equal(normalizeApiBase('pf-ild'), '/pf-ild');
  assert.equal(normalizeApiBase('/pf-ild/'), '/pf-ild');
  assert.equal(normalizeApiBase('/'), '');
  assert.equal(normalizeApiBase(null), '');
});

test('拒绝完整 URL 与含空白的值', () => {
  assert.equal(validateApiBase('https://x.example/pf').ok, false);
  assert.equal(validateApiBase('/pf ild').ok, false);
});

test('启动期守卫：失败不抛异常，返回可渲染横幅（禁裸 throw 白屏）', () => {
  const good = guardStartupApiBase('/api/pf-ild');
  assert.equal(good.ok, true);
  assert.equal(good.banner, null);
  const bad = guardStartupApiBase('/api');
  assert.equal(bad.ok, false);
  assert.equal(bad.base, '');
  assert.ok(bad.banner && bad.banner.title && bad.banner.detail, '失败时必须给出可渲染的横幅文案');
});

test('双形态回归：两种形态下拼接结果都只有一处 /api 交界', () => {
  for (const base of ['', '/api/pf-ild']) {
    const url = buildApiUrl(base, '/api/bootstrap');
    const junctions = url.match(/\/api\/api/g) || [];
    assert.equal(junctions.length, 0, `${base} 拼出重复交界：${url}`);
    assert.ok(url.endsWith('/api/bootstrap'), url);
  }
});
