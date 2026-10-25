# v0.2.0 · 2026-10-25 · PF-ILD 工作台（开发版）

## 这个版本能做什么 / 不能做什么

**能**：本机独立启动，看到 A/B 两位示例主体的全病程档案（肺功能/氧状态/急性加重/用药/影像/复诊待办/移植评估/诊断追溯/报告），以及 10 条占位招募行 + 2 条实查在招试验。
**不能**：**装进 DSH 宿主运行未验证**（本轮无真机环境，M6 未执行）；AI 面板是宿主的，本包不含 AI 实现。

## 变更

### 数据层（M3/M4）
- schema 21 表冻结，**无判定列**（无 diagnosis/risk_level/severity/stage/prognosis）。
- Oxford 三期 A 级论文 3 份入库（Raghu 2022 / ATS-ERS-ALAT-JRS 2022 / Cottin 2018）+ 证据分层报告。
- 临床试验：2 条在招（NCT05606939 非 IPF 肺纤维化、NCT07402804 肺纤维化间质疾病）；**ChiCTR / WHO ICTRP / openFDA 未查**（未授权联网即跳过）。

### 开发版（M5）
- 原型 → 开发版**定点移植**（`scripts/migrate-public.mjs`，5 处替换，`--check` 进 `npm run check`）。
- 异步 `bootstrap` 加载 + 失败横幅 + 重连按钮（不白屏）。
- 版本/构建日由服务端注入，页面无写死版本号（有断言测试）。

### AI（M6）
- 上下文包只装事实 + 证据等级；判断性字段黑名单；`POST /api/ai/context`。
- 不自动发送、不替用户下结论（`notes` 明文声明）。

## 验证

| 项 | 结果 |
| --- | --- |
| `npm test` | 42/42 |
| `npm run audit` | 31/33 通过 · 0 失败 · 2 待人工（`docs/AUDIT-MANUAL-REVIEW.md`） |
| 独立评审 | P0/P1/P2 = 0（`docs/DESIGN-REVIEW.md`，含未评审声明） |
| `npm run check` | 全绿 |
| V1 包级 | ✅ |
| V2 装机真加载 | ❌ **未执行** |
| V3 真机业务闭环 | ❌ **未执行** |

## 安装（仅独立启动已验证）

```bash
npm i -g .   # 或直接从 tgz
dsh-wb-pf-ild --root ~/Documents/pfild-data --port 7799
```

宿主内安装**未验证**，请勿按「已可安装」对外描述。

sha256: 见 `SHA256SUMS.txt`。
