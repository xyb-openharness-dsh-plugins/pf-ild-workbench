# CLINICAL-DATA · 小呼宝 BreathPal（pf-ild-workbench）· 2026

> 数据截止日：**2026-10-25**（检索运行时间，见 `data/trials/pf-ild/manifest.json` 的 `generatedAt`；离线来源的 `dataCutoff` 另行标注）。

## 一、口径

- 唯一入口：**unified-trial-mcp**（统一临床试验检索 MCP，MIT）。不做自己拼 URL。
- 四件套：manifest / jsonl / sqlite / CLINICAL-DATA 文档，四处条数必须一致。
- 来源终态：每条 trial 记 source、source_id、status、pubdate、summary_zh、last_checked_at。
- 刷新策略：在线通道每次运行时实时；离线语料 sha256 必须与 corpora/manifest.json 一致。

## 一·五、实际检索结果（2026-10-25 实跑，`scripts/fetch-pf-ild-trials.mjs`）

四件套：`data/trials/pf-ild/{manifest.json,trials.jsonl,trials.sqlite}` + 本文。**三处条数一致：manifest.records = jsonl 行数 = sqlite 行数 = 1**。

| 来源 | 终态 | 是否算「查过」 | 说明 |
| --- | --- | --- | --- |
| `chinadrugtrials`（CDE 受控归档） | `NO_RESULTS` / `SUCCESS` | **是** | 6 组关键词逐条查询；命中 1 条 |
| `ictrp`（WHO ICTRP） | `FAILED` | **否** | 上游入口 doctor 显示可用，但实际调用失败——**如实记「未查过」**，不得解读为"不存在" |
| `ctv`（Veeva CTV） | `NEEDS_SETUP` | 否 | 未配置上游服务目录或本地索引 |
| `chictr_online` | `NOT_ENABLED` | 否 | 未配置 ChiCTR 在线服务目录 |
| `chictr_pancreatic_archive` | `NEEDS_SETUP` | 否 | 离线语料，且**只有胰腺癌**（对本病种无覆盖） |
| `xyb_chinadrugtrials_archive` | `NEEDS_SETUP` | 否 | 同上 |

**实际取到的记录（1 条）**：

| recordId | 标题 | 适应症 | 分期 | 状态 |
| --- | --- | --- | --- | --- |
| `chinadrugtrials:CTR20213153` | BMS-986278 治疗肺纤维化的疗效与安全性的 2 期研究 | 肺纤维化 | 2 期 | 进行中 招募完成 |

> **纪律声明**：本次只有 1 个来源算「查过」，命中 1 条；**其余 5 个来源均属「未查过」，其缺失绝不等于"没有相关试验"**。登记状态未核实，以登记页为准；本表不构成招募推荐。

## 二、通道覆盖

| 通道 | 适用性 | 说明 |
| --- | --- | --- |
| ictrp | ✅ 在线 | WHO ICTRP，全球广度 |
| ctv | ✅ 在线 | Veeva CTV / ClinicalTrials.gov 深度（本地索引） |
| chictr_online | ✅ 在线 | ChiCTR 实时 |
| chinadrugtrials | ✅ 在线 | CDE，含研究者 PI |
| chictr_pancreatic（离线） | ❌ 未配置/无覆盖 | 离线语料目前**只有胰腺癌**；PF-ILD 未配置，不算"已查过" |
| xyb_cde_pancreatic（离线） | ❌ 未配置/无覆盖 | 同上 |
| ctv_index（离线） | ❌ 未配置/无覆盖 | 同上 |

> **已知覆盖限制（如实声明，不许假装补上）**：离线语料目前只有胰腺癌。PF-ILD 只能走在线四通道；离线通道对本病种属「未配置/无覆盖」，必须在本文与 sqlite 来源终态里如实声明。

## 三、筛选口径

- 检索关键词：`PF-ILD`、`progressive pulmonary fibrosis`、`interstitial lung disease`、`idiopathic pulmonary fibrosis`、` lung transplant`。
- 按 `histology` 不适用（非肿瘤），改用 `phase`、`enrollment`、`country` 过滤；中国可及性单独标注。

## 四、已知缺口

- 临床数据尚未实际检索（M4 未执行）。
- 医学审核未做：所有 `summary_zh` 需 🩺 审核后才进患者侧展示。
- 0 访谈：患者侧疗效口径无一手证据。
