import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Workbench, seedDemoData } from '../dsh/workbench.js';
import { createHandler } from '../dsh/server.js';

const PUB = join(import.meta.dirname, '..', 'public');

function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'pfild-ai-'));
  const wb = new Workbench({ root: dir });
  wb.open();
  seedDemoData(wb.db, { force: true });
  const handler = createHandler({
    apiBase: '',
    publicDir: PUB,
    services: { version: '0.1.0', displayVersion: 'v0.1.0', capabilities: ['bootstrap', 'health'], bootstrap: () => wb.bootstrap() },
  });
  return { wb, handler };
}

async function call(handler, { method = 'GET', url, body }) {
  const req = { method, url, async *[Symbol.asyncIterator]() { if (body !== undefined) yield Buffer.from(body); } };
  return new Promise((resolve) => {
    const res = {
      status: 0, headers: {},
      writeHead(s, h) { this.status = s; this.headers = h; },
      end(payload) { resolve({ status: this.status, body: payload }); },
    };
    handler(req, res);
  });
}

test('POST /api/ai/context 返回上下文包（只含事实）', async () => {
  const { wb, handler } = boot();
  const r = await call(handler, { method: 'POST', url: '/api/ai/context', body: JSON.stringify({ selection: { metricSeriesIds: ['FVC %pred'] } }) });
  assert.equal(r.status, 200);
  const pack = JSON.parse(r.body);
  assert.equal(pack.version, 'v1');
  assert.ok(pack.facts.length > 0);
  assert.ok(pack.notes.join(' ').includes('不得替用户判断病情'));
  wb.close();
});

test('空选择 → 0 事实（不主动塞数据）', async () => {
  const { wb, handler } = boot();
  const r = await call(handler, { method: 'POST', url: '/api/ai/context', body: '{}' });
  assert.equal(JSON.parse(r.body).facts.length, 0);
  wb.close();
});

test('坏 JSON → 400 而不是 500', async () => {
  const { wb, handler } = boot();
  const r = await call(handler, { method: 'POST', url: '/api/ai/context', body: 'not-json' });
  assert.equal(r.status, 400);
  wb.close();
});

test('GET /api/ai/context → 405', async () => {
  const { wb, handler } = boot();
  const r = await call(handler, { method: 'GET', url: '/api/ai/context' });
  assert.equal(r.status, 405);
  wb.close();
});
