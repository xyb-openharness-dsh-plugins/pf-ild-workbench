import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildContextPack, JUDGEMENT_KEYS, attachToAiPanel } from '../lib/ai-context.js';

const bootstrap = () => {
  const db = JSON.parse(readFileSync(new URL('./golden/bootstrap.json', import.meta.url), 'utf8'));
  return db;
};

test('上下文包只含用户勾选的条目', () => {
  const b = bootstrap();
  const pack = buildContextPack({ bootstrap: b, selection: { metricSeriesIds: ['FVC %pred'] } });
  assert.ok(pack.facts.length > 0);
  for (const f of pack.facts) {
    assert.equal(f.kind, 'metric-series');
    assert.equal(f.metric, 'FVC %pred');
    assert.ok(f.evidence, '每条事实必须带证据等级');
  }
});

test('不勾选 → 不带资料（不主动塞数据）', () => {
  const pack = buildContextPack({ bootstrap: bootstrap() });
  assert.equal(pack.facts.length, 0);
  assert.equal(pack.notes.length, 2);
});

test('上下文包不含任何判断性字段（结构约束，不是"当下没写"）', () => {
  const pack = buildContextPack({ bootstrap: bootstrap(), selection: { metricSeriesIds: ['FVC %pred'], trialTrials: ['NCT05606939'] } });
  const seen = new Set();
  (function walk(v) {
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) { if (JUDGEMENT_KEYS.includes(k)) seen.add(k); walk(x); }
  })(pack);
  assert.deepEqual([...seen], [], '上下文包出现判断性字段');
});

test('notes 明确禁止替用户下结论', () => {
  const pack = buildContextPack({ bootstrap: bootstrap() });
  assert.match(pack.notes.join(' '), /不得替用户判断病情/);
  assert.match(pack.notes.join(' '), /不得给出用药或治疗建议/);
});

test('宿主未提供 sendContext 时明确失败（不静默吞）', () => {
  assert.throws(() => attachToAiPanel({}, null), /sendContext/);
});
