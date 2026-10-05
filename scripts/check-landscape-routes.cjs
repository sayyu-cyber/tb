// Every route in the app on a landscape phone (design/arena/LANDSCAPE.md).
//
// Each route is opened at 844x390, 740x360 and 932x430. None may scroll
// sideways. No control may be cut off: none may run past the right edge
// or start under the rail, and none may be clipped by a box that does not
// scroll. The primary action - the first control on the page - must be
// wholly on screen. Held upright (390x844) every route shows the turn gate;
// a match shows MRotate instead.
//
// Public routes are the dev server's own pages. Signed-in routes render in
// the real AppShell through scripts/landscape-routes-entry with
// scripts/landscape-routes-services: a signed-in player, no network, so
// each screen is in its empty state (a few named states have fixtures).
// The boarded screens are matched against their boards by
// check-landscape-screens; the live tables (casual/ai, casual/passplay,
// casual/online/live, ranked/live) by check-landscape-tables.
//
//   node scripts/check-landscape-routes.cjs [--shots]   (dev server on :3000)
//   --shots writes each route at 844x390 to artifacts/landscape-routes/;
//   --only=/home,/play opens just those.
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/landscape-routes');
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const SHOTS = process.argv.includes('--shots');
const ONLY = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',');

/** Every page.tsx under app/ (and not-found, error, loading). */
const PUBLIC = ['/', '/login/', '/forgot-password/', '/confirm-email/', '/reset-password/', '/privacy/', '/terms/'];
const SIGNED_IN = [
  // Boarded (check-landscape-screens matches these to their boards).
  '/home', '/friends', '/clubs', '/messages', '/leaderboard', '/play', '/profile', '/settings', '/achievements',
  '/collection', '/inventory', '/room-cards', '/hall-of-fame', '/tournament', '/shop', '/rewards', '/missions',
  '/play/mindi/room',
  // No board.
  '/play/mindi/ranked', '/play/gin-rummy/ranked', '/play/mindi/ranked-duo', '/play/mindi/ranked-duo?code=K7M4QR',
  '/play/mindi/ranked-duo?code=K7M4QR&full', '/play/mindi/casual/online', '/play/post-match', '/play/post-match?m=test',
  '/play/post-match?m=test&lost', '/player?uid=nashid', '/admin', '/no-such-page', '/error', '/loading',
];
/** Held upright these keep MRotate (AppShell's `inMatch`). */
const MATCH = ['/spectate'];
const SIZES = [[844, 390], [740, 360], [932, 430]];

function build() {
  const mocks = path.join(__dirname, 'landscape-routes-services.tsx');
  const alias = Object.fromEntries([
    '@/contexts/AuthContext', '@/contexts/EconomyContext', '@/contexts/SettingsContext', '@/contexts/HomeSocialContext',
    '@/hooks/useTranslation', 'next/navigation', 'next/link', '@/lib/supabase/client', '@/lib/rooms',
  ].map(name => [name + '$', mocks]));
  alias['@'] = root;
  return new Promise((resolve, reject) => compiler.webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'landscape-routes-entry.tsx'),
    output: { path: output, filename: 'component.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
    plugins: [
      new compiler.webpack.NormalModuleReplacementPlugin(/\.css$/, 'data:text/javascript,export default {};'),
      // The same modules reached by a relative path (components/vip, lib/matchCommand, ...).
      new compiler.webpack.NormalModuleReplacementPlugin(/^(\.\.\/)+contexts\/(AuthContext|EconomyContext|SettingsContext|HomeSocialContext)$/, mocks),
      new compiler.webpack.NormalModuleReplacementPlugin(/^\.\/supabase\/client$/, mocks),
      new compiler.webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
      new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }),
    ],
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
}

/** What is on screen: the gates, sideways scroll, and every control that is cut off. */
function measure() {
  const shown = el => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  const rail = document.querySelector('.mrail');
  const railEdge = shown(rail) ? rail.getBoundingClientRect().right : 0;
  const chrome = '.phone-chrome, .turn-gate, .rotate-gate, .app-skip-link, .app-sidebar, .app-shell-toolbar, .desk-view, [inert], [aria-hidden="true"]';
  const controls = [...document.querySelectorAll('button:not(:disabled), a[href], input:not([type=hidden]):not(:disabled), select, textarea')]
    .filter(el => !el.closest(chrome));
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.querySelector('[aria-label]')?.getAttribute('aria-label') || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const cut = [];
  let primary = null;
  for (const el of controls) {
    const style = getComputedStyle(el);
    let r = el.getBoundingClientRect();
    if (!r.width || !r.height || style.visibility === 'hidden' || +style.opacity === 0) continue;
    // Clip by every box above it that hides its overflow. A box that
    // scrolls that way can bring the control into view; one that hides it
    // cuts it off.
    let box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, clippedBy = null, hidden = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.position === 'fixed') break;
      const pr = p.getBoundingClientRect();
      for (const [axis, lo, hi] of [['x', 'left', 'right'], ['y', 'top', 'bottom']]) {
        const o = axis === 'x' ? s.overflowX : s.overflowY;
        if (o === 'visible') continue;
        const scrolls = o === 'auto' || o === 'scroll';
        const nlo = Math.max(box[lo], pr[lo]), nhi = Math.min(box[hi], pr[hi]);
        if (nhi - nlo <= 0) { hidden = true; break; }
        if (!scrolls && (nlo > box[lo] + 1 || nhi < box[hi] - 1) && s.clipPath === 'none') clippedBy = p.className.toString().split(' ')[0] || p.tagName;
        if (scrolls) { box = { ...box }; continue; }
        box[lo] = nlo; box[hi] = nhi;
      }
      if (hidden) break;
    }
    if (hidden || /(^|\s)sr-only(\s|$)/.test(el.className) || style.clipPath !== 'none' && style.clipPath.startsWith('inset(50%')) continue;
    primary ??= { el, r };
    const problems = [];
    if (r.right > innerWidth + 1 && !el.closest('[class*="overflow-x"], .chips, .tabs') ) problems.push(`runs ${Math.round(r.right - innerWidth)}px past the right edge`);
    if (r.left < railEdge - 1) problems.push(`starts ${Math.round(railEdge - r.left)}px under the rail`);
    if (clippedBy) problems.push(`is clipped by .${clippedBy}`);
    if (problems.length) cut.push(`"${name(el)}" ${problems.join(', ')}`);
  }
  const p = primary && primary.r;
  return {
    overflow: document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth - innerWidth : 0,
    turnGate: shown(document.querySelector('.turn-gate')),
    rotateGate: shown(document.querySelector('.rotate-gate')),
    railed: railEdge > 0,
    primary: primary ? name(primary.el) : null,
    primaryOk: !p || (p.left >= railEdge - 1 && p.right <= innerWidth + 1 && p.top >= -1 && p.bottom <= innerHeight + 1),
    box: p && [Math.round(p.left), Math.round(p.top), Math.round(p.right), Math.round(p.bottom)],
    cut: [...new Set(cut)].slice(0, 6),
  };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  await build();
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const failures = [], report = [];
  try {
    const source = await browser.newPage();
    await source.goto(base + '/login/');
    const urls = await source.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.map(n => n.href));
    const css = []; for (const url of urls) { const r = await source.request.get(url); css.push(await r.text()); }
    const body = await source.locator('body').getAttribute('class'); await source.close();
    const script = fs.readFileSync(path.join(output, 'component.js'), 'utf8');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(s => `<style>${s}</style>`).join('')}</head><body class="${body}"><div id="test-root"></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;

    async function open(route, width, height) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      if (PUBLIC.includes(route)) {
        await page.goto(base + route);
      } else {
        await page.route('**/landscape-routes/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
        await page.goto(`${base}/landscape-routes/?route=${encodeURIComponent(route)}`);
      }
      await page.waitForTimeout(route === '/' ? 900 : 1500);
      return { page, context, errors };
    }

    for (const route of [...PUBLIC, ...SIGNED_IN, ...MATCH].filter(r => !ONLY || ONLY.includes(r))) {
      for (const [width, height] of SIZES) {
        const { page, context, errors } = await open(route, width, height);
        const m = await page.evaluate(measure);
        const problems = [];
        if (errors.length) problems.push(`throws: ${errors[0].slice(0, 120)}`);
        if (m.overflow) problems.push(`scrolls ${m.overflow}px sideways`);
        if (!m.primaryOk) problems.push(`its primary action "${m.primary}" is off screen at ${JSON.stringify(m.box)}`);
        problems.push(...m.cut);
        if (m.turnGate || m.rotateGate) problems.push('a gate shows');
        report.push(`${problems.length ? 'FAIL' : 'ok  '} ${route} ${width}x${height}${m.railed ? ' rail' : ''} - primary "${m.primary ?? 'none'}"${problems.length ? '\n       ' + problems.join('\n       ') : ''}`);
        if (problems.length) failures.push(`${route} at ${width}x${height}: ${problems.join('; ')}`);
        if (SHOTS && width === 844) await page.screenshot({ path: path.join(output, route.replace(/[/?=&]+/g, '-').replace(/^-|-$/g, '') || 'splash') + '.png' });
        await context.close();
      }
      // Held upright: the turn gate - or MRotate in a match - and the other one not.
      const { page, context } = await open(route, 390, 844);
      const m = await page.evaluate(measure);
      const match = MATCH.includes(route);
      const ok = match ? m.rotateGate && !m.turnGate : m.turnGate && !m.rotateGate;
      report.push(`${ok ? 'ok  ' : 'FAIL'} ${route} 390x844 - ${m.turnGate ? 'turn gate' : m.rotateGate ? 'MRotate' : 'no gate'}`);
      if (!ok) failures.push(`${route} at 390x844: ${match ? 'MRotate should show' : 'the turn gate should show'}, shows ${m.turnGate ? 'the turn gate' : m.rotateGate ? 'MRotate' : 'neither'}`);
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(report.join('\n'));
  assert.deepEqual(failures, [], 'Landscape route failures');
  console.log(`PASS: ${PUBLIC.length + SIGNED_IN.length + MATCH.length} routes and states at 844x390, 740x360 and 932x430 - nothing scrolls sideways, no control is cut off, the primary action is on screen - and held upright each shows the turn gate (MRotate in a match).`);
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { build };
