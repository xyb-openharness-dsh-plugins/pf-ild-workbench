#!/usr/bin/env node
/**
 * 医疗表述越界检查（PF-ILD 版）。
 *
 * 产品只提供信息，不做诊断、不给处置建议、不给移植资格结论、不做热量换算。
 * 这条红线在 UI 文案里最容易破防，所以放进 `npm run check`：命中即失败，不靠人记。
 *
 * 扫描范围：会被用户读到的实现代码——`dsh/`、`lib/`、`public/`、`src/`、`demo/`、`prototypes/`
 * 下的 .js/.mjs/.cjs/.html/.css。**不扫** docs/：那是讨论稿，另有评审。
 *
 * 两种放行方式：
 * 1. 否定语境：命中词前 12 个字符内出现「不 / 勿 / 禁止 / 别」，判为免责表述，放行；
 * 2. 显式标注：该行含 `wording-allow` 注释，放行（需在注释里写清为什么）。
 *
 * 本病种新增红线（来源：research/RESEARCH-MEDICAL-2026-10-25.md + 用户研究 §6）：
 * - 不得给移植资格结论（"符合移植条件/不适合移植"）；
 * - 不得做热量换算或肌少症判定；
 * - 不得生成 PPF/进展判定（"符合进展标准"）。
 *
 * 用法：node scripts/check-wording.mjs
 * 退出码：0 无命中或没有可扫文件；1 有命中。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['dsh', 'lib', 'public', 'src', 'demo', 'prototypes']
const EXTS = new Set(['.js', '.mjs', '.cjs', '.html', '.css'])

/** 越界表述：不是"提到疾病"，而是"替医生下结论或给处置"。 */
const RULES = [
  { id: 'treatment-advice', re: /建议\s*(进行|做|用|接受|采用|考虑)?\s*(治疗|手术|化疗|放疗|用药|服药|停药|加药|减药|靶向|吸氧|氧疗)/g },
  { id: 'recommend-drug', re: /推荐\s*(进行|使用|服用|用)?\s*(用药|服药|治疗|手术|剂量|药物)/g },
  { id: 'stop-medication', re: /(可以|可|建议|不妨)\s*停\s*(药|用|服)/g },
  { id: 'skip-care', re: /(不用|无需|不必|没必要)\s*(就医|复查|去医院|看医生|吸氧)/g },
  { id: 'prognosis-claim', re: /预后\s*(良好|较好|不错|较差|很差)/g },
  { id: 'cure-rate', re: /治愈率|生存期\s*(还有|不足|大概)/g },
  { id: 'diagnose-claim', re: /(确诊|诊断)\s*为\s*(癌|肿瘤|恶性|间质性肺|纤维化)/g },
  /* --- PF-ILD 专属 --- */
  { id: 'judge-worse', re: /(病情|指标|肺功能|趋势)\s*(明显)?\s*(恶化|好转|加重|进展)/g },
  { id: 'judge-severity', re: /(属于|已达|判定为)\s*(轻度|中度|重度|严重)/g },
  { id: 'ppf-verdict', re: /符合\s*(PPF|进展性肺纤维化|进展)\s*(标准|定义|诊断)/g },
  { id: 'transplant-eligibility', re: /(符合|不适合|适合|达到)\s*移植\s*(条件|标准|指征|资格)/g },
  { id: 'calorie-math', re: /(每日|建议)\s*(热量|千卡|kcal|蛋白质)\s*(摄入|需求|目标)/g },
  { id: 'sarcopenia-verdict', re: /(肌少症|营养不良)\s*(判定|诊断|符合|风险)/g },
  { id: 'ae-verdict', re: /(属于|符合|判定为)\s*急性加重/g },
]

const NEGATION = /[不勿禁别]$|不构成|不代表|不做|不提供|不作为|不生成|不写|不给|不要/

function walk(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    let st
    try { st = statSync(full) } catch { continue }   /* 生成器并发重写时的瞬态消失，跳过即可 */
    if (st.isDirectory()) out.push(...walk(full))
    else if (st.isFile() && EXTS.has(extname(entry))) out.push(full)
  }
  return out
}

const files = DIRS.flatMap((d) => walk(join(root, d)))
const hits = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('wording-allow')) return
    for (const rule of RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(line)) !== null) {
        const before = line.slice(Math.max(0, m.index - 12), m.index)
        if (NEGATION.test(before)) continue
        hits.push({ file: relative(root, file), line: i + 1, rule: rule.id, text: m[0].trim() })
      }
    }
  })
}

if (!files.length) {
  console.log('= 没有可扫描的实现文件（dsh/ lib/ public/ src/ 为空或不存在），本次跳过')
  process.exit(0)
}

if (hits.length) {
  console.error(`✗ 医疗表述越界 ${hits.length} 处（产品只提供信息，不做诊断、处置建议、移植资格结论与热量换算）：\n`)
  for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.rule}]  「${h.text}」`)
  console.error('\n改法：改成"记录/整理/带去看医生"的表述；确属免责语句请写在否定语境里。')
  console.error('依据：docs/SPEC.md §一/§十四、docs/METRIC-GRADING.md §二、docs/DEV-REQUIREMENTS-2026-10-25.md 硬约束 22–26。')
  process.exit(1)
}

console.log(`✓ 医疗表述检查通过（${files.length} 个实现文件，0 处越界）`)
