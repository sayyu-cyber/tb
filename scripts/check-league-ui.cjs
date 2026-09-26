/**
 * Weekend League (Arena) — design/arena/screens/app/app-09-weekend-league.jpg.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/league-test');
const mocks = path.join(__dirname, 'league-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/hooks/useTranslation', '@/lib/weekendLeague',
  '@/constants/ranks', 'next/navigation', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'league-test-entry.tsx'),
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
    await page.route('**/tournament/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/tournament/');
    await page.getByRole('heading', { name: 'Weekend League is live' }).waitFor();
    await page.waitForTimeout(250);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.leaguehero').count(), 1, 'The hero');
    assert.equal(await page.locator('.gbtn').count(), 2, 'Two game buttons');
    assert.equal(await page.locator('.rule').count(), 4, 'Four rules');
    assert.equal(await page.locator('.cd div').count(), 2, 'A two-cell countdown');
    assert.equal(await page.locator('.srow').count(), 13, 'Thirteen in the standings');
    assert.equal(await page.locator('.srow.me').count(), 1, 'Your row is marked');
    assert.deepEqual((await page.locator('.srow .wt').allTextContents()).slice(0, 3), ['64', '57', '49'],
      'The board\'s top three');
    assert.ok((await page.locator('.league-qual').innerText()).includes('You qualify · Gold'));

    // ── CODE ISSUE 9 ────────────────────────────────────────────────────
    // Live: the sentence says when it ends, with a real time.
    const liveLede = await page.locator('.league-lede').innerText();
    assert.ok(/Ends \w+ \d{2}:\d{2}/.test(liveLede), `Live copy names the end time (got: ${liveLede})`);
    assert.ok(!/Ends\s*\.$/.test(liveLede), 'and is never left dangling');

    // Closed: it says when it OPENS - the case that used to render empty.
    await page.goto(BASE + '/tournament/?closed');
    await page.waitForTimeout(250);
    await page.getByRole('heading', { name: 'Weekend League', exact: true }).waitFor();
    const shutLede = await page.locator('.league-lede').innerText();
    assert.ok(/Opens \w+ \d{2}:\d{2}/.test(shutLede), `Closed copy names the open time (got: ${shutLede})`);
    assert.ok(!/Opens\s*\.$/.test(shutLede), 'and is not the empty "Opens ." this used to be');
    assert.equal(await page.locator('.pill.live').count(), 0, 'No Live pill outside the window');
    const disabled = await page.locator('.gbtn:disabled').count();
    assert.equal(disabled, 2, 'and both games are unavailable rather than hidden');
    // The countdown still runs - to the opening, not to nothing.
    assert.equal(await page.locator('.cd div').count(), 2);
    assert.ok(/\d/.test(await page.locator('.cd').innerText()), 'with real figures in it');

    // ── Not qualified ───────────────────────────────────────────────────
    await page.goto(BASE + '/tournament/?bronze');
    await page.waitForTimeout(250);
    assert.ok((await page.locator('.league-qual').innerText()).includes('Reach Silver'));
    assert.equal(await page.locator('.gbtn:disabled').count(), 2, 'A Bronze player cannot enter');

    // ── Entering ────────────────────────────────────────────────────────
    await page.goto(BASE + '/tournament/');
    await page.waitForTimeout(250);
    await page.locator('.gbtn').first().click();
    assert.equal(await page.locator('body').getAttribute('data-destination'), '/play/mindi/ranked');
    await page.locator('.gbtn.b').click();
    assert.equal(await page.locator('body').getAttribute('data-destination'), '/play/gin-rummy/ranked');

    // ── Empty and error ─────────────────────────────────────────────────
    await page.goto(BASE + '/tournament/?empty');
    await page.getByText('No qualified players yet this week.').waitFor();
    await page.goto(BASE + '/tournament/?failure');
    await page.getByText('Standings could not be loaded.').waitFor();

    // ── Widths ──────────────────────────────────────────────────────────
    for (const state of ['', '?closed']) {
      await page.goto(BASE + '/tournament/' + state);
      await page.waitForTimeout(250);
      for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${state} ${width}`);
        assert.equal(
          await page.locator('.gbtn,.rule,.srow').evaluateAll(
            nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
          ), true, `Clipping ${state} ${width}`);
        await page.screenshot({ path: path.join(output, `${state ? 'closed' : 'live'}-${width}.png`), fullPage: true });
      }
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/tournament/');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    assert.equal(await page.locator('.cd[aria-label]').count(), 1, 'The countdown says what it counts');
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');

    assert.deepEqual(errors, []);
    console.log('Weekend League: hero, two game buttons, four rules, the countdown, thirteen standings with your row marked, a REAL open time when the window is closed (code issue 9), the unqualified state, entering both games, empty/error, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
