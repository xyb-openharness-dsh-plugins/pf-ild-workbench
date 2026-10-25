/* 由 scripts/build-client.mjs 从 src/client.js 生成，勿手改。 */
/* 面板参数来自 lib/layout.js，版本来自 lib/version.js（VERSION 派生）。 */
window.__ModuleLoader__.load({
  id: "@xyb-community/pf-ild-workbench",
  factory(require) {
    const React = require('react')
    /* 注入点：与 lib/layout.js 同源，客户端不许另写一份 0.65 */
    const __PANEL_LAYOUT__ = {"customFrame":true,"businessSide":"left","businessWidth":0.65,"businessWidthMin":0.55,"businessWidthMax":0.7}
    const __VERSION__ = "0.2.2"

    /**
     * 宿主接线件 ③：DSH Desktop 工作台客户端外壳。
     *
     * 家族口径：客户端插件只做「入口 + 装界面 + 连接状态」，**不重画界面**——
     * 业务界面全部来自 `public/`，由 iframe 装进面板。这样原型、dev-server、装机三处
     * 看到的是同一份 HTML/CSS/JS，不会出现"开发版一套、装机另一套"。
     *
     * 为什么不能留 init 生成的骨架（2026-10-25 装机前实测）：
     *   init 版 `lib/client.js` 只渲染一句「服务已连接、业务功能待实现」的占位文案，
     *   **从不请求 public/**。dev-server 挂在根上直接服务 public/，所以本地一切正常；
     *   装进 Desktop 才看到骨架——「dev 全绿 ≠ 装机能用」的第 3 类失败。
     *
     * 本文件由 `scripts/build-client.mjs` 打包成 `lib/client.js`（宿主加载的就是后者）。
     * 面板参数不在这里手写第二份：layout 由构建时从 lib/layout.js 注入。
     *
     * 注意：本仓**没有**自建 AI 会话面板。顶部/右侧会话由宿主提供，本外壳不画、
     * 也不冒充——capabilities 里只有 bootstrap/profile/health/trialMatch。
     */

    const UI_ENTRY = '/pf-ild/'
    const HEALTH_URL = '/api/pf-ild/api/health'

    const META = {
      title: '小呼宝 BreathPal 肺纤维化工作台',
      panelTitle: '小呼宝 · PF-ILD',
      icon: '🌿',
      repository: 'https://github.com/xyb-openharness-dsh-plugins/pf-ild-workbench',
      description: '本机优先的进行性纤维化性间质性肺疾病（PF-ILD）肺功能趋势、氧状态、急性加重事件与复诊准备工作台',
      audience: 'PF-ILD 患者与照护者',
      requirements: '本机数据整理；不做诊断、不给处置建议、不判断移植资格，判断由用户与其医生做出。',
      author: '小呼宝 BreathPal 社区贡献者',
    }

    const CLIENT_NAME = 'pf-ild-workbench'
    const INJECT = ['desktopWorkbenches']

    /* 等待 iframe 首次 load 的宽限：宿主刚重启时插件可能还没就绪，过早报错会吓人 */
    const LOAD_GRACE_MS = 8000

    function buildPanel(React, layout) {
      const h = React.createElement
      const { useState, useEffect, useRef } = React

      return function Panel() {
        const [phase, setPhase] = useState('loading')   // loading | ready | broken
        const [version, setVersion] = useState('')
        const [detail, setDetail] = useState('')
        const [attempt, setAttempt] = useState(0)
        const timer = useRef(null)

        useEffect(() => {
          setPhase('loading'); setDetail('')
          const controller = new AbortController()
          fetch(HEALTH_URL, { signal: controller.signal, credentials: 'same-origin' })
            .then(async (response) => {
              if (!response.ok) throw new Error(`服务连接失败 (${response.status})`)
              return response.json()
            })
            .then((health) => { if (!controller.signal.aborted) setVersion(health.version || '') })
            .catch((failure) => {
              if (controller.signal.aborted) return
              setDetail(failure.message)
              setPhase('broken')
            })
          timer.current = setTimeout(() => {
            setPhase((current) => (current === 'loading' ? 'broken' : current))
            setDetail((d) => d || '页面加载超时')
          }, LOAD_GRACE_MS)
          return () => { controller.abort(); clearTimeout(timer.current) }
        }, [attempt])

        if (phase === 'broken') {
          return h('main', {
            style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 12,
              justifyContent: 'center', alignItems: 'center', padding: 28, textAlign: 'center',
              font: '15px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif', color: '#34413c' },
          },
            h('strong', { style: { fontSize: 17 } }, `工作台没能打开${version ? `（v${version}）` : ''}`),
            h('p', { role: 'status', style: { margin: 0, maxWidth: 520, color: '#596c62' } },
              detail || '页面没有加载成功。'),
            h('p', { style: { margin: 0, maxWidth: 560, color: '#596c62' } },
              '常见原因：Harness 刚重启、插件还没加载完，或还没有在本机新建会话（首次使用需要先建一个会话再回到工作台）。'),
            h('button', {
              type: 'button',
              onClick: () => { setAttempt((n) => n + 1) },
              style: { minHeight: 44, padding: '9px 20px', borderRadius: 999, border: 0,
                background: '#b95023', color: '#fff', cursor: 'pointer', font: 'inherit' },
            }, '重新加载'))
        }

        return h('main', {
          style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0,
            background: '#f7faf8', position: 'relative' },
        },
          h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
              borderBottom: '1px solid #dce7df', background: '#fff', flex: '0 0 auto',
              font: '12.5px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif', color: '#596c62' },
          },
            h('span', null, `${META.icon} ${META.panelTitle}`),
            h('span', { 'aria-hidden': true }, '·'),
            h('span', { 'aria-live': 'polite' }, version ? `v${version}` : '连接中'),
            h('span', { style: { marginInlineStart: 'auto' }, title: '界面由 public/ 提供，与原型同源' }, '本机数据')),
          h('iframe', {
            key: attempt,
            src: UI_ENTRY,
            title: META.title,
            sandbox: 'allow-scripts allow-same-origin allow-forms allow-downloads',
            style: { flex: 1, width: '100%', border: 0, minHeight: 0, background: '#f7faf8' },
            onLoad: () => { clearTimeout(timer.current); setPhase('ready') },
          }),
          phase === 'loading'
            ? h('div', {
              style: { position: 'absolute', inset: '32px 0 0', display: 'grid', placeItems: 'center',
                color: '#596c62', font: '13px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif' },
            }, '正在打开工作台…')
            : null)
      }
    }

    function apply(ctx) {
      const layout = __PANEL_LAYOUT__
      const Panel = buildPanel(React, layout)
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: META.title,
        panelTitle: META.panelTitle,
        icon: META.icon,
        repository: META.repository,
        description: META.description,
        audience: META.audience,
        requirements: META.requirements,
        initialization: 'empty',
        embedded: true,
        version: __VERSION__,
        author: META.author,
        layout: { businessSide: layout.businessSide, businessWidth: layout.businessWidth },
        customFrame: layout.customFrame,
      }, Panel))
    }


    return { apply, inject: ['desktopWorkbenches'] }
  }
})
