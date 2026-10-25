# DEV-REQUIREMENTS · 小呼宝 BreathPal（pf-ild-workbench）· 2026-10-25

> 体例照 `gastric-workbench/docs/DEV-REQUIREMENTS-2026-10-21.md`（ZERO-TO-DEV §0.2）。
> 每条硬约束带**错误来源**（哪一轮、哪张截图、哪次 parity 红）。M9 追加条目时同此体例，新增必带来源。

## 一、范围（交付物 × 落点 × 怎么验）

- [ ] M0 骨架：init + 接线前置 + 文档 9 件 → 落点 `~/Downloads/pf-ild-workbench` → 验：`npm run check` staticPass + `git log` 有提交
- [ ] M1 调研 SPEC：三路调研 → 落点 `research/` + `docs/{SPEC,USER-RESEARCH,DIFF-MATRIX,PATIENT-FLOW,INTERACTION-DESIGN,METRIC-GRADING}` → 验：重名率数值可复算、G1 签认留痕
- [ ] M2 原型：`prototypes/v0.2/{index.html,style.css,app.js,demo-data.js}`（demo 唯一源）→ 验：HVT X1–X4 走查、独立评审 P0=0、README 截图 ≥4（33 号）
- [ ] M3 数据模型：`schema/0001_initial.sql` + `schema/freeze-contract.md` → 验：sha256 + 判读列断言脚本
- [ ] M4 临床库：`scripts/fetch-pf-ild-trials.mjs` → 四件套（manifest/jsonl/sqlite/文档）→ 验：三处条数一致 + FAILED 如实
- [ ] M5 开发版：七步移植 + MinerU 六部件 + apiBase 契约 + test 五套 → 验：`npm run check` 全绿 + `audit` 0 fail（V1）
- [ ] M6 装机：pack → tgz 四要素 → 真机走查 → 验：V2/V3 逐条截图归档 `docs/release/`
- [ ] M7 发布：tag + Release(tgz+sha256) + CHANGELOG → 验：Release 页可下载、sha256 一致
- [ ] M8 回填：组织 BACKLOG #69 行状态列（31 号口径）→ 验：PR 合并
- [ ] M9 回流：≥1 条"下一轮直接受益" → 验：starter `check-starter` + `npm test` 绿

写不出验证方式的要求不进本表。

## 二、照抄样板的产品要求（不许按比例缩减）

1. 顶栏三段式 + AI 五态（`prompts/DSH-WORKBENCH-TOP-BAR.md`）；AI 按钮走 `xxx:agent-draft` 一键携带提示词 + 病情上下文（starter `docs/20` §2.1–2.3）。
2. 面板：默认右侧、25%–45% 可拖、可收起可重开、会话区常挂载；参数唯一来源 `lib/layout.js`，businessWidth 0.55–0.75，避让红绿灯。
3. 一图秀（`docs/16-ONE-CHART-SPEC`）：肺功能趋势首图承担"一眼看懂在掉还是稳"的任务。
4. 3D 卡 / 折叠卡：治疗线与急性加重事件用 32 号折叠卡模版；README 收/展两态截图（33 号）。
5. 全局设置页必备（`docs/SETTINGS-DESIGN.md`）：资料目录、MinerU 凭据、临床参考包来源与状态。

## 三、硬约束

### 数据层（错误来源：ZERO-TO-DEV §0.2 汇编 + breast/cervical 各轮 parity 红）

1. 复合主键表裸 `SELECT` 必须 `ORDER BY rowid`；手写倒序数组只 `ORDER BY ord` 不叠 `DESC`。
2. 可选字段显式写 `null`，读模型按 `=== null` 分支；`Number(null)===0` 坑——空值先挡 `null/undefined/''` 再 `Number()`。
3. `using` 是 SQLite 保留字 → 列名 `in_use`（氧疗"在用"字段即此列）。
4. 每一节 `{title, rows}` 必须有对应 `*_title` 列。
5. 分类指标 `dec IS NULL` 且 `kind ∈ {grade,qual}`——**mMRC 等级、King-ILD-QoL 等量表分不进趋势折线**。
6. 化验/体征 2–4 周一点延续到今天；**肺功能（3 个月节奏）与影像（按需）按真实频率，不加密**（来源：本仓 2026-10-25 口径决定，防"造点"）。
7. `events`/`docs`/`candidates` 在快照里是定长数组；`assemble()` 中间量解构掉。
8. 演示数据唯一来源：`prototypes/v0.2/demo-data.js` → 生成 → 入库，两处不一致即 parity 红。
9. **无判读列**：schema 不含 diagnosis / risk_level / 严重度判定类列；PF 判定属医生任务，本仓只存事实与用户自录。

### 前端（来源：breast 0.10–0.12 各轮）

10. 页脚贴底 `min-height:calc(100vh - 32px)` + `flex:1`；`[hidden]{display:none!important}`。
11. 字号基线 12.5–15px；大字档 15px。
12. 面板 25%–45% 可拖可收；二级页签按 `state.sub` 分流且穷举测试。
13. 图标 key 走别名兜底；内联 svg 必须给宽高；SVG 根 `class="chart"`。
14. smoothPath 用 Fritsch–Carlson（不许 Catmull-Rom 过冲）——肺功能折线是医疗信息，视觉过冲=误导。
15. 窄宽适配按 30 号出第一版，不许"桌面先行后补"。

### 工程（来源：LESSONS 183–215 行 GBM/ATTR/头颈三连踩）

16. 改包必升版；版本四处一致（VERSION/package.json/lib/version.js/页面字面量）；`lib/version.js` 是生成物不手改。
17. `apiBase` 不含 `/api`；定稿契约含**交界守卫 + 双形态回归 + 禁裸 throw**（breast M5 口径）。
18. 迁移只增不改；INSERT 显式列名 + 显式问号数。
19. 宿主接线四要素缺一不装机：dsh 块 / patch `config.root` / 真客户端链路（非占位）/ 版本簿记（06 号）。
20. 并行写同仓以 `check` 为准合流并立即提交；BACKLOG 改前先 pull。
21. private 仓库三出口代码级过滤（包名/下载/索引不外泄）。

### 医学口径（来源：ZERO-TO-DEV v1.2 四条 + 23/25 号）

22. 分级只用「对照」，不写"偏高/偏低/严重"，不推断因果、不给处置。
23. ×ULN 型（本仓涉及肝酶等安全性化验时用）必须用**该化验单自带参考上限**，缺了返回 `needsUln`，绝不拿通用上限凑倍数。
24. 指南只做「出处 + 节奏 + 并列口径」，处置推荐只折叠原文；PF-ILD 判定标准（FVC 下降阈值等）作为**并列口径展示给复诊准备用**，不生成"你符合/不符合"的结论。
25. 未采用的原文分支在注释写「未采用」+ 原因。
26. **患者视角红线**：每条功能线挂一句患者视角需要（0 访谈→标改写句非一手）；医生任务（鉴别诊断、判定计算器、评分诊断）冒充患者需要 = 一票否决；`research/` 里"未核实"必须带核对日期。

## 四、本轮明确未做（不许在验收里算通过）

- 患者/家属访谈（0 份）；医学专家核对（未做）
- 真实资料目录接入与 MinerU 真解析（用户未指定目录，只装骨架）
- 离线语料（ChiCTR/CTV 胰腺癌专用语料对本病种无覆盖 → 记「未查过」）
- 市场投稿、public 化、ROADMAP 标 🟢（🟢 只认 V1+V2+V3 全过）

## 五、我替你定的默认值（可回退）

| # | 默认值 | 来源 | 回退成本 |
| --- | --- | --- | --- |
| 1 | 服务主体=患者本人为主 + 家属辅助 | 2026-10-25 AskUserQuestion 用户选定（推荐项） | 中：代记双视角需重做交互层 |
| 2 | 病程覆盖=全病程六段 | 同上 | 高：砍段要删功能线，但 schema 只增不改可保留 |
| 3 | MinerU=骨架不接真实目录 | 同上 | 低：用户给目录后即可接真管道 |
| 4 | 品牌=小呼宝 / BreathPal | 同上 | 低：M2 前改名只动文案层 |
| 5 | 一级功能线候选 10 项（见 DIFF-MATRIX） | 代理自拟，待 G1 签认 | — |
| 6 | 肺功能节奏按 3 个月、影像按需不加密 | 代理自拟（依据随访惯例，B 级） | 低：节奏仅是演示数据密度参数 |
| 7 | 量表（mMRC/King-ILD）只作趋势外的分类记录 | 代理自拟（硬约束 5 联动） | 中 |
