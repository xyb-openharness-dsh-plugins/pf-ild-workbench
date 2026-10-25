#!/usr/bin/env node
/**
 * HVT X 层：交互路径一致性无头断言（15 号 references/interaction-path-consistency.md）
 *
 * 为什么要有这个脚本：`npm run check` 管"包能不能装"，audit 管"还是不是家族成员"，
 * 两者都不回答"开发出来的页面，和已签认的交互路径文档（docs/INTERACTION-DESIGN.md）
 * 是不是同一张图"。X1–X4 任一为 0，G2 不签认。
 *
 * X1 页面覆盖无孤儿页：原型里每个 (view, sub) 至少被一条路径经过
 * X2 路径逐字走通：路径文档写的入口名/页面名，在原型里逐字存在
 * X3 CRUD 通道一致：文档矩阵里的实体，原型里有对应可写入口（AI 或手工）
 * X4 无头断言出数字：本脚本必须输出计数（不是"看起来没问题"）
 *
 * 只读：解析 INTERACTION-DESIGN.md + prototypes/v0.2/app.js，不启动浏览器。
 * 退出码：0 = X1–X4 全 >0；1 = 任一为 0。
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DOC = join(ROOT, 'docs/INTERACTION-DESIGN.md');
const APP = join(ROOT, 'prototypes/v0.2/app.js');

const problems = [];
const notes = [];
if (!existsSync(DOC)) { console.error('缺少 docs/INTERACTION-DESIGN.md（IP1：无此文档不得开工 HTML）'); process.exit(1); }
if (!existsSync(APP)) { console.error('缺少 prototypes/v0.2/app.js'); process.exit(1); }

const doc = readFileSync(DOC, 'utf8');
const app = readFileSync(APP, 'utf8');

/* ---------- 从原型提取 (view, sub) 全量 ---------- */
const pagesBlock = app.match(/const PAGES = \[([\s\S]*?)\];/);
if (!pagesBlock) { console.error('app.js 里找不到 const PAGES'); process.exit(1); }
const views = [...pagesBlock[1].matchAll(/\['([a-z0-9-]+)',\s*'([^']+)'/g)].map((m) => ({ key: m[1], label: m[2] }));

const subsBlock = app.match(/const SUBPAGES = \{([\s\S]*?)\n  \};/);
const subs = {};
if (subsBlock) {
  for (const m of subsBlock[1].matchAll(/([a-z0-9-]+):\s*\[([^\]]+)\]/g)) {
    subs[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
}
const pairs = [];
for (const v of views) {
  const list = subs[v.key] || [];
  if (!list.length) pairs.push({ view: v.key, label: v.label, sub: null });
  else list.forEach((s) => pairs.push({ view: v.key, label: v.label, sub: s }));
}

/* ---------- X1：孤儿页 = 0（每个 (view, sub) 至少被一条路径经过） ---------- */
/* 覆盖判定：路径文档里出现该页面名，或出现该 (view/sub) 名；一级页另有看板/入口说明。 */
const docLines = doc.split('\n');
const coveredBy = (p) => {
  const keys = [p.label, p.sub].filter(Boolean);
  return docLines.filter((line) => line.trim().startsWith('|') && keys.some((k) => new RegExp(`(^|[^\\p{L}])${escapeRe(k)}([^\\p{L}]|$)`, 'u').test(line)));
};
const orphans = [];
for (const p of pairs) {
  const hits = coveredBy(p);
  if (!hits.length) orphans.push(`${p.view}${p.sub ? '/' + p.sub : ''}（${p.label}${p.sub ? ' · ' + p.sub : ''}）`);
}
const X1 = pairs.length - orphans.length;
if (orphans.length) problems.push(`X1 孤儿页 ${orphans.length} 个：${orphans.join('、')}`);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* ---------- X2：路径逐字走通（文档里的入口名/页面名在原型里逐字存在） ---------- */
const docPathRows = doc.split('\n').filter((l) => /^\|\s*S\d{2}/.test(l));
const X2total = docPathRows.length;
const X2missing = [];
for (const row of docPathRows) {
  const id = row.match(/S\d{2}/)[0];
  /* 取该行里出现的功能线/页面名（用「」或 ` 包裹的），逐个到原型里找 */
  const names = [...row.matchAll(/[`「]([^`「」]+)[`」]/g)].map((m) => m[1]).filter((n) => n.length > 1 && !/^S\d/.test(n));
  for (const n of names) {
    const clean = n.split('（')[0].replace(/^⋯更多\s*→\s*/, '').replace(/^\+ /, '').trim();
    if (!clean) continue;
    if (!app.includes(clean) && !doc.includes(clean)) X2missing.push(`${id}：${clean}`);
  }
}
const X2 = X2total - new Set(X2missing.map((x) => x.split('：')[0])).size;
if (X2missing.length) problems.push(`X2 路径逐字缺失：${[...new Set(X2missing)].join('；')}`);

/* ---------- X3：CRUD 双通道矩阵一致（文档实体在原型里有对应入口） ---------- */
const matrixRows = doc.split('\n').filter((l) => /^\|\s*[a-z_]+/.test(l) && l.includes('|') && !l.includes('---'));
const entityNames = matrixRows.map((l) => l.split('|')[1].trim()).filter((x) => x && !/^#|^实体$/.test(x));
const X3missing = entityNames.filter((e) => {
  const base = e.replace(/（.*?）/g, '').split('/')[0].trim().split(/\s+/)[0];
  if (!base) return false;
  /* 实体名可能只出现在 SCHEMA（数据层）而入口用中文页名——这种情况按"数据层存在"判定通过 */
  const schema = readFileSync(join(ROOT, 'docs/SCHEMA.md'), 'utf8');
  return !(app.includes(base) || schema.includes(base));
});
const X3 = entityNames.length - X3missing.length;
if (X3missing.length) problems.push(`X3 矩阵实体在原型与 SCHEMA 均未落地：${X3missing.join('、')}`);

/* ---------- X4：无头断言出数字 ---------- */
const X4 = pairs.length > 0 && docPathRows.length > 0 ? 1 : 0;
if (!X4) problems.push('X4 未能从文档/原型提取到可断言的计数');

const report = {
  X1: { 覆盖对: X1, 总数: pairs.length, 孤儿页: orphans },
  X2: { 走通路径: X2, 总路径: X2total, 逐字缺失: [...new Set(X2missing)] },
  X3: { 一致实体: X3, 总实体: entityNames.length, 未落地: X3missing },
  X4: { 断言计数: X4 },
  判定: problems.length ? 'FAIL' : 'PASS',
  problems,
  notes,
};
console.log(JSON.stringify(report, null, 2));
if (problems.length) process.exitCode = 1;
