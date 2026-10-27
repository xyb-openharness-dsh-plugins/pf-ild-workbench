# CHANGELOG

家族口径：只写「版本 · 日期 · 改了什么 · 依据」，不写营销话术。

## v0.2.4 · 2026-10-27

### 36 号 v2 补齐（指南可点 + 状态卡）
- 从零引入疾病概要三件套：`prototypes/v0.2/{primer.js,primer.css,primer-data.js}`，顶栏「?」入口，四段固定顺序 `definition → evidence → landscape → trend`。
- 数据只取自本仓 README、`docs/CLINICAL-DATA-2026.md`、`docs/METRIC-GRADING.md`、`research/RESEARCH-MEDICAL-2026-10-25.md` 与 `data/trials/pf-ild/` 的已记录事实；不写判定、不复制指南条文。
- 链接 2 条（均真浏览器 `verify-links.mjs` = OK）：北京协和医院发布页、ATS 官方指南页；NHC 官网通知页对脚本返回 412，如实标「据二次来源」，本机另存官方 PDF。登记库记录页为薄页，标 `nolink` + 说明（台账 1 条）。
- 看板首卡加入 §2.6 状态卡四件：eyebrow / 锚点派生大字（本仓无锚点 → 「待初始化」+ 三步初始化）/ 现状行（阶段、状态、下次日期与事项）/ 出口按钮排（肺功能趋势 + 疾病概要副按钮）。
- 装机层同步：`scripts/migrate-public.mjs` 原样复制三件套，`--check` 纳入 `npm run check`；`public/` 由原型定点移植生成，随包发出。
- 新增 `scripts/check-primer-links.mjs`（L1–L12）与 `scripts/probe-disease-primer.mjs`（P1–P9 + E0）。

## v0.2.0 · 2026-10-25

### 数据层从零到可用（M3 + M4 + M5）
- `schema/0001_initial.sql` 21 表冻结（sha256 `dffe17f2…` 落 `schema/freeze-contract.md`），无任何判定列（脚本断言）。
- Oxford 三期分级 A 级论文 → `guidelines/` 三份正文本地入库 + `docs/RESEARCH-MEDICAL-2026-10-25.md` 报告。
- 临床试验 2 条在招（Trials.gov 实查，`data/trials/` 四件套三处条数一致）；其余 3 通道**未查**如实记录，未编造。
- `demo/demo-data.sqlite` 由**唯一源** `demo/demo-content.js` 自动生成；示例主体 A/B + 10 条占位招募行。

### 开发版
- `public/{index.html,style.css,app.js}` 由 `scripts/migrate-public.mjs` 从 `prototypes/v0.2/` **定点移植**（5 处替换，可复跑，`--check` 进检查链）。
- 数据来源改为异步 `${API_BASE}/api/bootstrap`（不再读 `window.DEMO_DATA` 快照）：**数据只有一个来源**。
- 启动期校验失败 → 渲染错误横幅 + 「重新检查连接」，**不白屏**。
- 版本/构建日全部走占位符由服务端注入：页面里没有任何写死的版本号（新增断言测试，防三处版本打架复发）。

### AI（M6）
- `lib/ai-context.js` 上下文包：只装用户勾选的**事实 + 证据等级（A/B/未核实）**，判断性字段黑名单递归扫描，命中即抛。
- `POST /api/ai/context`：空选 → 0 事实（不主动塞数据）；坏 JSON → 400；GET → 405。
- **AI 能力归宿主**，本仓只接入口；未实现任何 AI 功能，未伪造调用链。

### 宿主接线件
- `src/client.js`（client bundle prestige 形状）+ `scripts/build-client.mjs`；`src/plugin.js` 单起点 re-export。
- `lib/patient-store.js` 冻结形状校验（无判定字段断言）；`lib/layout.js` `customFrame: true`。

### 文档与验证
- 独立评审 `docs/DESIGN-REVIEW.md`：P0/P1/P2 均 0；**明确列出未评审项**（键盘可达性、真机装机、26/28/33 全文）。
- `docs/AUDIT-MANUAL-REVIEW.md`：2 项人工判定逐条留痕（一项设计已声明、实机未验）。
- `npm test` 42 用例全过；`npm run audit` 30/33 通过 0 失败 3 待人工。

### 未做 / 未验证（不掩饰）
- **M6 装机未执行**：无真机环境，V2/V3 未验；宿主内形态（非独立启动）**未实测**。
- M3 数据模型**待 G3 签认**；G2 待签认。
- 临床试验 3 个通道（ChiCTR / WHO ICTRP / openFDA）未查（用户未授权联网即跳过），非「无结果」。
