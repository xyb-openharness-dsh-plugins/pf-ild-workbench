/* 静态契约测试（五套之一）：把四个检查器纳入 node:test，一次跑完。
   为什么用子进程而不是 import：检查器是 CLI（有退出码语义），测试要断言的正是退出码。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const run = (script, extra = []) => execFileSync(process.execPath, [join(ROOT, script), ...extra], { encoding: 'utf8', cwd: ROOT });

test('包合同：check-workbench-package 必须 staticPass', () => {
  const out = run('scripts/check-workbench-package.mjs', ['.']);
  const json = JSON.parse(out);
  assert.equal(json.staticPass, true, '静态包合同必须通过：' + JSON.stringify(json.errors));
  assert.equal(json.errors.length, 0);
});

test('宿主注册契约：check-host-contract 通过', () => {
  const out = run('scripts/check-host-contract.mjs');
  assert.match(out, /符合宿主 register\(\) 校验/);
});

test('交互路径一致性：X1–X4 全 > 0（HVT X 层）', () => {
  const out = run('scripts/check-interaction-paths.mjs');
  const json = JSON.parse(out);
  assert.equal(json.判定, 'PASS', 'X 层不通过：' + JSON.stringify(json.problems));
  assert.ok(json.X1.覆盖对 > 0 && json.X1.孤儿页.length === 0, 'X1 不得有孤儿页');
  assert.ok(json.X2.走通路径 > 0 && json.X2.逐字缺失.length === 0, 'X2 路径须逐字走通');
  assert.ok(json.X3.一致实体 > 0 && json.X3.未落地.length === 0, 'X3 通道须一致');
  assert.equal(json.X4.断言计数, 1, 'X4 必须出数字');
});

test('数据模型：无判读列、分类指标不进趋势、保留字列名', () => {
  const out = run('scripts/check-schema.mjs');
  assert.match(out, /数据模型断言通过/);
});

test('文案红线：医疗表述 0 处越界', () => {
  const out = run('scripts/check-wording.mjs');
  assert.match(out, /医疗表述检查通过/);
});
