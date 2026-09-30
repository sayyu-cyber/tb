/**
 * Profile (Arena) — design/arena/screens/app/app-02-profile.jpg.
 *
 * Bundles app/(main)/profile/page.tsx with the contexts swapped for
 * scripts/profile-test-services.tsx (the board's own sample data), serves
 * it at /profile-test/ so it picks up the app's real stylesheets, then
 * checks the board's structure, the states and the accessibility list from
 * design/arena/WORKSPLIT.md.
 *
 * Environment: CHECK_PLAYWRIGHT, CHECK_CHANNEL, CHECK_BASE_URL - see
 * check-home-ui.cjs.
 */
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const PLAYWRIGHT = process.env.CHECK_PLAYWRIGHT
  || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);
const CHANNEL = process.env.CHECK_CHANNEL === undefined ? 'msedge' : process.env.CHECK_CHANNEL;
const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/profile-test');
const mocks = path.join(__dirname, 'profile-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/EconomyContext', '@/contexts/ToastContext',
  '@/hooks/useTranslation', '@/lib/profileHistory',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'profile-test-entry.tsx'),
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
    await page.route('**/profile-test/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}" style="margin:0">`
        + `<div class="arena-app arena-phone app-shell ar-stage"><main class="app-shell-main">`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/profile-test/');
    await page.getByRole('heading', { name: 'Sayyu' }).waitFor();

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.banner .bigav').count(), 1, 'The banner avatar');
    assert.equal(await page.locator('.banner .rkpin .rk').count(), 1, 'The rank hex pinned to it');
    assert.equal(await page.locator('.idchip').count(), 1, 'The ID chip');
    assert.equal(await page.locator('.tile').count(), 5, 'Four statistics tiles, plus the Milestones heart');
    assert.equal(await page.locator('.game').count(), 3, 'Two game cards and the locked slot');
    assert.equal(await page.locator('.wr').count(), 2, 'A win-rate ring per game');
    assert.equal(await page.locator('.ach').count(), 5, 'Five achievement cards');
    assert.equal(await page.locator('.hist:not(.head)').count(), 96, 'One row per online record');

    // ── The board's numbers ─────────────────────────────────────────────
    assert.deepEqual(await page.locator('.tile b').allTextContents(), ['96', '54', '42', '56%'], 'Statistics tiles');
    const games = await page.locator('.game .wr b').allTextContents();
    assert.deepEqual(games, ['59%', '51%'], 'Win-rate rings');
    assert.deepEqual(await page.locator('.game .nums b').allTextContents(), ['61', '36', '35', '18'], 'Per-game counts');
    assert.ok((await page.locator('.banner').innerText()).includes('K7M4QRT'), 'The player code');
    assert.ok((await page.locator('.banner').innerText()).includes('58 trophies'), 'Trophies');
    assert.ok((await page.locator('.banner').innerText()).includes('Member since Jul 2026'), 'Member since');
    // The address is masked, never printed in full.
    const banner = await page.locator('.banner').innerText();
    assert.ok(banner.includes('s••••@gmail.com'), 'Masked address');
    assert.ok(!banner.includes('sayyu@gmail.com'), 'Full address is not shown');

    // ── Tabs, edit, copy ────────────────────────────────────────────────
    assert.equal(await page.getByText('Admin', { exact: true }).count(), 0, 'No admin pill for a normal account');
    await page.getByRole('button', { name: 'History', exact: true }).click();
    assert.equal(await page.locator('.tile').count(), 0, 'History hides the overview panels');
    assert.equal(await page.locator('.hist:not(.head)').count(), 96, 'History keeps the table');
    await page.getByRole('button', { name: 'Overview', exact: true }).click();

    await page.getByRole('button', { name: 'Edit Profile', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('textbox').evaluate(n => document.activeElement === n), true, 'The name field takes focus');
    await page.getByRole('textbox').fill('Renamed Player');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForFunction(() => document.body.dataset.saved === 'Renamed Player');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Edit Profile', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0, 'Escape closes the dialog');

    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async value => { document.body.dataset.copied = value; } },
    }));
    await page.getByRole('button', { name: 'Copy player ID' }).click();
    assert.equal(await page.locator('body').getAttribute('data-copied'), 'K7M4QRT');
    assert.equal(await page.locator('body').getAttribute('data-toast'), 'User ID copied.');

    // ── Widths ──────────────────────────────────────────────────────────
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      assert.equal(
        await page.locator('.banner,.tile,.game,.ach,.hist').evaluateAll(
          nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
        ), true, 'Clipping ' + width);
      await page.screenshot({ path: path.join(output, 'profile-' + width + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── States ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/profile-test/?error');
    await page.getByText('Game statistics and history unavailable.').waitFor();
    await page.goto(BASE + '/profile-test/?empty');
    await page.getByText('No online matches yet. Play one and it will show up here.').waitFor();
    await page.goto(BASE + '/profile-test/?admin');
    await page.getByText('Admin', { exact: true }).waitFor();
    await page.goto(BASE + '/profile-test/?savefail');
    await page.getByRole('button', { name: 'Edit Profile', exact: true }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 1, 'A failed save keeps the dialog open');

    // ── Accessibility ───────────────────────────────────────────────────
    await page.goto(BASE + '/profile-test/');
    await page.getByRole('heading', { name: 'Sayyu' }).waitFor();
    // Two are in the DOM - the wide screen's and MProfile's - and CSS hides
    // one; the accessibility tree must only ever see the one on screen.
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'One h1 on screen');
    assert.ok(await page.locator('[role=progressbar][aria-valuenow]').count() >= 6, 'Meters report their value');
    assert.equal(await page.locator('.wr[role=img][aria-label]').count(), 2, 'The rings are labelled');
    const unlabelled = await page.locator('button').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only button has an aria-label');

    assert.deepEqual(errors, []);
    // ── Held upright: MProfile ──────────────────────────────────────────
    // design/arena/boards/MProfile.dc.html. The same seven sections, with
    // the five tabs as a scrolling chip row and the history table as a row
    // per match.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.arena-profile.ar-page').isVisible(), false, 'The wide screen steps aside');
    const phone = page.locator('.arena-mprofile');
    assert.equal(await phone.isVisible(), true, 'and MProfile takes over');
    assert.equal(await phone.locator('.chips > *').count(), 5, 'All five tabs, as a chip row');
    assert.equal(await phone.locator('.tile').count() >= 4, true, 'The four statistics tiles');
    assert.equal(await phone.locator('.game').count(), 2, 'Both games');
    assert.ok(await phone.locator('.hrow').count() > 0, 'and the match history as rows');
    assert.ok((await phone.innerText()).includes('Member since'), 'The player card keeps its meta');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 390');
    await page.screenshot({ path: path.join(output, 'mprofile-390.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Profile: board structure, MProfile held upright, board figures, masked address, tabs, edit/Escape/copy, seven widths, error/empty/admin/savefail states and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
