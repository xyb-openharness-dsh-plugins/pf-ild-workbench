-- schema/0002_parity_tables.sql · 只增不改（0001 已冻结，禁 DROP 0001 建的表）
--
-- 为什么需要这次追加：readmodels 的目标是"把行还原成 demo-data.js 同一形状"（parity 是唯一验收标准）。
-- 0001 覆盖了档案级/指标/记录类，但原型快照里还有三块**没有落点**：
--   ① 复诊节奏 rhythm（页面「复诊节奏」二级页）
--   ② 治疗与事件路径 pathway（32 号折叠卡的阶段概要与五块 detail）
--   ③ 诊断追溯的信息缺口 gaps（页面「信息断点」二级页）
-- 这三块都是**用户可见的一级内容**，靠读模型硬编码会变成第二个事实来源，所以按契约走 ALTER/CREATE 追加。
--
-- 依据：DEV-REQUIREMENTS §三 硬约束 18（迁移只增不改）+ §二 面板/折叠卡要求（32 号）。

-- ① 复诊节奏：一行 = 一个随访项
CREATE TABLE IF NOT EXISTS care_rhythm (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  rhythm_key  TEXT NOT NULL,
  item_label  TEXT NOT NULL,          -- 呼吸科门诊 / 肺功能 / HRCT ...
  cadence     TEXT NOT NULL,          -- 每 3 个月 / 按医生安排
  source_text TEXT NOT NULL,          -- 医生安排 / 医嘱原文 / 惯例推定
  next_due    TEXT,                   -- 下次时间（可空）
  ord         INTEGER,                -- 手写顺序只 ORDER BY ord，不叠 DESC
  in_use      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (subject_id, rhythm_key),
  CHECK (in_use IN (0,1))
);

-- ② 折叠卡：一行 = 一个阶段（概要三件在行上，五块细节在 pathway_details）
CREATE TABLE IF NOT EXISTS pathway_phases (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  phase_key   TEXT NOT NULL,
  happened_on TEXT NOT NULL,          -- 概要：日期
  phase_name  TEXT NOT NULL,          -- 概要：阶段名
  phase_tag   TEXT,                   -- 概要：本次 / 既往
  summary     TEXT NOT NULL,          -- 概要：一句话
  ord         INTEGER NOT NULL,       -- 阶段顺序（ORDER BY ord）
  PRIMARY KEY (subject_id, phase_key),
  UNIQUE (subject_id, ord)
);

-- 五块必须齐全（32 号：缺一块不算落地）——用 CHECK 钉住块名域
CREATE TABLE IF NOT EXISTS pathway_details (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  phase_key   TEXT NOT NULL,
  block       TEXT NOT NULL,          -- 方案 / 指标和趋势 / 影像发现 / 副作用总结 / 支持与效果
  summary     TEXT NOT NULL,
  items_json  TEXT NOT NULL,          -- JSON 数组：[[标签,内容], ...]
  PRIMARY KEY (subject_id, phase_key, block),
  FOREIGN KEY (subject_id, phase_key) REFERENCES pathway_phases(subject_id, phase_key) ON DELETE CASCADE,
  CHECK (block IN ('方案','指标和趋势','影像发现','副作用总结','支持与效果'))
);

-- ③ 诊断追溯的信息缺口：只标注缺口，不做任何推断
CREATE TABLE IF NOT EXISTS diagnosis_gaps (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  gap_key     TEXT NOT NULL,
  gap_label   TEXT NOT NULL,
  gap_note    TEXT NOT NULL,
  ord         INTEGER,
  PRIMARY KEY (subject_id, gap_key)
);

-- ④ 自编病程时间线：一行 = 一个里程碑。
-- 为什么不从其它表拼出来：原型里的 events 是**用户自己整理的病程里程碑**（含"2019 诊断类风湿关节炎"
-- 这类别的表里没有的节点），属于用户可见事实而非派生值；靠拼接必然缺项（实测 B 档案缺 1 条）。
CREATE TABLE IF NOT EXISTS timeline_events (
  subject_id TEXT NOT NULL REFERENCES subjects(subject_id),
  happened_on TEXT NOT NULL,
  label      TEXT NOT NULL,
  ord        INTEGER NOT NULL,        -- 同日多条时的稳定顺序
  PRIMARY KEY (subject_id, happened_on, ord)
);

-- ⑤ 诊断追溯时间线：一行 = 一个节点（起病 → 多次就诊 → 确诊）。
-- 与 timeline_events 的区别：这里是**诊断过程**的三元组（时间 / 经过 / 来源），
-- 来源列区分"本人回忆"与"报告已归档"；timeline_events 是全局病程里程碑。
CREATE TABLE IF NOT EXISTS diagnosis_timeline (
  subject_id  TEXT NOT NULL REFERENCES subjects(subject_id),
  node_key    TEXT NOT NULL,
  happened_at TEXT NOT NULL,
  course_text TEXT NOT NULL,
  source_text TEXT NOT NULL,
  ord         INTEGER NOT NULL,
  PRIMARY KEY (subject_id, node_key)
);
