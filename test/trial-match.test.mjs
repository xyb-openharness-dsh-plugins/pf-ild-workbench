/**
 * 临床试验三档对照 · 否定语义
 *
 * 这些用例不是为了"覆盖代码行"，而是为了钉住两个真实误判（2026-10-25）：
 *   ① 事实侧「未在用」被当成事实存在 → 入选条款「正在使用…」判成符合
 *   ② 条款侧「排除…者」没被识别为反向条款 → 「是（写明 IPF）」判成符合
 *
 * 两个错误叠加时**结论碰巧正确**（页面上四条全绿看着没问题）：
 * 条款侧全走 present 分支，事实侧又把"未在用"算 present，
 * 于是"排除在用抗纤维化药"这条 = present → 符合，正好和真实答案一致。
 * 只测"最终结论"是抓不到的 —— 所以这里**逐条测档位**，并把反向用例写死。
 *
 * L20 的教训也适用于此：断言要能失败。下面每条都在修复前实测过会红。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMatchModel, TIERS } from '../lib/trial-match.js';

const judgeOne = (rule, mine, { decidable = 1 } = {}) => {
  const m = buildMatchModel({
    trials: [{ recordId: 'T1', title: 't', ord: 0 }],
    criteria: [{ id: 1, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: rule, decidable, fact_key: 'k1' }],
    facts: { k1: { value_text: mine, source: 's' } },
  });
  return m.entries[0]?.rules[0]?.tier ?? m.entries[0]?.pending[0]?.text;
};

test('事实侧：入选条款要求"在用"，本地"未在用"必须是冲突', () => {
  assert.equal(judgeOne('正在使用抗纤维化药物', '未在用'), TIERS.CONFLICT);
});

test('事实侧：入选条款要求"在用"，本地"在用"是符合', () => {
  assert.equal(judgeOne('正在使用抗纤维化药物', '在用'), TIERS.SATISFIED);
});

test('事实侧：多种否定写法都要认出（不是只认"无"）', () => {
  for (const v of ['无', '未见', '阴性', 'none', 'n/a', '未使用', '未用过', '没有', '已停用', '不适用']) {
    assert.equal(judgeOne('有该检查记录', v), TIERS.CONFLICT, `「${v}」应被视为事实不存在`);
  }
});

test('条款侧：排除条款 + 本地"是" → 冲突（这是修复前判错的）', () => {
  assert.equal(judgeOne('排除特发性肺纤维化（IPF）明确诊断者', '是（写明 IPF）'), TIERS.CONFLICT);
});

test('条款侧：排除条款 + 本地"否" → 符合', () => {
  assert.equal(judgeOne('排除特发性肺纤维化（IPF）明确诊断者', '否（未写明 IPF）'), TIERS.SATISFIED);
});

test('条款侧：其他反向措辞也要认出', () => {
  for (const rule of ['不应有严重肝病', '不符合条件者排除', '未见相关记录者', 'non-use of steroids']) {
    assert.equal(judgeOne(rule, '有明确记录'), TIERS.CONFLICT, `「${rule}」是反向条款`);
  }
});

test('decidable=0 一律进待确认，不进三档', () => {
  const m = buildMatchModel({
    trials: [{ recordId: 'T1', title: 't', ord: 0 }],
    criteria: [{ id: 1, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: 'FVC %pred 不低于 45%', decidable: 0, fact_key: 'fvc_pred' }],
    facts: { fvc_pred: { value_text: '48', source: 's' } },
  });
  assert.equal(m.entries[0].rules.length, 0);
  assert.equal(m.entries[0].pending.length, 1);
});

test('本地没有该事实 → 待确认（不猜"符合"也不猜"冲突"）', () => {
  const m = buildMatchModel({
    trials: [{ recordId: 'T1', title: 't', ord: 0 }],
    criteria: [{ id: 1, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: '有 HRCT 资料', decidable: 1, fact_key: 'missing' }],
    facts: {},
  });
  assert.equal(m.entries[0].rules[0].tier, TIERS.UNDETERMINED);
});

test('输出里绝不能出现百分比/匹配度字段', () => {
  const m = buildMatchModel({
    trials: [{ recordId: 'T1', title: 't', ord: 0 }],
    criteria: [{ id: 1, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: '有记录', decidable: 1, fact_key: 'k1' }],
    facts: { k1: { value_text: '有', source: 's' } },
  });
  const flat = JSON.stringify(m);
  assert.doesNotMatch(flat, /score|percent|matchRate|匹配度/i);
  assert.ok(!('matchIndex' in m.entries[0]));
});

test('排序按 ord，不按档位（按档位排会暗示"前面的更适合"）', () => {
  const m = buildMatchModel({
    trials: [
      { recordId: 'T2', title: 'second', ord: 1 },
      { recordId: 'T1', title: 'first', ord: 0 },
    ],
    criteria: [
      { id: 1, trial_record_id: 'T2', ord: 0, kind: 'k', category: 'c', rule_text: '有记录', decidable: 1, fact_key: 'k1' },
      { id: 2, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: '有记录', decidable: 1, fact_key: 'nope' },
    ],
    facts: { k1: { value_text: '有', source: 's' } },
  });
  assert.deepEqual(m.entries.map((e) => e.recordId), ['T1', 'T2']);
});
