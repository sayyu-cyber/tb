/**
 * Daily rewards and Missions (Arena) —
 * design/arena/screens/app/app-13-rewards-missions.jpg, with the claim
 * popup from app-13b.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/rewards-test');
const mocks = path.join(__dirname, 'rewards-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/EconomyContext', '@/hooks/useTranslation', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'rewards-test-entry.tsx'),
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
    await page.route('**/rewards-test/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/rewards-test/');
    await page.getByRole('heading', { name: 'Daily Rewards' }).waitFor();

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.day').count(), 7, 'Seven day tiles');
    assert.equal(await page.locator('.day.claimed').count(), 5, 'Five claimed');
    assert.equal(await page.locator('.day.today').count(), 1, 'One is today');
    assert.equal(await page.locator('.day.big').count(), 1, 'Day 7 carries the blue ring');
    assert.equal(await page.locator('.day .gift').count(), 1, 'and the gift');
    assert.ok((await page.locator('.ph').first().innerText()).includes('5 / 7 claimed this cycle'));
    assert.equal(await page.locator('.mis').count(), 6, 'Three daily and three weekly missions');
    assert.equal(await page.locator('.mis.done').count(), 2, 'Two daily missions are done');

    // CODE ISSUE 7: each day names its own bonus.
    const bonuses = await page.locator('.day .bonus').allTextContents();
    assert.equal(bonuses[2].trim(), '+ GG Sticker', 'Day 3 gives the sticker');
    assert.equal(bonuses[4].trim(), '+ Maldives Wave banner', 'Day 5 gives the banner');
    assert.equal(bonuses[6].trim(), '+ 1-Hour Room Card', 'Only Day 7 gives a Room Card');
    assert.equal(bonuses[0].trim(), '', 'A day with no bonus says nothing');
    // Nothing anywhere promises a Room Card on a day that does not give one.
    const roomCardMentions = await page.locator('.day', { hasText: 'Room Card' }).count();
    assert.equal(roomCardMentions, 1, 'Exactly one tile mentions a Room Card');

    // The weekly cosmetic rewards are named from the catalogue.
    const rewards = await page.locator('.mis .rw small').allTextContents();
    assert.ok(rewards.some(text => text.includes('Nice Move')), 'Win 10 names its sticker');
    assert.ok(rewards.some(text => text.includes('Platinum Shield')), 'Reach Platinum names its frame');

    // ── The claim popup (app-13b) ───────────────────────────────────────
    await page.locator('.day.today').click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-claimed'), '6');
    const popup = await page.getByRole('dialog').innerText();
    assert.ok(popup.includes('Day 6 Claimed!'));
    assert.ok(popup.includes('+150 Coins'));
    assert.ok(popup.includes('Day 7: 250 coins and a 1-Hour Room Card'), 'and says what tomorrow gives');
    await page.getByRole('button', { name: 'Continue' }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.locator('.day.claimed').count(), 6, 'The tile is now claimed');

    // On the last day there is no tomorrow to promise.
    await page.goto(BASE + '/rewards-test/?last');
    await page.getByRole('heading', { name: 'Daily Rewards' }).waitFor();
    await page.locator('.day.today').click();
    await page.getByRole('dialog').waitFor();
    const lastPopup = await page.getByRole('dialog').innerText();
    assert.ok(lastPopup.includes("That's the full week."), 'The cycle ends cleanly');
    assert.ok(!lastPopup.includes('Come back tomorrow'), 'and promises no day 8');
    await page.getByRole('button', { name: 'Continue' }).click();

    // ── Missions on its own route ───────────────────────────────────────
    await page.goto(BASE + '/rewards-test/?missions');
    await page.getByRole('heading', { name: 'Missions' }).waitFor();
    assert.equal(await page.locator('.mis').count(), 6, 'The same panels, not a second drawing of them');
    assert.equal(await page.locator('.day').count(), 0, 'and no login calendar');

    // ── Held upright: MRewards ──────────────────────────────────────────
    // design/arena/boards/MRewards.dc.html. The calendar's seven tiles go
    // four to a row with Day 7 spanning two and lying on its side; the two
    // mission panels stack and each row's meter drops to its own line. The
    // claim celebration becomes the board's centred `.cel` over an
    // `.mscrim`. What a day or a mission is worth is the wide screen's own
    // working, checked above.
    await page.goto(BASE + '/rewards-test/');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('heading', { name: 'Daily Rewards' }).waitFor();
    assert.equal(await page.locator('.arena-rewards').count(), 0, 'The wide screen steps aside');
    const phone = page.locator('.arena-mrewards');
    assert.equal(await phone.isVisible(), true, 'and MRewards takes over');
    assert.equal(await phone.locator('.days > .day').count(), 7, 'Seven tiles in the four-column grid');
    assert.equal(await phone.locator('.day.big .col').count(), 1, 'Day 7 lies on its side');
    assert.equal(await phone.locator('.day.claimed').count(), 5, 'Five claimed');
    assert.equal(await phone.locator('.day.today').count(), 1, 'One is today');
    assert.equal(await phone.locator('.mis').count(), 6, 'Both mission panels, stacked');
    assert.equal(
      await phone.locator('.mis').first().evaluate(node => node.lastElementChild.className),
      'pr', 'and each row ends with its meter on its own line');
    // No tile promises a bonus it does not give, and none reserves a blank
    // line for one it has not got.
    assert.deepEqual(
      (await phone.locator('.day .bonus').allTextContents()).map(text => text.trim()),
      ['+ GG Sticker', '+ Maldives Wave banner', '+ 1-Hour Room Card'],
      'Only the three days with a bonus draw a bonus line');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 390');
    await page.screenshot({ path: path.join(output, 'mrewards-390.png'), fullPage: true });

    // The celebration, centred rather than pinned at the board's 190px.
    await phone.locator('.day.today').click();
    await page.locator('.cel').waitFor();
    const cel = await page.getByRole('dialog').innerText();
    assert.ok(cel.includes('Day 6 Claimed!') && cel.includes('+150 Coins'), 'It says what was claimed');
    assert.equal(await page.locator('.mscrim').count(), 1, 'over the phone scrim');
    await page.screenshot({ path: path.join(output, 'mrewards-claimed-390.png') });
    await page.getByRole('button', { name: 'Continue' }).click();
    assert.equal(await page.getByRole('dialog').count(), 0, 'and Continue closes it');

    // Missions upright: the same two panels, no calendar.
    await page.goto(BASE + '/rewards-test/?missions');
    await page.getByRole('heading', { name: 'Missions' }).waitFor();
    assert.equal(await page.locator('.arena-mrewards .mis').count(), 6, 'The same panels held upright');
    assert.equal(await page.locator('.day').count(), 0, 'and no login calendar');
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Widths ──────────────────────────────────────────────────────────
    await page.goto(BASE + '/rewards-test/');
    await page.getByRole('heading', { name: 'Daily Rewards' }).waitFor();
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      assert.equal(
        await page.locator('.day,.mis').evaluateAll(
          nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
        ), true, 'Clipping ' + width);
      await page.screenshot({ path: path.join(output, 'rewards-' + width + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Accessibility ───────────────────────────────────────────────────
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    assert.ok(await page.locator('[role=progressbar][aria-valuenow]').count() >= 7, 'Every meter reports its value');
    const unlabelled = await page.locator('button').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only button has an aria-label');
    // The lit tile bobs forever; it has to stop for reduced motion.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.getByRole('heading', { name: 'Daily Rewards' }).waitFor();
    const bobbing = await page.locator('.day.today .rew').evaluate(node => getComputedStyle(node).animationName);
    assert.equal(bobbing, 'none', 'The today tile stops bobbing under prefers-reduced-motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    assert.deepEqual(errors, []);
    console.log('Rewards: seven tiles and their states, named bonuses (code issue 7), the claim popup incl. end of cycle, six missions with catalogue-named rewards, Missions on its own route, MRewards held upright with its four-column grid and centred celebration, seven widths, accessibility and reduced motion passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
