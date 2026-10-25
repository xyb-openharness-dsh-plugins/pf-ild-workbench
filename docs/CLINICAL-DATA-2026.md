# CLINICAL-DATA · 小呼宝 BreathPal（pf-ild-workbench）· 2026

> 数据截止日：**2026-10-25（未核）**。本文只写**口径**与**已知缺口**，实际检索结果由 M4 `scripts/fetch-pf-ild-trials.mjs` 四件套回填。

## 一、口径

- 唯一入口：**unified-trial-mcp**（统一临床试验检索 MCP，MIT）。不做自己拼 URL。
- 四件套：manifest / jsonl / sqlite / CLINICAL-DATA 文档，四处条数必须一致。
- 来源终态：每条 trial 记 source、source_id、status、pubdate、summary_zh、last_checked_at。
- 刷新策略：在线通道每次运行时实时；离线语料 sha256 必须与 corpora/manifest.json 一致。

## 二、通道覆盖（M4 必填）

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
