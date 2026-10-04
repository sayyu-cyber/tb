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
    await page.getByRole('textbox', { name: 'Search cosmetics' }).fill('Fireworks');
    await page.waitForTimeout(200);
    await page.locator('.item .buy').first().click();
    await page.getByRole('dialog').waitFor();
    const affordable = await page.getByRole('dialog').innerText();
    assert.ok(affordable.includes('After purchase'), 'Affordable: shows what is left');
    assert.ok(affordable.includes('240'), '1,240 minus 1,000');
    assert.ok(!affordable.includes('Not enough coins.'), 'and no warning');
    await page.getByRole('dialog').getByRole('button', { name: /Buy for/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-bought'), 'va_fireworks');

    await page.getByRole('textbox', { name: 'Search cosmetics' }).fill('Crown Jewel');
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
    await page.getByRole('textbox', { name: 'Search cosmetics' }).fill('Fireworks');
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
    assert.equal(await page.locator('h1').innerText(), 'VIP Pass', 'The heading follows the tab');
    // Picking a plan changes the selection and the activate label.
    await page.locator('.plan').first().click();
    assert.equal(await page.locator('.plan').first().getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: /Activate Weekly VIP/ }).waitFor();
    await page.locator('.plan').nth(1).click();
    await page.getByRole('button', { name: /Activate Monthly VIP/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-vip'), '30', 'Activating uses the selected plan');

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
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
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
    // Two are in the DOM - the wide screen's and MShop's - and CSS
    // hides one; the accessibility tree must only see the one on screen.
    const unlabelled = await page.locator('button').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only button has an aria-label');
    assert.equal(await page.locator('input[aria-label="Search cosmetics"]').count(), 0, 'Search is on the Permanent tab');

    assert.deepEqual(errors, []);
    // ── Held upright: MShop, MShopBuy, MShopShort ───────────────────────
    // MShop keeps this screen's order - balance strip, tabs, VIP strip, the
    // same sections - but every piece in it is a size down, and those sizes
    // live in styles/arena-mshop.css. So the page swaps namespace: the two
    // grids narrow to two columns, the balance strip leaves the heading for
    // a row of its own, the VIP strip becomes a column, and the purchase
    // confirm becomes a bottom sheet. MShopBuy and MShopShort are that
    // sheet in its two states, and their stylesheets came out
    // byte-identical to MShop's because they are MShop with it open.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.arena-shop').count(), 0, 'The wide namespace steps aside');
    assert.equal(await page.locator('.arena-mshop.arena-mshopvip').count(), 1, 'and the board sheets take over');
    assert.equal(await page.locator('.shop-grid').count(), 0, 'The six-across grid steps aside');
    assert.ok(await page.locator('.item').count() > 0, 'and the items are still here');
    assert.equal(await page.locator('.bal').count(), 1, 'The balance strip stays');
    assert.equal(await page.locator('.phead').count(), 0, 'out of the wide heading');
    // The board's sizes are reaching the markup, not just its class names.
    assert.equal(
      await page.locator('.vipstrip').evaluate(node => getComputedStyle(node).flexDirection),
      'column', 'The VIP strip is the board\'s column, not the wide row');
    assert.equal(
      await page.locator('.bal b').evaluate(node => getComputedStyle(node).fontSize),
      '28px', 'and the balance reads at the board\'s 28px');
    // The buy confirm is a sheet, not a dialog element.
    await page.locator('.item .buy').first().click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('dialog.dlg[open]').count(), 0, 'No <dialog> at this size');
    assert.equal(
      await page.locator('.sart').evaluate(node => getComputedStyle(node).width),
      '92px', 'The sheet carries the board namespace, so its art square is styled');
    const sheet = await page.getByRole('dialog').innerText();
    assert.ok(sheet.includes('Price'), 'The sheet keeps the price row');
    assert.ok(sheet.includes('Current balance'), 'the balance row');
    assert.ok(sheet.includes('Cancel'), 'and a way out');
    await page.screenshot({ path: path.join(output, 'mshopbuy-390.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0, 'Escape closes it');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 390');
    await page.screenshot({ path: path.join(output, 'mshop-390.png'), fullPage: true });

    // ── Held upright: MShopVip ──────────────────────────────────────────
    // design/arena/boards/MShopVip.dc.html. Same pieces as the wide screen -
    // `.viphero`, the six perks, the two `.plan` buttons, and the coin packs
    // as `.prow` rows rather than the featured tab's cards - at the board's
    // sizes, with the plans moved out of the hero onto the page under it.
    // The balance strip is the one thing the board leaves out here, and the
    // wide screen already leaves it out too.
    await page.getByRole('button', { name: /VIP Pass/ }).first().click();
    await page.locator('.viphero').waitFor();
    assert.equal(await page.locator('.bal').count(), 0, 'No balance strip on the VIP tab');
    assert.equal(await page.locator('.perk').count(), 6, 'All six perks');
    assert.equal(await page.locator('.plan').count(), 2, 'Weekly and Monthly');
    assert.equal(await page.locator('.viphero .plan').count(), 0, 'held outside the hero, as the board draws them');
    assert.ok(await page.locator('.prow').count() > 0, 'and the coin packs as rows');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow on VIP at 390');
    await page.screenshot({ path: path.join(output, 'mshopvip-390.png'), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Shop: MShop, MShopBuy, MShopShort and MShopVip held upright, board structure, rarity labels (code issue 11), nothing free (code issue 5), both dialog states, Escape, equip, VIP hero and plan pick, pending top-up, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
