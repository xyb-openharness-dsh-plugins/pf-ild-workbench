/* 数据层测试（五套之四）：迁移幂等 / 播种幂等 / **readmodels 与原型逐字节 parity** / 主体隔离。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, migrate, closeStore, tableNames } from '../dsh/store.js';
import { seedDemoData, hasDemoData } from '../dsh/demo.js';
import { readBootstrap, readProfile, requiredTablesPresent } from '../dsh/readmodels.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const protoOf = () => {
  const js = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
  return JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf(';')));
};

test('迁移：幂等（第二次 ran=0）且 0001+0002 的表都建出来', () => {
  const db = openStore(':memory:');
  const again = migrate(db);
  assert.equal(again.ran, 0, '第二次迁移不应再执行任何文件');
  assert.equal(again.total >= 2, true, '至少应有 0001 与 0002 两个迁移');
  assert.deepEqual(requiredTablesPresent(db), [], '读模型需要的表必须都存在');
  closeStore(db);
});

test('迁移：0001 冻结后 0002 不得 DROP 其表', () => {
  const first = readFileSync(join(ROOT, 'schema/0001_initial.sql'), 'utf8');
  const second = readFileSync(join(ROOT, 'schema/0002_parity_tables.sql'), 'utf8');
  const dropped = [...second.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/gi)].map((m) => m[1]);
  assert.deepEqual(dropped, [], '0002 不得 DROP 任何表（只增不改），实际：' + dropped.join(','));
  assert.ok(first.length > 0);
});

test('播种：幂等（第二次 skipped）且单事务可回滚', () => {
  const db = openStore(':memory:');
  const first = seedDemoData(db);
  assert.equal(first.skipped, false);
  assert.ok(first.subjects >= 2);
  const second = seedDemoData(db);
  assert.equal(second.skipped, true, '已有数据时必须整批跳过');
  assert.equal(db.prepare('SELECT COUNT(*) c FROM subjects').get().c, first.subjects, '不得翻倍');
  closeStore(db);
});

test('播种：force 重播后条数不增长（清空再写）', () => {
  const db = openStore(':memory:');
  seedDemoData(db);
  const before = db.prepare('SELECT COUNT(*) c FROM metric_points').get().c;
  seedDemoData(db, { force: true });
  const after = db.prepare('SELECT COUNT(*) c FROM metric_points').get().c;
  assert.equal(after, before, 'force 重播必须清空再写，条数一致');
  closeStore(db);
});

test('PARITY：readmodels 与原型 demo-data.js 逐字节一致（全部档案全部字段）', () => {
  const db = openStore(':memory:');
  seedDemoData(db);
  const mine = readBootstrap(db);
  const proto = protoOf();
  assert.deepEqual(Object.keys(mine.profiles).sort(), Object.keys(proto.profiles).sort(), '档案集合必须一致');
  for (const k of Object.keys(proto.profiles)) {
    assert.deepEqual(mine.profiles[k], proto.profiles[k], `档案 ${k} 与原型不一致（parity 是这一层唯一验收标准）`);
  }
  assert.deepEqual(mine.trials, proto.trials, '试验表形状必须一致');
  closeStore(db);
});

test('主体隔离：读单个档案不串到另一个档案', () => {
  const db = openStore(':memory:');
  seedDemoData(db);
  const a = readProfile(db, 'A');
  const b = readProfile(db, 'B');
  assert.notEqual(a.name, b.name);
  assert.notDeepEqual(a.metrics.map((m) => m.key), b.metrics.map((m) => m.key));
  /* A 的指标点里不得出现 B 的指标键 */
  const bKeys = new Set(b.metrics.map((m) => m.key));
  const aOnly = a.metrics.filter((m) => !bKeys.has(m.key)).map((m) => m.key);
  assert.ok(aOnly.length > 0, '两份档案应有各自的专属指标（防复制粘贴掩盖隔离问题）');
  closeStore(db);
});

test('裸 SELECT 必须带 ORDER BY（源码级烟测：不允许无排序读取记录表）', () => {
  const src = readFileSync(join(ROOT, 'dsh/readmodels.js'), 'utf8');
  const RECORD = /FROM\s+(metric_points|ae_events|med_records|imaging_records|viewpoints|candidates|documents|timeline_events|diagnosis_timeline|care_rhythm|pathway_phases)\b/i;
  /* 括号感知：从 prepare( 起配平到对应右括号，避免语句内的引号把匹配截断 */
  const statements = [];
  let i = 0;
  while ((i = src.indexOf('prepare(', i)) >= 0) {
    let depth = 0, j = i + 'prepare'.length;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) break; }
    }
    statements.push(src.slice(i, j + 1));
    i = j + 1;
  }
  const offenders = statements.filter((st) => RECORD.test(st) && !/ORDER\s+BY/i.test(st));
  assert.deepEqual(offenders, [], '记录表查询必须显式排序：\n' + offenders.join('\n'));
});
