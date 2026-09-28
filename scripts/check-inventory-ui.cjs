/**
 * Inventory, Collection and Room Cards (Arena) —
 * design/arena/screens/app/app-03-inventory.jpg.
 *
 * One board drives three routes, so one check covers all three. It bundles
 * them with the contexts swapped for scripts/inventory-test-services.tsx
 * (the board's own collection), serves them at /inventory-test/ so they
 * pick up the app's real stylesheets, then checks the board's structure,
 * every tile state, the actions and the accessibility list.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/inventory-test');
const mocks = path.join(__dirname, 'inventory-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/EconomyContext', '@/hooks/useTranslation', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'inventory-test-entry.tsx'),
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
    await page.route('**/inventory-test/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}" style="margin:0">`
        + `<div class="arena-app arena-phone app-shell ar-stage"><main class="app-shell-main">`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/inventory-test/');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();

    // ── The board's structure and figures ───────────────────────────────
    assert.equal(await page.locator('.slot').count(), 5, 'Five loadout slots');
    assert.deepEqual(
      await page.locator('.slot b').allTextContents(),
      ['Arena', 'Neon Arena', 'Simple Border', 'Classic Clap', 'Classic Navy'],
      'The board\'s loadout');
    assert.equal(await page.locator('.slot.on').count(), 5, 'Each filled slot is lit');

    const header = await page.locator('.phead').innerText();
    assert.ok(header.includes('15'), 'Fifteen collected');
    assert.ok(header.includes('/ 56 collected'), 'Out of the real catalogue of 56');

    assert.deepEqual(
      await page.locator('.chips button span').allTextContents(),
      ['4/13', '2/10', '2/9', '2/8', '1/5', '2/5', '2/6'],
      'Per-category counts, counted from the catalogue');

    // ── Tile states ─────────────────────────────────────────────────────
    assert.equal(await page.locator('.tile').count(), 13, 'Thirteen card backs');
    assert.equal(await page.locator('.tile.eq').count(), 1, 'One equipped');
    assert.equal(await page.locator('.tbtn.done').count(), 1, 'Equipped reads as done');
    assert.equal(await page.locator('.tbtn.eq').count(), 3, 'Three owned but not equipped');
    assert.equal(await page.locator('.tbtn.vip').count(), 1, 'VIP Royal Gold is VIP only');
    assert.equal(await page.locator('.tile.lockd').count(), 9, 'Nine unowned tiles are dimmed');
    assert.equal(await page.locator('.tile .lk').count(), 9, 'and carry the lock');

    // ── Actions ─────────────────────────────────────────────────────────
    await page.locator('.tile', { hasText: 'Classic Gold' }).getByRole('button').click();
    assert.equal(await page.locator('body').getAttribute('data-equipped'), 'cardBack:cb_default');
    await page.locator('.tile', { hasText: 'Mahogany' }).getByRole('button').click();
    assert.equal(await page.locator('body').getAttribute('data-bought'), 'cb_wood');

    // A VIP account sees the VIP back as buyable rather than barred.
    await page.goto(BASE + '/inventory-test/?vip');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();
    assert.equal(await page.locator('.tbtn.vip').count(), 0, 'VIP unlocks the VIP-only back');

    // With no coins every price button is disabled rather than silently failing.
    await page.goto(BASE + '/inventory-test/?broke');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();
    const buys = await page.locator('.inv-grid .tbtn.buy').count();
    const disabled = await page.locator('.inv-grid .tbtn.buy:disabled').count();
    assert.equal(disabled, buys, 'No coins: every price is disabled');

    // ── Room Cards ──────────────────────────────────────────────────────
    await page.goto(BASE + '/inventory-test/');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();
    assert.equal(await page.locator('.rc').count(), 6, 'Six durations');
    assert.deepEqual(await page.locator('.rc b').allTextContents(),
      ['1-Hour', '3-Hour', '6-Hour', '24-Hour', '1-Week', '1-Month'], 'The board\'s durations');
    await page.locator('.rc', { hasText: '3-Hour' }).getByRole('button').click();
    assert.equal(await page.locator('body').getAttribute('data-boughtroom'), '3h:120', 'Prices come from ROOM_CARD_PRICES');
    await page.getByRole('button', { name: /^Activate/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-activated'), 'rc-1');

    await page.goto(BASE + '/inventory-test/?noroom');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();
    await page.getByText("You don't have a Room Card yet.", { exact: false }).waitFor();
    await page.goto(BASE + '/inventory-test/?activeroom');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();
    await page.getByText('Active —', { exact: false }).waitFor();

    // ── Collection: the same pieces, real totals (code issue 4) ─────────
    await page.goto(BASE + '/inventory-test/?collection');
    await page.getByRole('heading', { name: 'Collection' }).waitFor();
    assert.ok((await page.locator('.phead').innerText()).includes('27%'), '15 of 56 is 27 per cent');
    assert.ok((await page.locator('.phead').innerText()).includes('/ 56 collected'));
    assert.equal(await page.getByText('???').count(), 0, 'No filler tiles for cosmetics that do not exist');
    assert.equal(await page.locator('.chips button').count(), 7, 'All seven categories, including stickers and banners');

    // ── Room Cards on its own route ─────────────────────────────────────
    await page.goto(BASE + '/inventory-test/?roomcards');
    await page.getByRole('heading', { name: 'Room Cards' }).waitFor();
    assert.equal(await page.locator('.rc').count(), 6, 'The same panel, not a second drawing of it');

    // ── Widths ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/inventory-test/');
    await page.getByRole('heading', { name: 'Inventory' }).waitFor();
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      assert.equal(
        await page.locator('.slot,.tile,.rc,.ticket').evaluateAll(
          nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
        ), true, 'Clipping ' + width);
      await page.screenshot({ path: path.join(output, 'inventory-' + width + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Accessibility ───────────────────────────────────────────────────
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'One h1 on screen');
    // Two are in the DOM - the wide screen's and MInventory's - and CSS
    // hides one; the accessibility tree must only see the one on screen.
    assert.ok(await page.locator('[role=progressbar][aria-valuenow]').count() >= 1, 'The collection meter reports its value');
    const unlabelled = await page.locator('button').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only button has an aria-label');
    assert.equal(await page.locator('input[aria-label="Search inventory"]').count(), 1, 'The search field is labelled');

    assert.deepEqual(errors, []);
    // ── Held upright: MInventory ────────────────────────────────────────
    // design/arena/boards/MInventory.dc.html. The same screen recomposed:
    // the loadout becomes a side-scroller, the chips and the search stack,
    // and the tile grid drops to three columns. The pieces inside are this
    // screen's own, so what a tile does is already covered above.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.arena-inventory.ar-page').isVisible(), false, 'The wide screen steps aside');
    const phone = page.locator('.arena-minventory');
    assert.equal(await phone.isVisible(), true, 'and MInventory takes over');
    assert.equal(await phone.locator('.hs .slot').count(), 5, 'Five loadout slots, as a side-scroller');
    assert.equal(await phone.locator('.chips > button').count(), 7, 'All seven categories');
    assert.ok(await phone.locator('.tile').count() > 0, 'and the collection grid');
    assert.ok(await phone.locator('.rc').count() > 0, 'Room Cards are still here');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 390');
    await page.screenshot({ path: path.join(output, 'minventory-390.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Inventory: MInventory held upright, loadout, catalogue-derived counts, four tile states, equip/buy, VIP and no-coins, Room Cards incl. its own route, Collection totals (code issue 4), seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
