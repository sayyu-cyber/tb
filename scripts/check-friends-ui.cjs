/**
 * Friends (Arena) — design/arena/screens/app/app-04-friends.jpg, with the
 * Requests tab from app-04b.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/friends-test');
const mocks = path.join(__dirname, 'friends-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/ToastContext', 'next/navigation', 'next/link',
  '@/lib/friends', '@/lib/rooms', '@/lib/presence', '@/hooks/useTranslation',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'friends-test-entry.tsx'),
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
    await page.route('**/friends/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/friends/?populated=1');
    await page.getByRole('heading', { name: 'Friends', exact: true }).waitFor();
    await page.waitForTimeout(300);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.sbtn').count(), 3, 'Three stat buttons');
    assert.deepEqual(await page.locator('.sbtn b').allTextContents(), ['12', '2', '1'], 'The board\'s counts');
    assert.equal(await page.locator('.fr').count(), 12, 'Twelve roster rows');
    assert.equal(await page.locator('.fr .st.on').count(), 5, 'Five online');
    assert.equal(await page.locator('.sg').count(), 8, 'Five suggestions and three recently played');
    assert.equal(await page.locator('[role=switch][aria-label="Online only"]').count(), 1, 'The online-only switch');
    assert.ok((await page.locator('.roster-toolbar').innerText()).includes('Online only · 5'));
    // The rank line carries the tier and the trophy count, as the board draws.
    assert.ok((await page.locator('.sg .rank').first().innerText()).includes('·'), 'Suggestions show rank and trophies');

    // ── The more-menu (the board draws it open) ─────────────────────────
    await page.locator('.fr').first().getByRole('button', { name: /^More for / }).click();
    await page.locator('.menu').waitFor();
    const menu = await page.locator('.menu').innerText();
    for (const item of ['View Profile', 'Invite to Mindi', 'Invite to Gin Rummy', 'Remove Friend']) {
      assert.ok(menu.includes(item), `The menu has ${item}`);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.menu').count(), 0, 'Escape closes it');

    // ── Filtering and sorting ───────────────────────────────────────────
    await page.getByRole('switch', { name: 'Online only' }).click();
    assert.equal(await page.locator('.fr').count(), 5, 'Online only leaves five');
    await page.getByRole('switch', { name: 'Online only' }).click();
    await page.getByRole('textbox', { name: 'Search friends by username' }).fill('mar');
    assert.equal(await page.locator('.fr').count(), 1, 'Search narrows the roster');
    await page.getByRole('textbox', { name: 'Search friends by username' }).fill('');
    await page.getByRole('combobox', { name: 'Sort friends' }).selectOption('name');
    assert.equal(await page.locator('.fr .nm2 b').first().innerText(), 'ADAM', 'Alphabetical sorts A first');

    // ── Requests tab (app-04b) ──────────────────────────────────────────
    await page.getByRole('button', { name: /^Requests/ }).click();
    await page.waitForTimeout(150);
    const requests = await page.locator('.roster-list').innerText();
    for (const heading of ['Incoming requests', 'Sent requests', 'Room invites']) {
      assert.ok(requests.includes(heading), `The board's ${heading} section`);
    }
    assert.equal(await page.locator('.ibtn.accept').count(), 2, 'Two incoming requests to accept');
    assert.equal(await page.locator('.fr.invite').count(), 1, 'One room invite, ringed blue');
    await page.locator('.ibtn.accept').first().click();
    assert.equal(await page.locator('body').getAttribute('data-accepted'), 'true');
    await page.getByRole('button', { name: /^Cancel request to/ }).click();
    await page.waitForTimeout(100);

    // Blocked stays disabled: the app has no blocking from this screen.
    assert.equal(await page.getByRole('button', { name: 'Blocked' }).isDisabled(), true);

    // ── Add-friend dialog ───────────────────────────────────────────────
    await page.getByRole('button', { name: 'Add Friend', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('textbox', { name: 'Username or player ID' }).fill('ZxNova');
    await page.getByRole('button', { name: 'Search players' }).click();
    await page.getByText('ZxNova').waitFor();
    await page.getByRole('button', { name: /^Add ZxNova/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-sent'), 'yes');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);

    // ── Empty, guest and error states ───────────────────────────────────
    await page.goto(BASE + '/friends/');
    await page.getByRole('heading', { name: 'Friends', exact: true }).waitFor();
    await page.getByText('No friends yet').waitFor();
    await page.goto(BASE + '/friends/?guest=1');
    await page.getByText('Your squad starts here').waitFor();
    await page.goto(BASE + '/friends/?failure=1');
    await page.getByText('Could not load your social activity.').waitFor();

    // ── Widths ──────────────────────────────────────────────────────────
    for (const state of ['?populated=1', '', '?failure=1']) {
      await page.goto(BASE + '/friends/' + state);
      await page.getByRole('heading', { name: 'Friends', exact: true }).waitFor();
      await page.waitForTimeout(250);
      for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${state} ${width}`);
        const name = state.includes('populated') ? 'populated' : state.includes('failure') ? 'error' : 'empty';
        await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      }
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.goto(BASE + '/friends/?populated=1');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('heading', { name: 'Friends', exact: true }).waitFor();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');
    assert.equal(await page.locator('[role=switch][aria-checked]').count(), 1, 'The switch reports its state');

    assert.deepEqual(errors, []);
    console.log('Friends: board structure and counts, the more-menu, filter/search/sort, the Requests tab with all three sections, the add dialog, empty/guest/error states, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
