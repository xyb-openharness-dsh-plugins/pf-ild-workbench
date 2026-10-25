# 互动设计记录

状态：设计者对齐中 → 调研 → 场景 → 规格 → 独立评审 → 原型。已确认项继承，未核实不自动视为确认。
当前阶段/范围：designer-alignment → research → scenarios → specification → independent-review → prototype → implementation。
设计提示词：docs/DESIGN-PROMPT.md；设计者章程：docs/DESIGNER-BRIEF.md；实际独立审查：docs/DESIGN-REVIEW.md。
权威内容：docs/BRIEF.md、docs/SPEC.md；UI 与数据设计链接：docs/UI-DESIGN.md（待 M2 建）。

| 决策 ID | 待解决的问题 | 用户已确认内容/来源 | Agent 建议及原因 | 待确认项 | 确认人/日期 | 影响功能 ID |
| --- | --- | --- | --- | --- | --- | --- |
| DESIGN-01 | 服务主体 | 患者本人为主 + 家属辅助 | 用户 2026-10-25 AskUserQuestion 选定（推荐项） | 无（已确认） | 用户 | F-O2-01/F-AE-01/F-TP-01 文案层 |
| DESIGN-02 | 病程覆盖 | 全病程六段：诊断追溯→趋势→治疗→急性加重→移植评估→资源 | 用户 2026-10-25 选定（推荐项） | 无（已确认） | 用户 | SPEC §四 9 一级线 |
| DESIGN-03 | MinerU | 装六部件骨架，不接真实资料目录 | 用户 2026-10-25 选定（推荐项）；资料目录未经明确指定一律拒绝 | 用户给目录后接真管道 | 用户 | F-DOC-01、M5 |
| DESIGN-04 | 品牌占位名 | 小呼宝 / BreathPal | 用户 2026-10-25 选定（推荐项）；M2 前可改 | 无（已确认，M2 前可改） | 用户 | 全文案层 |
| DESIGN-05 | S07 营养线处置 | — | 方案 A 新增一级线「营养与日常功能」或方案 B 并入 S02 二级页（HVT-REVIEW §4 G1） | **G1 签认时用户拍板** | 待签认 | F-NP-01（方案A） |
| DESIGN-06 | 一级功能线定稿 | — | 9 一级 + 设置弹窗；重名率 44.4%（DIFF-MATRIX §二） | G1 签认 | 待签认 | SPEC §四 |
| DESIGN-07 | 0 访谈如实声明 | — | USER-RESEARCH 全二手；改写句不冒充一手引语；U1–U6 待 🩺 核 | G1 签认时用户知晓 | 待签认 | 全文档 |

本轮已写入的章节：docs/{SPEC,SCHEMA,PATIENT-FLOW,DIFF-MATRIX,CLINICAL-DATA-2026,METRIC-GRADING,INTERACTION-DESIGN,SCENARIOS,HVT-REVIEW,DEV-PLAN,DEV-REQUIREMENTS}.md；research/FAMILY-COMPARISON-2026-10-25.md。
下一轮最关键的问题：
1. G1 签认：S07 营养线方案 A/B + 9 一级线定稿 + U 级如实声明（三选一+两确认）。
2. 两路调研（医学/用户研究）子代理运行中，结果回填后更新 SPEC 与 USER-RESEARCH。
3. M2 原型开工前置：INTERACTION-DESIGN 签认（IP1）+ 交互路径文档版本留痕。

确认时展示的原型版本/hash、实际预览方式：无（M2 未开工；G1 不依赖原型）。
变更：旧决定 → 新决定、原因、受影响数据/API/原型/验收项：—（首轮）。

用户回答后由 Agent 更新对应文档；本记录只保留决策和指向，不重复复制完整需求。

HTML原型关口：路径/版本/hash、实际预览证据、用户确认范围/原话/日期；未确认则业务开发待开始。（M2 时填）
数据演进关口：SCHEMA变化矩阵、领域/流程/读模型边界、兼容与迁移未决项。（SCHEMA.md §迁移与冻结 已填；G3 确认）。
