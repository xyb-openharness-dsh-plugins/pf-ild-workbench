# DEV-PLAN · 小呼宝 BreathPal（pf-ild-workbench）

> **本文件是里程碑状态的唯一来源。** 汇报进度时判据列照抄本文件，不临场改写。
> 状态三态：✅ 实测通过（有命令/截图证据）｜🔧 骨架完成（能跑但未验业务）｜⏳ 未实现。
> 病种：进行性纤维化性间质性肺疾病 PF-ILD（罕见病目录 #69，页 408）· 线别 R2 非肿瘤慢性病型 · 级别 T1 优先
> 认领：[.github Issue #33](https://github.com/xyb-openharness-dsh-plugins/.github/issues/33)（`claimed` 已打，2026-10-25）
> 仓库：https://github.com/xyb-openharness-dsh-plugins/pf-ild-workbench （private）

## 基准与口径

| 项 | 取值 |
| --- | --- |
| 移植底本（client 链路） | `cervical-workbench` |
| 成熟对比基准（26 号口径） | `breast-cancer-workbench` v0.12.0 |
| 形态参考（R2 先例） | `fshd-workbench` v0.1.1 |
| 脚手架 | dsh-wb-cli 1.5.4 · revision 1541b8a |
| 服务主体 | 患者本人为主 + 家属辅助（2026-10-25 用户确认） |
| 病程覆盖 | 全病程：诊断追溯 → 趋势 → 治疗 → 急性加重 → 移植评估 → 资源（用户确认） |
| MinerU | 六部件骨架，不接真实资料目录（用户确认；资料目录未经明确指定一律拒绝） |
| 品牌 | 小呼宝 / BreathPal |

## M0–M9

| 阶段 | 内容 | 出口判据（可验证） | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| M0 骨架 | 领取 + 建仓 + init + 接线前置 + 文档 9 件 | `npm run check` → `"staticPass": true`；`cordis.patch.yml` 含 `config.root: !!js dshHomePath('pf-ild-workbench')` 且注释不在首行；9 件文档存在且为本病种原创内容 | ✅ 实测通过（2026-10-25） | check 输出 staticPass true；Issue #33 已 claimed |
| M1 调研 SPEC | 三路调研 + DIFF-MATRIX + SPEC + USER-RESEARCH + INTERACTION-DESIGN + HVT-REVIEW + SCENARIOS | 三路调研全部交付；重名率 55.0%→改名 44.4% ≤70%；HVT-REVIEW B=0/G=1/U=8；NHC #69 原文核到 A 级 | ✅ **G1 已签认**（2026-10-25） | research/{FAMILY-COMPARISON,USER-RESEARCH,RESEARCH-MEDICAL}-2026-10-25.md；HVT-REVIEW §3 检索式 |
| M2 原型 | demo 唯一源 + 四件套 + 32 号折叠卡 + 30 号窄宽 + HVT X1–X4 + 独立评审 P0=0 + README 截图 ≥4 | 四件套存在；X1–X4 断言 PASS（23/23 覆盖、0 孤儿页）；探针 5 档 × 23 页零溢出；README 实渲 10 张含折叠收/展；独立评审 P0 待收 | ✅ 已完成（独立评审 P0=0，4 次尝试后由子代理实证 5 项；docs/DESIGN-REVIEW.md） | `npm run check:paths` PASS；`npm run probe:resp` 5×23 全绿；docs/screenshots/ |
| M3 数据模型 | `schema/0001_initial.sql` + `freeze-contract.md` sha256 + 判读列断言 | 无 diagnosis/risk_level 类判定列（脚本断言）；freeze sha256 落档；G3 签认 | ✅ 完成（0001–0004，30 表）· **G3 已签认** | `npm run check:schema` PASS |
| M4 临床库 | `scripts/fetch-pf-ild-trials.mjs`（unified-trial MCP 四通道）→ 四件套 | `manifest = jsonl = sqlite` 三处条数一致；FAILED 通道如实记「未查过」 | ✅ 2 条 Trials.gov 在招（其余 3 通道未查，如实记） | `data/trials/pf-ild-trials.jsonl` |
| M5 开发版 | 七步移植 + 宿主接线件 + MinerU 六部件 + apiBase 定稿契约 + test 五套 | `npm run check` 全绿 + `npm run audit` 0 fail；V1 | ✅ check/audit 通过（audit 2 项待人工已留痕）· 宿主形态未真机 | `docs/AUDIT-MANUAL-REVIEW.md` |
| M6 装机 | 升版 → pack → 06 号四要素对照 tgz → corepack pnpm 装 → bundles 登记 → 新会话真机走查 → README 真机截图 | V2 真加载、V3 真机业务闭环，逐条有截图；`docs/release/<版本>/` | ⛔ 未执行（无真机环境） | — |
| M7 发布 | tag + GitHub Release（tgz + sha256）+ CHANGELOG 发版段 | Release 页面存在、tgz 可下载、sha256 一致 | ✅ v0.2.1 已发布（2026-10-25，含临床试验三块 + 否定语义修正）| `docs/release/v0.2.1/` |
| M8 回填 | 组织 BACKLOG 状态行（31 号：只改状态与招募列，🔵 版本+日期+依据），走 PR 前先 pull | PR 合并 + 项目 RELEASE.md 动作表补一行 | ✅ PR [#39](https://github.com/xyb-openharness-dsh-plugins/.github/pull/39) 已合并（2026-10-25） | `BACKLOG.md` |
| M9 经验收敛 | 新坑→项目 DEV-REQUIREMENTS；通用坑→starter LESSONS；流程→编号文档+prompts；可断言→检查器待实施清单；starter CHANGELOG 记「从 PF-ILD 回收了什么」 | 至少一条「下一轮直接受益」的回流；`check-starter` + `npm test` 通过 | ✅ L2 回流 PR [starter#1](https://github.com/xyb-openharness-dsh-plugins/xyb-workbench-starter/pull/1) **已合并**（2026-10-25，squash；三个闸门：版本字面量 / 静态引用完整性 L3 / 选择上限一致性 L2）；L1 记 L15–L20 | `docs/REFLOW-TO-STARTER.md` |

## 闸口

| 闸口 | 内容 | 状态 | 签认 |
| --- | --- | --- | --- |
| G1 | 业务流程与功能（SPEC + PATIENT-FLOW + INTERACTION-DESIGN 交签认，HVT B 级清零） | ✅ **已签认 2026-10-25** | 用户；B=0、G=0（S07 方案 A→F-NP-01）、U=8 如实声明；留痕 DESIGN-SESSION DESIGN-05/06/07 |
| G2 | HTML 原型（P1 发布可见性 + X1–X4 路径一致性走查） | ✅ **已签认**（2026-10-25 用户确认通过） | 用户 2026-10-25 回复「4.确认通过」 |
| G3 | 数据模型与数据流（未过不建表、不写迁移） | ✅ **已签认**（2026-10-25 用户确认通过） | 用户 2026-10-25 回复「4.确认通过」；schema 0001–0004 按「只增不改」演进 |
| V1 | 包级：`npm run check` 全绿 | M0 基线已 ✅（不代表 M5 完成） | — |
| V2 | 装机：Desktop 真加载 | ⏳ | — |
| V3 | 真机业务闭环 | ⏳ | — |

## 已知前置缺口（不掩饰）

- **演示档案空态覆盖不足**（LESSONS L16）：主体 B 的 transplant_items=9、imaging_records=3 都是满的，
  空态分支只有 `ae_events`（B=0）会被渲染。应让 B 故意缺移植评估与影像结论。**本轮未做**。

- 👤 **0 访谈**、🩺 **医学核对未做**：用户研究全部按证据分层标注，改写句不冒充一手引语；依赖一手证据的假设一律标 ⏳。
- 罕见病离线语料（ChiCTR/小胰宝归档）**只有胰腺癌**，本病种只能走在线四通道；离线通道在 CLINICAL-DATA 里记「未配置/无覆盖」，不算已查过。
