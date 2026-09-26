/**
 * The Mindi hand-over screen (Arena) —
 * design/arena/screens/result-hand-won.jpg, from the Result board.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/result-test');
const mocks = path.join(__dirname, 'result-test-services.tsx');
const alias = Object.fromEntries(['@/hooks/useTranslation', 'next/link'].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'result-test-entry.tsx'),
    output: { path: output, filename: 'component.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));

  const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.map(n => n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output, 'component.js'), 'utf8');
    // The in-match shell: `arena-app` is still on it, which is why
    // arena-shell.css scopes its own `.stat` to `.ar-page`. If that scope is
    // ever lost these panels go 56px tall and the assertions below fail.
    await page.route('**/result-test/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div class="arena-app app-shell app-shell-match">`
        + `<main class="app-shell-main"><div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/result-test/');
    await page.getByRole('heading', { name: 'You won the hand' }).waitFor();

    // ── The reveal ──────────────────────────────────────────────────────
    assert.equal(await page.locator('.big').count(), 4, 'All four Tens turn over');
    assert.equal(await page.locator('.big.us').count(), 3, 'Three are ours');
    assert.equal(await page.locator('.big.them').count(), 1, 'One is theirs');
    assert.equal(await page.locator('.big .face.ten').count(), 4, 'Every one carries the foil ring');
    const tags = (await page.locator('.who').allTextContents()).map(t => t.trim());
    assert.deepEqual(tags, ['Us', 'Us', 'Us · trick 9', 'Them'],
      'In the order they were taken, with the Ten that settled it tagged');
    assert.equal(await page.locator('.who.us').count(), 3);
    assert.equal(await page.locator('.who.them').count(), 1);

    // ── The headline ────────────────────────────────────────────────────
    const head = await page.locator('.stamp').innerText();
    assert.equal(head.trim(), 'You won the hand');
    assert.ok((await page.locator('.body').innerText()).includes('Sayyu and Mariyam took three of the four Tens.'));
    assert.ok((await page.locator('.chip.live').innerText()).toUpperCase().includes('WEEKEND LEAGUE'));

    // ── The four panels ─────────────────────────────────────────────────
    const stats = page.locator('.hud.stat');
    assert.equal(await stats.count(), 4);
    const values = (await page.locator('.stat .v').allTextContents()).map(v => v.replace(/\s+/g, ' ').trim());
    assert.deepEqual(values, ['3 – 1', '8 – 5', '+10', '+10'],
      'Tens, tricks, trophies and coins, from the hand');

    // The panel is the Result board's, not the Home board's figure column -
    // if `.arena-app .stat` leaks back in, this is 56px.
    const panelHeight = await stats.first().evaluate(node => node.getBoundingClientRect().height);
    assert.ok(panelHeight > 90, `The panel keeps its own height (got ${Math.round(panelHeight)}px)`);

    // The trophy counter runs 58 -> 68 from 1.5s, 90ms a step.
    await page.waitForTimeout(2800);
    const trophyLine = await page.locator('.stat .s').nth(2).innerText();
    assert.ok(trophyLine.includes('68'), `The counter reaches the new total (got "${trophyLine}")`);
    assert.ok(trophyLine.includes('7 to Platinum'), 'and says what is left to the next tier');
    const bar = await page.locator('.stat .xp i').evaluate(node => node.style.width);
    assert.equal(bar, '72%', '68 of the 50-75 Gold band');
    assert.ok((await page.locator('.stat .s').nth(3).innerText()).includes('Victory bonus · 1,260'));

    // ── The endings legend ──────────────────────────────────────────────
    assert.equal(await page.locator('.end').count(), 5, 'All five endings');
    assert.equal(await page.locator('.end.now').count(), 1, 'One of them is this hand');
    const now = await page.locator('.end.now').innerText();
    assert.ok(now.toUpperCase().includes('WON'));
    assert.ok(now.includes('More Tens: 3 to 1'), 'with the real score in it');
    const lost = await page.locator('.end', { hasText: 'Lost' }).innerText();
    assert.ok(lost.includes('−4 trophies this weekend'), 'The cost of losing is the pool\'s, not the board\'s');

    // ── The controls ────────────────────────────────────────────────────
    assert.equal(await page.locator('a.btn').nth(0).getAttribute('href'), '/play/mindi/ranked-duo');
    assert.equal(await page.locator('a.btn.ghost').getAttribute('href'), '/play');
    await page.screenshot({ path: path.join(output, 'result-1440.png') });

    // Replay restarts the reveal, which means the counter starts over.
    await page.getByRole('button', { name: 'Replay the reveal' }).click();
    await page.waitForTimeout(200);
    assert.ok((await page.locator('.stat .s').nth(2).innerText()).includes('58'), 'The count starts again from 58');
    await page.waitForTimeout(2600);
    assert.ok((await page.locator('.stat .s').nth(2).innerText()).includes('68'), 'and climbs again');

    // ── Accessibility ───────────────────────────────────────────────────
    assert.equal(await page.locator('.stat .xp[role=progressbar]').count(), 1);
    const loops = await page.locator('.mote, .rays, .chip.live i').count();
    assert.equal(await page.locator('.mote[data-ar-loop], .rays[data-ar-loop], .chip.live i[data-ar-loop]').count(),
      loops, 'Every loop carries data-ar-loop for prefers-reduced-motion');

    // ── The other endings ───────────────────────────────────────────────
    await page.goto(BASE + '/result-test/?lost');
    await page.getByRole('heading', { name: 'You lost the hand' }).waitFor();
    assert.equal((await page.locator('.end.now').innerText()).split('\n')[0].trim(), 'Lost');
    assert.equal(await page.locator('.big.us').count(), 1, 'One Ten was ours');
    assert.ok((await page.locator('.stat .v').nth(2).innerText()).includes('-4') ||
      (await page.locator('.stat .v').nth(2).innerText()).includes('−4'));

    await page.goto(BASE + '/result-test/?baga');
    await page.getByRole('heading', { name: 'Baga' }).waitFor();
    assert.equal((await page.locator('.end.now').innerText()).split('\n')[0].trim(), 'Baga');
    assert.equal(await page.locator('.big.us').count(), 4, 'All four Tens');

    await page.goto(BASE + '/result-test/?tie');
    await page.getByRole('heading', { name: 'You won the hand' }).waitFor();
    assert.equal((await page.locator('.end.now').innerText()).split('\n')[0].trim(), 'Won on tricks');
    assert.ok((await page.locator('.body').innerText()).includes('Two Tens each'));
    assert.equal((await page.locator('.who').allTextContents()).filter(t => t.includes('trick')).length, 0,
      'A 2-2 hand has no deciding Ten, so nothing is tagged with a trick');

    await page.goto(BASE + '/result-test/?forfeit');
    await page.getByRole('heading', { name: 'They left the hand' }).waitFor();
    assert.equal(await page.locator('.big').count(), 0, 'A forfeited hand has no Tens to turn over');

    await page.goto(BASE + '/result-test/?casual');
    await page.getByRole('heading', { name: 'You won the hand' }).waitFor();
    assert.equal((await page.locator('.stat .v').nth(2).innerText()).trim(), '—', 'Casual pays no trophies');
    assert.ok((await page.locator('.end', { hasText: 'Lost' }).innerText()).includes('No trophies at stake'));

    // ── Widths ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/result-test/');
    await page.getByRole('heading', { name: 'You won the hand' }).waitFor();
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
      await page.screenshot({ path: path.join(output, `result-${width}.png`) });
    }

    assert.deepEqual(errors, [], 'No page errors');
    console.log('✓ Mindi hand-over matches result-hand-won.jpg');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exit(1); });
