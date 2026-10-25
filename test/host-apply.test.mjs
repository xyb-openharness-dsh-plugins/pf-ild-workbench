/**
 * 宿主 apply() 契约：config 从**第二个参数**拿，不能读 `ctx.config`。
 *
 * 2026-10-25 装机实测（DSH Desktop）：写成 `ctx.config?.root` 时宿主报
 *   `cannot get property "config" without inject`
 * 随后 plugin-recovery 把插件从 profile 卸掉——用户看到"装了工作台但 Desktop 里没有"。
 *
 * 为什么这里是**源码级**断言而不是行为测试：
 *   `dsh/index.js` 依赖宿主提供的 peer 包 `@deepseek-ai/schemastery`，本仓不安装（也不该安装），
 *   所以在本机 import 它会 ERR_MODULE_NOT_FOUND，跑不起真 apply()。
 *   诚实记下这个局限：本测试拦的是"又写回 ctx.config"这一种形态，
 *   拦不到"其他只在宿主语境才发生的失败"。后者只能靠装机实测。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const src = readFileSync(join(ROOT, 'dsh/index.js'), 'utf8')

test('apply 的签名必须是 (ctx, config)', () => {
  assert.match(src, /export function apply\(ctx,\s*config\s*=\s*\{\}\)/, 'config 必须作为第二个参数声明')
})

test('源码里不得读 ctx.config（宿主会报 without inject）', () => {
  /* 去掉注释再看：注释里出现 ctx.config 是说明文字，不算违规 */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(code, /ctx\s*\.\s*config/, '不能读 ctx.config —— 用第二参数 config')
})

test('root 取自 config 且做了类型检查（空值不裸 throw）', () => {
  assert.match(src, /config\?\.root|config\.root/, '必须从 config 取 root')
  assert.match(src, /typeof root !== 'string'/, 'root 必须做类型检查，缺失时走可读错误而不是白屏')
})
