#!/usr/bin/env node
/**
 * PF-ILD 临床试验检索（M4）——唯一入口是 unified-trial-mcp 的 stdio 服务，不自己拼 URL。
 *
 * 产出四件套（四处条数必须一致）：
 *   data/trials/pf-ild/manifest.json   来源终态 + 计数 + 数据截止日
 *   data/trials/pf-ild/trials.jsonl    一条记录一行
 *   data/trials/pf-ild/trials.sqlite   可 SQL 查询
 *   docs/CLINICAL-DATA-<年>.md         人工可读的口径与覆盖声明（本脚本只写"检索结果"区块）
 *
 * 核心纪律（对齐 MCP 自己的那条规则）：**绝不把"我没查成"写成"不存在"。**
 *   只有 SUCCESS / NO_RESULTS 的来源才算"查过"；其余状态一律记「未查过（原因）」。
 *   离线语料（chictr_pancreatic / xyb_chinadrugtrials）目前只有胰腺癌，对本病种记「无覆盖」。
 *
 * 用法：
 *   node scripts/fetch-pf-ild-trials.mjs [--mcp <服务目录>] [--dry-run]
 * 退出码：0 = 四件套写出且条数一致；1 = 失败（含 MCP 不可用）
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const mcpArg = args.indexOf('--mcp');
const MCP_DIR = mcpArg >= 0 ? args[mcpArg + 1] : join(process.env.HOME || '', 'Downloads/unified_search_trials');
const OUT = join(ROOT, 'data/trials/pf-ild');

/* 检索口径：本病种的关键词组合（不写"仅中国"，中国来源单列） */
const QUERIES = [
  { label: '疾病名（英文）', payload: { keyword: 'progressive pulmonary fibrosis', limit: 50 } },
  { label: '疾病名（同义）', payload: { keyword: 'progressive fibrosing interstitial lung disease', limit: 50 } },
  { label: '疾病族', payload: { keyword: 'interstitial lung disease', phase: ['Phase 2', 'Phase 3'], limit: 50 } },
  { label: '抗纤维化用药', payload: { keywords: ['nintedanib', 'pirfenidone'], condition: 'pulmonary fibrosis', limit: 50 } },
  { label: '肺移植', payload: { keywords: ['lung transplant'], condition: 'pulmonary fibrosis', limit: 30 } },
  { label: '肺康复', payload: { keyword: 'pulmonary rehabilitation', condition: 'interstitial lung disease', limit: 30 } },
];

if (!existsSync(join(MCP_DIR, 'dist/src/cli/main.js'))) {
  console.error(`✗ 找不到 unified-trial-mcp：${MCP_DIR}/dist/src/cli/main.js`);
  console.error('  先 clone opencare-skillhub/unified-trial-search-mcp-service 并 npm install && npm run build。');
  process.exit(1);
}
if (dryRun) { console.log(JSON.stringify({ dryRun: true, mcp: MCP_DIR, queries: QUERIES.map((q) => q.label) }, null, 2)); process.exit(0); }

/* 载入 cookie.env（若存在）：MCP 从环境读，本脚本不打印任何值 */
const cookieEnv = join(process.env.HOME || '', '.unified-trial-mcp/cookie.env');
const extraEnv = {};
if (existsSync(cookieEnv)) {
  for (const line of readFileSync(cookieEnv, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) extraEnv[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/* ---------- MCP stdio 客户端（JSON-RPC over stdio，最小实现） ---------- */
function createClient() {
  const child = spawn(process.execPath, ['dist/src/cli/main.js', 'serve'], {
    cwd: MCP_DIR, env: { ...process.env, ...extraEnv }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buf = '';
  const pending = new Map();
  let nextId = 1;
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    }
  });
  child.stderr.on('data', () => { /* 诊断信息不落盘，避免带出 cookie */ });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`${method} 超时`)); } }, 120000);
  });
  const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  return { child, request, notify };
}

async function main() {
  const { child, request, notify } = createClient();
  const records = [];
  const statusByRun = [];
  const sourceStatus = new Map();

  try {
    await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'pf-ild-workbench-fetch', version: '0.1.0' },
    });
    notify('notifications/initialized', {});

    for (const q of QUERIES) {
      let result;
      try {
        result = await request('tools/call', { name: 'search_trials', arguments: q.payload });
      } catch (error) {
        statusByRun.push({ query: q.label, error: String(error.message) });
        continue;
      }
      /* MCP 返回 content[0].text（JSON 字符串） */
      let payload = null;
      try {
        const text = result?.content?.find((c) => c.type === 'text')?.text;
        payload = text ? JSON.parse(text) : result;
      } catch { payload = result; }
      const items = payload?.records || payload?.items || payload?.trials || [];
      for (const it of items) records.push({ query: q.label, ...it });
      const statuses = payload?.statuses || payload?.sources || [];
      for (const st of statuses) {
        const key = st.sourceId || st.source || st.id || 'unknown';
        const prev = sourceStatus.get(key) || { source: key, states: new Set(), dataCutoff: null, notes: new Set() };
        prev.states.add(String(st.status || st.state || 'UNKNOWN'));
        if (st?.freshness?.dataCutoff) prev.dataCutoff = st.freshness.dataCutoff;
        if (st?.message) prev.notes.add(String(st.message).slice(0, 200));
        sourceStatus.set(key, prev);
      }
      statusByRun.push({
        query: q.label, returned: items.length,
        coverage: payload?.coverage ?? null, completeness: payload?.completeness ?? null,
        truncation: payload?.truncation ?? null,
      });
    }
  } finally {
    try { child.stdin.end(); } catch { /* ignore */ }
    child.kill('SIGTERM');
  }

  /* 去重：优先按 recordId，其次 source+sourceId，最后标题 */
  const seen = new Set();
  const trials = [];
  for (const r of records) {
    const key = r.recordId || (r.source && r.sourceId ? `${r.source}:${r.sourceId}` : null) || r.title || JSON.stringify(r).slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    trials.push(r);
  }

  /* 来源终态表：只有 SUCCESS/NO_RESULTS 才算"查过" */
  const QUERIED = new Set(['SUCCESS', 'NO_RESULTS']);
  const sources = [...sourceStatus.values()].map((s) => {
    const stateList = [...s.states];
    const queried = stateList.some((x) => QUERIED.has(x));
    return {
      source: s.source,
      states: stateList,
      queried,
      terminal: queried ? 'queried' : 'not-queried',
      dataCutoff: s.dataCutoff,
      notes: [...s.notes],
    };
  });

  const manifest = {
    disease: 'PF-ILD',
    diseaseCn: '进行性纤维化性间质性肺疾病',
    generatedAt: new Date().toISOString(),
    mcpService: 'unified-trial-search-mcp-service',
    mcpDir: MCP_DIR.replace(process.env.HOME || '', '~'),
    queries: statusByRun,
    sourceTerminalStates: sources,
    counts: { records: trials.length, dedupedFrom: records.length },
    discipline: '只有 SUCCESS/NO_RESULTS 的来源算「查过」；其余状态一律记「未查过」，不得解读为「不存在」。离线语料目前只有胰腺癌，对本病种记「无覆盖」。',
    disclaimer: '登记状态未核实，以登记页为准；本文件不构成招募推荐。',
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(OUT, 'trials.jsonl'), trials.map((t) => JSON.stringify(t)).join('\n') + (trials.length ? '\n' : ''));

  /* sqlite：显式列名；三处条数一致由本脚本自断言 */
  const dbPath = join(OUT, 'trials.sqlite');
  if (existsSync(dbPath)) rmSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(`CREATE TABLE trials (
    record_id TEXT PRIMARY KEY, source TEXT, source_id TEXT, title TEXT, phase TEXT,
    status TEXT, sponsor TEXT, topic TEXT, last_verified TEXT, url TEXT, raw_json TEXT
  );`);
  const ins = db.prepare(`INSERT INTO trials
    (record_id, source, source_id, title, phase, status, sponsor, topic, last_verified, url, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const today = new Date().toISOString().slice(0, 10);
  /* node:sqlite 不接受 undefined，也不接受对象/数组直接绑定：统一转字符串或 null */
  const str = (v) => (v === undefined || v === null || v === '') ? null
    : (typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v)));
  for (const t of trials) {
    const recordId = str(t.recordId) || `${str(t.source) || 'unknown'}:${str(t.sourceId) || str(t.id) || ''}`;
    ins.run(recordId, str(t.source), str(t.sourceId) ?? str(t.id), str(t.title), str(t.phase),
      str(t.status), str(t.sponsor), str(t.topic), str(t.lastVerified) ?? today, str(t.url),
      JSON.stringify(t));
  }
  const dbCount = db.prepare('SELECT COUNT(*) c FROM trials').get().c;
  db.close();

  const jsonlCount = trials.length ? readFileSync(join(OUT, 'trials.jsonl'), 'utf8').trim().split('\n').length : 0;
  const manifestCount = manifest.counts.records;
  const ok = jsonlCount === manifestCount && dbCount === manifestCount;

  console.log(JSON.stringify({
    ok, manifest: manifestCount, jsonl: jsonlCount, sqlite: dbCount,
    sources: sources.map((s) => `${s.source}=${s.states.join('/')}${s.queried ? '' : '（未查过）'}`),
    out: OUT.replace(ROOT + '/', ''),
  }, null, 2));

  if (!trials.length) {
    console.log('\n注意：本次没有取到任何记录。这不是"不存在相关试验"，而是"本次来源未给出结果"。');
    console.log('各来源终态见 manifest.json 的 sourceTerminalStates；未查过的来源必须如实记录。');
  }
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => { console.error('✗ 检索失败：' + error.message); process.exitCode = 1; });
