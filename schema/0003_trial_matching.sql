-- 0003 · 临床试验匹配（规则 × 评估）：三档对照，**无百分比、无排序、无"推荐"**
--
-- 为什么是三档而不是"匹配指数 87%"：
--   家族红线（28 号证据规则 + GTN 实测）：给患者一个"匹配度 XX%"等于替医生下结论，
--   而且百分比无法回溯——用户看到 87% 会问"那我到底能不能进",工作台答不了。
--   三档（符合 / 冲突 / 待确认）每条都能指出**是拿哪一条记录对照出来的**，可以核对。
--
-- 结构：
--   trial_criteria      每条试验的入组/排除条目（原文 + 类别 + 是否可本地判定）
--   patient_facts       本地档案里可用于对照的事实（病理/基因/HRCT/肺功能/氧/年龄/用药）
--   match_assessments   一次评估（规则集版本 + 生成时间）；判断结果存 judgments_json
--
-- 边界：
--   - 不存"结论/建议/推荐"，只存 tier 与引用的事实；
--   - pending=1 表示"本地没有结构化字段，无法判定"，单列**不进三档**；
--   - 排序按数据来源顺序（ord），不按 tier 排。

CREATE TABLE trial_criteria (
  id            INTEGER PRIMARY KEY,
  trial_record_id TEXT NOT NULL,
  ord           INTEGER NOT NULL DEFAULT 0,
  kind          TEXT NOT NULL CHECK (kind IN ('inclusion','exclusion')),
  category      TEXT NOT NULL CHECK (category IN
                  ('diagnosis','pathology','genetics','imaging','pft','oxygen','age','medication','organ','other')),
  rule_text     TEXT NOT NULL,
  -- 本地能否用已记录事实判定：1=能（进三档）；0=不能（进 pending，不进三档）
  decidable     INTEGER NOT NULL DEFAULT 0 CHECK (decidable IN (0,1)),
  -- 判定所需的事实键（与 patient_facts.fact_key 对应），可空
  fact_key      TEXT,
  source_note   TEXT
);

CREATE TABLE patient_facts (
  id            INTEGER PRIMARY KEY,
  subject_id    TEXT NOT NULL,
  fact_key      TEXT NOT NULL,
  category      TEXT NOT NULL,
  value_text    TEXT,
  value_num     REAL,
  observed_on   TEXT,
  source        TEXT,
  evidence      TEXT NOT NULL DEFAULT '未核实' CHECK (evidence IN ('A','B','未核实')),
  UNIQUE (subject_id, fact_key)
);

CREATE TABLE match_assessments (
  id               INTEGER PRIMARY KEY,
  subject_id       TEXT NOT NULL,
  profile_revision INTEGER,
  rule_set_version TEXT NOT NULL,
  generated_at     TEXT NOT NULL,
  -- { "<criteria_id>": {"tier":"satisfied|conflict|undetermined","mine":"<事实值>","src":"<来源>"} }
  judgments_json   TEXT NOT NULL,
  note             TEXT
);

CREATE INDEX idx_criteria_trial ON trial_criteria(trial_record_id, ord);
CREATE INDEX idx_facts_subject ON patient_facts(subject_id, fact_key);
