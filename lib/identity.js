/**
 * 身份常量：插件 id、API 前缀、数据根目录名、UI 入口。
 *
 * `id` 必须与 package.json 的 name 一致（scripts/check-workbench-package.mjs 比对）；
 * `API_PREFIX` 是**宿主挂载前缀**（与 cordis.patch.yml 的 root slug 无关）：
 *   独立启动时 API_BASE = ''（页面拼 `/api/xxx`）；
 *   宿主里 API_BASE = '/api/pf-ild'（页面拼 `${API_BASE}/api/xxx` = `/api/pf-ild/api/xxx`）。
 * 守卫只禁"交界处重复 /api"（/(^|\/)api$/），**不许 includes('/api') 一刀切**——
 * 宿主前缀含 /api 是正常的（GBM 踩 4）。
 */

export const PLUGIN_ID = 'pf-ild-main';
export const PACKAGE_NAME = '@xyb-community/pf-ild-workbench';
export const API_PREFIX = 'pf-ild';
export const HOME_DIR = 'pf-ild-workbench';
export const DB_FILE = 'xyb-pf-ild.sqlite';
export const UI_ENTRY = 'index.html';

/** 独立启动时的默认端口（仅 dev-server 用；宿主里不使用）。 */
export const DEV_PORT = 7788;
