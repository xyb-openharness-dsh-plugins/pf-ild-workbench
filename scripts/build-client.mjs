#!/usr/bin/env node
/**
 * 宿主接线件 ③ 的构建：把 src/client.js 打成宿主可加载的前端包。
 * 与 build-version（写 lib/version.js）同一套"派生产物带哈希"的规矩。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(join(ROOT, 'src/client.js'), 'utf8');
mkdirSync(join(ROOT, 'dist'), { recursive: true });
const banner = `/* pf-ild-workbench client bundle · built ${new Date().toISOString()} */\n`;
writeFileSync(join(ROOT, 'dist/client.js'), banner + src.replace(/^export /gm, ''));
console.log('✓ dist/client.js');
