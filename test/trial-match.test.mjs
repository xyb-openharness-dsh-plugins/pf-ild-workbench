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
import { buildMatchModel, TIERS, factsOf, searchLeads } from '../lib/trial-match.js';

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

test('decidable=0 落待确认，并且必须给出 why（不能是沉默的灰点）', () => {
  const m = buildMatchModel({
    trials: [{ recordId: 'T1', title: 't', ord: 0 }],
    criteria: [{ id: 1, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: 'FVC %pred 不低于 45%', decidable: 0, fact_key: 'fvc_pred', source_note: '需要阈值比较' }],
    facts: { fvc_pred: { value_text: '48', source: 's' } },
  });
  const e = m.entries[0];
  assert.equal(e.pending.length, 1, 'decidable=0 要单列在 pending 里');
  assert.equal(e.rules[0].tier, TIERS.UNDETERMINED, '也进 rules 以便逐条显示原因');
  assert.ok(e.rules[0].why && e.rules[0].why.length > 4, '待确认必须带 why');
  assert.equal(e.decidable, 0);
  assert.equal(e.total, 1);
});

test('「未检测」不是阴性：必须落待确认，不能判冲突也不能判符合', () => {
  /* 这是最伤人的一种错：把"没做过这项检查"判成"不符合"或"符合"，
     都是替患者下了它没做过的结论。 */
  for (const v of ['未检测', '未查', '未做', '不详']) {
    assert.equal(judgeOne('入选：某项抗体阳性', v), TIERS.UNDETERMINED, `「${v}」应落待确认`);
  }
});

test('每条档位都必须带 why', () => {
  const m = buildMatchModel({
    trials: [{ recordId: 'T1', title: 't', ord: 0 }],
    criteria: [
      { id: 1, trial_record_id: 'T1', ord: 0, kind: 'k', category: 'c', rule_text: '有记录', decidable: 1, fact_key: 'k1' },
      { id: 2, trial_record_id: 'T1', ord: 1, kind: 'k', category: 'c', rule_text: '有记录', decidable: 1, fact_key: 'missing' },
    ],
    facts: { k1: { value_text: '有', source: 's' } },
  });
  for (const r of m.entries[0].rules) {
    assert.ok(r.why && r.why.length > 2, `${r.tier} 也要 why`);
  }
});

test('检索分层：结构化 → 文本 → 宽口径，且每层给得出证据', () => {
  const facts = factsOf({ etiology: '类风湿关节炎相关间质性肺病', imaging: { rows: [['2026-01-01', 'HRCT', '网格影']] } });
  const leads = searchLeads([
    { recordId: 'A', title: '类风湿关节炎相关间质性肺病研究' },
    { recordId: 'B', title: '肺纤维化治疗研究' },
    { recordId: 'C', title: '罕见病登记研究' },
  ], facts);
  assert.deepEqual(leads.layers.map((l) => l.title), ['结构化命中', '文本命中', '宽口径命中']);
  assert.equal(leads.layers[0].rows[0].recordId, 'A', '建档实体出现在标题里 → 结构化');
  assert.ok(leads.layers[0].rows[0].structured[0].field, '结构化命中要说明是哪个字段');
  assert.equal(leads.layers[1].rows[0].recordId, 'B', '题材词重合 → 文本');
  assert.ok(leads.layers[1].rows[0].text.length > 0, '文本命中要逐词列出');
  assert.equal(leads.layers[2].rows[0].recordId, 'C', '只沾大词 → 宽口径');
});

test('健康受试者/生物等效性单独兜出来（三层都不收时也不能静默消失）', () => {
  /* 这条登记不沾任何题材词，三层全空。旧实现会让它凭空不见 —— 患者以为"没有相关研究"，
     其实是"有一条但不招你这类人"。 */
  const leads = searchLeads([{ recordId: 'X', title: '某某片健康受试者生物等效性研究' }], {});
  assert.deepEqual(leads.counts, { structured: 0, text: 0, broad: 0 });
  assert.equal(leads.flagged.length, 1);
  assert.equal(leads.flagged[0].recordId, 'X');
  assert.ok(leads.flaggedNote, '要有一句说明为什么列在这里');
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
