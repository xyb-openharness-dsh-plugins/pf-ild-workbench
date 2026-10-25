# 经验回流脚手架留痕（M9）

## 已提交的回流 PR

| PR | 目标 | 层级 | 内容 | 来源病种（L2 需 ≥2） |
| --- | --- | --- | --- | --- |
| [xyb-workbench-starter#1](https://github.com/xyb-openharness-dsh-plugins/xyb-workbench-starter/pull/1) | 脚手架 1.5.8 | **L2 能力层** | 页面版本字面量闸门 `check-version-literal.mjs` 随 init 下发 | ① cervical-workbench `scripts/check-version.mjs:67` ② PF-ILD v0.2.0 升版 audit 报红 |

## 留在项目层（L1，单病种）

按脚手架 `SCAFFOLD-ITERATION.md` §1：**只有一个病种遇到 → 留在 L1**。以下已写入 `docs/LESSONS.md`：

| 编号 | 经验 | 为什么留 L1 |
| --- | --- | --- |
| L15 | 「可复跑的移植脚本」消掉了手工漂移，但把漂移转移到了脚本里；解法是页面零字面量 + 注入断言 | 移植脚本是 PF-ILD 首用，无第二病种复现 |
| L16 | 空态演示档案会遮住整条分支（本轮**实际未做**：B 的移植评估/影像都是满的，只有 ae_events=0） | 尚未修完，不构成可回流的成熟经验 |
| L17 | AI 上下文包「只装事实」可以用结构黑名单断言，不只靠文案 grep | M6 首用，无第二病种复现 |

## 未回流但值得下一轮注意

- **`npm test` 在脚手架干净克隆上已有 1 条失败**（`starter.test.mjs:59` 的 `/界面加载核验/` 不匹配，1.5.7 既有问题）。已在 PR 描述里如实记录，未在本轮修——它不是 PF-ILD 引入的，修它属于另一个任务范围。
- **演示档案空态覆盖**（L16）：应在下一轮补主体 B 的空态，再考虑是否可提 L2（需第二病种同样病征）。
