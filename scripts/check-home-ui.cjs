/**
 * Home (Arena) — design/arena/screens/app/app-01-home.jpg.
 *
 * Bundles app/(main)/home/page.tsx with the contexts swapped for
 * scripts/home-test-services.tsx (the board's own sample data), serves it
 * at /home/ so it picks up the app's real stylesheets, then checks the
 * board's structure, the states and the accessibility list from
 * design/arena/WORKSPLIT.md.
 *
 * Environment:
 *   CHECK_PLAYWRIGHT  where to require playwright from
 *   CHECK_CHANNEL     browser channel ("msedge" by default; "" for the
 *                     bundled Chromium)
 *   CHECK_BASE_URL    the dev server (http://127.0.0.1:3000 by default)
 * These exist so the same script runs on a machine with Edge and in a
 * plain Chromium environment, instead of hard-coding one person's paths.
 */
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const PLAYWRIGHT = process.env.CHECK_PLAYWRIGHT
  || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);
const CHANNEL = process.env.CHECK_CHANNEL === undefined ? 'msedge' : process.env.CHECK_CHANNEL;
const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/home-test');
const mocks = path.join(__dirname, 'home-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/EconomyContext', '@/contexts/SettingsContext',
  '@/contexts/HomeSocialContext', '@/hooks/useRankLock', '@/hooks/useSeasonInfo',
  '@/hooks/useNews', 'next/link', 'next/navigation',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'home-test-entry.tsx'),
    output: { path: output, filename: 'component.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));

  const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    await page.goto(BASE + '/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.map(n => n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output, 'component.js'), 'utf8');
    await page.route('**/home/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/home/');
    await page.getByRole('heading', { name: 'Thaasbai.' }).waitFor();

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.hero .fan .cardw').count(), 4, 'Four foil Tens in the hero fan');
    assert.equal(await page.locator('.hero .ring').count(), 1, 'The LED ring');
    assert.equal(await page.locator('.cover').count(), 2, 'Two game covers');
    assert.equal(await page.locator('.sc').count(), 9, 'Nine shortcuts');
    assert.equal(await page.locator('.news').count(), 3, 'Three Latest Updates cards');
    assert.equal(await page.locator('.hudstrip .stat').count(), 5, 'Five stat tiles');
    assert.equal(await page.locator('.panel.tick').count() >= 2, true, 'Corner-ticked panels');

    // ── The board's numbers, from the board's sample data ───────────────
    const strip = await page.locator('.hudstrip').innerText();
    for (const value of ['Sayyu', 'Gold', '58', '96', '54', '12', 'Season 9']) {
      assert.ok(strip.includes(value), `Stats strip shows ${value} (got: ${strip.replace(/\n/g, ' | ')})`);
    }
    // Gold's weekly payout, from RANK_CONFIGS - the point of code issue 3.
    assert.ok((await page.locator('.panel.tick').first().innerText()).includes('350'), 'Gold weekly reward is 350');

    // ── States ──────────────────────────────────────────────────────────
    assert.equal(await page.locator('.lockbar').count(), 0, 'No lock bar outside the league window');
    await page.goto(BASE + '/home/?locked');
    await page.getByRole('heading', { name: 'Thaasbai.' }).waitFor();
    assert.equal(await page.locator('.lockbar').count(), 1, 'Lock bar while ranks are locked');
    assert.equal(await page.locator('.lockbar').getAttribute('role'), 'status', 'Lock bar announces itself');

    // ── The covers route by mode ────────────────────────────────────────
    await page.goto(BASE + '/home/');
    await page.getByRole('heading', { name: 'Thaasbai.' }).waitFor();
    await page.locator('.cover.mindi').click();
    assert.equal(await page.locator('body').getAttribute('data-destination'), '/play/mindi/casual/online');
    await page.getByRole('combobox', { name: 'Mode' }).selectOption('ranked');
    await page.locator('.cover.gin').click();
    assert.equal(await page.locator('body').getAttribute('data-destination'), '/play/gin-rummy/ranked');
    await page.goto(BASE + '/home/?guest');
    await page.getByRole('heading', { name: 'Thaasbai.' }).waitFor();
    await page.locator('.cover.mindi').click();
    assert.equal(await page.locator('body').getAttribute('data-destination'), '/play/mindi/casual/ai', 'A guest gets the AI table');

    // ── Widths ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/home/');
    await page.getByRole('heading', { name: 'Thaasbai.' }).waitFor();
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      await page.screenshot({ path: path.join(output, 'home-' + width + '.png'), fullPage: true });
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    const unlabelled = await page.locator('button:not([aria-label]):not(:has-text(""))').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only button has an aria-label');
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    assert.ok(await page.locator('[role=progressbar][aria-valuenow]').count() >= 2, 'Meters report their value');
    // The one looping animation on this screen stops for reduced motion.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE + '/home/?live');
    await page.getByRole('heading', { name: 'Thaasbai.' }).waitFor();
    const looping = await page.locator('.pill.live').first().evaluate(
      node => getComputedStyle(node, '::before').animationName
    );
    assert.equal(looping, 'none', 'The live pill stops blinking under prefers-reduced-motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    assert.deepEqual(errors, []);
    console.log('Home: board structure, board figures, lock-bar state, cover routing incl. guest, seven widths, accessibility and reduced motion passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
