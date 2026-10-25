/* 演示数据一致性测试（五套之二）：唯一来源 → 两个产物 → 三处条数/结构一致。
   背景：家族里"生成器与前端快照不一致"是 parity 红的高发区（胃癌列数不匹配、
   宫颈事件未归一化导致 toISOString 抛错）。这里把该类的可断言部分固化下来。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function regenerate() {
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'demo/build-demo-data.mjs'], { cwd: ROOT, stdio: 'pipe' });
}
const openDb = () => new DatabaseSync(join(ROOT, 'demo/demo-data.sqlite'));

test('演示数据：生成器可跑，两个产物都存在', () => {
  regenerate();
  assert.ok(existsSync(join(ROOT, 'demo/demo-data.sqlite')), 'demo sqlite 必须生成');
  assert.ok(existsSync(join(ROOT, 'prototypes/v0.2/demo-data.js')), 'prototype 快照必须生成');
});

test('演示数据：sqlite 档案数 = 原型快照 profiles 数', () => {
  regenerate();
  const db = openDb();
  const nSubjects = db.prepare('SELECT COUNT(*) c FROM subjects').get().c;
  db.close();
  const js = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
  const data = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf(';')));
  assert.equal(Object.keys(data.profiles).length, nSubjects, '快照与 sqlite 档案数必须一致');
  assert.ok(nSubjects >= 2, '至少 2 个演示档案（防单档案掩盖主体隔离问题）');
});

test('演示数据：分类指标 dec IS NULL 且 in_trend=0 且无单位', () => {
  regenerate();
  const db = openDb();
  const rows = db.prepare('SELECT metric_key, kind, unit, in_trend FROM metric_definitions WHERE dec IS NULL').all();
  assert.ok(rows.length > 0, '至少要有分类指标（mMRC 等），否则该断言无意义');
  for (const r of rows) {
    assert.equal(r.in_trend, 0, `${r.metric_key} 分类指标不得进趋势`);
    assert.equal(r.unit, null, `${r.metric_key} 分类指标不得有单位`);
    assert.ok(['grade', 'qual'].includes(r.kind), `${r.metric_key} kind 必须是 grade/qual`);
  }
  const bad = db.prepare('SELECT metric_key FROM metric_definitions WHERE dec IS NOT NULL AND in_trend = 1 AND unit IS NULL').all();
  assert.equal(bad.length, 0, '进趋势的数值指标必须有单位：' + bad.map((b) => b.metric_key).join(','));
  db.close();
});

test('演示数据：数值点与文本点互斥（v_num / v_text）', () => {
  regenerate();
  const db = openDb();
  const bad = db.prepare('SELECT COUNT(*) c FROM metric_points WHERE (v_num IS NULL) = (v_text IS NULL)').get().c;
  assert.equal(bad, 0, '每个点必须恰好有 v_num 或 v_text 之一');
  db.close();
});

test('演示数据：快照里 events/docs/candidates 是定长数组（不是对象）', () => {
  regenerate();
  const js = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
  const data = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf(';')));
  for (const [k, p] of Object.entries(data.profiles)) {
    for (const field of ['events', 'docs', 'candidates']) {
      assert.ok(Array.isArray(p[field]), `${k}.${field} 必须是数组`);
      for (const item of p[field]) assert.ok(Array.isArray(item), `${k}.${field} 的每一项必须是定长数组`);
    }
    assert.ok(Array.isArray(p.pathway?.rows), `${k}.pathway.rows 必填（32 号折叠卡数据源）`);
    for (const b of ['方案', '指标和趋势', '影像发现', '副作用总结', '支持与效果']) {
      assert.ok(p.pathway?.detail?.[b], `${k} 折叠卡缺「${b}」块——32 号要求五块齐全`);
    }
  }
});

test('演示数据：无判读列（PRAGMA 全表扫描）', () => {
  regenerate();
  const db = openDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const JUDGE = /diagnosis|risk_level|severity|stage|prognos/i;
  for (const t of tables) {
    for (const c of db.prepare(`PRAGMA table_info(${t.name})`).all()) {
      assert.ok(!JUDGE.test(c.name), `判读列 ${t.name}.${c.name} 不得存在`);
    }
  }
  db.close();
});

test('演示数据：INSERT 全部显式列名（禁位置式）', () => {
  const src = readFileSync(join(ROOT, 'demo/build-demo-data.mjs'), 'utf8');
  const positional = [...src.matchAll(/INSERT\s+INTO\s+\w+\s+VALUES/gi)];
  assert.equal(positional.length, 0, '禁止 INSERT INTO t VALUES (?) 位置式写法');
});
