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

/**
 * 判定一条规则：返回 { tier, mine, src, why }
 *
 * `why` 是给人看的一句话，说明**凭什么**是这一档。没有 why 的档位等于没判 ——
 * 用户看到「待确认」时必须能读到"因为本机没有这一项记录"，而不是一个沉默的灰点。
 */
function judge(criteria, facts) {
  const fact = facts[criteria.fact_key];
  if (!fact) {
    return {
      tier: TIERS.UNDETERMINED, mine: null, src: null,
      why: '本机没有这一项记录（缺 ≠ 不符合）',
    };
  }

  const mine = fact.value_text ?? (fact.value_num === null || fact.value_num === undefined ? null : String(fact.value_num));
  const src = fact.source ?? null;

  /* 结构化的判定只有一种：条目要求"有/无某事实"。
     更细的阈值判定（如 FVC%pred > 45）需要 criteria 里带比较符，
     本轮 schema 未加该列 —— 如实按"仅事实存在性"处理，不假装能比大小。 */
  if (criteria.decidable !== 1) {
    return {
      tier: TIERS.UNDETERMINED, mine, src,
      why: criteria.source_note || '这一条需要阈值比较或原文核对，本仓没有对应字段，无法自动对照',
    };
  }

  /* 「未检测 / 未做 / 未查」不是阴性，也不是"没有这件事"——它是**本机没有这个信息**，
     必须落「待确认」。把它并进否定词表会让「入选：某项阳性」判成"冲突"，
     等于替患者下了它根本没做过的结论（PBC 仓踩过，PF-ILD 同样中招）。 */
  if (UNKNOWN_FACT_RE.test(String(mine ?? ''))) {
    return {
      tier: TIERS.UNDETERMINED, mine, src,
      why: `本机记录是「${mine}」，既不是阳性也不是阴性，无法对照`,
    };
  }

  const expectAbsent = ABSENT_RULE_RE.test(criteria.rule_text);
  const present = isPresent(mine);
  const ok = expectAbsent ? !present : present;
  return {
    tier: ok ? TIERS.SATISFIED : TIERS.CONFLICT,
    mine, src,
    why: expectAbsent
      ? (ok ? `条目要求"没有这一项"，本机记录：${mine}` : `条目要求"没有这一项"，但本机记录：${mine}`)
      : (ok ? `条目要求"有这一项"，本机记录：${mine}` : `条目要求"有这一项"，但本机记录：${mine}`),
  };
}

/* 「未检测」这类"信息缺失"必须单独一类：既不能算有，也不能算没有。 */
const UNKNOWN_FACT_RE = /^(未检测|未查|未做|未测|不知道|不详)/;

/* ── 否定语义的两个方向，必须分开看 ────────────────────────────
 * 2026-10-25 实测两个真实误判（三档全绿而结论相反）：
 *
 *   ① 事实侧：「未在用」被判成"事实存在"
 *      入选条款「正在使用抗纤维化药物」+ 本地「未在用」→ 判 satisfied。
 *      旧实现只把「无/未见/阴性/none」当否定，漏掉「未在用 / 未做 / 没有 / 否」。
 *      加模式时想清楚"这条记录说的是有事还是没事"，别只补眼下这一个词。
 *
 *   ② 条款侧：「排除…者」这种反向条款没有被识别
 *      「排除特发性肺纤维化（IPF）明确诊断者」——
 *      expectAbsent 若为 false，则本地「是（写明 IPF）」也会判 satisfied，
 *      结论正好相反。旧正则只有 无|未见|未用过|non-use，漏掉「排除 / 不应 / 不符合」。
 *
 * 两者叠加会**互相掩盖**：条款侧漏判让 expectAbsent 恒为 false，
 * 于是所有入选条款都走 present 分支；而事实侧漏判又让「未在用」算 present。
 * 两边各错一次，页面上全绿，看上去"跑通了"。
 */
const ABSENT_RULE_RE = /排除|除外|不应|不得|不能|不符合|无\s*[^，。]{0,12}者|未见|未用过|non[- ]?use|exclusion/i;

/** 事实值说的到底是"有"还是"没有"。返回 true 表示事实成立（存在）。 */
function isPresent(v) {
  if (v === null || v === undefined || v === '') return false;
  const s = String(v).trim();
  /* 明确的否定取值。注意顺序：先判「未在用 / 已停 / 没有」这类比"在用"更具体。 */
  if (/^(?:无|否|没有|未见|未发现|无相关记录|阴性|none|null|n\/a|不适用|未在用|未用过|未使用|未服用|未做|未查|未记录|未建)/i.test(s)) return false;
  if (/^(?:不是|不属于|并非)/.test(s)) return false;
  if (/未在用|已停用|已停药|不再使用|未使用过/.test(s)) return false;
  return true;
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
      /* 全部条目都进 rows（含 decidable=0），这样「为什么待确认」能逐条读到原因；
         `pending` 保留给「本仓压根没有字段」的那批，页面单独提示"这些不猜"。 */
      const judged = cs.map((c) => ({ ...judge(c, facts), criteriaId: c.id, kind: c.kind, category: c.category, text: c.rule_text }));
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
        /* 可判定条目数 / 总条目数：用来解释"为什么这么多待确认"，
           **不是**"匹配了多少"的分子（那是百分比的前身，不做）。 */
        decidable: judged.filter((r) => r.tier !== TIERS.UNDETERMINED).length,
        total: judged.length,
        /* 显式声明：这不是入组资格判定 */
        note: '登记状态，未核实；三条档位只表示"本地记录与条目文字是否一致"，不代表可入组。',
      };
    })
    .filter((e) => e.rules.length > 0 || e.pending.length > 0);

  return {
    ruleSetVersion: ruleSetVersion ?? 'unknown',
    generatedAt: generatedAt ?? new Date().toISOString(),
    entries,
    /* 把参与对照的事实一起带出去：页面要能列出「匹配建档」（哪个字段、值是什么、来源在哪），
       否则用户看到一个档位却不知道是拿哪条记录比出来的。 */
    facts,
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

/* ── 事实抽取：唯一来源 ────────────────────────────────────────
 * 2026-10-25 之前 `dsh/demo.js`（写库）和 `demo/build-demo-data.mjs`（写原型数据）
 * **各写了一份提取规则**。两份只要有一处不同，就会出现"原型显示 4 条符合、
 * 开发版显示 3 条"这种没人能解释的差异。现在两边都调这里。
 * 来源：PBC 仓 lib/trial-match.js 的 factsOf（它反过来引用本仓 v0.2.1 的 TIERS 口径）。
 */
export function factsOf(profile) {
  const p = profile ?? {};
  const facts = {};
  const put = (key, valueText, source, extra = {}) => {
    if (valueText === null || valueText === undefined || valueText === '') return;
    facts[key] = { value_text: String(valueText), source: source ?? null, ...extra };
  };

  /* 诊断原文：只搬医生写的，不归纳、不改写。 */
  put('diagnosis_text', p.etiology || null, '诊断原文', { evidence: 'B' });

  /* HRCT：同样只搬报告原文。 */
  const img = p.imaging?.rows?.[0];
  put('hrct_pattern', img?.[2] || null, '影像结论原文', { observed_on: img?.[0] ?? null, evidence: 'B' });

  /* IPF 是否写明：这是"诊断原文里有没有 IPF 字样"，不是判定 IPF。 */
  put('ipf_excluded', /IPF|特发性肺纤维化/i.test(String(p.etiology || '')) ? '是（写明 IPF）' : '否（未写明 IPF）',
    '诊断原文', { evidence: 'B' });

  /* 抗纤维化是否在用：`已停药` 是**明确不在用**，要表达出来而不是省略这行。 */
  const meds = p.med?.rows || [];
  const using = meds.filter((r) => /尼达尼布|吡非尼酮/.test(String(r[0] ?? '')) && !/已停/.test(String(r[3] ?? '')));
  if (meds.length) {
    put('antifibrotic_current', using.length ? `在用：${using.map((r) => r[0]).join('、')}` : '未在用（有用药记录但均标为已停）',
      '用药记录', { evidence: 'B' });
  }

  /* 病理资料：有没有"可供复核"的材料（影像/活检报告），不判断质量。 */
  put('pathology_available', (p.imaging?.rows || []).length > 0 ? '有影像资料可复核' : null, '影像档案', { evidence: 'B' });

  /* 肺功能末点：带日期，用户才知道这个数字是哪天的。 */
  const fvc = (p.metrics || []).find((m) => m.key === 'fvc');
  const last = fvc?.points?.length ? fvc.points[fvc.points.length - 1] : null;
  if (last) {
    put('fvc_pred', `${last.v} %pred`, '肺功能报告', { value_num: Number(last.v), observed_on: last.d, evidence: 'B' });
  }
  return facts;
}

/* ── 检索分层线索 ────────────────────────────────────────────
 * 「检索要素和结果」不是一张命中数表就完了：用户要看得到**凭什么命中**。
 * 三层（照 PBC 仓的口径）：
 *   structured 建档里的明确实体出现在标题里（最强）
 *   text       题材词重合，逐词给位置
 *   broad      只沾到"肺纤维化/罕见病"这类大词，排最后
 * 排序固定为 结构化 → 文本 → 宽口径，**不按"看起来像"重排**。
 */
const LEAD_TERMS = ['进展性纤维化性间质性肺疾病', 'PF-ILD', '间质性肺疾病', 'ILD', '肺纤维化',
  '抗纤维化', '尼达尼布', '吡非尼酮', '肺移植', '肺康复', '硬皮病', '类风湿', '过敏性肺炎'];
const LEAD_BROAD = ['罕见病', '呼吸系统疾病', '慢性肺病', '肺部疾病', '纤维化'];

export function searchLeads(trials, facts = {}) {
  const rows = (trials || []).map((t) => {
    const title = String(t.title ?? '');
    const structured = [];
    /* 建档里的实体出现在标题里才算结构化命中，且必须给出是哪个字段 */
    for (const [key, label] of [['diagnosis_text', '诊断'], ['hrct_pattern', 'HRCT'], ['antifibrotic_current', '用药']]) {
      const f = facts[key];
      if (!f?.value_text) continue;
      const needle = String(f.value_text).replace(/（.*?）/g, '').trim();
      if (needle && needle.length >= 2 && title.includes(needle.slice(0, 4))) {
        structured.push({ field: label, value: f.value_text, source: f.source });
      }
    }
    const text = LEAD_TERMS.filter((x) => title.includes(x)).map((term) => ({ term }));
    const broad = LEAD_BROAD.filter((x) => title.includes(x)).map((term) => ({ term }));
    return {
      recordId: t.recordId ?? t.id, title,
      status: t.status ?? null, url: t.url ?? null,
      snapshotNote: '登记状态，未核实',
      healthyVolunteer: /健康(受试者|人体|志愿者)|生物等效性/.test(title),
      structured, text, broad,
    };
  });
  const pick = (f) => rows.filter(f);
  const layers = [
    { key: 'structured', title: '结构化命中', hint: '建档里的明确实体出现在登记标题里', rows: pick((r) => r.structured.length) },
    { key: 'text', title: '文本命中', hint: '题材词重合，逐词列出', rows: pick((r) => !r.structured.length && r.text.length) },
    { key: 'broad', title: '宽口径命中', hint: '只沾到"肺纤维化 / 罕见病"这类大词，排最后', rows: pick((r) => !r.structured.length && !r.text.length && r.broad.length) },
  ];
  /* 「对象不是你这类人」的登记必须单独兜出来：它常常不沾任何题材词，
     于是三层全都不收 → 在页面上静默消失。宁可多给一条提醒，也不能让它凭空不见。 */
  const flagged = rows.filter((r) => r.healthyVolunteer);
  return {
    trialCount: rows.length,
    counts: { structured: layers[0].rows.length, text: layers[1].rows.length, broad: layers[2].rows.length },
    layers,
    flagged,
    flaggedNote: flagged.length
      ? '这几条登记的标题原文写的是「健康受试者 / 生物等效性」——招募对象不是你这类人，列在这里只为让你别误会。'
      : null,
  };
}
