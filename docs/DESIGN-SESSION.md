# 互动设计记录

状态：**G1 已签认（2026-10-25）** → 进入 M2 原型。已确认项继承，未核实不自动视为确认。
当前阶段/范围：designer-alignment → research → scenarios → specification → independent-review → prototype → implementation。
设计提示词：docs/DESIGN-PROMPT.md；设计者章程：docs/DESIGNER-BRIEF.md；实际独立审查：docs/DESIGN-REVIEW.md。
权威内容：docs/BRIEF.md、docs/SPEC.md；UI 与数据设计链接：docs/UI-DESIGN.md（待 M2 建）。

| 决策 ID | 待解决的问题 | 用户已确认内容/来源 | Agent 建议及原因 | 待确认项 | 确认人/日期 | 影响功能 ID |
| --- | --- | --- | --- | --- | --- | --- |
| DESIGN-01 | 服务主体 | 患者本人为主 + 家属辅助 | 用户 2026-10-25 AskUserQuestion 选定（推荐项） | 无（已确认） | 用户 | F-O2-01/F-AE-01/F-TP-01 文案层 |
| DESIGN-02 | 病程覆盖 | 全病程六段：诊断追溯→趋势→治疗→急性加重→移植评估→资源 | 用户 2026-10-25 选定（推荐项） | 无（已确认） | 用户 | SPEC §四 9 一级线 |
| DESIGN-03 | MinerU | 装六部件骨架，不接真实资料目录 | 用户 2026-10-25 选定（推荐项）；资料目录未经明确指定一律拒绝 | 用户给目录后接真管道 | 用户 | F-DOC-01、M5 |
| DESIGN-04 | 品牌占位名 | 小呼宝 / BreathPal | 用户 2026-10-25 选定（推荐项）；M2 前可改 | 无（已确认，M2 前可改） | 用户 | 全文案层 |
| DESIGN-05 | S07 营养线处置 | **用户 2026-10-25 G1 签认：采纳方案 A** | 新增一级线「营养与日常功能」（F-NP-01）：进食量记录 + 体重趋势 + 活动耐量对照；不做热量换算/肌少症判定 | 无（已确认） | 用户 / 2026-10-25 | F-NP-01 |
| DESIGN-06 | 一级功能线定稿 | **用户 2026-10-25 G1 签认** | 10 一级 + 设置弹窗；重名率 45.0%（DIFF-MATRIX §二） | 无（已确认） | 用户 / 2026-10-25 | SPEC §四 |
| DESIGN-07 | 0 访谈如实声明 | **用户 2026-10-25 G1 签认时已知晓** | USER-RESEARCH 全二手；改写句不冒充一手引语；U1–U8 待 🩺/👤 核 | 无（已知晓） | 用户 / 2026-10-25 | 全文档 |

本轮已写入的章节：docs/{SPEC,SCHEMA,PATIENT-FLOW,DIFF-MATRIX,CLINICAL-DATA-2026,METRIC-GRADING,INTERACTION-DESIGN,SCENARIOS,HVT-REVIEW,DEV-PLAN,DEV-REQUIREMENTS}.md；research/FAMILY-COMPARISON-2026-10-25.md。
**G1 签认已完成（2026-10-25）**：S07=方案 A（F-NP-01）；一级线定稿 10 项 + 设置弹窗；U1–U8 如实声明已知晓。
下一轮最关键的问题：
1. M2 原型：prototypes/v0.2 四件套 + HVT X1–X4 + 独立评审 P0=0 + README 截图 ≥4 张。
2. 两路调研（医学/用户研究）子代理运行中，结果回填后更新 SPEC 与 USER-RESEARCH。
3. M2 原型开工前置：INTERACTION-DESIGN 签认（IP1）+ 交互路径文档版本留痕。

确认时展示的原型版本/hash、实际预览方式：无（M2 未开工；G1 不依赖原型）。
变更：旧决定 → 新决定、原因、受影响数据/API/原型/验收项：—（首轮）。

用户回答后由 Agent 更新对应文档；本记录只保留决策和指向，不重复复制完整需求。

HTML原型关口：M2 进行中；路径/版本/hash、实际预览证据、用户确认范围/原话/日期待 G2 填。
数据演进关口：SCHEMA变化矩阵、领域/流程/读模型边界、兼容与迁移未决项。（SCHEMA.md §迁移与冻结 已填；G3 确认）。
