/**
 * 演示数据播种：把 `buildDemoProfiles()` 写进用户资料目录的库。
 *
 * 三条要求（ZERO-TO-DEV §2.1-2）：
 *   ① 幂等：库里已有 subjects 就整批跳过（重复点"载入演示数据"不会翻倍）；
 *   ② 单事务：要么全成功要么全回滚，不留半套档案；
 *   ③ 唯一来源：数据只来自 `demo/build-demo-data.mjs` 的 `buildDemoProfiles()`，
 *      本文件不重写任何一条内容。`files` 白名单必须含 `demo`——否则装机后 import 失败
 *      （ATTR 0.2.1 踩过：dsh/demo.js 引 ../demo/…，而 files 没写 demo/）。
 */
import { buildDemoProfiles } from '../demo/build-demo-data.mjs';

export function hasDemoData(db) {
  return db.prepare('SELECT COUNT(*) c FROM subjects').get().c > 0;
}

/** 单事务播种；返回写入了几个档案。 */
export function seedDemoData(db, { force = false } = {}) {
  if (!force && hasDemoData(db)) return { skipped: true, subjects: 0 };
  const { profiles, trials, trialCriteria } = buildDemoProfiles();

  db.exec('BEGIN');
  try {
    if (force) {
      for (const t of ['pathway_details', 'pathway_phases', 'diagnosis_gaps', 'care_rhythm', 'nutrition_logs',
        'transplant_items', 'imaging_records', 'med_records', 'ae_events', 'oxygen_records', 'pft_records',
        'viewpoints', 'candidates', 'documents', 'timeline_events', 'diagnosis_timeline', 'metric_points', 'metric_definitions', 'section_titles',
        'subjects', 'trials', 'trial_criteria', 'patient_facts', 'match_assessments', 'demo_meta']) {
        db.exec(`DELETE FROM ${t}`);
      }
    }
    const insSubject = db.prepare(`INSERT INTO subjects
      (subject_id, name, sex, age, meta, headline, etiology, mindset, dash_keys, path, activity, family_talk)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insTitle = db.prepare('INSERT INTO section_titles (subject_id, section, title) VALUES (?,?,?)');
    const insDef = db.prepare(`INSERT INTO metric_definitions
      (subject_id, metric_key, name, unit, dec, kind, band_low, band_high, ref_low, ref_high, note, category, color, in_trend)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insPt = db.prepare(`INSERT INTO metric_points
      (subject_id, metric_key, observed_on, v_num, v_text, source) VALUES (?,?,?,?,?,?)`);
    const insPft = db.prepare(`INSERT INTO pft_records
      (subject_id, test_date, place, bronchodilator, summary, doc_status, phase) VALUES (?,?,?,?,?,?,?)`);
    const insO2 = db.prepare(`INSERT INTO oxygen_records
      (subject_id, started_on, timing, flow_lpm, note, in_use) VALUES (?,?,?,?,?,?)`);
    const insAe = db.prepare(`INSERT INTO ae_events
      (subject_id, event_date, episode_end, care_setting, trigger_text, discharge_meds, review_due, clinical_note)
      VALUES (?,?,?,?,?,?,?,?)`);
    const insMed = db.prepare(`INSERT INTO med_records
      (subject_id, drug_name, form, start_at, changed_at, dose_text, reason_text, adverse_note, in_use)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const insImg = db.prepare(`INSERT INTO imaging_records
      (subject_id, study_date, modality, desc_text, doc_status, phase) VALUES (?,?,?,?,?,?)`);
    const insTp = db.prepare(`INSERT INTO transplant_items
      (subject_id, item_key, item_label, guidance, has_record, last_date, note, ord) VALUES (?,?,?,?,?,?,?,?)`);
    const insNp = db.prepare(`INSERT INTO nutrition_logs
      (subject_id, logged_on, meal, intake_text, intake_level, symptom_note, note) VALUES (?,?,?,?,?,?,?)`);
    const insVp = db.prepare('INSERT INTO viewpoints (subject_id, noted_on, mood, text, privacy) VALUES (?,?,?,?,?)');
    const insDoc = db.prepare(`INSERT INTO documents
      (doc_id, subject_id, file_name, doc_type, doc_date, parse_state, source) VALUES (?,?,?,?,?,?,?)`);
    const insCand = db.prepare(`INSERT INTO candidates
      (candidate_id, subject_id, kind, label, value_text, source_text, dec) VALUES (?,?,?,?,?,?,?)`);
    const insRhythm = db.prepare(`INSERT INTO care_rhythm
      (subject_id, rhythm_key, item_label, cadence, source_text, next_due, ord) VALUES (?,?,?,?,?,?,?)`);
    const insPhase = db.prepare(`INSERT INTO pathway_phases
      (subject_id, phase_key, happened_on, phase_name, phase_tag, summary, ord) VALUES (?,?,?,?,?,?,?)`);
    const insDetail = db.prepare(`INSERT INTO pathway_details
      (subject_id, phase_key, block, summary, items_json) VALUES (?,?,?,?,?)`);
    const insGap = db.prepare(`INSERT INTO diagnosis_gaps
      (subject_id, gap_key, gap_label, gap_note, ord) VALUES (?,?,?,?,?)`);
    const insEvent = db.prepare(`INSERT INTO timeline_events
      (subject_id, happened_on, label, ord) VALUES (?,?,?,?)`);
    const insDxNode = db.prepare(`INSERT INTO diagnosis_timeline
      (subject_id, node_key, happened_at, course_text, source_text, ord) VALUES (?,?,?,?,?,?)`);
    const insTrial = db.prepare(`INSERT INTO trials
      (nct_id, source, title, phase, status, sponsor, topic, last_verified, url) VALUES (?,?,?,?,?,?,?,?,?)`);

    for (const [k, p] of Object.entries(profiles)) {
      insSubject.run(k, p.name, p.sex, p.age, p.meta, p.headline, p.etiology, p.mindset,
        JSON.stringify(p.dash_keys), JSON.stringify(p.path), p.activity, p.familyTalk);
      for (const [section, obj] of [['diagnosis', p.diagnosis], ['pft', p.pft], ['oxygen', p.oxygen], ['ae', p.ae],
        ['med', p.med], ['imaging', p.imaging], ['transplant', p.transplant], ['nutrition', p.nutrition],
        ['pathway', p.pathway || { title: '' }]]) {
        insTitle.run(k, section, obj.title || '');
      }
      for (const m of p.metrics) {
        const kind = m.kind || 'numeric';
        const inTrend = m.dec === null ? 0 : 1;
        insDef.run(k, m.key, m.name, m.unit ?? null, m.dec ?? null, kind,
          m.band ? m.band[0] : null, m.band ? m.band[1] : null,
          m.refLow ?? null, m.refHigh ?? null, m.note, m.cat, m.color, inTrend);
        for (const pt of m.points) {
          if (typeof pt.v === 'number') insPt.run(k, m.key, pt.d, pt.v, null, pt.src);
          else insPt.run(k, m.key, pt.d, null, String(pt.v), pt.src);
        }
      }
      p.pft.rows.forEach((r) => insPft.run(k, r[0], r[1], r[2], r[3], r[4], r[5]));
      p.oxygen.rows.forEach((r) => insO2.run(k, r[0], r[1], r[2], r[3], r[4]));
      p.ae.rows.forEach((r) => insAe.run(k, r[0], r[1], r[2], r[3], r[4], r[5], r[6]));
      p.med.rows.forEach((r) => insMed.run(k, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]));
      p.imaging.rows.forEach((r) => insImg.run(k, r[0], r[1], r[2], r[3], r[4]));
      p.transplant.rows.forEach((r, i) => insTp.run(k, 'tp-' + (i + 1), r[0], r[1], r[2], r[3], r[4], i));
      p.nutrition.rows.forEach((r) => insNp.run(k, r[0], r[1], r[2], r[3], r[4], r[5]));
      p.viewpoints.forEach((r) => insVp.run(k, r[0], r[1], r[2], 'normal'));
      p.docs.forEach((r) => insDoc.run(r[0], k, r[1], r[3], r[2], r[4], 'original'));
      p.candidates.forEach((r) => insCand.run(r[0], k, 'metric', r[1], r[2], r[3],
        r[4] === '已接受' ? 'accept' : r[4] === '已拒收' ? 'reject' : null));
      p.rhythm.forEach((r, i) => insRhythm.run(k, 'r' + i, r[0], r[1], r[2], r[3], i));
      p.diagnosis.gaps.forEach((r, i) => insGap.run(k, 'g' + i, r[0], r[1], i));
      p.events.forEach((r, i) => insEvent.run(k, r[0], r[1], i));
      p.diagnosis.rows.forEach((r, i) => insDxNode.run(k, 'n' + i, r[0], r[1], r[2], i));
      if (p.pathway) {
        p.pathway.rows.forEach((r, i) => {
          const key = 'ph' + i;
          insPhase.run(k, key, r[0], r[1], r[2], r[3], i);
          for (const [block, body] of Object.entries(p.pathway.detail)) {
            insDetail.run(k, key, block, body.summary, JSON.stringify(body.items));
          }
        });
      }
    }
    /* source 存「哪条渠道查来的」（chinadrugtrials / ctv），不是恒为 placeholder；
       否则 readBootstrap 回读时与原型 demo-data.js 的 sourceChannel 对不上（PARITY 测试会拦）。 */
    trials.forEach((t) => insTrial.run(t.id, t.sourceChannel ?? 'placeholder', t.title, t.phase, t.status, t.sponsor, t.topic, t.last_verified, t.url));

    /* 入组条目：ord 按生成器数组顺序（数据来源顺序，**不按可判定性排**）。 */
    const insCrit = db.prepare(`INSERT INTO trial_criteria
      (trial_record_id, ord, kind, category, rule_text, decidable, fact_key, source_note) VALUES (?,?,?,?,?,?,?,?)`);
    for (const [i, c] of (trialCriteria ?? []).entries()) {
      insCrit.run(c.trial, i, c.kind, c.category, c.text, c.decidable, c.fact_key ?? null, c.source_note ?? null);
    }

    /* 患者事实：只存档案里**确实有出处**的字段；没有的不写。
       缺字段在读模型里表现为 undetermined（待确认），不拿空值冒充"符合"。 */
    const insFact = db.prepare(`INSERT INTO patient_facts
      (subject_id, fact_key, category, value_text, value_num, observed_on, source, evidence) VALUES (?,?,?,?,?,?,?,?)`);
    for (const [sid, p] of Object.entries(profiles)) {
      const add = (k, cat, v, num, on, src, ev) => insFact.run(sid, k, cat, v, num ?? null, on ?? null, src ?? null, ev ?? 'B');
      add('diagnosis_text', 'diagnosis', p.etiology || null, null, null, '诊断原文', 'B');
      add('hrct_pattern', 'imaging', (p.imaging?.rows?.[0] && p.imaging.rows[0][2]) || null, null, p.imaging?.rows?.[0]?.[0] ?? null, '影像结论原文', 'B');
      add('ipf_excluded', 'diagnosis', /IPF|特发性肺纤维化/i.test(p.etiology || '') ? '是（写明 IPF）' : '否（未写明 IPF）', null, null, '诊断原文', 'B');
      add('antifibrotic_current', 'medication',
        (p.med?.rows || []).some((r) => /尼达布|吡非尼酮/.test(String(r[0] ?? '')) && !/已停/.test(String(r[3] ?? ''))) ? '在用' : '未在用',
        null, null, '用药记录', 'B');
      add('pathology_available', 'pathology', (p.imaging?.rows || []).length > 0 ? '有影像资料' : '无影像资料', null, null, '影像档案', 'B');
      const fvc = (p.metrics || []).find((m) => m.key === 'fvc');
      const ps = fvc?.points || [];
      add('fvc_pred', 'pft', ps.length ? String(ps[ps.length - 1].v) : null, ps.length ? Number(ps[ps.length - 1].v) : null, ps.length ? ps[ps.length - 1].d : null, '肺功能报告', 'B');
    }

    /* 元数据：规则集版本 / 生成时间 / 免责与通道说明，读模型直接取，
       不在请求时现场生成（否则同一份数据每次打开都显示不同"生成于"）。 */
    const insMeta = db.prepare('INSERT INTO demo_meta (k, v) VALUES (?,?)');
    insMeta.run('match_rule_set_version', '2026-10-25.1');
    insMeta.run('match_generated_at', new Date().toISOString());
    insMeta.run('match_footer_note', '本页只做「档案事实 ↔ 登记条目」的文字对照，不做入组资格判定，也不能替代研究者的评估。');
    insMeta.run('match_channels_note', '已查通道：chinadrugtrials（1 条）、ctv/ClinicalTrials.gov（1 条）。未查：ChiCTR、WHO ICTRP、openFDA。未查 ≠ 无结果。');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw new Error('演示数据播种失败（已整体回滚）：' + error.message);
  }
  return { skipped: false, subjects: Object.keys(profiles).length };
}
