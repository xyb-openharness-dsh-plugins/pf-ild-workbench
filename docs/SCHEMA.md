# SCHEMA · 小呼宝 BreathPal（PF-ILD）· 草案 v0.1 · 未冻结

> 状态：**草案（Phase1）**。G3 签认前不建表、不写迁移；正式版落 `schema/0001_initial.sql` + `schema/freeze-contract.md`。
> 口径：26 号（成熟对比基准 breast-cancer-workbench）的表结构与四层事实模型，按 R2 慢性病形态裁剪——**没有分期、没有肿瘤标志物、没有放化疗线**，主线是「功能趋势 + 不可逆窗口决策（急性加重/移植评估）」。

## 实体—关系—表

| 实体 | 稳定 ID | 主体/外键 | 核心字段/类型 | 约束/索引 | 来源/确认 | 生命周期 |
| --- | --- | --- | --- | --- | --- | --- |
| subject | subject.* | — | patient_id(subject) | 唯一；scope=profile | 档案初始化 | 长期 |
| document | doc.* | subject | relative_path/hash/mime/source | hash 唯一索引；source=original | 导入/上传 | 长期 |
| candidate | cand.* | subject/document | kind/candidate_value/ref_source/dec(null|accept|reject) | kind 分类；dec 默认 null | 解析/录入 | 确认后 archived |
| metric_definition | metric.* | — | code/unit/ref_low/ref_high/kind(numeric/grade/qual)/in_trend(bool) | code 唯一 | 权威定义 | 长期（只增不改） |
| observation | obs.* | subject/metric_definition | observed_at/value/decimals | `ORDER BY rowid`；(subject,metric,at) 索引 | record | 长期 |
| metric_series_cache | series.* | subject/metric_definition | point_key/value_json/cache_at | 快照；唯一来源 = demo manifest | 派生缓存 | 可重建 |
| decision_version | verdict.* | subject/candidate/section | note/mode/at | 只增不改；accept 行 version 递增 | record | 长期 |
| pft_test | pft.* | subject | test_date/device/bronchodilator/report_doc_id/completeness | section_title 列必备 | record | 长期 |
| oxygen_therapy | o2.* | subject | started_at/stopped_at/**in_use**/flow_lpm/indication_text | using 保留字→in_use | record | 长期 |
| daily_quick_note | dnote.* | subject | noted_at/mMRC/spo2_rest/spo2_exertional/oxygen_flow/symptom_note/change_anchor(0/1) | change_anchor 只存事实 | record | 长期 |
| med_record | med.* | subject | drug_name/form/start_at/changed_at/dose_text/reason_text/adverse_note/in_use | 剂量变更只追加版本 | record | 长期 |
| ae_event（急性加重） | ae.* | subject | event_date/episode_end/care_setting_text/trigger_text/discharge_meds_json/oxygen_rx_text/review_due_at | 折叠卡 32 号渲染源 | record | 长期 |
| imaging_study | img.* | subject | study_date/modality/hrct_desc_text/report_doc_id/section_title | **按真实频率不加密** | record | 长期 |
| transplant_prep | tp.* | subject | item_key/item_label/has_record/last_date/note | 只列要问的，不给答案 | record | 长期 |
| visit_encounter | enc.* | subject | encountered_at/questions_checked_json | 复诊准备生成物 | record | 长期 |
| question_item | qitem.* | subject | item_key/item_label/asked(bool) | 用户自录勾选 | record | 长期 |
| trial | trial.* | — | source/source_id/trial_id/status/pubdate/summary_zh | M4 四件套产物 | cache | 按来源失效 |
| settings_kv | kv.* | — | key/value/updated_at | 版本簿记、apiBase 定稿、Token 状态 | config | 长期 |

实体图：

```
subject ─┬─ document(source=original)
         ├─ candidate(dec IS NULL → accept 才升 record)
         ├─ pft_test ─┐
         ├─ med_record ├─ obs(metric_definition, kind ∈ numeric/grade/qual)
         ├─ oxygen_therapy ┘   (grade/qual 的 dec IS NULL 且 kind ∈ {grade,qual} → 不进趋势折线)
         ├─ daily_quick_note / ae_event / imaging_study / transplant_prep
         └─ decision_version(更正只新增版本，不覆盖旧行)
```

## 四契约落点（家族通用，逐条对应 14 号）

1. **看法恒不为结论**：无 `is_conclusion`；所有"提示位"文案层生成，不落库。
2. **缺侧不生成差值**：DLCO 缺测 = NULL，前后差值列不插补（NULL ≠ 0；先挡 `null/undefined/''` 再 `Number()`——踩过三次的坑）。
3. **更正只新增版本**：`decision_version` 追加行；路径切换/剂量变更新增行不覆盖旧行。
4. **事实四层不合并**：document → candidate → record → observation 分表，解析结果必须经用户确认（`dec=accept`）才升为 record。

## 数据根与迁移

- 数据根：`config.root` → `dshHomePath('pf-ild-workbench')`，库文件 `xyb-pf-ild.sqlite`；public 数据（trial 语料、指南目录）与 private 分离。
- 迁移 ledger：`schema/migrations/` 只增不改；0001 冻结后发现漏列走 ALTER 追加不改 0001；每条迁移记 applied/backup/rollback 兼容。
- 前端/业务变化矩阵：改导航/布局→只动读模型；新指标→`metric_definition` 追加 + 迁移；新记录类型→专属表追加；来源更正→decision_version 追加；旧库升级→读模型版本字段兼容。**仅布局/字段顺序变化不能迫使用户清库。**

## 持久化选型（G3 确认项，草案理由）

- 等级 A/B：结构化时序 + 多表关系 + 本机离线 = SQLite（node:sqlite）。
- JSON 扩展：候选列表、问题清单勾选结果、discharge_meds_json 等**有 schema/version/上限**的结构化块，可接受。
- 核心关系保留外键与约束；写入有 revision/幂等键；并发写者（UI + AI 草稿）用单连接串行化写。
- 性能证据：待 M5 实测（演示数据点位 ~30–60，查询延迟目标 <16ms；未实测不得写"通过"）。

## 判读列断言（G3 出口，脚本随 schema 提交）

无列名匹配 `diagnosis|risk_level|severity|stage|prognos`；量表（mMRC/King-ILD/UCSD SBD）存**用户自录原值**，不存服务端计算的风险档位。PF-ILD/PPF 判定属医生任务，本仓只存事实与并列口径。
