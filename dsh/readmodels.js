/**
 * 读模型：把 SQLite 的行还原成 **demo-data.js 同一形状**（parity 是这一层唯一的验收标准）。
 *
 * 规则（ZERO-TO-DEV §2.1-3）：
 *   - 有 `ord` 的按 ord；events 按 rowid；其它列表按显式列排序，**绝不依赖插入顺序的巧合**；
 *   - `kind !== 'numeric'` 才还原 `kind` 键；数值指标原型里没有 `kind` 键，不许补；
 *   - 分类指标原型里没有 `unit`/`dec` 键，不许补（补了 parity 就红）；
 *   - **派生值读取时算，不落库**（分级/节奏这类随标准升版，落库等于把旧判断写成历史事实）；
 *   - 私密内容（viewpoints.privacy='private'）在**数据层**过滤，不靠前端不画。
 */
import { tableNames } from './store.js';
import { buildMatchModel, searchLeads } from '../lib/trial-match.js';

const asArray = (text, fallback = []) => {
  if (text === null || text === undefined || text === '') return fallback;
  try { const v = JSON.parse(text); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
};

/** 数值/文本互斥：数值指标只给 v，分类指标只给 v（字符串） */
function pointOf(row) {
  return { d: row.observed_on, v: row.v_num === null ? row.v_text : row.v_num, src: row.source };
}

export function listSubjects(db) {
  return db.prepare('SELECT * FROM subjects ORDER BY rowid').all();
}

/** 单份档案的完整读模型（形状 = DEMO_DATA.profiles[K]） */
export function readProfile(db, subjectId) {
  const s = db.prepare('SELECT * FROM subjects WHERE subject_id = ?').get(subjectId);
  if (!s) return null;

  const title = (section) => db.prepare('SELECT title FROM section_titles WHERE subject_id = ? AND section = ?').get(subjectId, section)?.title ?? '';

  /* metrics：定义 + 点；分类指标不补 unit/dec/kind 之外的键 */
  const defs = db.prepare('SELECT * FROM metric_definitions WHERE subject_id = ? ORDER BY rowid').all(subjectId);
  const metrics = defs.map((d) => {
    const points = db.prepare(`SELECT observed_on, v_num, v_text, source FROM metric_points
      WHERE subject_id = ? AND metric_key = ? ORDER BY observed_on, rowid`).all(subjectId, d.metric_key).map(pointOf);
    const m = { key: d.metric_key, name: d.name };
    /* 原型里数值指标有 unit/dec/band，分类指标**没有** unit/dec 键 */
    if (d.dec !== null) {
      if (d.unit !== null) m.unit = d.unit;
      m.dec = d.dec;
    } else {
      m.dec = null;
      m.kind = d.kind;
    }
    if (d.band_low !== null && d.band_high !== null) m.band = [d.band_low, d.band_high];
    else m.band = null;
    if (d.ref_low !== null || d.ref_high !== null) { m.refLow = d.ref_low; m.refHigh = d.ref_high; }
    m.note = d.note;
    m.cat = d.category;
    m.color = d.color;
    m.points = points;
    return m;
  });

  const rowsOf = (table, cols, order) =>
    db.prepare(`SELECT ${cols} FROM ${table} WHERE subject_id = ? ORDER BY ${order}`).all(subjectId)
      .map((r) => Object.values(r));

  const docs = db.prepare(`SELECT doc_id, file_name, doc_date, doc_type, parse_state FROM documents
    WHERE subject_id = ? ORDER BY rowid`).all(subjectId)
    .map((r) => [r.doc_id, r.file_name, r.doc_date, r.doc_type, r.parse_state]);

  const candidates = db.prepare(`SELECT candidate_id, label, value_text, source_text, dec FROM candidates
    WHERE subject_id = ? ORDER BY rowid`).all(subjectId)
    .map((r) => [r.candidate_id, r.label, r.value_text, r.source_text, r.dec === 'accept' ? '已接受' : r.dec === 'reject' ? '已拒收' : '待确认']);

  /* 事件：由各类记录拼装（不单独存一张 events 表，避免第二个事实来源） */
  /* 事件 = 用户自编时间线（timeline_events），按 (日期, ord) 稳定排序。
     不从其它表拼接：里程碑含别的表没有的节点（实测缺项），拼接等于丢事实。 */
  const events = db.prepare('SELECT happened_on AS d, label FROM timeline_events WHERE subject_id = ? ORDER BY happened_on, ord')
    .all(subjectId).map((e) => [e.d, e.label]);

  const viewpoints = db.prepare(`SELECT noted_on, mood, text FROM viewpoints
    WHERE subject_id = ? AND privacy = 'normal' ORDER BY rowid`).all(subjectId)
    .map((r) => [r.noted_on, r.mood, r.text]);

  const phases = db.prepare('SELECT * FROM pathway_phases WHERE subject_id = ? ORDER BY ord').all(subjectId);
  const pathway = phases.length ? {
    title: title('pathway') || '治疗与事件路径（默认概要，按需展开细节）',
    rows: phases.map((p) => [p.happened_on, p.phase_name, p.phase_tag, p.summary]),
    detail: Object.fromEntries(['方案', '指标和趋势', '影像发现', '副作用总结', '支持与效果'].map((b) => {
      const row = db.prepare('SELECT summary, items_json FROM pathway_details WHERE subject_id = ? AND phase_key = ? AND block = ?')
        .get(subjectId, phases[0].phase_key, b);
      return [b, { summary: row?.summary ?? '无', items: asArray(row?.items_json) }];
    })),
  } : null;

  return {
    name: s.name, sex: s.sex, age: s.age, meta: s.meta, headline: s.headline,
    etiology: s.etiology, mindset: s.mindset,
    dash_keys: asArray(s.dash_keys), path: asArray(s.path),
    activity: s.activity, familyTalk: s.family_talk,
    diagnosis: {
      title: title('diagnosis'),
      rows: db.prepare('SELECT happened_at, course_text, source_text FROM diagnosis_timeline WHERE subject_id = ? ORDER BY ord')
        .all(subjectId).map((r) => [r.happened_at, r.course_text, r.source_text]),
      gaps: db.prepare('SELECT gap_label, gap_note FROM diagnosis_gaps WHERE subject_id = ? ORDER BY ord')
        .all(subjectId).map((r) => [r.gap_label, r.gap_note]),
    },
    pft: { title: title('pft'), rows: rowsOf('pft_records', 'test_date, place, bronchodilator, summary, doc_status, phase', 'test_date DESC') },
    oxygen: { title: title('oxygen'), rows: rowsOf('oxygen_records', 'started_on, timing, flow_lpm, note, in_use', 'started_on DESC') },
    ae: { title: title('ae'), rows: rowsOf('ae_events', 'event_date, episode_end, care_setting, trigger_text, discharge_meds, review_due, clinical_note', 'event_date DESC') },
    med: { title: title('med'), rows: rowsOf('med_records', 'drug_name, form, start_at, changed_at, dose_text, reason_text, adverse_note, in_use', 'rowid') },
    imaging: { title: title('imaging'), rows: rowsOf('imaging_records', 'study_date, modality, desc_text, doc_status, phase', 'study_date DESC') },
    transplant: { title: title('transplant'), rows: rowsOf('transplant_items', 'item_label, guidance, has_record, last_date, note', 'ord') },
    nutrition: { title: title('nutrition'), rows: rowsOf('nutrition_logs', 'logged_on, meal, intake_text, intake_level, symptom_note, note', 'logged_on DESC') },
    rhythm: db.prepare('SELECT item_label, cadence, source_text, next_due FROM care_rhythm WHERE subject_id = ? ORDER BY ord').all(subjectId)
      .map((r) => [r.item_label, r.cadence, r.source_text, r.next_due]),
    events,
    viewpoints, docs, candidates, metrics, pathway,
  };
}

export function readBootstrap(db) {
  const subjects = listSubjects(db);
  const profiles = {};
  for (const s of subjects) profiles[s.subject_id] = readProfile(db, s.subject_id);
  /* sourceChannel 是原型的字段名，库里叫 source（NOT NULL DEFAULT 'placeholder'）；
     改名不改语义：这条试验是哪个登记渠道查来的，决定页面上"去哪儿核对"的提示。 */
  const trials = db.prepare(`SELECT nct_id, title, phase, status, sponsor, topic, last_verified, url, source
    FROM trials ORDER BY rowid`).all()
    .map((t) => ({ id: t.nct_id, title: t.title, phase: t.phase, status: t.status, sponsor: t.sponsor, topic: t.topic, last_verified: t.last_verified, url: t.url, sourceChannel: t.source }));
  /* trialMatch 与 profiles 一样按档案全量带出：切档案是前端的事，
     一次取全和原型 window.DEMO_DATA 的形状完全一致（原型 file:// 也是全量）。
     单独一个 /api/trials/match 端点保留给"只要匹配、不要全量"的调用方。 */
  const trialMatch = {};
  for (const sid of Object.keys(profiles)) trialMatch[sid] = readTrialMatch(db, sid);
  return { profiles, trials, trialMatch };
}

/**
 * 读一个主体的试验匹配模型（三档对照，不含百分比）。
 *
 * 与 readBootstrap 分开：匹配依赖 subject，而 bootstrap 是「全量首页数据」，
 * 把某个主体的匹配结果塞进 bootstrap 会让「切档案」时读到另一个人的对照结果。
 *
 * 参数缺失一律降级为「空对照」而不是抛错：登记条目没录完时页面要能开，
 * 用 pending 说明「本地还没有条目」，不显示假的三档。
 */
export function readTrialMatch(db, subjectId) {
  const meta = (k) => {
    const row = db.prepare('SELECT v FROM demo_meta WHERE k = ?').get(k);
    return row ? row.v : null;
  };
  const trials = db.prepare(`SELECT nct_id, title, phase, status, url, source, last_verified
    FROM trials ORDER BY rowid`).all()
    .map((t, i) => ({ recordId: t.nct_id, title: t.title, status: t.status, url: t.url, phase: t.phase, sourceChannel: t.source, last_verified: t.last_verified, ord: i }));
  const criteria = db.prepare(`SELECT id, trial_record_id, ord, kind, category, rule_text, decidable, fact_key, source_note
    FROM trial_criteria ORDER BY trial_record_id, ord`).all();
  const facts = {};
  for (const f of db.prepare(`SELECT fact_key, category, value_text, value_num, observed_on, source, evidence
    FROM patient_facts WHERE subject_id = ?`).all(subjectId)) {
    facts[f.fact_key] = {
      value_text: f.value_text, value_num: f.value_num, observed_on: f.observed_on,
      source: f.source, evidence: f.evidence, category: f.category,
    };
  }
  const model = buildMatchModel({
    trials,
    criteria,
    facts,
    ruleSetVersion: meta('match_rule_set_version'),
    generatedAt: meta('match_generated_at') ?? new Date().toISOString(),
    footerNote: meta('match_footer_note'),
    channelsNote: meta('match_channels_note'),
  });
  model.leads = searchLeads(trials, facts);
  return model;
}

/** 供检查器：读模型用到的表必须都存在（防 0002 漏跑） */
export function requiredTablesPresent(db) {
  const need = ['subjects', 'documents', 'candidates', 'metric_definitions', 'metric_points',
    'section_titles', 'viewpoints', 'care_rhythm', 'pathway_phases', 'pathway_details',
    'pft_records', 'oxygen_records', 'ae_events', 'med_records', 'imaging_records',
    'transplant_items', 'nutrition_logs', 'diagnosis_gaps', 'diagnosis_timeline', 'timeline_events'];
  const have = new Set(tableNames(db));
  return need.filter((t) => !have.has(t));
}
