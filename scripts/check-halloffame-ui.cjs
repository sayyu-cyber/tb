/**
 * Hall of Fame (Arena) — design/arena/screens/app/app-10-hall-of-fame.jpg.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/halloffame-test');
const mocks = path.join(__dirname, 'halloffame-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/hooks/useHallOfFame', '@/hooks/useTranslation', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'halloffame-test-entry.tsx'),
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
    await page.route('**/hall-of-fame/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}" style="margin:0">`
        + `<div class="arena-app app-shell ar-stage"><main class="app-shell-main">`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/hall-of-fame/');
    await page.getByRole('heading', { name: 'Hall of Fame' }).waitFor();
    await page.waitForTimeout(250);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.legend').count(), 3, 'Three podium cards');
    assert.equal(await page.locator('.legend.g1').count(), 1, 'One gold');
    assert.deepEqual(await page.locator('.legend .place').allTextContents(), ['2', '1', '3'],
      'laid out second, first, third');
    assert.deepEqual(await page.locator('.legend b.n').allTextContents(),
      ['Rasheed', 'Nashid', 'Aishath'], 'with the right three players');
    assert.deepEqual(await page.locator('.legend .peak').allTextContents(), ['78', '91', '70'],
      'and their peak trophies');
    assert.ok((await page.locator('.legend.g1').innerText()).includes('131 wins (68%)'),
      'The win rate is worked out, not stored');
    assert.equal(await page.locator('.hrow:not(.head)').count(), 6, 'The rest are listed');
    assert.equal(await page.locator('.hrow.me').count(), 1, 'Your row is marked');
    assert.deepEqual((await page.locator('.hrow:not(.head) .pos').allTextContents()), ['4', '5', '6', '7', '8', '9'],
      'numbered on from the podium');
    assert.ok((await page.locator('.hrow.me').innerText()).toUpperCase().includes('YOU'));
    assert.ok((await page.locator('.strip').innerText()).toUpperCase().includes('RANKED BY PEAK TROPHIES'));

    // ── The states the board cannot draw ────────────────────────────────
    await page.goto(BASE + '/hall-of-fame/?two');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.legend').count(), 2, 'A young hall shows only who is on it');
    assert.equal(await page.locator('.hof-list').count(), 0, 'and no empty table below');
    await page.goto(BASE + '/hall-of-fame/?empty');
    await page.getByText('No legends yet. Be the first.').waitFor();
    await page.goto(BASE + '/hall-of-fame/?failure');
    await page.getByText('The hall could not be loaded.').waitFor();
    await page.getByRole('button', { name: /Try again/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-refreshed'), 'yes');

    // ── Widths ──────────────────────────────────────────────────────────
    for (const state of ['', '?empty']) {
      await page.goto(BASE + '/hall-of-fame/' + state);
      await page.waitForTimeout(250);
      // The wide screen's sizes. A phone gets LHallOfFame, checked below.
      for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [768, 1024]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${state} ${width}`);
        assert.equal(
          await page.locator('.legend,.hrow').evaluateAll(
            nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
          ), true, `Clipping ${state} ${width}`);
        await page.screenshot({ path: path.join(output, `${state ? 'empty' : 'hall'}-${width}.png`), fullPage: true });
      }
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/hall-of-fame/');
    await page.waitForTimeout(250);
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'One h1 on screen');
    // Only one composition mounts, so there is one h1.
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');

    assert.deepEqual(errors, []);
    // ── On a phone: LHallOfFame ─────────────────────────────────────────
    // design/arena/boards/LHallOfFame.dc.html. The phone is landscape only
    // (design/arena/LANDSCAPE.md): the strip with your place, the podium 2,
    // 1, 3 across, then everyone after third in two columns.
    // scripts/check-landscape-screens.cjs holds it against its reference.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.arena-halloffame.ar-page').count(), 0, 'The wide screen is unmounted');
    const phone = page.locator('.arena-lhalloffame');
    assert.equal(await phone.isVisible(), true, 'and LHallOfFame takes over');
    assert.ok((await phone.locator('.strip').innerText()).toUpperCase().includes('YOU · NO. 5'), 'Your place on the strip');
    assert.deepEqual(await phone.locator('.legend .place').allTextContents(), ['2', '1', '3'], 'The podium, 2 1 3');
    assert.equal(await phone.locator('.hrow').count(), 6, 'Ranks 4 to 9');
    assert.ok((await phone.locator('.ph h2').innerText()).toUpperCase().includes('RANKS 4–9'), 'named for the range they cover');
    assert.equal(await phone.locator('.hrow.me .pos').innerText(), '5', 'with your row lit');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 844');
    await page.screenshot({ path: path.join(output, 'lhalloffame-844.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Hall of Fame: LHallOfFame on a phone, the three podium cards in board order with their peaks and computed win rates, the ranked list numbered on from the podium with your row marked, the two-legend/empty/error states, four wide-screen widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
