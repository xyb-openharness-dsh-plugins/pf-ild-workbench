# 冻结合同 · schema/0001_initial.sql

> G3 签认后本文件生效。**此后改结构只能新增 `0002_*.sql`**（ALTER 追加），不得修改 0001；
> 漏列（如分节 `*_title`）也走 ALTER 追加。`scripts/check-schema.mjs` 断言"只增不改"。

| 项 | 值 |
| --- | --- |
| 文件 | `schema/0001_initial.sql` |
| sha256 | `dffe17f29d2f7bca2b3fdf98ce7374c02e20f4552486ae3f1707a8f860443ab3` |
| 字节数 | 12631 |
| 冻结日期 | 待 G3 签认（本文件随 G3 签认生效；签认前为草案） |
| 表数量 | 21（档案级 3 + 指标 3 + 通用 8 + 专属 7 …见下） |
| 判读列 | **0**（`scripts/check-schema.mjs` 断言） |

## 内容边界（本文件包含 / 不包含）

**包含**：档案级 3（`subjects`/`documents`/`candidates`）、指标 3（`metric_definitions`/`metric_points`/`metric_series_cache`）、
通用 8（`section_titles`/`viewpoints`/`visit_encounters`/`question_items`/`decision_versions`/`trials`/`settings_kv`/`audit_log`）、
本病种专属 7（`pft_records`/`oxygen_records`/`ae_events`/`med_records`/`imaging_records`/`transplant_items`/`nutrition_logs`）。

**不包含（刻意）**：任何诊断/分期/风险分层/预后字段；任何"是否符合 PPF/是否该移植/热量需求"的判定列；
任何把量表换算成服务端档位的列。理由见 `docs/SPEC.md` §十四、`docs/METRIC-GRADING.md` §二。

## 变更流程

1. 新需求 → 新增 `schema/0002_<描述>.sql`（只 ALTER/CREATE，禁 DROP 0001 的表）；
2. 跑 `node scripts/check-schema.mjs` 与 `node scripts/check-demo-columns.mjs`（列一致性）；
3. 更新本文件的表清单与变更记录（**不改 sha256**——它锚定的是 0001）。

## 变更记录

| 日期 | 迁移 | 内容 | 依据 |
| --- | --- | --- | --- |
| 2026-10-25 | 0001 | 初始建模（21 表） | G1 签认后的 SPEC/SCHEMA；G3 待签认 |
