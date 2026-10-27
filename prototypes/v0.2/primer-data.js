/* 36 号 · 疾病概要数据（小呼宝 BreathPal · PF-ILD）
 * 内容只取自本仓 README.md、docs/CLINICAL-DATA-2026.md、docs/METRIC-GRADING.md、
 * research/RESEARCH-MEDICAL-2026-10-25.md 与 data/trials/pf-ild/ 的已记录事实。
 * 不写判定、不复制指南条文、不编 URL；四段顺序固定 definition → evidence → landscape → trend。
 */
window.DISEASE_PRIMER = {
  brand: '小呼宝 BreathPal',
  name: '进行性纤维化性间质性肺疾病',
  en: 'PF-ILD / PPF（progressive pulmonary fibrosis）',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '进行性纤维化性间质性肺疾病（PF-ILD，也写作 PPF）不是一种独立的疾病诊断。'
        + '国家卫生健康委《86 个罕见病病种诊疗指南（2025 年版）》#69 的原文口径是：「PPF 不是独立的疾病诊断，更多代表疾病行为」。',
      points: [
        '它描述的是一类已经出现肺纤维化影像证据、并在观察期内出现功能、症状或影像变化的间质性肺疾病；病因可以不同，本台只照录医生给出的病因与诊断原文。',
        '指南与本研究整理的病因举例包括纤维化型过敏性肺炎（fHP）、结缔组织病相关间质性肺疾病（CTD-ILD）、特发性非特异性间质性肺炎（iNSIP）与未分类的间质性肺疾病（u-IIP）等。',
        '2022 年 ATS/ERS/JRS/ALAT 临床实践指南提出 PPF 的工作定义：除特发性肺纤维化（IPF）外的间质性肺疾病，加上肺纤维化影像证据，并在过去 1 年内符合功能、症状或影像三类变化中的一项。本台只并列展示这一口径，不判断个人是否符合。',
        '常见症状是干咳或少量白黏痰、活动后气短；急性加重表现为短期内呼吸困难明显加重，判定属于医生任务。',
        '随访检查通常包括肺功能与胸部 HRCT。指南原文建议基线与随访过程中做肺功能，检查项目至少包括 FVC 和 DLCO；本台页面上的「每 3 个月」是按医生安排记录的节奏，不是指南给出的固定间隔。'
      ],
      sources: [
        { org: '国家卫生健康委', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#69 进行性纤维化性间质性肺疾病', version: '2025 年版', original: false, secondaryUrl: 'https://www.pumch.cn/detail/42283.html', page: '印刷页 408–411', note: '官网通知页对脚本返回 412；本机已存官方 PDF（517 页，2026-10-25 提取），据北京协和医院发布页二次来源' },
        { org: 'ATS/ERS/JRS/ALAT', doc: 'Idiopathic Pulmonary Fibrosis (an Update) and Progressive Pulmonary Fibrosis in Adults: Clinical Practice Guideline', version: '2022（Am J Respir Crit Care Med 205(9):e18–e47）', original: false, secondaryUrl: 'https://www.thoracic.org/statements/guideline-implementation-tools/matrix-guidelines-and-derivatives-ipf-update.php', note: '期刊全文页与 PMC 对脚本返回 403/薄页；原文未获取，经 NHC #69 转引，据 ATS 官方指南页二次来源' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '下面列出本台引用或转引的公开文件。原件能点开的给原件链接；点不开或本台没有原件的，如实写「未取得原件」并给二次来源。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台用途'],
        rows: [
          ['国家卫生健康委', '《86 个罕见病病种诊疗指南（2025 年版）》#69 进行性纤维化性间质性肺疾病', '2025 年版（印刷页 408–411）',
            { text: '据二次来源：北京协和医院发布页（本机另存官方 PDF）', kind: 'hub', url: 'https://www.pumch.cn/detail/42283.html', note: '官网通知页对脚本返回 412；本台 2026-10-25 已提取官方 PDF（517 页），可点链接以协和发布页为准' },
            '病种定义、术语与随访项目的 A 级出处'],
          ['ATS/ERS/JRS/ALAT', 'Idiopathic Pulmonary Fibrosis (an Update) and Progressive Pulmonary Fibrosis in Adults: Clinical Practice Guideline', '2022',
            { text: '未取得原件，据 ATS 官方指南页', kind: 'hub', url: 'https://www.thoracic.org/statements/guideline-implementation-tools/matrix-guidelines-and-derivatives-ipf-update.php', note: '期刊全文页与 PMC 对脚本返回 403/薄页；本台未取得该版原文，PPF 定义经 NHC #69 转引' },
            'PPF 定义的转引口径'],
          ['中国药物临床试验登记与信息公示平台', 'CTR20213153 · BMS-986278 治疗肺纤维化的疗效与安全性的 2 期研究', '登记状态：进行中 招募完成（本台 2026-10-25 快照）',
            { text: '未取得可验证原件 · 本台自采快照', nolink: true, note: '登记库检索页对脚本返回薄页；快照见 data/trials/pf-ild/trials.jsonl（2026-10-25），登记状态以登记页为准' },
            '发展趋势段的登记事实（只报数量与分期）']
        ]
      },
      points: [
        '原件与二次来源分开写：本台没有看到的原文，不会写成「已取得」。',
        '指南列的是「通常怎么做」，不是对某个人的处置建议；同一份指南隔一年，条目会变，所以版本号必须写清。'
      ],
      sources: [
        { org: '国家卫生健康委', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#69', version: '2025 年版', original: false, secondaryUrl: 'https://www.pumch.cn/detail/42283.html', page: '印刷页 408–411', note: '官网通知页对脚本返回 412；据北京协和医院发布页二次来源' },
        { org: 'ATS/ERS/JRS/ALAT', doc: 'IPF (an Update) and PPF in Adults: Clinical Practice Guideline', version: '2022', original: false, secondaryUrl: 'https://www.thoracic.org/statements/guideline-implementation-tools/matrix-guidelines-and-derivatives-ipf-update.php', note: '原文未获取，经 NHC #69 转引' },
        { org: '中国药物临床试验登记与信息公示平台', doc: 'CTR20213153（本台自采快照）', version: '2026-10-25', nolink: true, note: '登记库检索页对脚本返回薄页；快照存 data/trials/pf-ild/，第三方原件未存档' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按指南列举的类别列出目前出现过的手段。只写「是什么、用在哪一类情形」，不排序、不比优劣、不给个人推荐。',
      groups: [
        {
          label: '针对原发病与致敏环境',
          points: [
            '脱离致敏环境：指南把脱离致敏环境列为处理的一部分（例如过敏性肺炎的居家霉斑、鸟类接触等）。',
            '糖皮质激素与免疫抑制剂：用于原发病治疗；具体品种、剂量与疗程属于医生处方，本台不载。'
          ]
        },
        {
          label: '非药物治疗',
          points: [
            '氧疗：按医生处方记录实际使用（活动时或静息时、流量）；本台不给氧疗指征结论。',
            '肺康复：指南把肺康复列为非药物治疗的组成部分。',
            '心理社会支持：指南把心理社会支持列入非药物治疗的组成部分。',
            '姑息治疗：指南把姑息治疗列为非药物治疗的组成部分之一。'
          ]
        },
        {
          label: '抗纤维化治疗',
          points: [
            '尼达尼布：指南提到其抗纤维化作用机制与 INBUILD 研究支持，用于除 IPF 外的进展性纤维化性间质性肺疾病。',
            '吡非尼酮：指南述及其对 FVC、DLCO 下降速度与 6 分钟步行距离的趋势；指南同时写明没有很高级别的推荐。',
            '本台只记录「什么时候改的、改成多少、为什么」的原样文本，不推荐调整。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: '国家卫生健康委', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#69', version: '2025 年版', original: false, secondaryUrl: 'https://www.pumch.cn/detail/42283.html', page: '印刷页 410', note: '官网通知页对脚本返回 412；据北京协和医院发布页二次来源' },
        { org: 'ATS/ERS/JRS/ALAT', doc: 'IPF (an Update) and PPF in Adults: Clinical Practice Guideline', version: '2022', original: false, secondaryUrl: 'https://www.thoracic.org/statements/guideline-implementation-tools/matrix-guidelines-and-derivatives-ipf-update.php', note: '原文未获取，经 NHC #69 转引' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事实：哪份文件发布或换版、登记平台上能检索到什么、登记状态怎么记。不预测、不评价。',
      points: [
        '2025 年：国家卫生健康委发布《86 个罕见病病种诊疗指南（2025 年版）》，PF-ILD 为其中 #69；本台 2026-10-25 已从官方 PDF 提取该病种页（印刷页 408–411）。',
        '2022 年：ATS/ERS/JRS/ALAT 临床实践指南在 IPF 更新版中同时提出 PPF 的工作定义（除 IPF 外的间质性肺疾病 + 肺纤维化影像证据 + 过去 1 年内功能、症状或影像变化）；本台口径经 NHC #69 转引。',
        '截至 2026-10-25：本台对 6 组关键词做登记库检索，只有 ChinaDrugTrials 通道算「查过」，命中 1 条 2 期研究（CTR20213153，BMS-986278，肺纤维化，登记状态「进行中 招募完成」）；其余 5 个通道未查过，缺失不等于没有相关登记。',
        '同一份检索快照记录：登记状态未核实，以登记页为准；本台不据此判断任何药物与个人治疗的关系。'
      ],
      sources: [
        { org: '国家卫生健康委', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#69', version: '2025 年版', original: false, secondaryUrl: 'https://www.pumch.cn/detail/42283.html', page: '印刷页 408', note: '官网通知页对脚本返回 412；据北京协和医院发布页二次来源' },
        { org: 'ATS/ERS/JRS/ALAT', doc: 'IPF (an Update) and PPF in Adults: Clinical Practice Guideline', version: '2022', original: false, secondaryUrl: 'https://www.thoracic.org/statements/guideline-implementation-tools/matrix-guidelines-and-derivatives-ipf-update.php', note: '原文未获取，经 NHC #69 转引' },
        { org: '中国药物临床试验登记与信息公示平台', doc: 'CTR20213153（本台自采快照）', version: '2026-10-25', nolink: true, note: '登记库检索页对脚本返回薄页；快照存 data/trials/pf-ild/' }
      ]
    }
  ]
}
