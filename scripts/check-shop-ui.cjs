/**
 * Shop (Arena) — design/arena/screens/app/app-11-shop.jpg, with the
 * purchase dialog's two states from app-11b and app-11c.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/shop-test');
const mocks = path.join(__dirname, 'shop-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/EconomyContext', '@/contexts/ToastContext',
  '@/contexts/SettingsContext', '@/lib/coinTopups',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'shop-test-entry.tsx'),
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
    await page.route('**/shop-test/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}" style="margin:0">`
        + `<div class="arena-app app-shell ar-stage"><main class="app-shell-main">`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/shop-test/');
    await page.getByRole('heading', { name: 'Shop', exact: true }).waitFor();

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.bal').count(), 1, 'The balance card');
    assert.ok((await page.locator('.bal').innerText()).includes('1,240'), 'The board\'s balance');
    assert.equal(await page.locator('.tabs button').count(), 4, 'Four tabs');
    assert.equal(await page.locator('.vipstrip').count(), 1, 'The VIP strip');
    assert.equal(await page.locator('.item').count(), 6, 'Six featured items');
    assert.equal(await page.locator('.item .feat').count(), 6, 'Each carries the Featured pill');
    assert.equal(await page.locator('.item .eye').count(), 6, 'and a preview button');
    assert.equal(await page.locator('.pack').count(), 4, 'Four coin packs on the Featured tab');
    assert.equal(await page.locator('.pack.pop').count(), 1, 'One Popular');
    assert.equal(await page.locator('.pack.best').count(), 1, 'One Best Value');

    // CODE ISSUE 11: the rarity line reads as words, never a raw id.
    const meta = await page.locator('.item .rar').allTextContents();
    assert.ok(meta.length > 0, 'Items carry a rarity line');
    for (const line of meta) {
      assert.ok(/ · /.test(line), `Rarity line uses the board's separator: ${line}`);
      assert.ok(!/cardBack|tableTheme|profileFrame|victoryAnimation/.test(line), `No raw category id: ${line}`);
    }

    // CODE ISSUE 5: nothing is ever offered at zero.
    await page.getByRole('button', { name: 'Permanent', exact: true }).click();
    await page.waitForTimeout(300);
    const prices = await page.locator('.item .buy').allTextContents();
    for (const price of prices) {
      assert.ok(!/^\s*0\s*$/.test(price.trim()), `No free item in the catalogue: "${price}"`);
    }
    const names = await page.locator('.item h3').allTextContents();
    for (const reward of ['Master Collector', 'Animated Gold', "Champion's Banner"]) {
      assert.ok(!names.includes(reward), `${reward} is a reward, not stock`);
    }
    for (const vip of ['VIP Royal Gold', 'VIP Lounge', 'VIP Elite']) {
      assert.ok(!names.includes(vip), `${vip} is VIP-exclusive, not stock`);
    }

    // ── The dialog, both states (app-11b and app-11c) ───────────────────
    await page.getByRole('searchbox', { name: 'Search cosmetics' }).fill('Fireworks');
    await page.waitForTimeout(200);
    await page.locator('.item .buy').first().click();
    await page.getByRole('dialog').waitFor();
    const affordable = await page.getByRole('dialog').innerText();
    assert.ok(affordable.includes('After purchase'), 'Affordable: shows what is left');
    assert.ok(affordable.includes('240'), '1,240 minus 1,000');
    assert.ok(!affordable.includes('Not enough coins.'), 'and no warning');
    await page.getByRole('dialog').getByRole('button', { name: /Buy for/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-bought'), 'va_fireworks');

    await page.getByRole('searchbox', { name: 'Search cosmetics' }).fill('Crown Jewel');
    await page.waitForTimeout(200);
    await page.locator('.item .buy').first().click();
    await page.getByRole('dialog').waitFor();
    const short = await page.getByRole('dialog').innerText();
    assert.ok(short.includes('More coins needed'), 'Too dear: the row flips');
    assert.ok(short.includes('1,260'), '2,500 minus 1,240');
    assert.ok(short.includes('Not enough coins.'), 'and says so');
    await page.getByRole('dialog').getByRole('button', { name: 'Get Coins' }).click();
    await page.getByText('Prices in MVR. Top-ups require admin approval before coins are credited.').waitFor();
    assert.equal(await page.locator('dialog[open]').count(), 0, 'Get Coins closes the dialog and shows the packs');

    // Escape closes it, because it is a real <dialog>.
    await page.getByRole('button', { name: 'Permanent', exact: true }).click();
    await page.locator('.item .eye').first().click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);

    // ── Owned, and VIP ──────────────────────────────────────────────────
    await page.goto(BASE + '/shop-test/?owned');
    await page.getByRole('heading', { name: 'Shop', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Permanent', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search cosmetics' }).fill('Fireworks');
    await page.waitForTimeout(200);
    await page.locator('.item .buy.eq').first().click();
    assert.equal(await page.locator('body').getAttribute('data-equipped'), 'victoryAnimation:va_fireworks');

    await page.goto(BASE + '/shop-test/?vip');
    await page.getByText('Your extra weekly cosmetic slot is unlocked.').waitFor();
    assert.equal(await page.getByRole('button', { name: 'View VIP Plans' }).count(), 0, 'No upsell for a VIP account');
    assert.equal(await page.locator('.item').count(), 7, 'VIP gets a seventh featured slot');

    // ── VIP tab (app-12) ────────────────────────────────────────────────
    await page.goto(BASE + '/shop-test/');
    await page.getByRole('heading', { name: 'Shop', exact: true }).waitFor();
    await page.getByRole('button', { name: 'VIP Pass', exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.viphero').count(), 1, 'The VIP hero');
    assert.equal(await page.locator('.perk').count(), 6, 'Six perks');
    assert.equal(await page.locator('.plan').count(), 2, 'Two plans');
    assert.equal(await page.locator('.plan[aria-pressed="true"]').count(), 1, 'One selected at a time');
    assert.equal(await page.locator('.prow').count(), 5, 'The whole pack catalogue, as rows');
    assert.equal(await page.locator('.prow.pop').count(), 1, 'Popular');
    assert.equal(await page.locator('.prow.best').count(), 1, 'Best Value');
    assert.equal(await page.locator('h1').textContent(), 'VIP Pass', 'The heading follows the tab');
    // VIP billing is switched off (def7f8f): the plans are shown and say
    // so, but neither they nor Activate can be used.
    await page.getByText('VIP purchases are currently unavailable.').waitFor();
    assert.equal(await page.locator('.plan:disabled').count(), 2, 'Both plans are disabled');
    assert.equal(await page.getByRole('button', { name: /Activate Weekly VIP/ }).isDisabled(), true, 'and so is Activate');
    assert.equal(await page.locator('body').getAttribute('data-vip'), null, 'Nothing was activated');

    // A pending top-up disables every request and says why.
    await page.goto(BASE + '/shop-test/?pending');
    await page.getByRole('heading', { name: 'Shop', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Coin Packs', exact: true }).click();
    await page.waitForTimeout(250);
    await page.getByText('Your Standard Pack request is pending admin approval.').waitFor();
    assert.equal(await page.locator('.pending .spin').count(), 1, 'with the board\'s spinner');
    const rows = await page.locator('.prow button').count();
    const off = await page.locator('.prow button:disabled').count();
    assert.equal(off, rows, 'and every request button is disabled');

    // ── Widths ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/shop-test/');
    await page.getByRole('heading', { name: 'Shop', exact: true }).waitFor();
    // The wide screen's sizes. A phone gets LShop, checked below.
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [768, 1024]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      assert.equal(
        await page.locator('.item,.pack,.bal').evaluateAll(
          nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
        ), true, 'Clipping ' + width);
      await page.screenshot({ path: path.join(output, 'shop-' + width + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Accessibility ───────────────────────────────────────────────────
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'One h1 on screen');
    // Only one composition mounts, so there is one h1.
    const unlabelled = await page.locator('button').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only button has an aria-label');
    assert.equal(await page.locator('input[aria-label="Search cosmetics"]').count(), 0, 'Search is on the Permanent tab');

    assert.deepEqual(errors, []);
    // ── On a phone: LShop, LShopBuy, LShopShort, LShopVip ───────────────
    // design/arena/boards/LShop.dc.html and its three companions. The phone
    // is landscape only (design/arena/LANDSCAPE.md): the balance and the
    // four tabs on one row, Featured three across, the VIP strip, four coin
    // packs; the purchase confirm is the centred landscape dialog in its
    // two states; VIP Pass puts the hero beside the plans and lists every
    // pack as a row. scripts/check-landscape-screens.cjs holds all four
    // against their references.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.arena-shop').count(), 0, 'The wide screen is unmounted');
    const phone = page.locator('.arena-lshop.arena-lshopvip');
    assert.equal(await phone.count(), 1, 'and LShop takes over');
    assert.equal(await phone.locator('.dock .bal').count(), 1, 'The balance beside the tabs');
    assert.equal(await phone.locator('.dock .tabs > button').count(), 4, 'all four tabs');
    assert.equal(await phone.locator('.cols.c3 > .item').count(), 6, 'Featured, three across');
    assert.equal(await phone.locator('.cols.c4 > .pack').count(), 4, 'and four coin packs');
    // The buy confirm: the landscape dialog, both states.
    const afford = phone.locator('.item').filter({ has: page.locator('.buy') }).first();
    await afford.locator('.buy').click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await page.locator('dialog.dlg[open]').count(), 0, 'No <dialog> element at this size');
    assert.equal(await page.locator('.ldlg .card.bdlg').count(), 1, 'the board\'s centred dialog');
    const text = await dialog.innerText();
    for (const row of ['Price', 'Current balance', 'Cancel']) assert.ok(text.toUpperCase().includes(row.toUpperCase()), 'The dialog keeps ' + row);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0, 'Escape closes it');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 844');
    await page.screenshot({ path: path.join(output, 'lshop-844.png'), fullPage: true });
    await phone.getByRole('button', { name: /Permanent/ }).click();
    assert.equal(await phone.locator('input[aria-label="Search cosmetics"]').count(), 1, 'Permanent: search, sort and the chips');
    await phone.getByRole('button', { name: /VIP Pass/ }).click();
    await phone.locator('.viphero').waitFor();
    assert.equal(await phone.locator('.bal').count(), 0, 'No balance strip on the VIP tab');
    assert.equal(await phone.locator('.perk').count(), 6, 'All six perks');
    assert.equal(await phone.locator('.plan').count(), 2, 'Weekly and Monthly');
    assert.equal(await phone.locator('.viphero .plan').count(), 0, 'beside the hero, as the board draws them');
    assert.ok(await phone.locator('.prow').count() > 0, 'and the coin packs as rows');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow on VIP at 844');
    await page.screenshot({ path: path.join(output, 'lshopvip-844.png'), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Shop: LShop, LShopBuy, LShopShort and LShopVip on a phone, board structure, rarity labels (code issue 11), nothing free (code issue 5), both dialog states, Escape, equip, VIP hero with billing switched off, pending top-up, four wide-screen widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
