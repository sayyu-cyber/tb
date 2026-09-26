/**
 * Achievements (Arena) — design/arena/screens/app/app-08-achievements.jpg.
 *
 * Environment: CHECK_PLAYWRIGHT, CHECK_CHANNEL, CHECK_BASE_URL - see
 * check-home-ui.cjs.
 */
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const nextWebpack = require('next/dist/compiled/webpack/webpack'); nextWebpack.init();
const { webpack } = nextWebpack;
const PLAYWRIGHT = process.env.CHECK_PLAYWRIGHT
  || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);
const CHANNEL = process.env.CHECK_CHANNEL === undefined ? 'msedge' : process.env.CHECK_CHANNEL;
const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/achievements-test');
const mocks = path.join(__dirname, 'achievements-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/EconomyContext', '@/hooks/useTranslation', 'next/link']
  .map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'achievements-test-entry.tsx'),
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
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => node.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output, 'component.js'), 'utf8');
    await page.route('**/achievements/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/achievements/');
    await page.getByRole('heading', { name: 'Achievements' }).waitFor();
    await page.waitForTimeout(250);

    // ── The board's structure and figures ───────────────────────────────
    assert.equal(await page.locator('.arow').count(), 10, 'Ten achievements');
    assert.equal(await page.locator('.arow.done').count(), 4, 'Four complete');
    assert.equal(await page.locator('.aic.off').count(), 6, 'and six greyed hexagons');
    assert.ok((await page.locator('.ach-ring').innerText()).includes('4'), 'The ring says four');
    assert.ok((await page.locator('.ach-ring').innerText()).includes('of 10'));
    assert.equal(await page.locator('.ach-ring[role=img][aria-label]').count(), 1, 'and is labelled');
    assert.equal(await page.locator('.cat').count(), 5, 'Five categories');
    assert.deepEqual(await page.locator('.cat .c').allTextContents(),
      ['4/10', '3/4', '1/2', '0/3', '0/1'], 'with the board\'s counts');

    // A no-coin achievement reads Prestige, not "0".
    const rewards = await page.locator('.rwd .amt').allTextContents();
    assert.ok(rewards.some(text => text.trim() === 'Prestige'), 'A badge-only achievement says Prestige');
    assert.ok(!rewards.some(text => text.trim() === '0'), 'and none reads as zero coins');
    assert.equal(await page.locator('.state.on').count(), 4, 'Four read Unlocked');

    // ── Filtering ───────────────────────────────────────────────────────
    await page.getByRole('button', { name: /^Ranks/ }).click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.arow').count(), 2, 'Ranks has two');
    await page.getByRole('button', { name: /^Special/ }).click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.arow').count(), 1, 'Special has one');
    await page.getByRole('button', { name: /^All/ }).click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.arow').count(), 10);

    // ── The two extremes ────────────────────────────────────────────────
    await page.goto(BASE + '/achievements/?none');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.arow.done').count(), 0, 'A new account has none complete');
    assert.ok((await page.locator('.ach-ring').innerText()).includes('0'));
    await page.goto(BASE + '/achievements/?all');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.arow.done').count(), 10, 'and a finished one has them all');
    assert.equal(await page.locator('.aic.off').count(), 0);

    // ── Widths ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/achievements/');
    await page.waitForTimeout(250);
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      assert.equal(
        await page.locator('.arow,.cat').evaluateAll(
          nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
        ), true, 'Clipping ' + width);
      await page.screenshot({ path: path.join(output, 'achievements-' + width + '.png'), fullPage: true });
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    assert.equal(await page.locator('[role=progressbar][aria-valuenow]').count(), 10, 'Every meter reports its value');
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');

    assert.deepEqual(errors, []);
    console.log('Achievements: ten rows with four complete, the labelled ring, five category counts, Prestige rather than zero, filtering, the empty and finished extremes, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
