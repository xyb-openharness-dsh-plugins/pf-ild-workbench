# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.1.0 — 2026-10-25

- 由社区脚手架 dsh-wb-cli@1.5.4 (1541b8a) 初始化，仅有注册骨架与健康接口，无业务功能。

## 0.1.0 — 2026-10-25（M0 骨架）

- **领取**：Issue #33「[认领] PF-ILD（罕见病 #69 · R2 · T1 优先）」已打 `claimed`；建私有仓 `pf-ild-workbench` 并 clone。
- **接线前置**：`cordis.patch.yml` 补 `config.root: !!js dshHomePath('pf-ild-workbench')`（注释放条目后，规避 LESSONS 183 行首行坑）；`dsh/index.js` `Config` 声明 root 对齐；dsh 块 / repository 核对通过。
- **基线**：`npm run check` → `"staticPass": true`；audit 22/30（6 fail 为 init 结构缺口，M1–M3 补齐）。
- 用户可见：工作台可注册、健康接口 200、显示版本号；业务功能待按 spec 实现。

## 0.1.0 — 2026-10-25（M1 调研 SPEC）

- **文档 9 件 + 决策记录**：DEV-PLAN / DEV-REQUIREMENTS-2026-10-25 / SPEC / SCHEMA / PATIENT-FLOW / DIFF-MATRIX / CLINICAL-DATA-2026 / METRIC-GRADING / INTERACTION-DESIGN + DESIGN-SESSION / SCENARIOS / HVT-REVIEW。
- **家族对比实测**：一级重名率 5.5/10=55.0% → 改名定稿 9 一级 = 44.4%（≤70% 合格）；26 号口径对 R2 明确不适用 5 条。
- **HVT-REVIEW**：B=0（G1 具备签认条件）、G=1（S07 营养线）、U=6（医学口径待核）。
- **INTERACTION-DESIGN**：补全 28 号 IP1 三张表（S01–S07 场景路径六要素 + CRUD 双通道矩阵 + IP1–IP10 门槛红线）。
- 用户可见：无（M1 是设计层，业务代码未写）。

## 0.1.0 — 2026-10-25（M1 进行中）

- 三路调研并行：家族对比✅完成；医学指南 + 用户研究子代理运行中（sources 已累积 7 个来源文件）。
- 待回填：USER-RESEARCH-2026-10-25.md、RESEARCH-MEDICAL-2026-10-25.md；G1 签认待用户。
