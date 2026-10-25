/**
 * 宿主接线件 ③：DSH Web 客户端面板（注册工作台入口）。
 *
 * 家族口径：客户端插件只做「入口 + 调宿主 API」，不重画界面——界面全部来自 public/。
 * 本文件在宿主里编译为前端包；独立启动不使用它。
 *
 * ⚠️ 本仓未在真实宿主里实测（宿主内部 API 不在仓内）。宿主加载失败不影响独立启动。
 */
export const clientPlugin = {
  name: 'pf-ild-workbench',
  register(ctx) {
    const apiBase = '/api/pf-ild';
    ctx.panel({
      id: 'pf-ild-workbench',
      title: '小呼宝 · PF-ILD 工作台',
      url: `${apiBase}/`,
      width: 'wide',
    });
  },
};
