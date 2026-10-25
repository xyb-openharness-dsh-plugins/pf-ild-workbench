/**
 * 临床试验匹配 · 三档对照（**不产出百分比、不排序、不推荐**）
 *
 * 为什么没有"匹配指数 87%"：
 *   给患者一个百分比等于替医生下结论，而且无法回溯——用户看到 87% 会问「那我到底能不能进」，
 *   工作台答不了。三档（符合 / 冲突 / 待确认）每条都能指出**是拿哪一条档案记录对照出来的**，
 *   用户可以拿这条记录去问医生。这个设计沿用家族 GTN 仓的实测结论
 *   （`dsh/readmodels.js:120-155`：三档枚举 + 排序不按匹配度 + 待确认单列）。
 *
 * 红线：
 *   - 不产生 satisfied 之外的任何结论性文案（不写"建议参加""适合入组"）；
 *   - `undetermined` 不等于"不符合"，只表示"本地没有可用字段"；
 *   - `pending` 不进三档（decidable=0 的条目）；
 *   - 排序保持数据来源顺序（ord），**不按档位排** —— 按档位排会让用户以为前面的更"适合"。
 */

export const TIERS = Object.freeze({
  SATISFIED: 'satisfied',     // 本地记录与条目一致
  CONFLICT: 'conflict',       // 本地记录与条目相冲突
  UNDETERMINED: 'undetermined', // 本地没有可用字段 / 字段为空 → 不可判定
});

export const TIER_LABEL = Object.freeze({
  satisfied: '符合',
  conflict: '冲突',
  undetermined: '待确认',
});

/** 判定一条规则：返回 { tier, mine, src } */
function judge(criteria, facts) {
  const fact = facts[criteria.fact_key];
  if (!fact) return { tier: TIERS.UNDETERMINED, mine: null, src: null };

  const mine = fact.value_text ?? (fact.value_num === null || fact.value_num === undefined ? null : String(fact.value_num));
  const src = fact.source ?? null;

  /* 结构化的判定只有一种：条目要求"有/无某事实"。
     更细的阈值判定（如 FVC%pred > 45）需要 criteria 里带比较符，
     本轮 schema 未加该列 —— 如实按"仅事实存在性"处理，不假装能比大小。 */
  if (criteria.decidable !== 1) return { tier: TIERS.UNDETERMINED, mine, src };

  const expectAbsent = /无|未见|未用过|non[- ]?use/i.test(criteria.rule_text);
  const present = mine !== null && mine !== '' && !/^(无|未见|阴性|none)$/i.test(mine);
  const ok = expectAbsent ? !present : present;
  return { tier: ok ? TIERS.SATISFIED : TIERS.CONFLICT, mine, src };
}

/**
 * @param trials   [{ recordId, title, status, url, ord }]
 * @param criteria [{ id, trial_record_id, ord, kind, category, rule_text, decidable, fact_key }]
 * @param facts    { [fact_key]: { value_text, value_num, observed_on, source, evidence } }
 * @returns { ruleSetVersion, generatedAt, entries[], channelsNote, footerNote }
 */
export function buildMatchModel({ trials, criteria, facts, ruleSetVersion, generatedAt, footerNote, channelsNote }) {
  const byTrial = new Map();
  for (const c of criteria) {
    if (!byTrial.has(c.trial_record_id)) byTrial.set(c.trial_record_id, []);
    byTrial.get(c.trial_record_id).push(c);
  }

  const entries = trials
    .slice()
    /* 排序按数据来源顺序，**不按 tier**；调用方传入的 ord 是唯一依据 */
    .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0) || String(a.recordId).localeCompare(String(b.recordId)))
    .map((t) => {
      const cs = (byTrial.get(t.recordId) ?? []).slice().sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
      const judged = cs.filter((c) => c.decidable === 1).map((c) => ({ ...judge(c, facts), criteriaId: c.id, kind: c.kind, category: c.category, text: c.rule_text }));
      const pending = cs.filter((c) => c.decidable !== 1).map((c) => ({ criteriaId: c.id, kind: c.kind, category: c.category, text: c.rule_text }));
      /* 汇总：只计数，不给"匹配度" */
      const counts = { satisfied: 0, conflict: 0, undetermined: 0 };
      for (const j of judged) counts[j.tier] += 1;
      return {
        recordId: t.recordId,
        title: t.title,
        status: t.status ?? null,
        url: t.url ?? null,
        rules: judged,
        pending,
        counts,
        /* 显式声明：这不是入组资格判定 */
        note: '登记状态，未核实；三条档位只表示"本地记录与条目文字是否一致"，不代表可入组。',
      };
    })
    .filter((e) => e.rules.length > 0 || e.pending.length > 0);

  return {
    ruleSetVersion: ruleSetVersion ?? 'unknown',
    generatedAt: generatedAt ?? new Date().toISOString(),
    entries,
    channelsNote: channelsNote ?? null,
    footerNote: footerNote ?? '本页只做"档案事实 ↔ 登记条目"的文字对照，不做入组资格判定，也不能替代研究者的评估。',
  };
}

/** 供前端/测试：把一次评估压成可读结构（不带百分比字段，防止有人后来加） */
export function summarize(model) {
  const flat = { satisfied: 0, conflict: 0, undetermined: 0, pending: 0, trials: 0 };
  for (const e of model.entries) {
    flat.trials += 1;
    flat.satisfied += e.counts.satisfied;
    flat.conflict += e.counts.conflict;
    flat.undetermined += e.counts.undetermined;
    flat.pending += e.pending.length;
  }
  return flat;
}
