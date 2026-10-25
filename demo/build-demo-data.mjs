/* 小呼宝 BreathPal · PF-ILD 演示数据生成器（唯一数据源）
   产出：demo/demo-data.sqlite（可 SQL 查询）+ prototypes/v0.2/demo-data.js（原型只读数据层）
   原则：全部患者数据为虚构模拟；trials 表为真实登记摘录（登记状态未核实，以登记页为准）。
   运行：node demo/build-demo-data.mjs  —— 改数据只改这里，两个产物一起重生成。

   本病种口径（与肿瘤仓的差别，改前必读）：
   - R2 非肿瘤慢性病形态：**无分期、无肿瘤标志物、无放化疗线**；主线是「功能趋势 + 不可逆窗口决策」。
   - 核心指标 = 肺功能（FVC%pred / DLCO%pred），**按 3 个月节奏**（惯例推定，B 级）；
     影像（HRCT）**按需不加密**。
   - 量表（mMRC / King-ILD）是**分类**指标：dec=null 且 kind∈{grade,qual}，**不进趋势折线**（只画点/档位文字）。
   - 治疗线用 32 号折叠卡：pathway[].detail 固定五块（方案/指标和趋势/影像发现/副作用总结/支持与效果）。
   - 医学口径：PPF 判定、急性加重诊断、移植适应证均为**医生任务**，本仓只存事实与原文。
     来源：国家卫生健康委《86 个罕见病病种诊疗指南（2025 年版）》#69（印刷页 408–411）。

   继承的坑（改前必读）：
   - INSERT 一律写显式列名，禁止位置式 VALUES；
   - 分类指标**不写 unit**（必须缺键）；
   - events / docs / candidates 是**定长数组**：events=[日期,名称]、docs=[id,名称,日期,类型,状态]、
     candidates=[id,名称,值,来源,状态]；
   - 可选字段显式 null，读模型按 === null 分支；空值先挡 null/undefined/'' 再 Number()。
*/
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const P2 = join(ROOT, 'prototypes/v0.2');

const pts = (arr) => arr.map(([d, v, src]) => ({ d, v, src }));

/* 同屏最多 3–4 条线，靠色相区分：肺功能偏蓝、弥散偏青、活动耐量偏绿、氧合偏紫、体重偏棕、肝酶偏金 */
const CAT_COLOR = {
  '肺功能': '#2b6cb0', '弥散功能': '#1f7a8c', '活动耐量': '#2f7d5f',
  '氧合': '#6a55b8', '营养': '#8a6b1f', '安全化验': '#a85724', '血象': '#a03d5c',
  '症状评分': '#8a5a9e',
};
const cat = (c) => ({ cat: c, color: CAT_COLOR[c] });

const KEY_COLOR = {
  fvc: '#2b6cb0', dlco: '#1f7a8c', fev1: '#4a89c8', sixmwt: '#2f7d5f',
  spo2r: '#6a55b8', spo2e: '#8d7ac8', o2flow: '#a08ad4',
  wt: '#8a6b1f', alt: '#a85724', ast: '#c07a45', crp: '#8f5a2a',
  wbc: '#c2687f', hgb: '#a03d5c', kl6: '#7a5ea8',
  mmrc: '#8a5a9e', kingild: '#a87ab8',
};

/* ---------------- 档案 A：纤维化型过敏性肺炎（fHP）进展表型，抗纤维化中，有一次急性加重 ---------------- */
const DA = ['2025-04-18', '2025-07-20', '2025-10-19', '2026-01-18', '2026-04-19', '2026-07-19', '2026-10-18'];
const LA = ['确诊时', '3 个月', '6 个月', '9 个月', '12 个月', '15 个月', '复诊'];
const zipA = (vals) => pts(DA.map((d, i) => [d, vals[i], LA[i]]));

const labsA = () => [
  { key: 'wbc', name: '白细胞', unit: '10⁹/L', dec: 1, band: [3.5, 9.5], note: '不同医院参考区间不合并', ...cat('血象'),
    points: pts([['2025-04-18', 7.2, '确诊时'], ['2025-07-20', 6.4, '3 个月'], ['2026-01-18', 5.8, '9 个月'], ['2026-04-19', 6.1, '12 个月'], ['2026-10-18', 5.9, '复诊']]) },
  { key: 'hgb', name: '血红蛋白', unit: 'g/L', dec: 0, band: [115, 150], note: '女性参考区间与男性不同', ...cat('血象'),
    points: pts([['2025-04-18', 132, '确诊时'], ['2025-10-19', 128, '6 个月'], ['2026-04-19', 124, '12 个月'], ['2026-10-18', 127, '复诊']]) },
  { key: 'alt', name: 'ALT', unit: 'U/L', dec: 0, band: null, refLow: null, refHigh: 40, note: '抗纤维化治疗期间定期复查；上限取本院化验单参考上限', ...cat('安全化验'),
    points: pts([['2025-04-18', 21, '确诊时'], ['2025-05-20', 34, '起始后 1 个月'], ['2025-07-20', 41, '3 个月'], ['2025-10-19', 33, '6 个月'], ['2026-01-18', 28, '9 个月'], ['2026-04-19', 26, '12 个月'], ['2026-07-19', 24, '15 个月'], ['2026-10-18', 25, '复诊']]) },
  { key: 'ast', name: 'AST', unit: 'U/L', dec: 0, band: null, refLow: null, refHigh: 35, note: '同上', ...cat('安全化验'),
    points: pts([['2025-04-18', 19, '确诊时'], ['2025-05-20', 28, '起始后 1 个月'], ['2025-07-20', 34, '3 个月'], ['2025-10-19', 27, '6 个月'], ['2026-01-18', 24, '9 个月'], ['2026-04-19', 22, '12 个月'], ['2026-07-19', 21, '15 个月'], ['2026-10-18', 22, '复诊']]) },
  { key: 'crp', name: 'C 反应蛋白', unit: 'mg/L', dec: 1, band: [0, 8], note: '单次升高不等于感染或加重', ...cat('安全化验'),
    points: pts([['2025-04-18', 6.8, '确诊时'], ['2025-10-19', 4.2, '6 个月'], ['2026-01-18', 12.6, '加重住院'], ['2026-04-19', 3.4, '12 个月'], ['2026-10-18', 2.9, '复诊']]) },
  { key: 'kl6', name: 'KL-6（涎液化糖链抗原）', unit: 'U/mL', dec: 0, band: null, refLow: null, refHigh: 500, note: '本院参考上限 500；不同医院区间不合并', ...cat('安全化验'),
    points: pts([['2025-04-18', 986, '确诊时'], ['2025-10-19', 812, '6 个月'], ['2026-01-18', 1104, '加重住院'], ['2026-04-19', 704, '12 个月'], ['2026-10-18', 668, '复诊']]) },
];

/* 肺功能：3 个月节奏（惯例推定 B 级）；FVC%pred 与 DLCO%pred 是主线 */
const pftA = [
  { key: 'fvc', name: 'FVC %pred', unit: '%', dec: 0, band: null, note: '用力肺活量占预计值百分比；变化需结合临床与影像判读', ...cat('肺功能'),
    points: pts([['2025-04-18', 78, '确诊时'], ['2025-07-20', 74, '3 个月'], ['2025-10-19', 71, '6 个月'], ['2026-01-18', 62, '急性加重住院'], ['2026-04-19', 66, '12 个月'], ['2026-07-19', 64, '15 个月'], ['2026-10-18', 63, '复诊']]) },
  { key: 'dlco', name: 'DLCO %pred', unit: '%', dec: 0, band: null, note: '一氧化碳弥散量占预计值百分比；与 FVC 一起看', ...cat('弥散功能'),
    points: pts([['2025-04-18', 62, '确诊时'], ['2025-07-20', 58, '3 个月'], ['2025-10-19', 55, '6 个月'], ['2026-01-18', 46, '急性加重住院'], ['2026-04-19', 51, '12 个月'], ['2026-07-19', 49, '15 个月'], ['2026-10-18', 48, '复诊']]) },
  { key: 'fev1', name: 'FEV1 %pred', unit: '%', dec: 0, band: null, note: '用于评估气流受限', ...cat('肺功能'),
    points: pts([['2025-04-18', 80, '确诊时'], ['2025-10-19', 74, '6 个月'], ['2026-01-18', 65, '急性加重住院'], ['2026-04-19', 70, '12 个月'], ['2026-10-18', 68, '复诊']]) },
  { key: 'sixmwt', name: '6 分钟步行距离', unit: 'm', dec: 0, band: null, note: '活动耐量；测试条件不同不合并', ...cat('活动耐量'),
    points: pts([['2025-04-18', 430, '确诊时'], ['2025-10-19', 388, '6 个月'], ['2026-04-19', 356, '12 个月'], ['2026-10-18', 342, '复诊']]) },
  { key: 'spo2r', name: '静息 SpO₂', unit: '%', dec: 0, band: null, note: '自录值；测量条件以记录为准', ...cat('氧合'),
    points: pts([['2025-04-18', 96, '确诊时'], ['2025-10-19', 95, '6 个月'], ['2026-04-19', 94, '12 个月'], ['2026-10-18', 94, '复诊']]) },
  { key: 'spo2e', name: '活动后 SpO₂', unit: '%', dec: 0, band: null, note: '6MWT 结束时自录；下降幅度需结合测试条件看', ...cat('氧合'),
    points: pts([['2025-04-18', 92, '确诊时'], ['2025-10-19', 89, '6 个月'], ['2026-01-18', 85, '急性加重住院'], ['2026-04-19', 87, '12 个月'], ['2026-10-18', 86, '复诊']]) },
  { key: 'o2flow', name: '活动时氧流量', unit: 'L/min', dec: 1, band: null, note: '仅记录实际使用值，不含指征判断', ...cat('氧合'),
    points: pts([['2026-01-18', 2, '出院带氧'], ['2026-04-19', 2, '12 个月'], ['2026-07-19', 2, '15 个月'], ['2026-10-18', 3, '复诊']]) },
  { key: 'wt', name: '体重', unit: 'kg', dec: 1, band: null, note: '持续下降需在就诊时提出', ...cat('营养'),
    points: pts([['2025-04-18', 61.8, '确诊时'], ['2025-10-19', 59.4, '6 个月'], ['2026-01-18', 57.2, '急性加重住院'], ['2026-04-19', 56.4, '12 个月'], ['2026-10-18', 55.2, '复诊']]) },
  { key: 'mmrc', name: 'mMRC 气促分级', dec: null, kind: 'grade', band: null, note: '本人自述档位（0–4 级），非服务端计算；不进趋势折线', ...cat('症状评分'),
    points: pts([['2025-04-18', '1 级', '确诊时'], ['2025-10-19', '2 级', '6 个月'], ['2026-01-18', '3 级', '急性加重住院'], ['2026-04-19', '2 级', '12 个月'], ['2026-10-18', '2 级', '复诊']]) },
  { key: 'kingild', name: "King's ILD 生活质量（自评）", dec: null, kind: 'qual', band: null, note: '本人自述感受，不做量表评分与分级', ...cat('症状评分'),
    points: pts([['2025-07-20', '尚可，爬楼会喘', '自述'], ['2026-01-18', '很难受，走几步就喘', '自述'], ['2026-10-18', '还行，比住院时好', '自述']]) },
];

/* ---------------- 档案 B：类风湿关节炎相关 ILD（RA-ILD），确诊较晚，评估移植 ---------------- */
const DB = ['2025-09-12', '2025-12-14', '2026-03-15', '2026-06-14', '2026-09-13'];
const LB = ['确诊时', '3 个月', '6 个月', '9 个月', '复诊'];
const zipB = (vals) => pts(DB.map((d, i) => [d, vals[i], LB[i]]));

const labsB = () => [
  { key: 'wbc', name: '白细胞', unit: '10⁹/L', dec: 1, band: [3.5, 9.5], note: '免疫抑制治疗期间定期复查', ...cat('血象'),
    points: pts([['2025-09-12', 6.8, '确诊时'], ['2026-03-15', 5.2, '6 个月'], ['2026-09-13', 5.6, '复诊']]) },
  { key: 'hgb', name: '血红蛋白', unit: 'g/L', dec: 0, band: [130, 175], note: '男性参考区间', ...cat('血象'),
    points: pts([['2025-09-12', 141, '确诊时'], ['2026-03-15', 132, '6 个月'], ['2026-09-13', 129, '复诊']]) },
  { key: 'alt', name: 'ALT', unit: 'U/L', dec: 0, band: null, refLow: null, refHigh: 40, note: '上限取本院化验单参考上限', ...cat('安全化验'),
    points: pts([['2025-09-12', 26, '确诊时'], ['2025-10-12', 44, '起始后 1 个月'], ['2025-12-14', 52, '3 个月'], ['2026-03-15', 38, '6 个月'], ['2026-06-14', 31, '9 个月'], ['2026-09-13', 29, '复诊']]) },
  { key: 'crp', name: 'C 反应蛋白', unit: 'mg/L', dec: 1, band: [0, 8], note: '与关节症状一起看', ...cat('安全化验'),
    points: pts([['2025-09-12', 18.4, '确诊时'], ['2026-03-15', 9.2, '6 个月'], ['2026-09-13', 6.4, '复诊']]) },
];

const pftB = [
  { key: 'fvc', name: 'FVC %pred', unit: '%', dec: 0, band: null, note: '用力肺活量占预计值百分比', ...cat('肺功能'),
    points: pts([['2025-09-12', 68, '确诊时'], ['2025-12-14', 64, '3 个月'], ['2026-03-15', 58, '6 个月'], ['2026-06-14', 54, '9 个月'], ['2026-09-13', 51, '复诊']]) },
  { key: 'dlco', name: 'DLCO %pred', unit: '%', dec: 0, band: null, note: '一氧化碳弥散量占预计值百分比', ...cat('弥散功能'),
    points: pts([['2025-09-12', 52, '确诊时'], ['2026-03-15', 44, '6 个月'], ['2026-09-13', 39, '复诊']]) },
  { key: 'sixmwt', name: '6 分钟步行距离', unit: 'm', dec: 0, band: null, note: '活动耐量；测试条件不同不合并', ...cat('活动耐量'),
    points: pts([['2025-09-12', 372, '确诊时'], ['2026-03-15', 306, '6 个月'], ['2026-09-13', 268, '复诊']]) },
  { key: 'spo2r', name: '静息 SpO₂', unit: '%', dec: 0, band: null, note: '自录值', ...cat('氧合'),
    points: pts([['2025-09-12', 94, '确诊时'], ['2026-03-15', 92, '6 个月'], ['2026-09-13', 91, '复诊']]) },
  { key: 'spo2e', name: '活动后 SpO₂', unit: '%', dec: 0, band: null, note: '6MWT 结束时自录', ...cat('氧合'),
    points: pts([['2025-09-12', 89, '确诊时'], ['2026-03-15', 84, '6 个月'], ['2026-09-13', 82, '复诊']]) },
  { key: 'o2flow', name: '活动时氧流量', unit: 'L/min', dec: 1, band: null, note: '仅记录实际使用值', ...cat('氧合'),
    points: pts([['2026-06-14', 2, '9 个月'], ['2026-09-13', 3, '复诊']]) },
  { key: 'wt', name: '体重', unit: 'kg', dec: 1, band: null, note: '持续下降需在就诊时提出', ...cat('营养'),
    points: pts([['2025-09-12', 74.2, '确诊时'], ['2026-03-15', 70.6, '6 个月'], ['2026-09-13', 67.4, '复诊']]) },
  { key: 'mmrc', name: 'mMRC 气促分级', dec: null, kind: 'grade', band: null, note: '本人自述档位（0–4 级）；不进趋势折线', ...cat('症状评分'),
    points: pts([['2025-09-12', '1 级', '确诊时'], ['2026-03-15', '3 级', '6 个月'], ['2026-09-13', '3 级', '复诊']]) },
];

/* pathways 用 32 号折叠卡五块结构（方案/指标和趋势/影像发现/副作用总结/支持与效果） */
const pathwayA = {
  title: '治疗与事件路径（默认概要，按需展开细节）',
  rows: [
    ['2025-04-18 · 确诊', '纤维化型过敏性肺炎（医生诊断原文）', '本次', '居家霉斑与鸟类接触史，HRCT 见纤维化改变；医生原话记录在诊断追溯页'],
    ['2025-05-06 · 起始抗纤维化', '尼达尼布 150 mg 每日两次', '本次', '医生原话：「先按标准剂量开始，一个月后复查肝功能」'],
    ['2025-07-20 · 剂量调整', '减为 100 mg 每日两次', '本次', '腹泻明显，医生原话：「先减量，等症状缓解再评估」'],
    ['2026-01-18 · 急性加重住院', '住院 9 天，出院带氧 2 L/min', '本次', '短期内呼吸困难明显加重；出院医嘱原文记录在事件卡'],
    ['2026-10-18 · 复诊评估', '维持 100 mg 每日两次 + 长期氧疗', '本次', '医生提到「可以考虑转诊做移植评估」'],
  ],
  detail: {
    方案: { summary: '抗纤维化 + 氧疗 + 肺康复（原文摘录）', items: [['尼达尼布', '100 mg 每日两次（2025-07-20 起减量）'], ['氧疗', '活动时 2–3 L/min（2026-01 出院起）'], ['肺康复', '门诊肺康复每周 2 次（2025-08 起）']] },
    指标和趋势: { summary: 'FVC%pred 78→63、DLCO%pred 62→48（21 个月）', items: [['FVC %pred', '78（2025-04）→ 63（2026-10）'], ['DLCO %pred', '62（2025-04）→ 48（2026-10）'], ['6MWD', '430 m → 342 m']] },
    影像发现: { summary: 'HRCT 报告结论原文（不判读）', items: [['2026-10-18', '报告原文摘录：双下肺纤维化改变较前相仿，未见新发实变'], ['2026-01-16', '报告原文摘录：双肺新发磨玻璃影伴牵拉性支气管扩张']] },
    副作用总结: { summary: '腹泻（原样记录，等级按医生记录）', items: [['2025-07', '腹泻，医生记录后减量'], ['2026-03', '食欲差，自述记录']] },
    支持与效果: { summary: '只记患者原话，不评疗效', items: [['2026-01', '「住院那几天最难受，走两步就喘」'], ['2026-10', '「现在能慢慢走到小区门口了」']] },
  },
};

const pathwayB = {
  title: '治疗与事件路径（默认概要，按需展开细节）',
  rows: [
    ['2025-09-12 · 确诊', '类风湿关节炎相关间质性肺病（医生诊断原文）', '本次', '先有手关节症状数年，因气促查 HRCT 发现纤维化'],
    ['2025-10-08 · 起始免疫抑制', '泼尼松 + 甲氨蝶呤', '本次', '医生原话：「先把关节和肺的炎症一起控制」'],
    ['2026-03-15 · 加抗纤维化', '尼达尼布 150 mg 每日两次', '本次', 'FVC 持续下降，医生原话：「加上抗纤维化，注意腹泻和肝功」'],
    ['2026-06-14 · 剂量调整', '减为 100 mg 每日两次', '本次', '腹泻与食欲下降'],
    ['2026-09-13 · 复诊评估', '维持治疗 + 转诊移植评估', '本次', '医生原话：「按现在的下降速度，建议去移植中心评估」'],
  ],
  detail: {
    方案: { summary: '免疫抑制 + 抗纤维化 + 氧疗（原文摘录）', items: [['泼尼松', '剂量变更记录见用药页'], ['甲氨蝶呤', '按医嘱维持'], ['尼达尼布', '100 mg 每日两次（2026-06-14 起减量）'], ['氧疗', '活动时 2–3 L/min']] },
    指标和趋势: { summary: 'FVC%pred 68→51、DLCO%pred 52→39（12 个月）', items: [['FVC %pred', '68（2025-09）→ 51（2026-09）'], ['DLCO %pred', '52（2025-09）→ 39（2026-09）'], ['6MWD', '372 m → 268 m']] },
    影像发现: { summary: 'HRCT 报告结论原文（不判读）', items: [['2026-09-10', '报告原文摘录：双下肺网格影与牵拉性支气管扩张较前进展'], ['2025-09-08', '报告原文摘录：双下肺胸膜下网格影，考虑纤维化']] },
    副作用总结: { summary: '腹泻、食欲下降、关节症状（原样记录）', items: [['2026-06', '腹泻，医生记录后减量'], ['2026-08', '食欲下降，自述记录']] },
    支持与效果: { summary: '只记患者原话，不评疗效', items: [['2026-03', '「爬三楼要歇两次」'], ['2026-09', '「吃饭没胃口，人也瘦了」']] },
  },
};

const DATA = {
  profiles: {
    A: {
      name: '王秀兰', sex: '女', age: 62, meta: '纤维化型过敏性肺炎（fHP）进展表型 · 退休教师',
      headline: '纤维化型过敏性肺炎进展表型，2025-04 确诊，抗纤维化治疗中，2026-01 因急性加重住院一次',
      etiology: '纤维化型过敏性肺炎（医生诊断原文）', mindset: '最担心「走两步就喘」，想把每天的变化记下来，复诊时能说清楚',
      dash_keys: ['fvc', 'dlco', 'spo2e', 'wt'],
      path: ['fHP', '进展表型', '抗纤维化', '长期氧疗'],
      activity: '每天上午在小区慢走 15 分钟；喘得厉害那天改在室内活动',
      familyTalk: '和女儿说好：复诊报告一起看；出院带氧的事不再一个人扛',
      diagnosis: {
        title: '诊断追溯（起病 → 确诊时间线，只拼接不判定）',
        rows: [
          ['2024-06', '开始干咳、爬楼气促', '本人回忆（未找到当时就诊记录）'],
          ['2024-11', '社区卫生中心按「支气管炎」处理', '本人回忆；处方未找到'],
          ['2025-02', '转呼吸科，查胸部 CT', '报告已归档'],
          ['2025-04-18', 'HRCT + 肺功能后确诊', '医生诊断原文：「纤维化型过敏性肺炎，考虑与居家霉斑和鸟类接触有关」'],
          ['2025-04-18', '医生建议脱离致敏环境', '医嘱原文记录在用药页'],
        ],
        gaps: [['2024-06 至 2025-02 的就诊记录', '未找到；本人回忆可能有遗漏'], ['当时是否被给过其他诊断', '本人回忆「说过是支气管炎」，无书面记录']],
      },
      pft: {
        title: '肺功能检查（3 个月节奏；数值在趋势页）',
        rows: [
          ['2026-10-18', '本院肺功能室', '未用支气管舒张剂', 'FVC 63%pred / DLCO 48%pred / FEV1 68%pred', '报告已归档', '本次'],
          ['2026-07-19', '本院肺功能室', '未用支气管舒张剂', 'FVC 64%pred / DLCO 49%pred', '报告已归档', '15 个月'],
          ['2026-04-19', '本院肺功能室', '未用支气管舒张剂', 'FVC 66%pred / DLCO 51%pred', '报告已归档', '12 个月'],
          ['2026-01-18', '本院（住院）', '—', 'FVC 62%pred / DLCO 46%pred', '报告已归档', '急性加重住院期间'],
          ['2025-07-20', '本院肺功能室', '未用支气管舒张剂', 'FVC 74%pred / DLCO 58%pred', '报告已归档', '3 个月'],
          ['2025-04-18', '本院肺功能室', '未用支气管舒张剂', 'FVC 78%pred / DLCO 62%pred', '报告已归档', '确诊基线'],
        ],
      },
      oxygen: {
        title: '氧疗记录（只记实际使用，不含指征判断）',
        rows: [
          ['2026-10-18', '活动时', '3 L/min', '复诊时医生看了记录', 1],
          ['2026-07-19', '活动时', '2 L/min', '—', 1],
          ['2026-04-19', '活动时', '2 L/min', '—', 1],
          ['2026-01-27', '出院带氧', '2 L/min', '出院医嘱原文：「活动时吸氧，静息不吸；复查血氧后调整」', 1],
        ],
      },
      ae: {
        title: '急性加重事件（自然病程事件，仅记录不诊断）',
        rows: [
          ['2026-01-16', '2026-01-25', '住院 9 天', '受凉后 3 天内气促明显加重，走路即喘', '出院带药与氧疗处方见事件卡', '2026-01-27', '医生记录原文：「短期内呼吸困难明显加重」；具体判定以病历为准'],
        ],
      },
      med: {
        title: '用药与耐受记录（原样文本，不推荐调整）',
        rows: [
          ['尼达尼布', '胶囊', '2025-05-06', '2025-07-20', '150 mg 每日两次（起始剂量）', '医生原话：「先按标准剂量开始，一个月后复查肝功能」', '—', 0],
          ['尼达尼布', '胶囊', '2025-07-20', null, '100 mg 每日两次（减量后）', '腹泻明显，医生原话：「先减量，等症状缓解再评估」', '腹泻（医生记录）', 1],
          ['泼尼松', '片剂', '2025-04-25', null, '按医嘱逐渐减量（具体剂量见处方原文）', '医生原话：「激素先用一段，慢慢减」', '—', 0],
          ['乙酰半胱氨酸', '泡腾片', '2025-05-06', null, '每日 2 次（按说明书剂量）', '自述「帮助咳痰」', '—', 1],
        ],
      },
      imaging: {
        title: '影像档案（HRCT，结论原文摘录，不判读）',
        rows: [
          ['2026-10-18', 'HRCT', '报告原文摘录：双下肺纤维化改变较前相仿，未见新发实变', '报告已归档', '复诊'],
          ['2026-01-16', 'HRCT', '报告原文摘录：双肺新发磨玻璃影伴牵拉性支气管扩张，较 2025-10 进展', '报告已归档', '急性加重住院'],
          ['2025-10-19', 'HRCT', '报告原文摘录：双下肺胸膜下网格影，牵拉性支气管扩张', '报告已归档', '6 个月'],
          ['2025-04-18', 'HRCT', '报告原文摘录：双下肺胸膜下网格影与蜂窝样改变，考虑纤维化', '报告已归档', '确诊基线'],
        ],
      },
      transplant: {
        title: '移植评估信息自检（只列要问的，不给资格结论）',
        rows: [
          ['转诊/评估相关沟通记录', '最近一次医生提到评估的时间与原话', 1, '2026-10-18', '医生原话：「按现在的情况，可以考虑转诊做移植评估」'],
          ['肺功能系列报告', '至少近一年内的多次肺功能（含 FVC、DLCO）', 1, '2026-10-18', '本院系统可调；纸质件已归档'],
          ['HRCT 影像与报告', '最近一次与基线影像', 1, '2026-10-18', '胶片与报告均在'],
          ['6 分钟步行试验记录', '含血氧变化', 1, '2026-10-18', '—'],
          ['血气分析（如做过）', '最近一次', 0, null, '未做过；下次复诊可以问是否需要'],
          ['用药清单与剂量变更史', '含抗纤维化与激素', 1, '2026-10-18', '本页可导出'],
          ['并发症筛查记录', '胃食管反流 / 肺动脉高压 / 睡眠呼吸暂停等', 0, null, '未系统筛查过；下次可以问'],
          ['移植中心挂号的流程与材料要求', '要带什么、怎么挂', 0, null, '未了解；列为下次要问的第一条'],
        ],
      },
      nutrition: {
        title: '营养与日常功能（按自述，不做热量换算、不做肌少症判定）',
        rows: [
          ['2026-10-17', '午餐', '约半碗饭 + 少量菜', '少', '吃几口就喘', '自述频率：最近半个月经常这样'],
          ['2026-10-16', '早餐', '粥 + 鸡蛋', '中', '无', '—'],
          ['2026-09-20', '晚餐', '面条小半碗', '少', '饭后腹胀', '—'],
          ['2026-08-15', '午餐', '米饭 + 鱼', '中', '无', '—'],
        ],
      },
      rhythm: [
        ['呼吸科门诊', '每 3 个月', '医生安排', '2027-01 上旬'],
        ['肺功能（FVC/DLCO）', '每 3 个月', '医生安排', '2027-01 上旬'],
        ['HRCT', '按医生安排（近期约 6 个月）', '医生安排', '2027-04 前后'],
        ['肝功能（ALT/AST）', '抗纤维化治疗期间定期', '医生安排', '2027-01 上旬'],
        ['6 分钟步行试验', '每次肺功能同期', '医生安排', '2027-01 上旬'],
      ],
      events: [
        ['2024-06', '开始干咳、活动后气促'],
        ['2025-04-18', '确诊（纤维化型过敏性肺炎）'],
        ['2025-05-06', '开始抗纤维化治疗'],
        ['2025-07-20', '因腹泻减量'],
        ['2026-01-16', '急性加重住院'],
        ['2026-01-27', '出院，开始活动时氧疗'],
        ['2026-10-18', '复诊，医生提到移植评估'],
      ],
      viewpoints: [
        ['2025-06-10', '有点烦', '吃药以后老跑厕所，出门要先找卫生间'],
        ['2026-01-20', '害怕', '住院那几天最难受，走两步就喘'],
        ['2026-10-18', '还行', '现在能慢慢走到小区门口了'],
      ],
      docs: [
        ['A-D1', 'HRCT 报告 2025-04-18.pdf', '2025-04-18', '影像报告', '已解析'],
        ['A-D2', '肺功能报告 2025-04-18.pdf', '2025-04-18', '检查报告', '已解析'],
        ['A-D3', '出院记录 2026-01-25.pdf', '2026-01-25', '住院记录', '已解析'],
        ['A-D4', '肺功能报告 2026-10-18.pdf', '2026-10-18', '检查报告', '已解析'],
        ['A-D5', '肝功能 2026-10-18.jpg', '2026-10-18', '化验单', '待核对'],
        ['A-D6', 'HRCT 报告 2026-10-18.pdf', '2026-10-18', '影像报告', '已解析'],
      ],
      candidates: [
        ['A-C1', 'FVC %pred', '63', '肺功能报告 2026-10-18', '待确认'],
        ['A-C2', 'DLCO %pred', '48', '肺功能报告 2026-10-18', '待确认'],
        ['A-C3', '体重', '55.2', '门诊记录 2026-10-18', '已接受'],
      ],
      metrics: [...pftA],
      pathway: pathwayA,
    },
    B: {
      name: '李建国', sex: '男', age: 67, meta: '类风湿关节炎相关间质性肺病（RA-ILD） · 退休工人',
      headline: '类风湿关节炎相关间质性肺病，2025-09 确诊，免疫抑制 + 抗纤维化治疗中，医生建议转诊移植评估',
      etiology: '类风湿关节炎相关间质性肺病（医生诊断原文）', mindset: '最担心「肺功能一直往下掉」，想知道移植评估到底要准备什么',
      dash_keys: ['fvc', 'dlco', 'sixmwt', 'wt'],
      path: ['RA-ILD', '进展表型', '免疫抑制 + 抗纤维化', '移植评估中'],
      activity: '在家做呼吸操；出门买菜走 300 米要歇一次',
      familyTalk: '和老伴说好：移植评估的事一起了解，不瞒着孩子',
      diagnosis: {
        title: '诊断追溯（起病 → 确诊时间线，只拼接不判定）',
        rows: [
          ['2019', '双手关节晨僵、肿痛，诊断类风湿关节炎', '本人回忆；早年病历未找到'],
          ['2024-09', '开始活动后气促，按「年纪大了」解释', '本人回忆'],
          ['2025-06', '气促加重，呼吸科查 HRCT', '报告已归档'],
          ['2025-09-12', '确诊类风湿关节炎相关间质性肺病', '医生诊断原文：「结合手关节病史与 HRCT 表现，考虑 RA 相关 ILD」'],
        ],
        gaps: [['2019–2024 的关节治疗记录', '未找到；本人回忆可能有遗漏'], ['2024-09 至 2025-06 是否被给过其他诊断', '本人回忆「当时没说要查肺」，无书面记录']],
      },
      pft: {
        title: '肺功能检查（3 个月节奏；数值在趋势页）',
        rows: [
          ['2026-09-13', '本院肺功能室', '未用支气管舒张剂', 'FVC 51%pred / DLCO 39%pred', '报告已归档', '本次'],
          ['2026-06-14', '本院肺功能室', '未用支气管舒张剂', 'FVC 54%pred', '报告已归档', '9 个月'],
          ['2026-03-15', '本院肺功能室', '未用支气管舒张剂', 'FVC 58%pred / DLCO 44%pred', '报告已归档', '6 个月'],
          ['2025-12-14', '本院肺功能室', '未用支气管舒张剂', 'FVC 64%pred', '报告已归档', '3 个月'],
          ['2025-09-12', '本院肺功能室', '未用支气管舒张剂', 'FVC 68%pred / DLCO 52%pred', '报告已归档', '确诊基线'],
        ],
      },
      oxygen: {
        title: '氧疗记录（只记实际使用，不含指征判断）',
        rows: [
          ['2026-09-13', '活动时', '3 L/min', '复诊时医生看了记录', 1],
          ['2026-06-14', '活动时', '2 L/min', '—', 1],
        ],
      },
      ae: { title: '急性加重事件（自然病程事件，仅记录不诊断）', rows: [] },
      med: {
        title: '用药与耐受记录（原样文本，不推荐调整）',
        rows: [
          ['尼达尼布', '胶囊', '2026-03-15', '2026-06-14', '150 mg 每日两次（起始剂量）', '医生原话：「加上抗纤维化，注意腹泻和肝功」', '—', 0],
          ['尼达尼布', '胶囊', '2026-06-14', null, '100 mg 每日两次（减量后）', '腹泻与食欲下降，医生原话：「先减量，观察两周」', '腹泻、食欲下降（医生记录）', 1],
          ['泼尼松', '片剂', '2025-10-08', null, '按医嘱逐渐减量（具体剂量见处方原文）', '医生原话：「激素慢慢减，别自己停」', '—', 0],
          ['甲氨蝶呤', '片剂', '2025-10-08', null, '每周一次（按医嘱剂量）', '医生原话：「关节和肺的炎症一起控制」', '—', 1],
        ],
      },
      imaging: {
        title: '影像档案（HRCT，结论原文摘录，不判读）',
        rows: [
          ['2026-09-10', 'HRCT', '报告原文摘录：双下肺网格影与牵拉性支气管扩张较前进展', '报告已归档', '复诊'],
          ['2026-03-12', 'HRCT', '报告原文摘录：双下肺胸膜下网格影较前相仿', '报告已归档', '6 个月'],
          ['2025-09-08', 'HRCT', '报告原文摘录：双下肺胸膜下网格影，考虑纤维化', '报告已归档', '确诊基线'],
        ],
      },
      transplant: {
        title: '移植评估信息自检（只列要问的，不给资格结论）',
        rows: [
          ['转诊/评估相关沟通记录', '最近一次医生提到评估的时间与原话', 1, '2026-09-13', '医生原话：「按现在的下降速度，建议去移植中心评估」'],
          ['肺功能系列报告', '至少近一年内的多次肺功能（含 FVC、DLCO）', 1, '2026-09-13', '本院系统可调'],
          ['HRCT 影像与报告', '最近一次与基线影像', 1, '2026-09-10', '胶片与报告均在'],
          ['6 分钟步行试验记录', '含血氧变化', 1, '2026-09-13', '—'],
          ['血气分析', '最近一次', 0, null, '未做过；下次复诊可以问'],
          ['用药清单与剂量变更史', '含抗纤维化与免疫抑制', 1, '2026-09-13', '本页可导出'],
          ['并发症筛查记录', '胃食管反流 / 肺动脉高压 / 睡眠呼吸暂停等', 0, null, '未系统筛查过'],
          ['移植中心挂号的流程与材料要求', '要带什么、怎么挂', 0, null, '未了解；列为下次要问的第一条'],
          ['家属沟通与陪护安排', '谁陪同、住院期间怎么安排', 0, null, '还没和家人细谈；先记下来'],
        ],
      },
      nutrition: {
        title: '营养与日常功能（按自述，不做热量换算、不做肌少症判定）',
        rows: [
          ['2026-09-12', '晚餐', '半碗饭 + 少量菜', '少', '没胃口', '自述频率：近一个月多数时候吃不多'],
          ['2026-09-11', '早餐', '牛奶 + 半个馒头', '中', '无', '—'],
          ['2026-08-20', '午餐', '面条一碗', '中', '无', '—'],
        ],
      },
      rhythm: [
        ['风湿免疫科 + 呼吸科联合门诊', '每 3 个月', '医生安排', '2026-12 上旬'],
        ['肺功能（FVC/DLCO）', '每 3 个月', '医生安排', '2026-12 上旬'],
        ['HRCT', '按医生安排（约 6 个月）', '医生安排', '2027-03 前后'],
        ['肝功能（ALT/AST）', '抗纤维化 + 免疫抑制期间定期', '医生安排', '2026-12 上旬'],
        ['移植中心评估', '医生建议尽快了解', '医生建议', '待预约'],
      ],
      events: [
        ['2019', '诊断类风湿关节炎'],
        ['2024-09', '开始活动后气促'],
        ['2025-09-12', '确诊类风湿关节炎相关间质性肺病'],
        ['2025-10-08', '开始免疫抑制治疗'],
        ['2026-03-15', '加用抗纤维化治疗'],
        ['2026-06-14', '因腹泻与食欲下降减量'],
        ['2026-09-13', '复诊，医生建议转诊移植评估'],
      ],
      viewpoints: [
        ['2026-03-20', '有点烦', '爬三楼要歇两次，以前不这样'],
        ['2026-06-20', '还行', '减量以后肚子舒服一些'],
        ['2026-09-13', '担心', '医生说要去移植中心，心里没底'],
      ],
      docs: [
        ['B-D1', 'HRCT 报告 2025-09-08.pdf', '2025-09-08', '影像报告', '已解析'],
        ['B-D2', '肺功能报告 2025-09-12.pdf', '2025-09-12', '检查报告', '已解析'],
        ['B-D3', '门诊病历 2026-09-13.pdf', '2026-09-13', '门诊记录', '已解析'],
        ['B-D4', '肺功能报告 2026-09-13.pdf', '2026-09-13', '检查报告', '已解析'],
        ['B-D5', '血生化 2026-09-13.jpg', '2026-09-13', '化验单', '待核对'],
      ],
      candidates: [
        ['B-C1', 'FVC %pred', '51', '肺功能报告 2026-09-13', '待确认'],
        ['B-C2', 'DLCO %pred', '39', '肺功能报告 2026-09-13', '待确认'],
      ],
      metrics: [...pftB],
      pathway: pathwayB,
    },
  },
  trials: [
    {
      id: 'CTR20213153', title: 'BMS-986278 治疗肺纤维化的疗效与安全性的 2 期研究',
      phase: '2 期', status: '进行中 · 招募完成', sponsor: 'Bristol-Myers Squibb',
      topic: '抗纤维化（LPA1 拮抗剂）', last_verified: '2026-10-25',
      url: 'https://www.chinadrugtrials.org.cn/',
      sourceChannel: 'chinadrugtrials',
    },
    {
      id: 'NCT05606939', title: 'Progressive Fibrosing Interstitial Lung Disease Registry（登记研究）',
      phase: '观察性', status: '招募中', sponsor: '待核对登记页',
      topic: '进展性纤维化性间质性肺疾病自然史', last_verified: '2026-10-25',
      url: 'https://clinicaltrials.gov/study/NCT05606939',
      sourceChannel: 'ctv',
    },
  ],
  /* 入组/排除条目（原文摘录，逐条标"本地能否判定"）。
     decidable=0 一律进"待确认"，**不进三档** —— 本地没有结构化字段时不许猜。
     真实登记页的标准更长，本仓只收录能落到档案字段上的几条，且注明来源。 */
  trialCriteria: [
    /* --- CTR20213153 --- */
    { trial: 'CTR20213153', kind: 'inclusion', category: 'diagnosis',
      text: '确诊为进展性纤维化性间质性肺疾病（PF-ILD）', decidable: 1, fact_key: 'diagnosis_text',
      source_note: '登记页入组标准；本地取诊断原文对照' },
    { trial: 'CTR20213153', kind: 'inclusion', category: 'imaging',
      text: ' HRCT 显示纤维化改变（蜂窝影/牵拉性支气管扩张等）', decidable: 1, fact_key: 'hrct_pattern',
      source_note: '本地取影像结论原文对照' },
    { trial: 'CTR20213153', kind: 'inclusion', category: 'pft',
      text: 'FVC %pred 不低于 45%（具体阈值以登记页为准）', decidable: 0, fact_key: 'fvc_pred',
      source_note: '**需要阈值比较，本仓 schema 未存比较符 → 进待确认，不猜**' },
    { trial: 'CTR20213153', kind: 'exclusion', category: 'diagnosis',
      text: '排除特发性肺纤维化（IPF）明确诊断者', decidable: 1, fact_key: 'ipf_excluded',
      source_note: '本地取诊断原文是否写明 IPF' },
    { trial: 'CTR20213153', kind: 'exclusion', category: 'medication',
      text: '排除正在使用其他抗纤维化药物者（以登记页为准）', decidable: 1, fact_key: 'antifibrotic_current',
      source_note: '本地取当前用药记录' },
    { trial: 'CTR20213153', kind: 'exclusion', category: 'organ',
      text: '排除中重度肝功能异常者', decidable: 0, fact_key: null,
      source_note: '阈值未公开 → 待确认' },
    /* --- NCT05606939 --- */
    { trial: 'NCT05606939', kind: 'inclusion', category: 'diagnosis',
      text: '试验要求：已有医生记录的 ILD 诊断，且符合进展性纤维化表型', decidable: 1, fact_key: 'diagnosis_text' },
    { trial: 'NCT05606939', kind: 'inclusion', category: 'pathology',
      text: '有 HRCT 或肺活检病理资料可供复核', decidable: 1, fact_key: 'pathology_available' },
    { trial: 'NCT05606939', kind: 'inclusion', category: 'genetics',
      text: '提供遗传/家族史信息（如已知的端粒酶或表面活性物质相关基因变异）', decidable: 0, fact_key: 'genetic_variant',
      source_note: '本仓未建立基因检测结构化字段 → 待确认；**这也是该病确实需要病理/基因建档的证据**' },
    { trial: 'NCT05606939', kind: 'exclusion', category: 'other',
      text: '排除无法完成随访者', decidable: 0, fact_key: null },
  ],
};

/* ---------------- 组装（中间量必须解构掉：多一个键，读模型 parity 就红） ---------------- */
function assemble(P, labs) {
  const { name, sex, age, meta, headline, etiology, mindset, dash_keys, path, activity, familyTalk,
    diagnosis, pft, oxygen, ae, med, imaging, transplant, nutrition, rhythm, events, viewpoints,
    docs, candidates, metrics, pathway } = P;
  return {
    name, sex, age, meta, headline, etiology, mindset, dash_keys, path, activity, familyTalk,
    diagnosis, pft, oxygen, ae, med, imaging, transplant, nutrition, rhythm,
    events: events.map(([d, label]) => [d, label]),
    viewpoints, docs, candidates,
    metrics: [...metrics, ...labs()],
    pathway,
  };
}

const DEMO = {
  profiles: { A: assemble(DATA.profiles.A, labsA), B: assemble(DATA.profiles.B, labsB) },
  trials: DATA.trials,
  trialCriteria: DATA.trialCriteria,
};

/* ---------------- SQLite（显式列名，禁位置式 INSERT） ---------------- */
function buildTables(db) {
  db.exec(`
DROP TABLE IF EXISTS metric_definitions; DROP TABLE IF EXISTS metric_points;
DROP TABLE IF EXISTS section_titles; DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS pft_records; DROP TABLE IF EXISTS oxygen_records;
DROP TABLE IF EXISTS ae_events; DROP TABLE IF EXISTS med_records;
DROP TABLE IF EXISTS imaging_records; DROP TABLE IF EXISTS transplant_items;
DROP TABLE IF EXISTS nutrition_logs; DROP TABLE IF EXISTS viewpoints;
DROP TABLE IF EXISTS trials; DROP TABLE IF EXISTS trial_criteria; DROP TABLE IF EXISTS patient_facts; DROP TABLE IF EXISTS match_assessments; DROP TABLE IF EXISTS demo_meta;

CREATE TABLE subjects (
  subject_id TEXT PRIMARY KEY, name TEXT NOT NULL, sex TEXT NOT NULL, age INTEGER NOT NULL,
  meta TEXT NOT NULL, headline TEXT NOT NULL, etiology TEXT NOT NULL, mindset TEXT NOT NULL,
  dash_keys TEXT NOT NULL, path TEXT NOT NULL, activity TEXT NOT NULL, family_talk TEXT NOT NULL
);
CREATE TABLE section_titles (
  subject_id TEXT NOT NULL, section TEXT NOT NULL, title TEXT NOT NULL,
  PRIMARY KEY (subject_id, section)
);
CREATE TABLE metric_definitions (
  subject_id TEXT NOT NULL, metric_key TEXT NOT NULL, name TEXT NOT NULL,
  unit TEXT, dec INTEGER, kind TEXT NOT NULL, band_low REAL, band_high REAL,
  ref_low REAL, ref_high REAL, note TEXT NOT NULL, category TEXT NOT NULL, color TEXT NOT NULL,
  in_trend INTEGER NOT NULL,
  PRIMARY KEY (subject_id, metric_key)
);
CREATE TABLE metric_points (
  subject_id TEXT NOT NULL, metric_key TEXT NOT NULL, observed_on TEXT NOT NULL,
  v_num REAL, v_text TEXT, source TEXT NOT NULL,
  PRIMARY KEY (subject_id, metric_key, observed_on)
);
CREATE TABLE pft_records (
  subject_id TEXT NOT NULL, test_date TEXT NOT NULL, place TEXT NOT NULL, bronchodilator TEXT NOT NULL,
  summary TEXT NOT NULL, doc_status TEXT NOT NULL, phase TEXT NOT NULL,
  PRIMARY KEY (subject_id, test_date)
);
CREATE TABLE oxygen_records (
  subject_id TEXT NOT NULL, started_on TEXT NOT NULL, timing TEXT NOT NULL, flow_lpm REAL NOT NULL,
  note TEXT NOT NULL, in_use INTEGER NOT NULL,
  PRIMARY KEY (subject_id, started_on, timing)
);
CREATE TABLE ae_events (
  subject_id TEXT NOT NULL, event_date TEXT NOT NULL, episode_end TEXT, care_setting TEXT NOT NULL,
  trigger_text TEXT NOT NULL, discharge_meds TEXT NOT NULL, review_due TEXT, clinical_note TEXT NOT NULL,
  PRIMARY KEY (subject_id, event_date)
);
CREATE TABLE med_records (
  subject_id TEXT NOT NULL, drug_name TEXT NOT NULL, form TEXT NOT NULL, start_at TEXT NOT NULL,
  changed_at TEXT, dose_text TEXT NOT NULL, reason_text TEXT NOT NULL, adverse_note TEXT NOT NULL,
  in_use INTEGER NOT NULL,
  PRIMARY KEY (subject_id, drug_name, start_at)
);
CREATE TABLE imaging_records (
  subject_id TEXT NOT NULL, study_date TEXT NOT NULL, modality TEXT NOT NULL, desc_text TEXT NOT NULL,
  doc_status TEXT NOT NULL, phase TEXT NOT NULL,
  PRIMARY KEY (subject_id, study_date, modality)
);
CREATE TABLE transplant_items (
  subject_id TEXT NOT NULL, item_key TEXT NOT NULL, item_label TEXT NOT NULL, guidance TEXT NOT NULL,
  has_record INTEGER, last_date TEXT, note TEXT NOT NULL,
  PRIMARY KEY (subject_id, item_key)
);
CREATE TABLE nutrition_logs (
  subject_id TEXT NOT NULL, logged_on TEXT NOT NULL, meal TEXT NOT NULL, intake_text TEXT NOT NULL,
  intake_level TEXT NOT NULL, symptom_note TEXT NOT NULL, note TEXT NOT NULL,
  PRIMARY KEY (subject_id, logged_on, meal)
);
CREATE TABLE viewpoints (
  subject_id TEXT NOT NULL, noted_on TEXT NOT NULL, mood TEXT NOT NULL, text TEXT NOT NULL,
  PRIMARY KEY (subject_id, noted_on)
);
CREATE TABLE trials (
  nct_id TEXT PRIMARY KEY, title TEXT NOT NULL, phase TEXT NOT NULL, status TEXT NOT NULL,
  sponsor TEXT NOT NULL, topic TEXT NOT NULL, last_verified TEXT NOT NULL, url TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0, source_channel TEXT
);
CREATE TABLE trial_criteria (
  id INTEGER PRIMARY KEY, trial_record_id TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL CHECK (kind IN ('inclusion','exclusion')),
  category TEXT NOT NULL, rule_text TEXT NOT NULL,
  decidable INTEGER NOT NULL DEFAULT 0 CHECK (decidable IN (0,1)),
  fact_key TEXT, source_note TEXT
);
CREATE TABLE patient_facts (
  id INTEGER PRIMARY KEY, subject_id TEXT NOT NULL, fact_key TEXT NOT NULL, category TEXT NOT NULL,
  value_text TEXT, value_num REAL, observed_on TEXT, source TEXT,
  evidence TEXT NOT NULL DEFAULT '未核实' CHECK (evidence IN ('A','B','未核实')),
  UNIQUE (subject_id, fact_key)
);
CREATE TABLE match_assessments (
  id INTEGER PRIMARY KEY, subject_id TEXT NOT NULL, profile_revision INTEGER,
  rule_set_version TEXT NOT NULL, generated_at TEXT NOT NULL,
  judgments_json TEXT NOT NULL, note TEXT
);
CREATE TABLE demo_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
`);
}

function writeSqlite() {
  const db = new DatabaseSync(join(ROOT, 'demo/demo-data.sqlite'));
  buildTables(db);
  const insSubject = db.prepare(`INSERT INTO subjects
    (subject_id, name, sex, age, meta, headline, etiology, mindset, dash_keys, path, activity, family_talk)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insTitle = db.prepare('INSERT INTO section_titles (subject_id, section, title) VALUES (?,?,?)');
  const insDef = db.prepare(`INSERT INTO metric_definitions
    (subject_id, metric_key, name, unit, dec, kind, band_low, band_high, ref_low, ref_high, note, category, color, in_trend)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insPt = db.prepare(`INSERT INTO metric_points
    (subject_id, metric_key, observed_on, v_num, v_text, source) VALUES (?,?,?,?,?,?)`);
  const insPft = db.prepare(`INSERT INTO pft_records
    (subject_id, test_date, place, bronchodilator, summary, doc_status, phase) VALUES (?,?,?,?,?,?,?)`);
  const insO2 = db.prepare(`INSERT INTO oxygen_records
    (subject_id, started_on, timing, flow_lpm, note, in_use) VALUES (?,?,?,?,?,?)`);
  const insAe = db.prepare(`INSERT INTO ae_events
    (subject_id, event_date, episode_end, care_setting, trigger_text, discharge_meds, review_due, clinical_note)
    VALUES (?,?,?,?,?,?,?,?)`);
  const insMed = db.prepare(`INSERT INTO med_records
    (subject_id, drug_name, form, start_at, changed_at, dose_text, reason_text, adverse_note, in_use)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const insImg = db.prepare(`INSERT INTO imaging_records
    (subject_id, study_date, modality, desc_text, doc_status, phase) VALUES (?,?,?,?,?,?)`);
  const insTp = db.prepare(`INSERT INTO transplant_items
    (subject_id, item_key, item_label, guidance, has_record, last_date, note) VALUES (?,?,?,?,?,?,?)`);
  const insNp = db.prepare(`INSERT INTO nutrition_logs
    (subject_id, logged_on, meal, intake_text, intake_level, symptom_note, note) VALUES (?,?,?,?,?,?,?)`);
  const insVp = db.prepare('INSERT INTO viewpoints (subject_id, noted_on, mood, text) VALUES (?,?,?,?)');

  for (const [k, p] of Object.entries(DEMO.profiles)) {
    insSubject.run(k, p.name, p.sex, p.age, p.meta, p.headline, p.etiology, p.mindset,
      JSON.stringify(p.dash_keys), JSON.stringify(p.path), p.activity, p.familyTalk);
    insTitle.run(k, 'diagnosis', p.diagnosis.title);
    insTitle.run(k, 'pft', p.pft.title);
    insTitle.run(k, 'oxygen', p.oxygen.title);
    insTitle.run(k, 'ae', p.ae.title);
    insTitle.run(k, 'med', p.med.title);
    insTitle.run(k, 'imaging', p.imaging.title);
    insTitle.run(k, 'transplant', p.transplant.title);
    insTitle.run(k, 'nutrition', p.nutrition.title);
    for (const m of p.metrics) {
      const kind = m.kind || 'numeric';
      const inTrend = m.dec === null ? 0 : 1;
      insDef.run(k, m.key, m.name, m.unit ?? null, m.dec ?? null, kind,
        m.band ? m.band[0] : null, m.band ? m.band[1] : null,
        m.refLow ?? null, m.refHigh ?? null, m.note, m.cat, m.color, inTrend);
      for (const pt of m.points) {
        if (typeof pt.v === 'number') insPt.run(k, m.key, pt.d, pt.v, null, pt.src);
        else insPt.run(k, m.key, pt.d, null, String(pt.v), pt.src);
      }
    }
    p.pft.rows.forEach((r) => insPft.run(k, r[0], r[1], r[2], r[3], r[4], r[5]));
    p.oxygen.rows.forEach((r) => insO2.run(k, r[0], r[1], r[2], r[3], r[4]));
    p.ae.rows.forEach((r) => insAe.run(k, r[0], r[1], r[2], r[3], r[4], r[5], r[6]));
    p.med.rows.forEach((r) => insMed.run(k, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]));
    p.imaging.rows.forEach((r) => insImg.run(k, r[0], r[1], r[2], r[3], r[4]));
    p.transplant.rows.forEach((r, i) => insTp.run(k, 'tp-' + (i + 1), r[0], r[1], r[2], r[3], r[4]));
    p.nutrition.rows.forEach((r) => insNp.run(k, r[0], r[1], r[2], r[3], r[4], r[5]));
    p.viewpoints.forEach((r) => insVp.run(k, r[0], r[1], r[2]));
  }
  const insTrial = db.prepare(`INSERT INTO trials
    (nct_id, title, phase, status, sponsor, topic, last_verified, url, ord, source_channel) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  DEMO.trials.forEach((t, i) => insTrial.run(t.id, t.title, t.phase, t.status, t.sponsor, t.topic, t.last_verified, t.url, i, t.sourceChannel ?? null));

  /* 入组条目：ord 按数组顺序（数据来源顺序，不按可判定性排） */
  const insCrit = db.prepare(`INSERT INTO trial_criteria
    (trial_record_id, ord, kind, category, rule_text, decidable, fact_key, source_note) VALUES (?,?,?,?,?,?,?,?)`);
  DEMO.trialCriteria.forEach((c, i) => insCrit.run(c.trial, i, c.kind, c.category, c.text, c.decidable, c.fact_key ?? null, c.source_note ?? null));

  /* 患者事实（可用于对照的档案字段）：只存档案里**确实有出处**的，
     没有的一律不写 —— 缺字段就是"待确认"，不拿空值冒充。 */
  const insFact = db.prepare(`INSERT INTO patient_facts
    (subject_id, fact_key, category, value_text, value_num, observed_on, source, evidence) VALUES (?,?,?,?,?,?,?,?)`);
  for (const [sid, p] of Object.entries(DEMO.profiles)) {
    const add = (k, cat, v, num, on, src, ev) => insFact.run(sid, k, cat, v, num ?? null, on ?? null, src ?? null, ev ?? 'B');
    add('diagnosis_text', 'diagnosis', p.etiology || p.diagnosis || null, null, null, '诊断原文', 'B');
    add('hrct_pattern', 'imaging', (p.imaging.rows[0] && p.imaging.rows[0][2]) || null, null, p.imaging.rows[0]?.[0] ?? null, '影像结论原文', 'B');
    add('ipf_excluded', 'diagnosis', /IPF|特发性肺纤维化/i.test(p.etiology || '') ? '是（写明 IPF）' : '否（未写明 IPF）', null, null, '诊断原文', 'B');
    add('antifibrotic_current', 'medication',
      (p.med.rows || []).some((r) => /尼达尼布|吡非尼酮/.test(String(r[1])) && !/已停/.test(String(r[4] ?? ''))) ? '在用' : '未在用',
      null, null, '用药记录', 'B');
    add('pathology_available', 'pathology', (p.imaging.rows || []).length > 0 ? '有影像资料' : '无影像资料', null, null, '影像档案', 'B');
    add('fvc_pred', 'pft', null, (() => { const f = (p.metrics || []).find((m) => m.key === 'fvc'); const ps = f?.points || []; return ps.length ? Number(ps[ps.length - 1].v) : null; })(), null, '肺功能报告', 'B');
  }
  const insMeta = db.prepare('INSERT INTO demo_meta (k, v) VALUES (?,?)');
  insMeta.run('disclaimer', '全部患者数据为虚构模拟，仅供原型演示；trials 表为真实登记摘录（登记状态未核实，以登记页为准）');
  insMeta.run('match_rule_set_version', '2026-10-25.1');
  insMeta.run('match_footer_note', '本页只做「档案事实 ↔ 登记条目」的文字对照，不做入组资格判定，也不能替代研究者的评估。');
  insMeta.run('match_channels_note', '已查通道：chinadrugtrials（1 条）、ctv/ClinicalTrials.gov（1 条）。未查：ChiCTR、WHO ICTRP、openFDA。未查 ≠ 无结果。');
  insMeta.run('subject_count', String(Object.keys(DEMO.profiles).length));
  insMeta.run('metric_count', String(Object.values(DEMO.profiles).reduce((a, p) => a + p.metrics.length, 0)));
  insMeta.run('point_count', String(Object.values(DEMO.profiles).reduce((a, p) => a + p.metrics.reduce((b, m) => b + m.points.length, 0), 0)));
  db.close();
}

function writePrototypeJs() {
  mkdirSync(P2, { recursive: true });
  const js = '/* 由 demo/build-demo-data.mjs 生成；勿手改，改数据请改生成器后重新运行。 */\n'
    + 'window.DEMO_DATA = ' + JSON.stringify({ profiles: DEMO.profiles, trials: DEMO.trials }) + ';\n';
  writeFileSync(join(P2, 'demo-data.js'), js);
}

export function buildDemoProfiles() {
  return { profiles: DEMO.profiles, trials: DEMO.trials };
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  writeSqlite();
  writePrototypeJs();
  const nMetrics = Object.values(DEMO.profiles).reduce((a, p) => a + p.metrics.length, 0);
  const nPoints = Object.values(DEMO.profiles).reduce((a, p) => a + p.metrics.reduce((b, m) => b + m.points.length, 0), 0);
  console.log(`demo-data.sqlite + demo-data.js 生成完毕：2 档案 / ${nMetrics} 项指标 / ${nPoints} 个数据点 / ${DEMO.trials.length} 条试验（占位）`);
}
