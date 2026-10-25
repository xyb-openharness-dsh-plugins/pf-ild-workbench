/**
 * AI 上下文包（context pack）——**只组装事实，不产出判断**。
 *
 * 家族红线（28 号证据规则 + 45 号 AI 三件）：
 *   1. 上下文里只放"用户自己记录的事实 + 证据等级"，不许放"结论/建议/风险评级"；
 *   2. AI 面板只接**入口 + 上下文**，AI 能力归宿主，本仓不实现；
 *   3. 用户可见的 B 类（资料整理）类措辞不许替医生下结论。
 *
 * 所以本文件的核心约束是：**输出里不存在判断性字段**（无 diagnosis / risk / severity / suggestion）。
 * 这不是"当下没写"，而是 test/ai-context.test.mjs 会守住的结构约束。
 */

/** 证据等级（A 多源交叉 / B 单一可信 / 未核实）——跟着每条事实走，不许凭空给级。 */
export const EVIDENCE_LEVELS = Object.freeze({ A: 'A', B: 'B', UNVERIFIED: '未核实' });

/** 判断性字段黑名单：出现即视为越界（测试会遍历整包扫描）。 */
export const JUDGEMENT_KEYS = Object.freeze([
  'diagnosis', 'riskLevel', 'severity', 'stage', 'prognosis', 'suggestion', 'advice', 'conclusion', 'recommendation',
]);

/** 递归查黑名单键 */
function findJudgement(value, path = '') {
  const hits = [];
  if (!value || typeof value !== 'object') return hits;
  for (const [k, v] of Object.entries(value)) {
    const keyPath = path ? `${path}.${k}` : k;
    if (JUDGEMENT_KEYS.includes(k)) hits.push(keyPath);
    hits.push(...findJudgement(v, keyPath));
  }
  return hits;
}

/**
 * 组装 AI 上下文包。
 *
 * @param {object} params
 * @param {object} params.bootstrap  #/api/bootstrap 的返回值（候选资料，用户自己勾选后第二个参数为准）
 * @param {object} [params.selection] 用户勾选的条目 id 集合；缺省=不带资料
 * @returns {{version:string, generatedAt:string, facts:object[], notes:string[]}}
 */
export function buildContextPack({ bootstrap, selection } = {}) {
  if (!bootstrap) throw new Error('buildContextPack 需要 bootstrap 数据');
  const facts = [];

  /* 只从"用户自己勾选"的条目取数——不勾选就不带 */
  if (selection && Array.isArray(selection.metricSeriesIds)) {
    for (const profileId of Object.keys(bootstrap.profiles || {})) {
      const profile = bootstrap.profiles[profileId];
      for (const metric of profile.metrics || []) {
        if (!selection.metricSeriesIds.includes(metric.name)) continue;
        facts.push({
          kind: 'metric-series',
          profile: profileId,
          metric: metric.name,
          unit: metric.unit,
          /* 点结构来自 schema：d=日期 v=值 src=来源（用户自述/机构报告） */
          points: (metric.points || []).map((p) => ({ date: p.d, value: p.v, source: p.src })),
          /* 指标是用户自己记录的 → B 类（单一来源可信）；不冒充多源交叉 */
          evidence: EVIDENCE_LEVELS.B,
        });
      }
    }
  }

  if (selection && Array.isArray(selection.trialTrials)) {
    for (const trial of bootstrap.trials || []) {
      if (!selection.trialTrials.includes(trial.id)) continue;
      facts.push({
        kind: 'trial-recruitment',
        id: trial.id,
        title: trial.title,
        condition: trial.condition,
        status: trial.status,
        evidence: EVIDENCE_LEVELS.A,
      });
    }
  }

  const pack = {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    facts,
    /* 明确告诉 AI 使用方：这里只有事实，别替用户下结论 */
    notes: [
      '本上下文只含用户自己记录的事实与证据等级，不含任何诊断/建议/评级。',
      '回答时不得替用户判断病情、不得给出用药或治疗建议。',
    ],
  };

  const hits = findJudgement(pack);
  if (hits.length) throw new Error(`上下文包含判断性字段（越界）：${hits.join(', ')}`);
  return pack;
}

/** 宿主对接：把上下文包挂到 AI 面板入口（不实现 AI，只把数据递过去）。 */
export function attachToAiPanel(pack, hostApi) {
  if (!hostApi || typeof hostApi.sendContext !== 'function') {
    throw new Error('宿主未提供 sendContext（AI 面板入口不可用）');
  }
  hostApi.sendContext({ kind: 'pf-ild-context-pack', pack });
  return true;
}
