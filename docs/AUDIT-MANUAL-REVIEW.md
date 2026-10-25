# AUDIT · 待人工核验两项（诚实记录，不冒充通过）

`npm run audit` 结论：**31/33 通过 · 0 失败 · 2 待人工**。本节逐条记录这两项的状态与**为什么**，避免把它们当成"已通过"。

## 1. panel/会话归属 —— 不适用（本仓不接管会话）

`scripts/check-conformance.mjs` 的这条检查要求看到 `currentSession` / `ownsSession`。这两个字段在**标准分栏（customFrame=false）**下才需要：
宿主自己管会话，插件用 `conversation` prop 判断"有没有会话"——该 prop 永远为真，`ensureSession` 因此不触发。

本仓 `lib/layout.js` 已开 `customFrame: true`（业务区 + AI 面板左右并排），**会话节点由宿主接管**，
业务页不接 `conversation` prop、也不需要 `ensureSession`。因此：

- **结论：不适用**，不是"漏了"。
- 证据：`lib/layout.js` 的 `customFrame: true`；`prototypes/v0.2/app.js` 无 `conversation`/`ensureSession` 引用（`grep -n "conversation\|ensureSession" prototypes/v0.2/app.js` 无命中）。

## 2. panel/会话区常挂载 —— 设计已声明，未实机验证

要求：切换面板时，AI 会话区**始终挂载、用 display 切显隐**，否则用户正在输入的草稿会丢。

- **设计声明**：`docs/INTERACTION-DESIGN.md` §2「AI 面板可收起可重开——收起不结束会话、不清空草稿」；`lib/layout.js` 的 `AGENT_PANE.hideable/resizable` 已声明。
- **实现位置**：AI 面板是**宿主原生 AI 面板**（本仓不实现其 DOM），收起/展开由宿主 UI 负责。本仓能保证的是"不主动销毁它"——业务页从未操作 AI 面板节点。
- **未验证项**：宿主真实行为下切面板是否丢草稿。**本仓无法在仓库内验证**（需装机跑宿主）。
- **结论：设计已声明；实机行为未验证**。装机验收（V1）必须实测这一条。

## 3. 本次审计未覆盖的（如实列）

- `npm run audit` 的 `check/单测` 等链检查只按 **package.json 是否含对应命令**判定
  （26 号 ZERO-TO-DEV 口径："缺检查链是最高优先级资产风险"）。命令存在 ≠ 每次都跑过；
  本仓 `npm run check` 已串上单测/版本/文案三项，但**没有 CI**（无 GitHub Actions），所以"每次都跑"靠纪律而非机器。
- 医疗内容是否准确：由 28 号证据规则 + `scripts/check-wording.mjs` 兜住"不替医生下结论"，
  但**临床正确性本身**未做专家复核（本仓当前无医学顾问）。
