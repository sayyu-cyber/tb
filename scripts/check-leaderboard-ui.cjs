/**
 * Leaderboard (Arena) — design/arena/screens/app/app-07-leaderboard.jpg.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/leaderboard-test');
const mocks = path.join(__dirname, 'leaderboard-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/EconomyContext', '@/contexts/HomeSocialContext',
  '@/hooks/useLeaderboard', '@/hooks/useTranslation', '@/constants/ranks', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'leaderboard-test-entry.tsx'),
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
    await page.route('**/leaderboard/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/leaderboard/');
    await page.getByRole('heading', { name: 'Leaderboard' }).waitFor();
    await page.waitForTimeout(300);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.podium .pl').count(), 3, 'Three on the podium');
    assert.deepEqual(await page.locator('.plinth').allTextContents(), ['2', '1', '3'], 'Silver, gold, bronze order');
    assert.deepEqual(await page.locator('.pl .who > b').allTextContents(),
      ['Rasheed', 'Nashid', 'Aishath'], 'and the right three players');
    assert.equal(await page.locator('.podium-crown').count(), 1, 'The winner gets the crown');
    assert.equal(await page.locator('.lrow:not(.head)').count(), 9, 'The table lists the rest');
    assert.equal(await page.locator('.lrow.me').count(), 1, 'Your row is marked');
    assert.equal(await page.locator('#lb-current-user').count(), 1, 'and can be scrolled to');
    assert.ok((await page.locator('.lrow.me').innerText()).includes('You'));

    // ── Your Rank ───────────────────────────────────────────────────────
    const rank = await page.locator('.lb-rank').innerText();
    assert.ok(rank.includes('#10'), 'Your placement');
    assert.ok(rank.includes('33 Trophies'), 'and your trophies');
    assert.ok(rank.includes('2 trophies') && rank.includes('to the next place.'),
      'and the gap to the player above (35 - 33)');

    // ── CODE ISSUE 8 ────────────────────────────────────────────────────
    // profile.rank is Bronze in the fixture, as the app leaves it; the
    // player has 33 trophies, which is Silver. The card must say Silver.
    assert.equal(await page.locator('.rw.cur').count(), 1, 'Exactly one tier is marked as yours');
    const mine = await page.locator('.rw.cur').innerText();
    assert.ok(mine.includes('Silver'), `Your tier comes from trophies, not profile.rank (got: ${mine.replace(/\n/g, ' ')})`);
    assert.ok(mine.includes('150'), 'and it shows Silver\'s payout');
    assert.ok(!(await page.locator('.rw').first().innerText()).includes('You'), 'Bronze is not marked');
    assert.equal(await page.locator('.rw').count(), 4, 'All four tiers are listed');

    // ── Tabs ────────────────────────────────────────────────────────────
    assert.equal(await page.getByRole('button', { name: /^Monthly/ }).isDisabled(), true,
      'Monthly stays disabled - there is no monthly board');
    assert.ok((await page.locator('.lb-tabrow').innerText()).includes('Resets in'), 'The weekly reset counts down');
    await page.getByRole('button', { name: /^All Time/ }).click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.lb-reset').count(), 0, 'and the countdown is weekly-only');

    // ── Search and refresh ──────────────────────────────────────────────
    await page.getByRole('button', { name: /^Weekly/ }).click();
    await page.waitForTimeout(150);
    await page.getByRole('searchbox').fill('mari');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.lrow:not(.head)').count(), 1, 'Search narrows the table');
    assert.equal(await page.locator('.podium').count(), 0, 'and the podium steps aside while searching');
    await page.getByRole('searchbox').fill('zzzz');
    await page.getByText('No players match your search.').waitFor();
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: 'Refresh leaderboard' }).click();
    assert.equal(await page.locator('body').getAttribute('data-refreshed'), 'yes');

    // ── States the board cannot show at once ────────────────────────────
    await page.goto(BASE + '/leaderboard/?first');
    await page.waitForTimeout(300);
    await page.getByText('You are top of the board.').waitFor();
    await page.goto(BASE + '/leaderboard/?nome');
    await page.waitForTimeout(300);
    await page.getByText('Play a ranked match this week and you will appear here.').waitFor();
    await page.goto(BASE + '/leaderboard/?guest');
    await page.waitForTimeout(300);
    await page.getByText('Sign in to see where you stand.').waitFor();
    await page.goto(BASE + '/leaderboard/?empty');
    await page.waitForTimeout(300);
    await page.getByText('No one on the board yet').waitFor();
    await page.goto(BASE + '/leaderboard/?failure');
    await page.waitForTimeout(300);
    await page.getByText('The leaderboard could not be loaded.').waitFor();

    // ── Widths ──────────────────────────────────────────────────────────
    for (const state of ['', '?empty']) {
      await page.goto(BASE + '/leaderboard/' + state);
      await page.waitForTimeout(300);
      for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${state} ${width}`);
        assert.equal(
          await page.locator('.pl,.lrow,.rw').evaluateAll(
            nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
          ), true, `Clipping ${state} ${width}`);
        await page.screenshot({ path: path.join(output, `${state ? 'empty' : 'board'}-${width}.png`), fullPage: true });
      }
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/leaderboard/');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    assert.ok(await page.locator('[role=progressbar][aria-valuenow]').count() >= 1, 'The rank meter reports its value');
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');

    assert.deepEqual(errors, []);
    console.log('Leaderboard: podium and plinth order, the table with your row pinned, Your Rank and the gap above, the Weekly Rewards tier from TROPHIES not profile.rank (code issue 8), tabs with Monthly disabled, search/refresh, first/absent/guest/empty/error states, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
