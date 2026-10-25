/* 小呼宝 BreathPal · PF-ILD 交互原型 __VERSION_DISPLAY__
   数据：window.DEMO_DATA（由 demo/build-demo-data.mjs 生成，唯一来源；本文件不改数据）
   规则依据：26 号功能线 / 30 号窄宽 / 32 号折叠卡 / 16 号一图秀 / 28 号交互路径 / 20 号 Agent 面板
   红线：不做判读（无"恶化/好转/严重"结论）、不做热量换算、不给移植资格结论。
*/
(() => {
  'use strict';

  /* ---------------- 图标与导航 ---------------- */
  const icons = {
    home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z',
    chart: 'M4 19V5m0 14h16M8 15l3-4 3 2 4-6',
    wave: 'M3 12h3l2-5 3 10 3-7 2 2h5',
    bolt: 'M13 3 5 14h5l-1 7 8-11h-5Z',
    pill: 'M8 4h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8Zm4 8v8',
    scan: 'M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2M4 12h16',
    clipboard: 'M9 4h6v3H9Zm-2 1H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M8 12h8M8 16h5',
    scale: 'M12 4v16M6 8h12M6 8 3 14h6Zm12 0-3 6h6Z',
    route: 'M6 4v9a3 3 0 0 0 3 3h6a3 3 0 0 1 0 6H9M6 4a2 2 0 1 0 0-.001Z',
    folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
    leaf: 'M20 4c-9 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-5 8-16ZM6 20c2-4 5-7 9-9',
  };
  const ICON_ALIAS = { dashboard: 'home', pft: 'chart', oxygen: 'wave', ae: 'bolt', med: 'pill', imaging: 'scan', visit: 'clipboard', transplant: 'scale', diagnosis: 'route', docs: 'folder', nutrition: 'leaf' };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k] || icons[ICON_ALIAS[k]] || icons.badge}"/></svg>`;

  /* 10 个业务一级线 + 看板（G1 签认：F-NP-01 营养为第 10 条；设置走顶栏弹窗） */
  const PAGES = [
    ['dashboard', '看板', 'home'],
    ['pft', '肺功能趋势', 'chart'],
    ['oxygen', '氧状态与日常快记', 'wave'],
    ['ae', '急性加重事件', 'bolt'],
    ['med', '用药与耐受记录', 'pill'],
    ['imaging', '影像档案', 'scan'],
    ['visit', '复诊待办与问题清单', 'clipboard'],
    ['transplant', '移植评估信息自检', 'scale'],
    ['diagnosis', '诊断追溯', 'route'],
    ['docs', '报告与资料整理', 'folder'],
    ['nutrition', '营养与日常功能', 'leaf'],
  ];
  /* 指标目录：分类与顺序的唯一来源（24 号 §2「类别的标题、顺序、项目归属由唯一 metricCatalog/categoryOrder 给出」）。
     指标页与一图秀选择窗共用这一份，保证两页组名/顺序/项数一致。 */
  const METRIC_CATALOG = [
    { key: 'pft', name: '肺功能', codes: ['fvc', 'dlco', 'fev1', 'sixmwt'] },
    { key: 'oxygen', name: '氧合与活动', codes: ['spo2r', 'spo2e', 'o2flow', 'mmrc'] },
    { key: 'body', name: '身体与生活', codes: ['wt', 'kingild'] },
    { key: 'lab', name: '常规化验', codes: ['wbc', 'hgb', 'alt', 'ast', 'crp'] },
    { key: 'biomarker', name: '疾病标志物', codes: ['kl6'] },
  ];
  const CATEGORY_ORDER = METRIC_CATALOG.map((c) => c.key);

  const SUBPAGES = {
    pft: ['趋势图', '检查登记', '数据口径'],
    oxygen: ['快记时间线', '氧疗记录'],
    ae: ['事件卡', '前后对照'],
    med: ['按药聚合', '剂量变更史'],
    imaging: ['检查列表', '报告原文'],
    visit: ['问题清单', '打印文本', '复诊节奏'],
    transplant: ['完整度清单', '待问事项', '临床试验'],
    diagnosis: ['时间线', '信息断点'],
    docs: ['资料库', '待核对候选'],
    nutrition: ['进食记录', '体重趋势'],
  };
  const SUBTITLES = {
    dashboard: '把「这半年是掉还是稳」和「下次复诊要问什么」放在一起，让每一次门诊有据可查。',
    pft: 'FVC%pred 与 DLCO%pred 各按自身范围缩放；数值并列展示，不给结论——变化怎么读，由医生判断。',
    oxygen: '记气促档位、血氧和氧流量；变化起点由你标记，工作台不替你判断"是不是加重"。',
    ae: '急性加重是病程事件，只记录不诊断：病因、出院带药、复查节点都照原文留。',
    med: '记「什么时候改的、改成多少、为什么」；剂量与原因原样保存，不改写成建议。',
    imaging: 'HRCT 结论只摘录原文，不做模式判读、不给影像分级。',
    visit: '该带什么、该问什么提前写下来；清单可勾选、可打印，诊室里不用凭记忆。',
    transplant: '只列「要准备什么、要问什么」；够不够格由移植团队评估，这里不给资格结论。',
    diagnosis: '从起病到确诊的时间线，只拼接记录，不做诊断判断。',
    docs: '上传 → 解析 → 逐项核对 → 入档；原件永远保留，接受之前都只是候选。',
    nutrition: '按自述记进食与体重；不做热量换算，也不做肌少症判定。',
  };

  /* ---------------- 数据层（读 demo-data.js，不做二次加工） ---------------- */
  /* ---- apiBase 契约（内联版；权威实现与测试在 lib/api-base.js + test/api-base.test.mjs）----
     独立启动 API_BASE=""；宿主里 API_BASE="/api/pf-ild"。页面统一拼 `${API_BASE}/api/xxx`。
     守卫只禁交界处重复 /api，**不许 includes("/api") 一刀切**（宿主前缀含 /api 是正常的）。 */
  const API_BASE = "__API_BASE__";
  const VERSION_ARTIFACT = "__VERSION__";
  function normalizeApiBase(raw) {
    if (raw === undefined || raw === null) return "";
    let v = String(raw).trim();
    if (v === "" || v === "/") return "";
    if (!v.startsWith("/")) v = "/" + v;
    return v.replace(/\/+$/, "");
  }
  function validateApiBase(raw) {
    const rawText = raw === undefined || raw === null ? "" : String(raw).trim();
    if (/^https?:\/\//i.test(rawText) || rawText.indexOf("://") >= 0) return { ok: false, base: "", reason: "API_BASE 只放挂载前缀，不放完整 URL" };
    const base = normalizeApiBase(raw);
    if (/(^|\/)api$/.test(base)) return { ok: false, base, reason: "API_BASE 以 /api 结尾会让拼出的路径出现 /api/api（当前 " + base + "）" };
    if (/\s/.test(base)) return { ok: false, base, reason: "API_BASE 不得含空白字符" };
    return { ok: true, base };
  }
  function buildApiUrl(base, path) {
    const v = validateApiBase(base);
    if (!v.ok) throw new Error("apiBase 非法：" + v.reason);
    return v.base + (path.startsWith("/") ? path : "/" + path);
  }
  function guardStartupApiBase(raw) {
    const v = validateApiBase(raw);
    if (v.ok) return { ok: true, base: v.base, banner: null };
    return { ok: false, base: "", banner: { title: "服务连接配置有问题", detail: v.reason, hint: "点「重新检查连接」重试；这通常不是你的操作问题。" } };
  }

  /* ---- 数据加载：开发版不读 window.DEMO_DATA 快照，唯一来源是本机服务 ---- */
  let D = null;
  let bootError = null;
  async function loadBootstrap() {
    const guard = guardStartupApiBase(API_BASE);
    if (!guard.ok) { bootError = guard.banner; return false; }
    try {
      const response = await fetch(buildApiUrl(guard.base, "/api/bootstrap"), { credentials: "same-origin" });
      if (!response.ok) throw new Error("服务返回 " + response.status);
      D = await response.json();
      if (!D || !D.profiles) throw new Error("返回数据缺少 profiles");
      return true;
    } catch (error) {
      bootError = { title: "连不上本机服务", detail: String(error.message || error), hint: "数据没有上传到任何地方；可以点「重新检查连接」重试。" };
      return false;
    }
  }

  /* 启动期校验失败 → 渲染错误横幅，**不裸 throw 白屏** */
  function renderBootError() {
    const box = document.getElementById("main");
    if (!box) return;
    box.innerHTML = '<div class="notice warn"><b>' + esc(bootError.title) + '</b><div style="margin-top:6px">' + esc(bootError.detail) + '</div>'
      + '<div class="actions" style="margin-top:10px"><button class="primary" data-action="retry-connect">重新检查连接</button></div>'
      + '<div class="small-note">' + esc(bootError.hint || "") + '</div></div>';
  }
  /* 一图秀选中指标：按档案各记一份，**最多 4 个**（16 号 §3 sel 上限）。
     默认给该档案 dash_keys 里前 3 个，用户可改；改完存在内存里，刷新回到默认。 */
  const ONE_CHART_DEFAULT = 3;
  const ONE_CHART_MAX = 4;

  const state = { view: 'dashboard', sub: {}, profile: 'A', large: false, sel: [], agentOpen: false };

  /* hash 路由：#<view>[/<sub>][?fold=1] —— 深链可分享，也供 HVT X2「路径逐字走通」走查与截图使用。 */
  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!raw) return null;
    const [path, query] = raw.split('?');
    const [view, subName] = path.split('/');
    if (!PAGES.some((x) => x[0] === view)) return null;
    const params = new URLSearchParams(query || '');
    return { view, sub: subName || '', fold: params.get('fold') === '1', agent: params.get('agent') === '1', draft: params.get('draft') === '1', probe: params.get('probe') || '' };
  }
  function applyHash() {
    const h = parseHash();
    if (!h) return false;
    state.view = h.view;
    if (h.sub) state.sub[h.view] = h.sub;
    state._foldOpen = Boolean(h.fold);
    state._wantAgent = Boolean(h.agent);
    state._wantDraft = Boolean(h.draft);
    state._wantProbe = h.probe;
    return true;
  }
  function syncHash() {
    const subName = SUBPAGES[state.view] ? sub(state.view) : '';
    const next = '#' + state.view + (subName ? '/' + subName : '') + (state._foldOpen ? '?fold=1' : '');
    if (location.hash !== next) history.replaceState(null, '', next);
  }
  const P = () => D.profiles[state.profile];
  const M = () => { const o = {}; for (const m of P().metrics) o[m.key] = m; return o; };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sub = (page) => state.sub[page] || SUBPAGES[page]?.[0] || '';
  const $ = (s) => document.querySelector(s);

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------------- 图表：Fritsch–Carlson 单调三次插值（禁过冲） ---------------- */
  function smoothPath(coords) {
    const n = coords.length;
    if (!n) return '';
    if (n === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    const dx = [], slope = [];
    for (let i = 0; i < n - 1; i++) {
      const ddx = coords[i + 1].x - coords[i].x;
      dx.push(ddx);
      slope.push(ddx ? (coords[i + 1].y - coords[i].y) / ddx : 0);
    }
    const tan = [slope[0]];
    for (let i = 1; i < n - 1; i++) {
      if (slope[i - 1] * slope[i] <= 0) tan.push(0);
      else {
        const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        tan.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
      }
    }
    tan.push(slope[n - 2]);
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const c1x = coords[i].x + dx[i] / 3, c1y = coords[i].y + tan[i] * dx[i] / 3;
      const c2x = coords[i + 1].x - dx[i] / 3, c2y = coords[i + 1].y - tan[i + 1] * dx[i] / 3;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`;
    }
    return d;
  }

  const numPts = (m) => (m.points || []).filter((p) => typeof p.v === 'number');
  const dateMs = (d) => Date.parse(d + 'T00:00:00');

  /* 一图秀：多序列独立归一化；单点不连线；分类指标只画档位点 */
  function chartSVG(codes, opts = {}) {
    const W = 760, H = opts.h || 260, L = 46, R = 16, T = 16, B = 30;
    const CX0 = L, CX1 = W - R, CY0 = T, CY1 = H - B;
    const all = codes.map((c) => M()[c]).filter(Boolean);
    if (!all.length) return `<div class="empty"><h3>还没有可画的指标</h3><p>先登记一次肺功能或快记一次气促。</p></div>`;
    const mx = [];
    all.forEach((m) => (m.points || []).forEach((p) => mx.push(dateMs(p.d))));
    const t0 = Math.min(...mx), t1 = Math.max(...mx);
    const xOf = (ms) => CX0 + (t1 === t0 ? 0.5 : (ms - t0) / (t1 - t0)) * (CX1 - CX0);
    const series = all.map((m) => {
      const nums = numPts(m);
      if (!nums.length) return { m, qual: true, pts: m.points || [] };
      const vals = nums.map((p) => p.v);
      let lo = Math.min(...vals), hi = Math.max(...vals);
      const span = (hi - lo) || Math.max(Math.abs(hi) * 0.08, 1);
      if (hi === lo) { hi = lo + span; }
      return { m, qual: false, lo, hi, span, pts: nums };
    });
    const nums = series.filter((s) => !s.qual);
    const quals = series.filter((s) => s.qual);
    const yOf = (s, v) => CY1 - ((v - s.lo) / s.span) * (CY1 - CY0);
    const grid = [0, 1, 2, 3, 4].map((i) => `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${(CY0 + i * (CY1 - CY0) / 4).toFixed(1)}" y2="${(CY0 + i * (CY1 - CY0) / 4).toFixed(1)}"/>`).join('');
    const allMonths = [];
    { const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
      while (cur.getTime() <= t1) { allMonths.push({ x: xOf(cur.getTime()), label: `${cur.getFullYear() % 100}/${cur.getMonth() + 1}` }); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); } }
    /* 标签过密会糊成一串：按全范围等距抽样到 ≤8 个，**不截断**（截断会让轴盖不住数据）。 */
    const step = Math.max(1, Math.ceil(allMonths.length / 8));
    const months = allMonths.filter((_, i) => i % step === 0 || i === allMonths.length - 1);
    const axis = months.map((mo) => `<text class="axis" x="${mo.x.toFixed(1)}" y="${H - 10}" text-anchor="middle">${mo.label}</text>`).join('');
    const lines = nums.map((s) => {
      const pts = s.pts.map((p) => ({ x: xOf(dateMs(p.d)), y: yOf(s, p.v) }));
      const path = pts.length > 1 ? `<path class="line" d="${smoothPath(pts)}" stroke="${s.m.color}" pathLength="1"/>` : '';
      const dots = pts.map((p) => `<circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2" fill="${s.m.color}"/>`).join('');
      return path + dots;
    }).join('');
    const qualLanes = quals.map((s, i) => {
      const y = CY0 + 14 + i * 22;
      const pts = s.pts.map((p) => `<g><circle class="dot" cx="${xOf(dateMs(p.d)).toFixed(1)}" cy="${y}" r="4" fill="${s.m.color}"/><text class="axis" x="${xOf(dateMs(p.d)).toFixed(1)}" y="${y - 8}" text-anchor="middle">${esc(p.v)}</text></g>`).join('');
      return `<text class="axis" x="${CX0 - 5}" y="${y + 3}" text-anchor="end">${esc(s.m.name.slice(0, 4))}</text>${pts}`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="指标趋势图">
      ${grid}${axis}${qualLanes}${lines}
      <text class="axis" x="${CX0}" y="${CY0 - 4}">各条线按该指标自身全部记录范围缩放</text>
    </svg>`;
  }

  const legend = (codes) => `<div class="grid three" style="gap:8px;margin-top:10px">${codes.map((c) => { const m = M()[c]; if (!m) return ''; const nums = numPts(m); const rng = nums.length ? `${Math.min(...nums.map(p => p.v))}–${Math.max(...nums.map(p => p.v))} ${m.unit || ''}` : '分类记录'; return `<div class="kv"><span class="k" style="color:${m.color}">● ${esc(m.name)}</span><span class="v" style="font-size:12px">全期范围 ${esc(rng)}</span></div>`; }).join('')}</div>`;

  /* ---------------- 通用片段 ---------------- */
  const rowHTML = (r) => `<div class="row"><div class="row-main"><b>${esc(r.title || r[0])}</b>${r.when ? `<span class="row-when">${esc(r.when)}</span>` : ''}${r.pill ? `<span class="pill ${r.pillTone || ''}">${esc(r.pill)}</span>` : ''}</div>${(r.desc || r[1]) ? `<div class="row-desc">${esc(r.desc || r[1])}</div>` : ''}${r.src ? `<div class="row-src">${esc(r.src)}</div>` : ''}</div>`;

  const card = (title, bodyHTML, note) => `<section class="card"><div class="card-head"><div><h2>${esc(title)}</h2></div></div>${bodyHTML}${note ? `<div class="source-note">${note}</div>` : ''}</section>`;

  const listRows = (rows, map) => `<div class="rows">${rows.map(map).join('')}</div>`;

  const aiButton = (page, prompt, label = '与 AI 一起整理') =>
    `<button class="soft" data-action="agent-draft" data-page="${esc(page)}" data-prompt="${esc(prompt)}">${esc(label)}</button>`;

  /* ---------------- 页面：看板 ---------------- */
  function pageDashboard() {
    const p = P();
    const pick = (k) => M()[k];
    const cards = p.dash_keys.map((k) => {
      const m = pick(k);
      if (!m) return '';
      const nums = numPts(m);
      const last = m.points[m.points.length - 1];
      const prev = nums.length > 1 ? nums[nums.length - 2] : null;
      const cur = nums.length ? nums[nums.length - 1].v : null;
      const delta = (prev && cur !== null) ? (cur - prev.v) : null;
      return `<div class="card"><div class="kv"><span class="k">${esc(m.name)}</span>
        <span class="v" style="color:${m.color}">${esc(last.v)}${m.unit ? ' ' + esc(m.unit) : ''}</span>
        <span class="k">${esc(last.d)} · ${esc(last.src)}</span>
        ${delta !== null ? `<span class="k">与上一次记录相差 ${delta > 0 ? '+' : ''}${Number(delta.toFixed(1))}（并列展示，不判断好坏）</span>` : '<span class="k">只有一次记录，不计算差值</span>'}
      </div></div>`;
    }).join('');
    const aeRows = p.ae.rows;
    const tpRows = p.transplant.rows.filter((r) => r[2] === 0);
    return `
    <div class="page-head"><div><span class="eyebrow">看板</span><h1>${esc(p.name)}的档案</h1>
      <p>${esc(p.headline)}</p></div>
      <div class="actions">${aiButton('dashboard', `帮我用一句话整理${p.name}现在的整体情况，并列出这次复诊最该问的三件事。`)}</div></div>

    <div class="notice blue" style="margin-bottom:16px">
      <b>这一页只做两件事：</b>把散落的记录放到同一条时间线上，并帮你准备下一次沟通。工作台不做诊断、不判断病情好坏、不给治疗建议。
    </div>

    <div class="grid four" style="margin-bottom:16px">${cards}</div>

    ${(() => {
      const sel = oneChartSelection().filter((c) => M()[c] && M()[c].points && M()[c].points.length);
      const chart = sel.length
        ? chartSVG(sel) + legend(sel) + `<p class="small-note">每项按自身全部记录范围缩放，不代表不同指标数值可比；单点不连线。</p>`
        : `<div class="empty"><h3>还没有选要画入一图秀的指标</h3><p>在下面「选择要画进一图秀的指标」里勾选，最多 ${ONE_CHART_MAX} 项。</p></div>`;
      return card('一图秀 · 病程一页纵览', chart + oneChartPicker(), '选中项只看你自己记过的记录；不做判读、不画"趋势好坏"。');
    })()}

    <div class="grid two">
      ${card('接下来', `<div class="rows">
        ${p.rhythm.slice(0, 4).map((r) => `<div class="row"><div class="row-main"><b>${esc(r[0])}</b><span class="row-when">${esc(r[3])}</span></div><div class="row-desc">${esc(r[1])} · ${esc(r[2])}</div></div>`).join('')}
      </div>`, '复诊节奏为医生安排或医嘱原文；未注明来源的按"惯例推定"标注。')}
      ${card('最近一件事', aeRows.length
        ? listRows(aeRows, (r) => rowHTML({ title: '急性加重住院', when: `${r[0]} → ${r[1]}`, desc: `${r[2]}｜${r[3]}`, pill: '自然病程事件', pillTone: 'yellow' }))
        : `<div class="empty"><h3>还没有急性加重记录</h3><p>如果住过院，可以在「急性加重事件」里建一张事件卡。</p></div>`,
        '事件只记录不诊断；具体判定以病历为准。')}
    </div>

    <div style="margin-top:16px">
      ${card('移植评估：还没准备的项（只列要问的）', tpRows.length
        ? `<div class="check-list">${tpRows.map((r) => `<div class="check-item"><span class="mark no">?</span><div class="body"><b>${esc(r[0])}</b><div class="guide">${esc(r[1])}</div><div class="note">${esc(r[4])}</div></div></div>`).join('')}</div>`
        : '<div class="notice grey">所有项都有记录。是否具备条件由移植团队评估，工作台不下结论。</div>',
        '本清单只回答"要带什么、要问什么"，不给资格结论。来源：SPEC §四 F-TP-01。')}
    </div>`;
  }

  /* ---------------- 页面：肺功能趋势 ---------------- */
  /* ---------------- 指标卡（3D 翻面，按 19 号 §指标卡翻转） ----------------
     正面：最新已核对值 + 单位 + 日期 + 记录次数 + 来源
     背面：该指标按真实时间轴排列的历次点（单点不连线）
     **同一张卡只放一个可比序列**；换单位/方法不合并（本仓暂无多方法，留接口）。 */
  const mcardFront = (m) => {
    const nums = numPts(m);
    const latest = m.points && m.points.length ? m.points[m.points.length - 1] : null;
    const prev = nums.length > 1 ? nums[nums.length - 2] : null;
    const cur = nums.length ? nums[nums.length - 1] : null;
    /* 同组前次变化：只在两次都是数值时算；缺一侧写「缺测」，不按 0 处理（数据口径）。 */
    let delta = '';
    if (cur && prev) {
      const d = cur.v - prev.v;
      const sign = d > 0 ? '+' : '';
      delta = `${sign}${(Math.round(d * 10) / 10)}${m.unit || ''}（较 ${esc(prev.d)}）`;
    } else if (cur && !prev) {
      delta = '仅 1 次记录，无法比较';
    }
    return `<span class="mface front">
      <span class="mf-name"><span>${esc(m.name)}</span><span style="color:${m.color}">●</span></span>
      <span class="mf-val">${latest ? esc(String(Number.isFinite(Number(latest.v)) ? latest.v : latest.v)) : '—'}<small>${esc(m.unit || '')}</small></span>
      <span class="mf-meta">
        <span>最近记录：${latest ? esc(latest.d) : '—'}${latest && latest.src ? '｜' + esc(latest.src) : ''}</span>
        <span>已有 ${m.points ? m.points.length : 0} 次记录${delta ? '｜' + delta : ''}</span>
      </span>
      <span class="mf-hint">点卡片看历次记录 →</span>
    </span>`;
  };

  const mcardBack = (m) => {
    const nums = numPts(m);
    const W = 300, H = 96, L = 8, R = 8, T = 8, B = 16;
    if (m.points && m.points.length && !nums.length) {
      /* 定性记录：只列文字值，不假装能画趋势 */
      return `<span class="mface back"><span class="mf-name">${esc(m.name)}</span>
        <span class="mf-empty">${esc((m.points || []).map((p) => `${p.d} ${p.v}`).join('\n'))}</span></span>`;
    }
    if (nums.length <= 1) {
      return `<span class="mface back"><span class="mf-name">${esc(m.name)}</span>
        <span class="mf-empty">只有 ${nums.length} 次记录，暂不连线<br><span style="font-size:11px">${nums.length ? esc(nums[0].d + '  ' + nums[0].v + (m.unit || '')) : ''}</span></span></span>`;
    }
    const ms = nums.map((p) => dateMs(p.d));
    const t0 = Math.min(...ms), t1 = Math.max(...ms);
    const xOf = (msv) => L + (t1 === t0 ? 0.5 : (msv - t0) / (t1 - t0)) * (W - L - R);
    const vals = nums.map((p) => p.v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const span = (hi - lo) || Math.max(Math.abs(hi) * 0.08, 1);
    const yOf = (v) => H - B - ((v - lo) / span) * (H - T - B);
    const pts = nums.map((p, i) => ({ x: xOf(ms[i]), y: yOf(p.v), d: p.d, v: p.v }));
    const path = pts.length > 1 ? `<path d="${smoothPath(pts)}" fill="none" stroke="${m.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    const dots = pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="${m.color}"><title>${esc(p.d + '  ' + p.v + (m.unit || ''))}</title></circle>`).join('');
    const first = pts[0], last = pts[pts.length - 1];
    return `<span class="mface back"><span class="mf-name"><span>${esc(m.name)}</span><span style="font-size:10.5px;color:var(--ink-3);font-weight:500">${nums.length} 次</span></span>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;display:block" role="img" aria-label="${esc(m.name)} 历次记录">
        ${path}${dots}
        <text x="${first.x.toFixed(1)}" y="${H - 3}" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">${esc(String(first.d).slice(2))}</text>
        <text x="${last.x.toFixed(1)}" y="${H - 3}" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">${esc(String(last.d).slice(2))}</text>
      </svg>
      <span class="mf-hint">再点返回 →</span></span>`;
  };

  const mcard = (m) => `<button class="mcard" type="button" data-mcard="${esc(m.key)}" data-flipped="false" aria-pressed="false" aria-roledescription="指标卡：可翻面" aria-label="${esc(m.name)}，${m.points ? m.points.length : 0} 次记录，点击翻看历次记录">
      <span class="mcard-inner">${mcardFront(m)}${mcardBack(m)}</span>
    </button>`;

  /* 按类别分组渲染：类别名 + 项数 + 有记录项数；空组不消失（折叠标题仍能找到）。
     目录顺序与项数来自 METRIC_CATALOG（唯一来源），指标页与一图秀选择窗共用。 */
  function metricGroups(onlyCodes) {
    const all = M();
    const blocks = METRIC_CATALOG.map((cat) => {
      const codes = cat.codes.filter((c) => (onlyCodes ? onlyCodes.includes(c) : true));
      const items = codes.map((c) => all[c]).filter(Boolean);
      if (!items.length) return '';
      const recorded = items.filter((m) => m.points && m.points.length);
      const head = `<div class="mgroup-head"><h3>${esc(cat.name)}</h3><span class="mgroup-count">${items.length} 项 · 有记录 ${recorded.length} 项</span></div>`;
      /* 空组：整组无记录时折叠（避免一屏空卡），但标题仍在 */
      if (!recorded.length) {
        return `<div class="mgroup"><details><summary class="mgroup-head"><h3>${esc(cat.name)}</h3><span class="mgroup-count">${items.length} 项 · 尚无记录（点开补录）</span></summary><div class="metric-grid">${items.map(mcard).join('')}</div></details></div>`;
      }
      return `<div class="mgroup">${head}<div class="metric-grid">${items.map(mcard).join('')}</div></div>`;
    }).filter(Boolean);
    return blocks.join('') || `<div class="empty"><h3>还没有记录任何指标</h3><p>先导入一次检验单，或手工补录一个值。</p></div>`;
  }

  /* ---------------- 一图秀指标选择窗 ----------------
     与指标页共用 METRIC_CATALOG（组名/顺序/项数一致，24 号 §2）。
     上限 4 个：超了不静默丢，明确提示"最多选 4 项"。 */
  function oneChartSelection() {
    if (!state.oneChart) state.oneChart = {};
    const key = state.profile;
    if (!state.oneChart[key]) {
      const def = (P().dash_keys || []).slice(0, ONE_CHART_DEFAULT);
      state.oneChart[key] = def;
    }
    return state.oneChart[key];
  }

  function oneChartPicker() {
    const sel = oneChartSelection();
    const all = M();
    const groupsHTML = METRIC_CATALOG.map((cat) => {
      const items = cat.codes.map((c) => all[c]).filter(Boolean);
      if (!items.length) return '';
      const rows = items.map((m) => {
        const on = sel.includes(m.key);
        const nums = numPts(m);
        const last = m.points && m.points.length ? m.points[m.points.length - 1] : null;
        /* 没记录的指标不能选进图（选了也是空线）——明确禁用并说明原因 */
        const disabled = !last;
        return `<label class="pick-row${disabled ? ' is-disabled' : ''}">
          <input type="checkbox" data-action="oc-toggle" data-code="${esc(m.key)}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <span class="pick-name"><b style="color:${m.color}">●</b> ${esc(m.name)}</span>
          <span class="pick-val">${last ? `${esc(String(last.v))}${esc(m.unit || '')} · ${esc(last.d)}` : '还没有记录'}</span>
          <span class="pick-n">${nums.length} 点</span>
        </label>`;
      }).join('');
      return `<div class="pick-group"><div class="pick-group-head">${esc(cat.name)}</div>${rows}</div>`;
    }).join('');
    return `<div class="card">
      <div class="card-head"><div><h2>选择要画进一图秀的指标</h2>
        <p class="small-note" style="margin:4px 0 0">最多 ${ONE_CHART_MAX} 项。已选 <b id="oc-count">${sel.length}</b> 项。每项按自身范围缩放，不共用 Y 轴。</p></div>
        <div class="actions"><button class="soft" data-action="oc-reset">恢复默认</button></div></div>
      <div class="pick-list">${groupsHTML}</div>
      <p class="small-note">没有记录的指标不能选（选了只会得到一条空线）。分类与指标页一致，来自同一份目录。</p>
    </div>`;
  }

  function pagePft() {
    const p = P(), s = sub('pft');
    if (s === '检查登记') {
      return head('pft', '肺功能趋势', '检查登记', aiButton('pft', '帮我把最近一次肺功能报告的关键值整理进「检查登记」。'))
        + card('已登记的检查', listRows(p.pft.rows, (r) => rowHTML({ title: `${r[0]}｜${r[1]}`, desc: `${r[3]}｜${r[4]}`, src: `${r[5]}；支气管舒张剂：${r[2]}` })),
          '数值同时进入趋势页（同一份事实，不另存一份）。')
        + card('手工登记（示例：≤6 字段）', `<div class="grid two">
            <label><span class="form-label">检查日期</span><input type="date" value="2026-10-18"></label>
            <label><span class="form-label">FVC %pred</span><input type="number" inputmode="decimal" value="63"></label>
            <label><span class="form-label">DLCO %pred</span><input type="number" inputmode="decimal" value="48"></label>
            <label><span class="form-label">报告文件</span><input type="text" value="肺功能报告 2026-10-18.pdf"></label>
          </div><div class="actions" style="margin-top:12px"><button class="primary" data-action="demo-save">保存（演示）</button></div>`,
          '手工通道是收敛入口，默认走 AI/解析候选；数字输入使用数字键盘（IP7）。');
    }
    if (s === '数据口径') {
      return head('pft', '肺功能趋势', '数据口径', '')
        + card('口径与边界', `<div class="rows">
          ${rowHTML({ title: '随访节奏', desc: '本仓按 3 个月展示（惯例推定，B 级待核）；指南 #69 原文只写"基线及随访过程中"，未给具体间隔。' })}
          ${rowHTML({ title: '可比性', desc: 'FVC%pred 与 DLCO%pred 各按自身全部记录范围缩放，不共用 Y 轴；图上已写明不可比。' })}
          ${rowHTML({ title: '单点不连线', desc: '只有一个时间点的指标只画点，不连折线，避免造出趋势。' })}
          ${rowHTML({ title: '不做判读', desc: '不生成"恶化/好转/进展"结论；PPF 判定属医生任务。' })}
          ${rowHTML({ title: '缺失不插补', desc: '某次未做 DLCO 时该点为空，相邻差值显示「缺测，无法计算」，不按 0 处理。' })}
        </div>`, '来源：国家卫生健康委《86 个罕见病病种诊疗指南（2025 年版）》#69（印刷页 408–411）；research/RESEARCH-MEDICAL-2026-10-25.md §2 A8。');
    }
    const codes = ['fvc', 'dlco', 'sixmwt'];
    return head('pft', '肺功能趋势', '趋势图', aiButton('pft', '帮我把 FVC%pred、DLCO%pred 和 6 分钟步行距离的变化整理成复诊时要问的问题，不要给结论。'))
      + card('趋势（FVC%pred / DLCO%pred / 6MWD）', chartSVG(codes) + legend(codes) + `<p class="small-note">每条线按该指标全部记录范围缩放，不代表不同指标数值可比；单点不连线。</p>`)
      + `<div class="card" style="margin-top:16px"><div class="card-head"><div><h2>全部指标（按类别）</h2><p class="small-note" style="margin:4px 0 0">点卡片翻面看这项指标的历次记录；再次点击返回。分类取指标定义，不需要你自己分组。</p></div></div>${metricGroups()}</div>`
      + `<div class="grid two" style="margin-top:16px">
        ${card('相邻两次的变化（并列，不判断）', listRows(p.pft.rows.slice(0, 5), (r, i, arr) => {
          const nxt = arr[i + 1];
          return rowHTML({ title: r[0], desc: r[3], src: nxt ? `与上一次（${nxt[0]}）相比：请对照两次报告原文` : '基线记录' });
        }), '差值只在两次都是数值时计算；缺一侧显示「缺测，无法计算」。')}
        ${card('这次可以问的问题', `<ul style="padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.8">
          <li>最近两次的 FVC 和 DLCO 变化，在您看来算稳定吗？</li>
          <li>下次肺功能检查安排在什么时候？</li>
          <li>如果这半年继续下降，下一步通常会考虑什么？</li>
          <li>（如已用氧）活动时氧流量要不要调整？</li>
        </ul><p class="small-note">这些是"要问的"，不是"要做的事"；答案由医生给。</p>`, '')}
      </div>`;
  }

  /* ---------------- 页面：氧状态与日常快记 ---------------- */
  function pageOxygen() {
    const p = P(), s = sub('oxygen');
    if (s === '氧疗记录') {
      return head('oxygen', '氧状态与日常快记', '氧疗记录', aiButton('oxygen', '帮我把氧疗使用情况整理成一段记录，不要给指征判断。'))
        + card('氧疗记录（只记实际使用）', listRows(p.oxygen.rows, (r) => rowHTML({ title: `${r[1]}｜${r[2]} L/min`, when: r[0], desc: r[3], pill: r[4] ? '在用' : '已停', pillTone: r[4] ? 'green' : 'grey' })),
          '不写"是否需要吸氧"这类指征结论；处方原文照录。');
    }
    const codes = ['spo2r', 'spo2e', 'o2flow'];
    return head('oxygen', '氧状态与日常快记', '快记时间线', aiButton('oxygen', '帮我把最近几天的气促、血氧和氧流量整理一下，指出变化起点，不要判断严重程度。'))
      + card('最近快记（含变化锚点）', listRows([
        { d: '2026-10-17', mmrc: '2 级', rest: 94, ex: 86, flow: 3, note: '上午走小区一圈，中途歇了一次', anchor: true },
        { d: '2026-10-16', mmrc: '2 级', rest: 95, ex: 88, flow: 2, note: '比昨天好一些', anchor: false },
        { d: '2026-10-15', mmrc: '3 级', rest: 93, ex: 84, flow: 3, note: '受凉后喘得厉害，走几步就停', anchor: true },
        { d: '2026-10-14', mmrc: '2 级', rest: 95, ex: 88, flow: 2, note: '—', anchor: false },
      ], (r) => `<div class="row"><div class="row-main"><b>mMRC ${esc(r.mmrc)}</b><span class="row-when">${esc(r.d)}</span>${r.anchor ? '<span class="pill yellow">变化起点</span>' : ''}</div>
        <div class="row-desc">静息 SpO₂ ${r.rest}% ｜ 活动后 SpO₂ ${r.ex}% ｜ 活动时氧流量 ${r.flow} L/min</div>
        <div class="row-src">${esc(r.note)}</div></div>`),
        '数值均为本人自录；变化起点由本人标记，工作台不判断是否属于加重。')
      + `<div class="grid two" style="margin-top:16px">
        ${card('氧合趋势（静息/活动 SpO₂）', chartSVG(codes) + legend(codes))}
        ${card('快记一笔（示例：≤6 字段）', `<div class="grid two">
            <label><span class="form-label">日期</span><input type="date" value="2026-10-18"></label>
            <label><span class="form-label">mMRC 档位</span><select><option>0 级</option><option>1 级</option><option selected>2 级</option><option>3 级</option><option>4 级</option></select></label>
            <label><span class="form-label">静息 SpO₂ %</span><input type="number" inputmode="numeric" value="94"></label>
            <label><span class="form-label">活动后 SpO₂ %</span><input type="number" inputmode="numeric" value="86"></label>
            <label><span class="form-label">活动时氧流量 L/min</span><input type="number" inputmode="decimal" step="0.5" value="3"></label>
            <label><span class="form-label">备注</span><input type="text" value="走到小区门口"></label>
          </div><div class="actions" style="margin-top:12px"><button class="primary" data-action="demo-save">记一笔（演示）</button><button class="soft" data-action="demo-save">标为变化起点</button></div>`,
          '量表档位只存本人自录原值，不存服务端计算档位，也不进趋势折线。')}
      </div>`;
  }

  /* ---------------- 页面：急性加重事件（32 号折叠卡） ---------------- */
  function foldCards(rows) {
    const p = P();
    const d = p.pathway.detail;
    const block = (name) => {
      const b = d[name];
      return `<div class="pd-block"><h4>${esc(name)}</h4><p>${esc(b.summary)}</p><ul>${b.items.map(([k, v]) => `<li><b>${esc(k)}</b>：${esc(v)}</li>`).join('')}</ul></div>`;
    };
    const phases = rows.length ? rows : p.pathway.rows;
    return phases.map(([when, name, tag, text]) => `<details class="phase-fold"${state._foldOpen ? ' open' : ''}>
      <summary><span class="ph-name">● ${esc(name)}</span><span class="ph-when">${esc(when)}</span>${tag ? `<span class="pill">${esc(tag)}</span>` : ''}<span class="ph-text">${esc(text)}</span></summary>
      <div class="ph-hint">默认收起；点开看这一阶段的五块细节（方案 / 指标和趋势 / 影像发现 / 副作用总结 / 支持与效果）。</div>
      <div class="phase-detail">${['方案', '指标和趋势', '影像发现', '副作用总结', '支持与效果'].map(block).join('')}</div>
    </details>`).join('');
  }

  function pageAe() {
    const p = P(), s = sub('ae');
    if (s === '前后对照') {
      return head('ae', '急性加重事件', '前后对照', '')
        + card('事件前后趋势并列（不合并、不算斜率结论）', chartSVG(['fvc', 'dlco']) + legend(['fvc', 'dlco'])
          + `<div class="notice grey" style="margin-top:12px">事件前的点与事件后的点都按各自记录展示；工作台不计算"下降速度"，也不判断恢复程度。</div>`,
          '一图秀规则：单点不连线、独立归一化、图上写明不可比（16 号 R1/R2）。');
    }
    const rows = p.ae.rows;
    return head('ae', '急性加重事件', '事件卡', aiButton('ae', '帮我把这次住院的经过整理成一张事件卡：时间、起因、出院用药、复查节点。'))
      + (rows.length ? `<div style="margin-bottom:16px">${rows.map((r) => card(`事件卡 · ${r[0]}`, `<div class="rows">
          ${rowHTML({ title: '住院区间', desc: `${r[0]} → ${r[1]}（${r[2]}）` })}
          ${rowHTML({ title: '起因（原样记录）', desc: r[3] })}
          ${rowHTML({ title: '出院带药与氧疗处方', desc: r[4] })}
          ${rowHTML({ title: '复查节点', desc: r[5] || '未登记' })}
          ${rowHTML({ title: '病历原文摘录', desc: r[6] })}
        </div>`, '急性加重的诊断由医生给出；这里只保存原文与日期。')).join('')}</div>`
        : `<div class="empty" style="margin-bottom:16px"><h3>还没有急性加重事件</h3><p>住过院的话，点「与 AI 一起整理」或手工建一张事件卡。</p></div>`)
      + `<h2 style="margin:8px 0 10px">治疗与事件路径（折叠卡）</h2>
        ${foldCards(p.pathway.rows)}
        <p class="small-note">打印时全部展开（@media print），一页拿到完整病程；默认全部收起。</p>`;
  }

  /* ---------------- 页面：用药与耐受记录 ---------------- */
  function pageMed() {
    const p = P(), s = sub('med');
    const rows = p.med.rows;
    const byDrug = {};
    rows.forEach((r) => { (byDrug[r[0]] = byDrug[r[0]] || []).push(r); });
    if (s === '剂量变更史') {
      return head('med', '用药与耐受记录', '剂量变更史', aiButton('med', '帮我把剂量变更按时间整理成一条线，写清每次变更的时间和原因原文。'))
        + card('变更史（按时间，只追加不覆盖）', listRows(rows.slice().sort((a, b) => a[2].localeCompare(b[2])), (r) => rowHTML({
          title: `${r[0]}｜${r[4]}`, when: r[3] ? `${r[2]} → ${r[3]}` : `${r[2]} 起`, desc: `原因原文：${r[5]}`, src: `不良反应记录：${r[6]}`, pill: r[7] ? '在用' : '已停', pillTone: r[7] ? 'green' : 'grey',
        })), '更正只新增版本：改剂量是追加一行，不覆盖旧行（04 号 revision 契约）。');
    }
    return head('med', '用药与耐受记录', '按药聚合', aiButton('med', '帮我把用药和剂量变更整理成复诊时能带走的清单，不要给调整建议。'))
      + `<div class="grid two">${Object.entries(byDrug).map(([drug, rs]) => card(drug, listRows(rs, (r) => rowHTML({
        title: r[4], when: r[3] ? `${r[2]} → ${r[3]}` : `${r[2]} 起`, desc: `原因原文：${r[5]}`, src: `耐受记录：${r[6]}`, pill: r[7] ? '在用' : '已停', pillTone: r[7] ? 'green' : 'grey',
      })), '剂量与原因原样保存，不推荐调整。')).join('')}</div>
      <div style="margin-top:16px">${card('加一条剂量变更（示例：≤6 字段）', `<div class="grid two">
        <label><span class="form-label">药名</span><input type="text" value="尼达尼布"></label>
        <label><span class="form-label">变更日期</span><input type="date" value="2026-10-18"></label>
        <label><span class="form-label">剂量原文</span><input type="text" value="100 mg 每日两次"></label>
        <label><span class="form-label">原因（原文）</span><input type="text" value="医生原话：先维持，下次复查再定"></label>
      </div><div class="actions" style="margin-top:12px"><button class="primary" data-action="demo-save">追加变更（演示）</button></div>`, '追加一行 = 一条新版本；旧版本仍可在变更史里看到。')}</div>`;
  }

  /* ---------------- 页面：影像档案 ---------------- */
  function pageImaging() {
    const p = P(), s = sub('imaging');
    if (s === '报告原文') {
      return head('imaging', '影像档案', '报告原文', '')
        + card('HRCT 报告结论原文摘录', listRows(p.imaging.rows, (r) => rowHTML({ title: `${r[0]}｜${r[1]}`, desc: r[2], src: `${r[3]}；${r[4]}` })),
          '只摘录原文，不做影像模式判读、不给影像分级（红线）。');
    }
    return head('imaging', '影像档案', '检查列表', aiButton('imaging', '帮我把几次 HRCT 报告的结论原文按时间排好，不要解释影像含义。'))
      + card('检查列表（按真实频率，不加密）', `<div class="table-wrap"><table>
        <thead><tr><th>日期</th><th>检查</th><th>报告结论原文</th><th>归档</th><th>节点</th></tr></thead>
        <tbody>${p.imaging.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody>
      </table></div><div class="scroll-hint">表格可横向滚动</div>`,
        '影像间隔按医生安排记录，不人为加密或插值。');
  }

  /* ---------------- 页面：复诊待办与问题清单 ---------------- */
  const QUESTIONS = [
    ['最近两次的 FVC 和 DLCO 变化，算稳定吗？', true],
    ['下次肺功能检查安排在什么时候？', true],
    ['如果继续下降，下一步通常会考虑什么？', false],
    ['（活动时吸氧）氧流量要不要调整？', false],
    ['移植评估需要先做哪些检查？', false],
    ['胃食管反流、睡眠呼吸暂停要不要筛查？', false],
  ];
  function pageVisit() {
    const p = P(), s = sub('visit');
    if (s === '打印文本') {
      return head('visit', '复诊待办与问题清单', '打印文本', '<button class="soft" data-action="demo-save">打印（演示）</button>')
        + card('本次复诊要带 / 要问（打印版）', `<div class="rows">
          ${rowHTML({ title: '要带的资料', desc: '最近两次肺功能报告、最近一次 HRCT 报告与胶片、当前用药清单、氧疗记录。' })}
          ${rowHTML({ title: '要问的问题', desc: QUESTIONS.filter((q) => q[1]).map((q, i) => `${i + 1}. ${q[0]}`).join('　') })}
          ${rowHTML({ title: '想告诉医生的事', desc: '最近半个月吃饭吃得少，体重从 56.4 kg 掉到 55.2 kg；走路时血氧最低 84%。' })}
        </div>`, '打印时折叠卡会自动展开；本页不生成任何结论性表述。');
    }
    if (s === '复诊节奏') {
      return head('visit', '复诊待办与问题清单', '复诊节奏', '')
        + card('复诊节奏（医生安排 / 惯例推定分列）', listRows(p.rhythm, (r) => rowHTML({ title: r[0], when: r[3], desc: `${r[1]}｜${r[2]}` })),
          '带"惯例推定"的条目待 🩺 核对；节奏只做记录与提醒，不生成"该复查了"这类建议句。');
    }
    return head('visit', '复诊待办与问题清单', '问题清单', aiButton('visit', '帮我把这次复诊要问的问题整理成一份清单，按"最想问"排序。'))
      + card('这次要问的（可勾选）', `<div class="check-list">${QUESTIONS.map((q, i) => `<div class="check-item"><span class="mark ${q[1] ? 'yes' : ''}">${q[1] ? '✓' : ''}</span><div class="body"><b>${esc(q[0])}</b><div class="note">${q[1] ? '已勾选，会进打印文本' : '未勾选'}</div></div></div>`).join('')}</div>
        <div class="actions" style="margin-top:12px"><button class="primary" data-action="demo-save">生成打印文本（演示）</button><button class="soft" data-action="demo-save">新增一个问题</button></div>`,
        '问题清单由本人维护；AI 只做整理，不代替发言、不自动填充答案。')
      + `<div class="grid two" style="margin-top:16px">
        ${card('想告诉医生的事（自述）', `<div class="rows">
          ${rowHTML({ title: '吃饭', desc: '最近半个月吃得少，吃几口就喘。' })}
          ${rowHTML({ title: '体重', desc: '从 56.4 kg 掉到 55.2 kg（20 天）。' })}
          ${rowHTML({ title: '活动', desc: '走到小区门口要歇一次，活动后血氧最低 84%。' })}
        </div>`, '只写事实与自述，不写"是不是严重"。')}
        ${card('复诊节奏（最近四项）', listRows(p.rhythm.slice(0, 4), (r) => rowHTML({ title: r[0], when: r[3], desc: `${r[1]}｜${r[2]}` })), '')}
      </div>`;
  }

  /* ---------------- 页面：移植评估信息自检 ---------------- */
  function pageTransplant() {
    const p = P(), s = sub('transplant');
    const rows = p.transplant.rows;
    if (s === '临床试验') return trialHTML();
    if (s === '待问事项') {
      const todo = rows.filter((r) => r[2] === 0);
      return head('transplant', '移植评估信息自检', '待问事项', aiButton('transplant', '帮我把还没准备的项整理成下次要问的问题清单，不要给资格判断。'))
        + card('还没准备 / 还没了解的事', todo.length ? `<div class="check-list">${todo.map((r) => `<div class="check-item"><span class="mark no">?</span><div class="body"><b>${esc(r[0])}</b><div class="guide">${esc(r[1])}</div><div class="note">${esc(r[4])}</div></div></div>`).join('')}</div>`
          : '<div class="notice grey">所有项都有记录。是否具备条件由移植团队评估。</div>',
          '本页只回答"要准备什么、要问什么"；不给资格结论、不排序、不推荐医院与医生。');
    }
    const yes = rows.filter((r) => r[2] === 1).length;
    return head('transplant', '移植评估信息自检', '完整度清单', aiButton('transplant', '帮我把移植评估要准备的资料清单整理出来，标出还缺哪些。'))
      + `<div class="notice warn" style="margin-bottom:16px"><b>这不是资格评估。</b>本页只帮你把「要带什么、要问什么」列清楚；是否适合移植、什么时候转诊，由移植团队与主管医生判断。</div>`
      + card(`完整度（${yes}/${rows.length} 项已准备）`, `<div class="check-list">${rows.map((r) => `<div class="check-item"><span class="mark ${r[2] === 1 ? 'yes' : 'no'}">${r[2] === 1 ? '✓' : '?'}</span><div class="body"><b>${esc(r[0])}</b><div class="guide">${esc(r[1])}</div><div class="note">${r[2] === 1 ? `最近一次：${esc(r[3] || '—')}｜${esc(r[4])}` : esc(r[4])}</div></div></div>`).join('')}</div>`,
        '来源：SPEC §四 F-TP-01；医学口径见 research/RESEARCH-MEDICAL-2026-10-25.md §6（移植评估属医生任务）。');
  }

  /* ---------------- 页签：临床试验（移植评估 → 临床试验） ----------------
     用户要的三块：①基础病理建档 ②检索要素与结果 ③匹配与分析。
     结构上刻意分成三段而不是一个长列表：
     病理建档是"我有什么"、检索是"外面有什么"、匹配是"两者对上了没有"——
     三段分开，用户才知道"待确认"是缺资料还是缺检索。 */
  function trialHTML() {
    const p = P(), sid = state.profile;
    const m = (D.trialMatch && D.trialMatch[sid]) || null;
    const leads = m && m.leads ? m.leads : null;
    const TIER = { satisfied: ['符合', 'ok', '✓'], conflict: ['冲突', 'bad', '!'], undetermined: ['待确认', 'q', '?'] };

    /* ---- ① 匹配建档：只有这里列出的字段参与对照，来源逐项写清 ---- */
    const facts = m && m.facts ? m.facts : {};
    const factRows = [
      ['诊断原文', facts.diagnosis_text?.value_text, facts.diagnosis_text?.source],
      ['HRCT 结论', facts.hrct_pattern?.value_text, facts.hrct_pattern?.source],
      ['病理资料', facts.pathology_available?.value_text, facts.pathology_available?.source],
      ['是否写明 IPF', facts.ipf_excluded?.value_text, facts.ipf_excluded?.source],
      ['抗纤维化用药', facts.antifibrotic_current?.value_text, facts.antifibrotic_current?.source],
      ['FVC %pred', facts.fvc_pred?.value_text, facts.fvc_pred?.source],
    ];
    const missing = [
      ['遗传 / 基因检测', '本仓未建立结构化基因字段'],
      ['肺活检病理报告原文', '本档案只有影像，没有肺穿记录'],
      ['入排标准原文', '本登记只采到标题/登记号/状态，未抓纳入排除原文'],
      ['体力状态评分（ECOG/6MWD 分级）', '本仓未建该字段'],
    ];
    const dossierCard = card('① 匹配建档（只有这里列出的字段参与对照）',
      `<p class="muted">能用来匹配的只有档案里<b>确实有出处</b>的字段；没建的一律不参与，也不猜。</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>字段</th><th>本档案记录</th><th>来源</th></tr></thead><tbody>${
        factRows.map(([k, v, src]) => `<tr><td>${esc(k)}</td><td>${v ? esc(v) : '<span class="muted">本机无记录</span>'}</td><td class="note">${esc(src || '—')}</td></tr>`).join('')
      }</tbody></table></div>
      <h3 style="margin:18px 0 8px;font-size:13px">本地没建档的（这些永远「无法自动匹配」）</h3>
      <ul class="list">${missing.map(([k, why]) => `<li><span><b>${esc(k)}</b><br><span class="muted">${esc(why)}</span></span></li>`).join('')}</ul>
      <p class="muted" style="margin-top:8px">缺字段一律判「待确认」，<b>不判「不符合」</b>——工作台不替你下结论。</p>`,
      '来源：SPEC §四 F-DX-01；医学口径见 research/RESEARCH-MEDICAL-2026-10-25.md。');

    /* ---- ② 检索要素与结果：分层，逐条给证据 ---- */
    const leadRow = (t) => {
      const ev = t.structured.length
        ? t.structured.map((h) => `${h.field}=${h.value}（来源：${h.source || '未记'}）`).join('；')
        : (t.text.length ? t.text.map((h) => h.term).join('、') : t.broad.map((h) => h.term).join('、'));
      return `<li><span><b>${esc(t.title)}</b><br>
        <span class="muted">${esc(t.recordId)} · ${esc(t.status || '状态未标')} · ${esc(t.snapshotNote)}</span><br>
        <span class="muted">命中证据：${esc(ev)}</span></span></li>`;
    };
    const searchCard = leads ? card('② 检索要素与结果（分层给证据，不是一张命中数表）',
      `<div class="row" style="margin-bottom:10px">
        ${[['结构化命中', leads.counts.structured, '建档实体出现在标题里'],
           ['文本命中', leads.counts.text, '题材词重合，逐词给证据'],
           ['宽口径命中', leads.counts.broad, '只沾大词，排最后'],
           ['本地快照', leads.trialCount, '不是"全部相关试验"']]
          .map(([k, v, h]) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${v}</span><span class="muted" style="font-size:11px">${esc(h)}</span></div>`).join('')}
      </div>
      ${leads.flagged.length ? `<div class="notice warn" style="margin-bottom:12px"><b>⚠ 对象不是你这类人的登记</b>：${esc(leads.flaggedNote)}</div>` : ''}
      ${leads.layers.map((L) => `<h3 style="margin:14px 0 6px;font-size:13px">${esc(L.title)} <span class="muted">${esc(L.hint)} · ${L.rows.length} 条</span></h3>
        ${L.rows.length ? `<ul class="list">${L.rows.slice(0, 12).map(leadRow).join('')}</ul>`
          : '<p class="muted">这一层没有结果。</p>'}`).join('')}
      <div class="notice warn" style="margin-top:12px"><b>未查 ≠ 无结果。</b>6 条检索式里只有 1 条命中；ChiCTR / WHO ICTRP / ClinicalTrials.gov / openFDA 本轮未查，不能据此说"这个病没有临床试验"。</div>`,
      '来源：data/trials/pf-ild/manifest.json（unified-trial MCP 四通道，2026-10-25）。')
      : card('② 检索要素与结果', '<p class="muted">本地快照还没有加载。</p>');

    /* ---- ③ 入排条款对照：三档 + 逐条 why ---- */
    let matchBody;
    if (!m || !m.entries.length) {
      matchBody = '<p class="muted">本地还没有登记条目，无法做对照。这不表示"没有试验"，只表示"本页还没收录条目"。</p>';
    } else {
      matchBody = m.entries.map((e) => {
        const rows = (e.rules || []).map((r) => {
          const [label, tone, mark] = TIER[r.tier] || TIER.undetermined;
          return `<li><span class="tier ${tone}">${mark} ${label}</span><span><b>${esc(r.text)}</b><br>
            <span class="muted">${esc(r.why || '')}${r.src ? ' · 来源：' + esc(r.src) : ''}</span></span></li>`;
        }).join('');
        return `<div class="tier-block">
          <div class="tier-head"><b>${esc(e.title)}</b></div>
          <div class="trial-counts">
            <span class="pill green">符合 ${e.counts.satisfied}</span>
            <span class="pill yellow">冲突 ${e.counts.conflict}</span>
            <span class="pill grey">待确认 ${e.counts.undetermined}</span>
            <span class="note">可判定 ${e.decidable} / ${e.total} 条 · 登记号 ${esc(e.recordId)}${e.url ? ` · <a href="${esc(e.url)}" target="_blank" rel="noopener">登记页 ↗</a>` : ''}</span>
          </div>
          <ul class="list tier-rows">${rows}</ul>
        </div>`;
      }).join('');
    }
    const matchCard = card('③ 入排条款对照 · 三档', matchBody,
      esc(m?.footerNote || '本页只做文字对照，不做入组资格判定。') + (m?.channelsNote ? `　${esc(m.channelsNote)}` : ''));

    const ruleCard = card('口径', `<ul class="list">
      <li><span class="muted">登记状态，未核实；<b>登记 ≠ 有效 ≠ 安全 ≠ 可入组</b>。</span></li>
      <li><span class="muted">不产出"匹配度 87%"这类综合分——数值化会把"沾到几个词"伪装成"你符合条件"。</span></li>
      <li><span class="muted">排序按登记来源顺序，<b>不按档位排</b>——按档位排会让人以为前面的更适合。</span></li>
      <li><span class="muted">「待确认」不等于不符合，只表示本机没有这一项记录（缺 ≠ 否）。</span></li>
      <li><span class="muted">工作台不写"建议参加 / 适合你"；AI 只帮你整理命中证据与要问医生的问题。</span></li>
    </ul>`);

    return head('transplant', '移植评估信息自检', '临床试验', aiButton('transplant', '帮我把这页的对照结果整理成下次问医生的问题清单，不要判断我能不能入组。'))
      + `<div class="notice warn" style="margin-bottom:16px"><b>这不是入组资格判定。</b>本页只做「你的档案记录 ↔ 登记条目原文」的文字对照；能不能参加由研究者和研究方案决定。</div>`
      + dossierCard + searchCard + matchCard + ruleCard;
  }

  /* ---------------- 页面：诊断追溯 ---------------- */
  function pageDiagnosis() {
    const p = P(), s = sub('diagnosis');
    const dx = p.diagnosis;
    if (s === '信息断点') {
      return head('diagnosis', '诊断追溯', '信息断点', '')
        + card('记录缺口（只标注，不推断）', listRows(dx.gaps, (r) => rowHTML({ title: r[0], desc: r[1], pill: '待补', pillTone: 'yellow' })),
          '缺口标注用于下次就诊时补资料，不做任何"可能是什么病"的推断。');
    }
    return head('diagnosis', '诊断追溯', '时间线', aiButton('diagnosis', '帮我把从起病到确诊的经过按时间排成一条线，标出信息缺失的地方。'))
      + card(dx.title, listRows(dx.rows, (r) => rowHTML({ title: r[0], desc: r[1], src: r[2] })),
        '只拼接已有记录与本人回忆；诊断本身以医生给出的原文为准。')
      + `<div class="grid two" style="margin-top:16px">
        ${card('医生给出的诊断原文', `<div class="rows">
          ${rowHTML({ title: '病因 / 诊断', desc: p.etiology })}
          ${rowHTML({ title: '记录方式', desc: '照录医生原文，工作台不重写、不改写、不分类。' })}
        </div>`, 'PPF 是疾病行为而非独立诊断（指南 #69 原句）；本仓不设病因选择器。')}
        ${card('事件时间线（全部）', listRows(p.events.slice(-6), (r) => rowHTML({ title: r[1], when: r[0] })), '')}
      </div>`;
  }

  /* ---------------- 页面：报告与资料整理 ---------------- */
  function pageDocs() {
    const p = P(), s = sub('docs');
    if (s === '待核对候选') {
      return head('docs', '报告与资料整理', '待核对候选', aiButton('docs', '帮我把这份报告里能核对的项目列成候选清单，我要逐项确认。'))
        + card('待核对候选（接受之前都只是候选）', listRows(p.candidates, (r) => `<div class="row"><div class="row-main"><b>${esc(r[1])}</b><span class="row-when">${esc(r[2])}</span><span class="pill ${r[4] === '已接受' ? 'green' : 'yellow'}">${esc(r[4])}</span></div><div class="row-desc">来源：${esc(r[3])}</div><div class="actions" style="margin-top:6px"><button class="text-button" data-action="demo-save">接受</button><button class="text-button" data-action="demo-save">改一下</button><button class="text-button" data-action="demo-save">拒收</button></div></div>`),
          'AI 说错是常态：候选落"待核对"、不落"已保存"；拒收零副作用（IP5）。');
    }
    return head('docs', '报告与资料整理', '资料库', aiButton('docs', '帮我看看资料库里还缺哪些报告，列个补料清单。'))
      + `<div class="notice blue" style="margin-bottom:16px">资料目录：<b>未指定</b>。用户明确指定目录之前，工作台不读取、不解析任何真实资料（本条为 M5 硬约束）。</div>`
      + card('资料库（原件永远保留）', `<div class="table-wrap"><table>
        <thead><tr><th>编号</th><th>文件</th><th>日期</th><th>类型</th><th>状态</th></tr></thead>
        <tbody>${p.docs.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td><span class="pill ${r[4] === '待核对' ? 'yellow' : 'green'}">${esc(r[4])}</span></td></tr>`).join('')}</tbody>
      </table></div><div class="scroll-hint">表格可横向滚动</div>`,
        '上传 → 解析 → 逐项核对 → 入档；解析失败保留原件，不静默丢弃。');
  }

  /* ---------------- 页面：营养与日常功能（G1 方案 A 新增） ---------------- */
  function pageNutrition() {
    const p = P(), s = sub('nutrition');
    if (s === '体重趋势') {
      return head('nutrition', '营养与日常功能', '体重趋势', aiButton('nutrition', '帮我把体重变化和进食记录放在一起看，整理成复诊时要说的事。'))
        + card('体重趋势', chartSVG(['wt']) + legend(['wt']) + `<p class="small-note">体重按自身范围缩放；不做热量换算、不做肌少症判定。</p>`);
    }
    return head('nutrition', '营养与日常功能', '进食记录', aiButton('nutrition', '帮我把最近半个月的进食情况整理一下，我要在复诊时告诉医生。'))
      + `<div class="notice warn" style="margin-bottom:16px">这一页只做记录：<b>不做热量换算、不做肌少症判定、不给食谱或补充剂建议</b>。吃不下的原因与处理由医生判断。</div>`
      + card(p.nutrition.title, listRows(p.nutrition.rows, (r) => rowHTML({ title: `${r[0]}｜${r[1]}`, desc: `${r[2]}（进食量：${r[3]}）`, src: `症状：${r[4]}｜${r[5]}` })),
        '进食量为粗档（少/中/多）分类记录，不进趋势折线（26 号 L6 + 硬约束 5）。')
      + `<div class="grid two" style="margin-top:16px">
        ${card('记一餐（示例：≤6 字段）', `<div class="grid two">
          <label><span class="form-label">日期</span><input type="date" value="2026-10-18"></label>
          <label><span class="form-label">餐次</span><select><option>早餐</option><option selected>午餐</option><option>晚餐</option></select></label>
          <label><span class="form-label">吃了什么</span><input type="text" value="半碗饭 + 少量菜"></label>
          <label><span class="form-label">进食量</span><select><option>少</option><option selected>中</option><option>多</option></select></label>
          <label><span class="form-label">当时的症状</span><input type="text" value="吃几口就喘"></label>
          <label><span class="form-label">体重 kg</span><input type="number" inputmode="decimal" step="0.1" value="55.2"></label>
        </div><div class="actions" style="margin-top:12px"><button class="primary" data-action="demo-save">记一餐（演示）</button></div>`, '')}
        ${card('体重与进食对照（最近）', listRows(p.nutrition.rows.slice(0, 3), (r) => rowHTML({ title: r[0], desc: `${r[1]}｜进食量 ${r[3]}｜${r[4]}`, src: `体重记录见趋势页` })), '')}
      </div>`;
  }

  const PAGES_FN = { dashboard: pageDashboard, pft: pagePft, oxygen: pageOxygen, ae: pageAe, med: pageMed, imaging: pageImaging, visit: pageVisit, transplant: pageTransplant, diagnosis: pageDiagnosis, docs: pageDocs, nutrition: pageNutrition };

  function head(view, title, subName, actionsHTML) {
    const subs = SUBPAGES[view] || [];
    const tabs = subs.length ? `<div class="actions" role="tablist" style="margin-bottom:14px">${subs.map((s) => `<button role="tab" aria-selected="${s === subName}" class="${s === subName ? 'primary' : 'soft'}" data-action="sub" data-view="${view}" data-sub="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
    return `<div class="page-head"><div><span class="eyebrow">小呼宝 · ${esc(title)}</span><h1>${subName && subs.length ? esc(subName) : esc(title)}</h1><p>${esc(SUBTITLES[view] || '')}</p></div><div class="actions">${actionsHTML || ''}</div></div>${tabs}`;
  }

  /* ---------------- 渲染 ---------------- */
  function renderNav() {
    $('#nav').innerHTML = PAGES.map(([key, label, ic]) => {
      const n = SUBPAGES[key]?.length;
      return `<button class="nav-button" data-action="go" data-view="${key}" ${state.view === key ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span>${n ? `<span class="nav-count">${n}</span>` : ''}</button>`;
    }).join('');
  }

  function render() {
    const p = P();
    $('#profile-avatar').textContent = p.name.slice(0, 1);
    $('#profile-name').textContent = `${p.name}的资料`;
    $('#profile-meta').textContent = `${p.age} 岁 · ${p.etiology}`;
    const entry = PAGES.find((x) => x[0] === state.view) || PAGES[0];
    $('#breadcrumb').textContent = entry[1];
    document.title = `小呼宝 BreathPal · ${entry[1]} · PF-ILD 工作台原型 __VERSION_DISPLAY__`;
    renderNav();
    $('#main').innerHTML = PAGES_FN[state.view]();
    $('#main').scrollTop = 0;
    syncHash();
  }

  /* ---------------- 弹窗 / 设置 ---------------- */
  function openDialog(title, bodyHTML, footHTML, eyebrow = '小呼宝') {
    $('#dialog-eyebrow').textContent = eyebrow;
    $('#dialog-title').textContent = title;
    $('#dialog-body').innerHTML = bodyHTML;
    $('#dialog-foot').innerHTML = footHTML;
    $('#dialog').showModal();
  }
  const closeDialog = () => $('#dialog').close();

  function openSettings() {
    openDialog('设置', `<div class="rows">
      ${rowHTML({ title: '资料目录', desc: '未指定。指定后才会读取本机报告；主目录 / 桌面 / 下载根 / tmp 一律拒绝。', pill: '未指定', pillTone: 'yellow' })}
      ${rowHTML({ title: '文档解析（MinerU）', desc: '六部件骨架已装，未接真实资料目录（用户确认项）。', pill: '骨架', pillTone: 'grey' })}
      ${rowHTML({ title: '临床参考包', desc: '来源：unified-trial-mcp 在线四通道；离线语料对本病种无覆盖（如实声明）。', pill: '待 M4', pillTone: 'grey' })}
      ${rowHTML({ title: 'AI 对话', desc: '原生面板；草稿只填入输入框，不自动发送。', pill: '不自动发送', pillTone: 'green' })}
    </div>`, `<button class="soft" data-action="close">关闭</button>`);
  }

  function openAbout() {
    openDialog('关于小呼宝', `<div class="rows">
      ${rowHTML({ title: '版本', desc: '__VERSION_DISPLAY__（原型 __VERSION_DISPLAY__）' })}
      ${rowHTML({ title: '构建日期', desc: '2026-10-25' })}
      ${rowHTML({ title: '病种', desc: '进行性纤维化性间质性肺疾病 PF-ILD（罕见病目录 #69 · R2 非肿瘤慢性病型 · T1 优先）' })}
      ${rowHTML({ title: '数据', desc: '全部患者数据为虚构模拟；临床试验为占位，待 M4 检索填充。' })}
      ${rowHTML({ title: '红线', desc: '不做诊断、不做处置建议、不给移植资格结论、不做热量换算，患者数据本机优先。' })}
    </div>`, `<button class="soft" data-action="close">关闭</button>`, '小呼宝 BreathPal');
  }

  function openProfiles() {
    openDialog('切换演示档案', `<div class="rows">${Object.entries(D.profiles).map(([k, pr]) => `<div class="row"><div class="row-main"><b>${esc(pr.name)}</b><span class="pill ${k === state.profile ? 'violet' : 'grey'}">${k === state.profile ? '当前' : '可切换'}</span></div><div class="row-desc">${esc(pr.headline)}</div><div class="actions" style="margin-top:6px"><button class="soft" data-action="switch" data-k="${k}">切换到 ${esc(pr.name)}</button></div></div>`).join('')}</div>`,
      `<button class="soft" data-action="close">关闭</button>`);
  }

  /* ---------------- Agent 面板与草稿（不自动发送） ---------------- */
  const MESSAGE_TYPE = 'pf-ild:agent-draft';
  const agentHostAvailable = () => { try { return Boolean(window.parent) && window.parent !== window; } catch { return false; } };

  function contextFor(view) {
    const p = P();
    const lines = [];
    if (view === 'pft') p.pft.rows.slice(0, 4).forEach((r) => lines.push(`· ${r[0]} ${r[3]}`));
    else if (view === 'oxygen') lines.push('· 最近快记：mMRC 2 级，静息 94%，活动后 86%，氧流量 3 L/min');
    else if (view === 'ae') p.ae.rows.forEach((r) => lines.push(`· ${r[0]}→${r[1]} ${r[2]}｜${r[3]}`));
    else if (view === 'med') p.med.rows.forEach((r) => lines.push(`· ${r[0]} ${r[4]}（${r[2]}${r[3] ? '→' + r[3] : ' 起'}）`));
    else if (view === 'imaging') p.imaging.rows.slice(0, 3).forEach((r) => lines.push(`· ${r[0]} ${r[1]}：${r[2]}`));
    else if (view === 'transplant') p.transplant.rows.filter((r) => r[2] === 0).forEach((r) => lines.push(`· 未准备：${r[0]}`));
    else if (view === 'diagnosis') p.diagnosis.rows.forEach((r) => lines.push(`· ${r[0]} ${r[1]}`));
    else if (view === 'docs') p.docs.forEach((r) => lines.push(`· ${r[1]}（${r[3]}｜${r[4]}）`));
    else if (view === 'nutrition') p.nutrition.rows.forEach((r) => lines.push(`· ${r[0]} ${r[1]}：${r[2]}，进食量 ${r[3]}`));
    else p.dash_keys.forEach((k) => { const m = M()[k]; if (m) { const last = m.points[m.points.length - 1]; lines.push(`· ${m.name}：${last.v}${m.unit || ''}（${last.d}）`); } });
    return { label: (PAGES.find((x) => x[0] === view) || [])[1], lines };
  }

  function openAgentDraft(view, promptText) {
    const { label, lines } = contextFor(view);
    const draft = `${promptText || '帮我把这一页的内容整理成复诊准备材料。'}\n\n【只整理已记录的内容】\n${lines.join('\n')}\n\n【要求】不要给诊断或处置建议；不要判断病情好坏；缺项就列出来让我确认。`;
    openDialog(`与 AI 对话 · ${label}`, `<div class="notice blue">下面这些是<b>你记录过的内容</b>，会整理成一段草稿。草稿只会填进输入框，<b>不会自动发送</b>。</div>
      <div class="agent-preview">
        <div class="agent-block"><b>会带进对话的内容</b><ul>${lines.map((l) => `<li>${esc(l.replace(/^· /, ''))}</li>`).join('')}</ul></div>
        <div class="agent-block gaps"><b>这次没带入</b><ul><li>心理/情绪私密记录——默认不带（fail-closed）</li><li>原始报告文件——只带文件名与状态，不带内容</li></ul></div>
      </div>
      <label style="display:block;margin-top:12px"><span class="form-label">实际填入会话的草稿（可以改）</span><textarea id="agent-prompt">${esc(draft)}</textarea></label>
      <p class="small-note">${agentHostAvailable() ? '点「填入 AI 对话」后，这段文字会出现在右侧会话输入框里，发送前还能改。' : '当前是独立打开的页面，没有 AI 面板；可以先复制草稿。'}</p>`,
      `${agentHostAvailable() ? `<button class="soft" data-action="close">取消</button><button class="soft" data-action="agent-copy">复制草稿</button><button class="primary" data-action="agent-send">填入 AI 对话</button>` : `<button class="soft" data-action="close">取消</button><button class="primary" data-action="agent-copy">复制草稿</button>`}`,
      '小呼宝 · 只整理已记录的内容');
  }

  function agentSend() {
    const prompt = $('#agent-prompt')?.value?.trim();
    if (!prompt) { toast('草稿是空的，先写一点'); return; }
    try { window.parent.postMessage({ type: MESSAGE_TYPE, prompt }, window.location.origin); }
    catch { toast('没能传给 AI 面板；可以用「复制草稿」自己粘过去'); return; }
    closeDialog();
    toast('已填入右侧 AI 对话的输入框，按回车发送');
  }
  function agentCopy() {
    const prompt = $('#agent-prompt')?.value?.trim();
    if (!prompt) { toast('草稿是空的，先写一点'); return; }
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(prompt).then(() => toast('草稿已复制')).catch(() => toast('复制失败：可以手动选中草稿')); return; }
    toast('复制失败：可以手动选中草稿');
  }

  function toggleAgent(force) {
    state.agentOpen = typeof force === 'boolean' ? force : !state.agentOpen;
    $('#agent-dock').hidden = !state.agentOpen;
    $('#work-grid').classList.toggle('agent-open', state.agentOpen);
    $('#agent-toggle').setAttribute('aria-expanded', String(state.agentOpen));
    $('#agent-state').textContent = state.agentOpen ? '已进入激活' : '未进入激活';
    $('#agent-dot').classList.toggle('on', state.agentOpen);
    if (state.agentOpen && !$('#agent-body').dataset.init) {
      $('#agent-body').dataset.init = '1';
      $('#agent-body').innerHTML = `<div class="agent-empty">这里是与本机 Agent 的原生会话面板。<br><br>
        · 会话由宿主按本工作台会话授权，重启后需重新创建；<br>
        · 页面上的「与 AI 一起整理」会把<b>已记录内容</b>整理成草稿，<b>只填入输入框、不自动发送</b>；<br>
        · 私密记录默认不带入。</div>`;
    }
  }

  /* ---------------- 指标卡翻面 ----------------
     卡片本身是 button，键盘 Enter/Space 天然可用；**来源点等内部可点元素不触发翻回**
     （24 号：来源点有独立点击行为，不能触发翻回）。 */
  function toggleMcard(cardEl) {
    const on = cardEl.getAttribute('data-flipped') === 'true';
    cardEl.setAttribute('data-flipped', String(!on));
    cardEl.setAttribute('aria-pressed', String(!on));
  }
  document.addEventListener('click', (event) => {
    const cardEl = event.target.closest('.mcard[data-mcard]');
    if (cardEl) {
      /* 内部独立交互元素（来源点/链接）不翻卡 */
      if (event.target.closest('[data-no-flip], a, [data-action]')) return;
      toggleMcard(cardEl);
      return;
    }
  });

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'oc-toggle') {
      const code = el.dataset.code;
      const sel = oneChartSelection();
      const i = sel.indexOf(code);
      if (i >= 0) { sel.splice(i, 1); render(); return; }
      if (sel.length >= ONE_CHART_MAX) {
        /* 超上限：checkbox 的浏览器原生勾选已经发生了，必须**重渲染把状态改回去**，
           否则界面显示已选 5 项而数据只有 4 项——提示是对的、界面是错的。 */
        toast(`最多选 ${ONE_CHART_MAX} 项（先去勾掉一个）`);
        render();
        return;
      }
      sel.push(code); render(); return;
    }
    if (action === 'oc-reset') { state.oneChart[state.profile] = null; render(); return; }
    if (action === 'go') { state.view = el.dataset.view; render(); return; }
    if (action === 'sub') { state.sub[el.dataset.view] = el.dataset.sub; render(); return; }
    if (action === 'profiles') { openProfiles(); return; }
    if (action === 'switch') { state.profile = el.dataset.k; closeDialog(); render(); toast('已切换演示档案'); return; }
    if (action === 'settings') { openSettings(); return; }
    if (action === 'about') { openAbout(); return; }
    if (action === 'open-store') { openSettings(); return; }
    if (action === 'close') { closeDialog(); return; }
    if (action === 'help') { openDialog('原型操作说明', `<div class="rows">
      ${rowHTML({ title: '切换页面', desc: '左侧导航 11 项：看板 + 10 条业务功能线。' })}
      ${rowHTML({ title: '二级页签', desc: '页面标题下方按钮切换；每页二级按场景分步。' })}
      ${rowHTML({ title: 'AI 面板', desc: '顶栏「AI 对话」开关；可隐藏重开，隐藏不清空草稿。' })}
      ${rowHTML({ title: '折叠卡', desc: '治疗路径默认收起，点开看五块细节。' })}
    </div>`, '<button class="soft" data-action="close">关闭</button>'); return; }
    if (action === 'agent') { toggleAgent(); return; }
    if (action === 'agent-size') {
      const w = { narrow: '24%', std: '32%', wide: '44%' }[el.dataset.size];
      $('#work-grid').style.setProperty('--agent-w', w);
      document.querySelectorAll('[data-action="agent-size"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      toast(`面板宽度：${el.textContent}`);
      return;
    }
    if (action === 'agent-build') {
      const { lines, label } = contextFor(state.view);
      $('#agent-body').insertAdjacentHTML('beforeend', `<div class="msg me">整理「${esc(label)}」要点</div><div class="msg">已读取 ${lines.length} 条已记录内容，整理成草稿放在输入框（未发送）。</div>`);
      openAgentDraft(state.view, `帮我把「${label}」这一页的内容整理成复诊准备材料。`);
      return;
    }
    if (action === 'agent-demo') { $('#agent-body').insertAdjacentHTML('beforeend', '<div class="msg">（模拟回复自检：面板可用，未连接模型。）</div>'); return; }
    if (action === 'agent-draft') { openAgentDraft(el.dataset.page, el.dataset.prompt); return; }
    if (action === 'agent-send') { agentSend(); return; }
    if (action === 'agent-copy') { agentCopy(); return; }
    if (action === 'demo-save') { toast('演示：已记录（原型不落库，刷新重置）'); return; }
  });

  /* 页面内二级页签属于 head() 生成的按钮，已在委托中处理 */
  $('#font-toggle').addEventListener('click', () => {
    state.large = !state.large;
    document.body.classList.toggle('large', state.large);
    $('#font-toggle').setAttribute('aria-pressed', String(state.large));
  });

  /* 响应式探针：`?probe=resp` 时逐页渲染并测量横向溢出，把结果写进 DOM 供无头浏览器抓取。
     30 号要求"每条规则要有探针或单测兜底，不许口头说没问题"。 */
  function runResponsiveProbe() {
    const out = [];
    const keep = { view: state.view, sub: { ...state.sub } };
    for (const [key, label] of PAGES) {
      const subs = SUBPAGES[key] || [null];
      for (const sn of subs) {
        state.view = key;
        if (sn) state.sub[key] = sn;
        render();
        const de = document.documentElement;
        const overflow = de.scrollWidth - de.clientWidth;
        /* 规则 3：行内标签不得成为 flex item 被压成竖排单字（抽样：任一元素宽度 < 24px 且高度 > 宽度×2） */
        let squeezed = 0;
        document.querySelectorAll('#main .row-main > *, #main .check-item .body > *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.width < 24 && r.height > r.width * 2) squeezed++;
        });
        out.push({ page: key + (sn ? '/' + sn : ''), label, overflow, squeezed, width: de.clientWidth });
      }
    }
    state.view = keep.view; state.sub = keep.sub; render();
    const pre = document.createElement('pre');
    pre.id = 'probe-result';
    pre.textContent = JSON.stringify({ viewport: window.innerWidth, pages: out,
      bad: out.filter((x) => x.overflow > 1 || x.squeezed > 0) }, null, 2);
    document.body.appendChild(pre);
  }

  applyHash();
  window.addEventListener('hashchange', () => { if (applyHash()) { if (D) { render(); maybeOpenFromHash(); } } });

  async function boot() {
    const ok = await loadBootstrap();
    if (!ok) { renderBootError(); return; }
    render();
    maybeOpenFromHash();
    if (state._wantProbe === 'resp') runResponsiveProbe();
  }
  boot();

  /* 重新检查连接：失败态下唯一可用动作，不刷新整页 */
  window.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action="retry-connect"]');
    if (el) { bootError = null; boot(); }
  });
  function maybeOpenFromHash() {
    if (state._wantAgent) toggleAgent(true);
    if (state._wantDraft) { const { label } = contextFor(state.view); openAgentDraft(state.view, `帮我把「${label}」这一页的记录整理成复诊材料。`); }
  }
})();
