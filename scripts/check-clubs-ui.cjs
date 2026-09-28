/**
 * Clubs (Arena) — design/arena/screens/app/app-06-clubs.jpg, with the chat
 * tab from app-06b.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/clubs-test');
const mocks = path.join(__dirname, 'clubs-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/ToastContext', '@/lib/clubs', '@/lib/friends',
  '@/hooks/useTranslation', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'clubs-test-entry.tsx'),
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
    await page.route('**/clubs/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}" style="margin:0">`
        + `<div class="arena-app arena-phone app-shell ar-stage"><main class="app-shell-main">`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/clubs/');
    await page.getByRole('heading', { name: 'Clubs', exact: true }).waitFor();
    await page.waitForTimeout(300);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.club').count(), 4, 'Four suggested clubs');
    assert.equal(await page.locator('.crest').count(), 5, 'A crest each, plus My Club\'s');
    assert.deepEqual(await page.locator('.club .tag').allTextContents(),
      ['[HLM]', '[GIN]', '[ADU]', '[FVM]'], 'The board\'s tags');
    const caps = await page.locator('.club .cap').allInnerTexts();
    assert.ok(caps[0].includes('17 / 30'), 'and their member counts');
    assert.ok(caps[2].includes('30 / 30'));
    // Already in a club, so joining is barred; the full one says Full.
    const actions = await page.locator('.club button').allTextContents();
    assert.ok(actions.some(text => text.includes('Full')), 'A full club reads Full');
    assert.ok(actions.filter(text => text.includes('Already in a club')).length >= 2,
      'and the rest say why you cannot join');

    // ── My Club, and CODE ISSUE 10 ──────────────────────────────────────
    assert.equal(await page.locator('.club-panel').count(), 1, 'The My Club panel');
    assert.ok((await page.locator('.club-head').innerText()).includes("Male' Mindi Masters"));
    assert.ok((await page.locator('.club-head').innerText()).includes('24 / 30 members'));
    assert.equal(await page.locator('.mem').count(), 6, 'Six members');
    // The fixture's club document records everyone at their join-day figure
    // (4, 9, 12, 2, 30, 7). The screen must show the live ones, in order.
    const trophies = (await page.locator('.mem .tnum').allTextContents()).map(text => text.trim());
    assert.deepEqual(trophies, ['71', '66', '58', '55', '49', '42'],
      'Live trophies, highest first - not the stale stored figures');
    assert.deepEqual(await page.locator('.mem .pos').allTextContents(), ['1', '2', '3', '4', '5', '6']);
    assert.equal(await page.locator('.mem.me').count(), 1, 'Your own row is ringed');
    assert.ok((await page.locator('.mem.me').innerText()).includes('(you)'));

    // Owner controls: Kick on everyone but me.
    assert.equal(await page.locator('.kick').count(), 5, 'The owner can kick the other five');
    await page.locator('.kick').first().click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Remove' }).click();
    assert.equal(await page.locator('body').getAttribute('data-kicked'), 'rasheed');

    // A member who is not the owner sees no Kick at all.
    await page.goto(BASE + '/clubs/?member');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.kick').count(), 0, 'A plain member cannot kick anyone');
    assert.equal(await page.getByText('Owner', { exact: true }).count(), 0, 'and carries no Owner pill');

    // ── Club chat (app-06b) ─────────────────────────────────────────────
    await page.goto(BASE + '/clubs/');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Club Chat/ }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.cb2').count(), 4, 'Four messages');
    assert.equal(await page.locator('.cb2.me').count(), 1, 'One of them mine');
    assert.equal(await page.locator('.cb2.them small').count(), 3, 'Theirs are named');
    await page.getByRole('textbox', { name: 'Message the club' }).fill('See you at nine');
    await page.getByRole('button', { name: 'Send to club' }).click();
    assert.equal(await page.locator('body').getAttribute('data-said'), 'See you at nine');

    // ── Leaving ─────────────────────────────────────────────────────────
    await page.getByRole('button', { name: /^Members/ }).click();
    await page.getByRole('button', { name: /^Leave Club/ }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Leave' }).click();
    assert.equal(await page.locator('body').getAttribute('data-left'), 'yes');

    // ── Joining, when you have no club ──────────────────────────────────
    await page.goto(BASE + '/clubs/?none');
    await page.waitForTimeout(300);
    await page.getByText('Your next team starts here').waitFor();
    const joinable = await page.getByRole('button', { name: /^Join Club/ }).count();
    assert.equal(joinable, 3, 'Three joinable clubs - the full one is not');
    await page.getByRole('button', { name: /^Join Club/ }).first().click();
    assert.equal(await page.locator('body').getAttribute('data-joined'), 'hlm');

    // ── Search, guest and error states ──────────────────────────────────
    await page.goto(BASE + '/clubs/');
    await page.waitForTimeout(300);
    await page.getByRole('textbox', { name: 'Search clubs by name or tag' }).fill('gin');
    assert.equal(await page.locator('.club').count(), 1, 'Search narrows the grid');
    await page.getByRole('textbox', { name: 'Search clubs by name or tag' }).fill('zzzz');
    await page.getByText('No clubs match your search.').waitFor();
    await page.goto(BASE + '/clubs/?guest');
    await page.getByText('Sign in to join a club and chat with members.').waitFor();
    await page.goto(BASE + '/clubs/?failure');
    await page.getByText("Couldn't load clubs. Please try again.").waitFor();

    // ── Widths ──────────────────────────────────────────────────────────
    for (const state of ['', '?none']) {
      await page.goto(BASE + '/clubs/' + state);
      await page.waitForTimeout(300);
      for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${state} ${width}`);
        assert.equal(
          await page.locator('.club,.mem,.club-panel').evaluateAll(
            nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
          ), true, `Clipping ${state} ${width}`);
        await page.screenshot({ path: path.join(output, `${state ? 'noclub' : 'member'}-${width}.png`), fullPage: true });
      }
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/clubs/');
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'One h1 on screen');
    // Two are in the DOM - the wide screen's and MClubs's - and CSS
    // hides one; the accessibility tree must only see the one on screen.
    assert.ok(await page.locator('[role=progressbar][aria-valuenow]').count() >= 4, 'Every membership meter reports its value');
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');

    assert.deepEqual(errors, []);
    // ── Held upright: MClubs ────────────────────────────────────────────
    // design/arena/boards/MClubs.dc.html. The two columns stack and reverse:
    // your own club leads, Browse follows. The panel and the cards are the
    // wide screen's own, so what they do is already covered above.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.arena-clubs.ar-page').count(), 0, 'The wide screen steps aside');
    const phone = page.locator('.arena-mclubs');
    assert.equal(await phone.isVisible(), true, 'and MClubs takes over');
    assert.equal(await phone.locator('.club-panel').count(), 1, 'Your own club leads');
    assert.ok(await phone.locator('.club').count() > 0, 'and the browse cards follow it');
    // The chat tab still subscribes and sends, from the one panel there is.
    await phone.getByRole('button', { name: /Club Chat/ }).click();
    await phone.locator('.club-composer').waitFor();
    await phone.getByRole('button', { name: /Members \(/ }).click();
    assert.ok(await phone.locator('.mem').count() > 0, 'and the ladder comes back');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 390');
    await page.screenshot({ path: path.join(output, 'mclubs-390.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Clubs: MClubs held upright, board structure, tags and capacities, all four card states, My Club with LIVE member trophies (code issue 10), owner-only kick, club chat, leave, join, search, guest/error states, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
