-- schema/0001_initial.sql · 小呼宝 BreathPal（pf-ild-workbench）
--
-- 四契约（14 号 / 04 号）：
--   ① 看法恒不为结论：全库无 is_conclusion，无 diagnosis/risk_level/severity/stage/prognos 列；
--   ② 缺侧不生成差值：数值缺失写 NULL（不写 0），差值在读模型算且缺一侧不计算；
--   ③ 更正只新增版本：decision_versions 追加行，业务表用 in_use 归档不物理删；
--   ④ 事实四层不合并：documents → candidates → records → metric_points 分表。
--
-- 数据层硬约束（DEV-REQUIREMENTS §三）：复合主键表裸 SELECT 必须 ORDER BY rowid；
--   可选字段显式 null；`using` 是 SQLite 保留字 → 列名 in_use；
--   每一节 {title, rows} 必须有对应 *_title 列（本库用 section_titles 表，见下）；
--   分类指标 dec IS NULL 且 kind ∈ {grade,qual}，不得进趋势折线。
--
-- 医学口径：PPF 判定、急性加重诊断、移植适应证、热量换算/肌少症判定均为医生任务，
--   本库只存事实与用户自录原值。来源：NHC《86 个罕见病病种诊疗指南（2025 年版）》#69。
--
-- 冻结：本文件一旦写入 schema/freeze-contract.md 的 sha256，此后只增不改；
--   漏列走 0002_*.sql 的 ALTER 追加，不改本文件。

PRAGMA foreign_keys = ON;

-- ============ 档案级（3） ============
CREATE TABLE IF NOT EXISTS subjects (
  subject_id    TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  sex           TEXT NOT NULL,
  age           INTEGER NOT NULL,
  meta          TEXT NOT NULL,
  headline      TEXT NOT NULL,
  etiology      TEXT NOT NULL,          -- 医生给出的病因/诊断原文（本仓不重写、不分类）
  mindset       TEXT NOT NULL,
  dash_keys     TEXT NOT NULL,          -- JSON 数组：看板四张卡
  path          TEXT NOT NULL,          -- JSON 数组：病程标签
  activity      TEXT NOT NULL,
  family_talk   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id        TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(subject_id),
  file_name     TEXT NOT NULL,
  relative_path TEXT,                   -- 数据根相对路径；原件永远保留
  sha256        TEXT,
  mime          TEXT,
  doc_type      TEXT NOT NULL,          -- 影像报告/检查报告/化验单/住院记录/门诊记录
  doc_date      TEXT,
  parse_state   TEXT NOT NULL,          -- 待核对/已解析/已入库/解析失败
  source        TEXT NOT NULL DEFAULT 'original',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject_id, doc_date);

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id  TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(subject_id),
  doc_id        TEXT REFERENCES documents(doc_id),
  kind          TEXT NOT NULL,          -- metric/event/med/imaging/...
  label         TEXT NOT NULL,
  value_text    TEXT,
  value_num     REAL,
  source_text   TEXT NOT NULL,          -- 来自哪份报告/哪次门诊
  dec           TEXT,                   -- NULL=待核对；accept/reject（不接受即不入事实层）
  decided_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (dec IS NULL OR dec IN ('accept','reject'))
);
CREATE INDEX IF NOT EXISTS idx_candidates_pending ON candidates(subject_id, dec);

-- ============ 指标三张 ============
CREATE TABLE IF NOT EXISTS metric_definitions (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  metric_key  TEXT NOT NULL,
  name        TEXT NOT NULL,
  unit        TEXT,                     -- 分类指标必须为 NULL（不是 ''）
  dec         INTEGER,                  -- NULL = 分类指标
  kind        TEXT NOT NULL,            -- numeric/grade/qual
  band_low    REAL,
  band_high   REAL,
  ref_low     REAL,                     -- 参考下限（可空）
  ref_high    REAL,                     -- 参考上限（可空）；×ULN 型缺此值 → 读模型返回 needsUln
  note        TEXT NOT NULL,
  category    TEXT NOT NULL,
  color       TEXT NOT NULL,
  in_trend    INTEGER NOT NULL,         -- 0 = 不进趋势折线（分类指标）
  PRIMARY KEY (subject_id, metric_key),
  CHECK (kind IN ('numeric','grade','qual')),
  CHECK (in_trend IN (0,1)),
  -- 分类指标不得有单位与小数位；数值指标必须有 dec
  CHECK ((dec IS NULL AND unit IS NULL AND kind IN ('grade','qual')) OR (dec IS NOT NULL AND kind = 'numeric')),
  -- 单位缺失时不得进趋势（防"无量纲曲线"）
  CHECK (in_trend = 0 OR (dec IS NOT NULL AND kind = 'numeric'))
);

CREATE TABLE IF NOT EXISTS metric_points (
  subject_id  TEXT NOT NULL,
  metric_key  TEXT NOT NULL,
  observed_on TEXT NOT NULL,
  v_num       REAL,                     -- 数值指标用
  v_text      TEXT,                     -- 分类指标用
  source      TEXT NOT NULL,
  ordinal     INTEGER,                  -- 手写倒序/并列展示用；裸 SELECT 必须 ORDER BY rowid
  PRIMARY KEY (subject_id, metric_key, observed_on),
  FOREIGN KEY (subject_id, metric_key) REFERENCES metric_definitions(subject_id, metric_key),
  -- v_num 与 v_text 互斥（列一致性检查脚本会独立复验）
  CHECK ((v_num IS NULL) <> (v_text IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_points_metric ON metric_points(subject_id, metric_key, observed_on);

CREATE TABLE IF NOT EXISTS metric_series_cache (
  subject_id  TEXT NOT NULL,
  metric_key  TEXT NOT NULL,
  cache_at    TEXT NOT NULL,
  payload     TEXT NOT NULL,            -- JSON 快照；唯一来源 = demo 生成器/读模型
  PRIMARY KEY (subject_id, metric_key),
  FOREIGN KEY (subject_id, metric_key) REFERENCES metric_definitions(subject_id, metric_key)
);

-- ============ 通用（8） ============
-- 分节标题表（不在 subjects 上排 *_title 列：食管癌那轮漏两节标题只能发 ALTER 补列，最贵的一次返工）
CREATE TABLE IF NOT EXISTS section_titles (
  subject_id TEXT NOT NULL REFERENCES subjects(subject_id),
  section    TEXT NOT NULL,
  title      TEXT NOT NULL,
  PRIMARY KEY (subject_id, section)
);

CREATE TABLE IF NOT EXISTS viewpoints (
  viewpoint_id INTEGER PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(subject_id),
  noted_on     TEXT NOT NULL,
  mood         TEXT NOT NULL,
  text         TEXT NOT NULL,           -- 本人自述原话
  privacy      TEXT NOT NULL DEFAULT 'normal',  -- normal/private（private 不进导出与看板摘要）
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (privacy IN ('normal','private'))
);

CREATE TABLE IF NOT EXISTS visit_encounters (
  encounter_id INTEGER PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(subject_id),
  encountered_on TEXT NOT NULL,
  department   TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_items (
  question_id  INTEGER PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(subject_id),
  encounter_id INTEGER REFERENCES visit_encounters(encounter_id),
  item_key     TEXT NOT NULL,
  item_label   TEXT NOT NULL,
  asked        INTEGER NOT NULL DEFAULT 0,
  asked_at     TEXT,
  ord          INTEGER,                 -- 手写排序只 ORDER BY ord，不叠 DESC
  CHECK (asked IN (0,1))
);

-- 更正链：所有"改这一条"都追加一行，旧行不删
CREATE TABLE IF NOT EXISTS decision_versions (
  version_id   INTEGER PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(subject_id),
  entity       TEXT NOT NULL,           -- med_records/pft_records/...
  entity_key   TEXT NOT NULL,
  revision     INTEGER NOT NULL,
  mode         TEXT NOT NULL,           -- create/amend/archive
  changed_on   TEXT NOT NULL,
  reason_text  TEXT,
  snapshot     TEXT,                    -- 该版本的字段快照（JSON）
  CHECK (mode IN ('create','amend','archive')),
  UNIQUE (subject_id, entity, entity_key, revision)
);

CREATE TABLE IF NOT EXISTS trials (
  nct_id        TEXT PRIMARY KEY,
  source        TEXT NOT NULL DEFAULT 'placeholder',
  source_id     TEXT,
  title         TEXT NOT NULL,
  phase         TEXT NOT NULL,
  status        TEXT NOT NULL,          -- 登记状态未核实，以登记页为准
  sponsor       TEXT NOT NULL,
  topic         TEXT NOT NULL,
  last_verified TEXT NOT NULL,
  url           TEXT NOT NULL,
  terminal_state TEXT                   -- 来源终态：failed/no-coverage 等如实记录（M4）
);

CREATE TABLE IF NOT EXISTS settings_kv (
  k          TEXT PRIMARY KEY,
  v          TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id   INTEGER PRIMARY KEY,
  subject_id TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_key TEXT,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ 本病种专属（8） ============
CREATE TABLE IF NOT EXISTS pft_records (
  subject_id     TEXT NOT NULL REFERENCES subjects(subject_id),
  test_date      TEXT NOT NULL,
  place          TEXT NOT NULL,
  bronchodilator TEXT NOT NULL,
  summary        TEXT NOT NULL,          -- 报告原文摘录，不改写
  doc_status     TEXT NOT NULL,
  phase          TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (subject_id, test_date)
);

CREATE TABLE IF NOT EXISTS oxygen_records (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  started_on  TEXT NOT NULL,
  timing      TEXT NOT NULL,             -- 活动时/静息/夜间
  flow_lpm    REAL NOT NULL,
  note        TEXT NOT NULL,             -- 医嘱原文
  in_use      INTEGER NOT NULL,          -- 保留字坑：不用 using
  PRIMARY KEY (subject_id, started_on, timing),
  CHECK (in_use IN (0,1))
);

CREATE TABLE IF NOT EXISTS ae_events (
  subject_id    TEXT NOT NULL REFERENCES subjects(subject_id),
  event_date    TEXT NOT NULL,
  episode_end   TEXT,                    -- 可空（住院中/未登记）
  care_setting  TEXT NOT NULL,
  trigger_text  TEXT NOT NULL,           -- 起因原文
  discharge_meds TEXT NOT NULL,
  review_due    TEXT,
  clinical_note TEXT NOT NULL,           -- 病历原文摘录；判定留医生
  in_use        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (subject_id, event_date),
  CHECK (in_use IN (0,1))
);

-- 一行 = 一个剂量段（start_at 段起，changed_at 段止）；更正=追加新段，不覆盖旧段
CREATE TABLE IF NOT EXISTS med_records (
  subject_id   TEXT NOT NULL REFERENCES subjects(subject_id),
  drug_name    TEXT NOT NULL,
  form         TEXT NOT NULL,
  start_at     TEXT NOT NULL,
  changed_at   TEXT,
  dose_text    TEXT NOT NULL,            -- 剂量原文
  reason_text  TEXT NOT NULL,            -- 变更原因原文
  adverse_note TEXT NOT NULL,            -- 耐受/不良反应原样文本，不分级
  in_use       INTEGER NOT NULL,
  PRIMARY KEY (subject_id, drug_name, start_at),
  CHECK (in_use IN (0,1)),
  CHECK (changed_at IS NULL OR changed_at >= start_at)
);

CREATE TABLE IF NOT EXISTS imaging_records (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  study_date  TEXT NOT NULL,
  modality    TEXT NOT NULL,
  desc_text   TEXT NOT NULL,             -- 报告结论原文摘录，不判读
  doc_status  TEXT NOT NULL,
  phase       TEXT NOT NULL,
  PRIMARY KEY (subject_id, study_date, modality)
);

-- 移植评估信息自检：只列"要带什么/要问什么"，不给资格结论
CREATE TABLE IF NOT EXISTS transplant_items (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  item_key    TEXT NOT NULL,
  item_label  TEXT NOT NULL,
  guidance    TEXT NOT NULL,
  has_record  INTEGER,                   -- 1=有 0=没有 NULL=未知（三态，不压成两态）
  last_date   TEXT,
  note        TEXT NOT NULL,
  ord         INTEGER,
  PRIMARY KEY (subject_id, item_key),
  CHECK (has_record IS NULL OR has_record IN (0,1))
);

-- 营养与日常功能（G1 方案 A 新增）：不做热量换算、不做肌少症判定
CREATE TABLE IF NOT EXISTS nutrition_logs (
  subject_id   TEXT NOT NULL REFERENCES subjects(subject_id),
  logged_on    TEXT NOT NULL,
  meal         TEXT NOT NULL,
  intake_text  TEXT NOT NULL,
  intake_level TEXT NOT NULL,            -- 少/中/多（粗档分类，不进趋势折线）
  symptom_note TEXT NOT NULL,
  note         TEXT NOT NULL,
  PRIMARY KEY (subject_id, logged_on, meal),
  CHECK (intake_level IN ('少','中','多'))
);
