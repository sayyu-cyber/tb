/**
 * Play lobby (Arena) — design/arena/screens/lobby-01-mindi.jpg, with the
 * busy state from lobby-02-gin-finding.jpg.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/play-test');
const mocks = path.join(__dirname, 'play-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/hooks/useTranslation', '@/hooks/useCasualQueue',
  '@/lib/weekendLeague', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development',
    plugins: [new compiler.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    devtool: false,
    entry: path.join(__dirname, 'play-test-entry.tsx'),
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
    // The shell is what the page sits in, so the fixture reproduces it: the
    // arena-app namespace, the stage, and a rail the width of the sidebar.
    await page.route('**/play-test/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div class="arena-app app-shell ar-stage">`
        + `<aside style="width:96px;flex:none"></aside>`
        + `<main class="app-shell-main"><div class="app-shell-toolbar" style="height:72px"></div>`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/play-test/');
    await page.getByRole('heading', { name: 'Choose your table' }).waitFor();

    // ── The podium (lobby-01) ───────────────────────────────────────────
    assert.equal(await page.locator('.lob-canvas .deck').count(), 2, 'Two deck boxes');
    assert.equal(await page.locator('.deck.vio.on').count(), 1, 'Mindi is the lit deck');
    assert.equal(await page.locator('.deck.blk.off').count(), 1, 'Gin Rummy is dimmed');
    assert.equal(await page.locator('.apron').count(), 10, 'Ten stacked aprons');
    assert.equal(await page.locator('.leds ellipse').count(), 4, 'The four LED rings');
    assert.equal(await page.locator('.mote').count(), 4, 'Four drifting motes');
    assert.equal(await page.locator('.lob-canvas .beam').count(), 2, 'Two spotlight beams');
    assert.ok((await page.locator('.lob-mid').innerText()).toUpperCase().includes('PICK A GAME'));

    // ── The Mindi panel ─────────────────────────────────────────────────
    const modes = page.locator('.lob-modes');
    let text = await modes.innerText();
    assert.ok(text.toUpperCase().includes('FOUR PLAYERS, TWO TEAMS'), 'Mindi kicker');
    assert.ok(text.includes('Follow suit, find trump, and capture the Tens.'), 'Mindi rules line');
    assert.equal(await modes.locator('.mode').count(), 5, 'Mindi has five modes');
    assert.equal(await modes.locator('.x2').count(), 1, 'Only Ranked duo doubles');
    assert.equal(await modes.locator('.mode[aria-pressed=true]').count(), 1);
    assert.ok((await modes.locator('.mode').first().innerText()).includes('Auto-teamed, no partner needed'));
    assert.ok(text.includes('Play Mindi'), 'The CTA names the game');
    assert.ok(text.includes('Casual online'), 'and the note names the mode');

    // Mindi ranked is 2v2 only - there is no Mindi 1v1 queue in the app.
    await modes.getByRole('button', { name: /Ranked duo/ }).click();
    assert.equal(await modes.locator('a.ar-btn').getAttribute('href'), '/play/mindi/ranked-duo');
    assert.ok((await modes.innerText()).includes('double trophies until'), 'x2 modes date the league');

    // ── The rank panel ──────────────────────────────────────────────────
    const rank = await page.locator('.lob-rank').innerText();
    assert.ok(rank.includes('SAYYU') || rank.includes('Sayyu'));
    assert.ok(rank.includes('Gold · 58 trophies'), 'Tier and trophies, from the player');
    assert.ok(rank.toUpperCase().includes('17 TO PLATINUM'));
    assert.ok(rank.toUpperCase().includes('GOLD 50'));
    assert.ok(rank.includes('75'));
    assert.equal(await page.locator('.lob-rank .rk.gold').count(), 1, 'The hexagon takes the tier metal');
    const fill = await page.locator('.lob-rank .xp i').evaluate(node => node.style.width);
    assert.equal(fill, '32%', "The board's 32%, worked out from 58 of 50-75");

    // ── The league panel ────────────────────────────────────────────────
    const league = await page.locator('.lob-league').innerText();
    assert.ok(league.includes('worth 10 trophies instead of 5'), 'Doubled from constants/ranks');
    assert.ok(league.includes('a loss costs 4'));
    assert.ok(league.toUpperCase().includes('LIVE NOW'));
    assert.equal(await page.locator('.lob-league a.ar-btn.blue').getAttribute('href'), '/tournament');

    // ── Gin Rummy (lobby-02) ────────────────────────────────────────────
    await page.getByRole('button', { name: /^Gin Rummy/ }).click();
    assert.equal(await page.locator('.deck.blk.on').count(), 1, 'The Gin deck lights');
    assert.equal(await page.locator('.deck.vio.off').count(), 1, 'and Mindi dims');
    text = await modes.innerText();
    assert.ok(text.toUpperCase().includes('TWO PLAYERS'), 'Gin kicker');
    assert.ok(text.includes('There is no knocking.'), 'Gin rules line');
    assert.equal(await modes.locator('.mode').count(), 6, 'Gin has six modes');
    assert.equal(await modes.locator('.x2').count(), 2, 'Both ranked pools double');
    assert.ok(text.includes('Play Gin Rummy'), 'Picking a deck resets the mode to Casual online');

    // Every mode points at the route the app really has.
    for (const [name, href] of [
      ['Vs AI', '/play/gin-rummy/casual/ai'],
      ['Pass & Play', '/play/gin-rummy/casual/passplay'],
      ['Ranked 1v1', '/play/gin-rummy/ranked'],
      ['Ranked 2v2', '/play/gin-rummy/ranked-duo'],
      ['Private room', '/play/gin-rummy/room'],
    ]) {
      await modes.getByRole('button', { name: new RegExp(name.replace(/[&]/g, '\\&')) }).click();
      assert.equal(await modes.locator('a.ar-btn').getAttribute('href'), href, name);
      assert.equal(await page.locator('body').getAttribute('data-queue'), 'off', name + ' does not queue');
    }

    // ── Finding a table ─────────────────────────────────────────────────
    await modes.getByRole('button', { name: /Casual online/ }).click();
    await modes.getByRole('button', { name: /Play Gin Rummy/ }).click();
    assert.equal(await page.locator('.lob-modes .ar-btn.busy').count(), 1, 'The CTA goes busy');
    assert.equal(await page.locator('.lob-modes .spin').count(), 1, 'with the board spinner');
    text = await modes.innerText();
    assert.ok(text.includes('Finding a table'));
    assert.ok(text.includes('Tap again to stop looking'));
    assert.equal(await page.locator('body').getAttribute('data-queue'), 'gin-rummy', 'and a real queue is running');
    await page.screenshot({ path: path.join(output, 'lobby-finding.png') });

    // Tapping again stops looking, which is what the note promises.
    await modes.getByRole('button', { name: /Finding a table/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-queue'), 'off', 'and stops it');
    assert.equal(await page.locator('.lob-modes .ar-btn.busy').count(), 0);

    // Picking a different deck also stops it - looking for a Gin table
    // while the Mindi panel is open would be a lie.
    await modes.getByRole('button', { name: /Play Gin Rummy/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-queue'), 'gin-rummy');
    await page.getByRole('button', { name: /^Mindi/ }).click();
    assert.equal(await page.locator('body').getAttribute('data-queue'), 'off');

    // ── Accessibility ───────────────────────────────────────────────────
    assert.equal(await page.locator('.deck[aria-pressed]').count(), 2, 'Decks say which is chosen');
    assert.equal(await page.locator('.mode[aria-pressed]').count(), 5);
    assert.equal(await page.locator('.lob-rank .xp[role=progressbar]').count(), 1, 'The bar is a progressbar');
    // Every loop the board runs forever can be switched off.
    const loops = await page.locator('.mote, .deck, .chase').count();
    assert.equal(await page.locator('.mote[data-ar-loop], .deck[data-ar-loop], .chase[data-ar-loop]').count(), loops,
      'Every loop carries data-ar-loop for prefers-reduced-motion');

    // ── The composition keeps the artboard's width ──────────────────────
    // The board is a picture, not a dashboard: its panels are at x=48 and
    // x=1062 of 1440 with the podium between them. Stretched to a 2,400px
    // monitor that flings them to opposite walls, so the page caps at the
    // artboard and starts where the sidebar ends. The room behind it still
    // reaches both edges, and the podium stays centred on the composition
    // rather than on the room.
    await page.setViewportSize({ width: 2200, height: 1000 });
    await page.waitForTimeout(300);
    const box = await page.locator('.lob-page').boundingBox();
    const room = await page.locator('.lob-scene').boundingBox();
    const main = await page.locator('.app-shell-main').boundingBox();
    assert.ok(box.width <= 1441, `The composition stops at the artboard (got ${Math.round(box.width)}px)`);
    assert.ok(Math.abs(box.x - main.x) < 2, 'and starts where the content area does, not centred');
    assert.ok(room.width > box.width + 200, 'while the room bleeds past it');
    const podium = await page.locator('.lob-canvas').boundingBox();
    assert.ok(Math.abs((podium.x + podium.width / 2) - (box.x + 720)) < 3,
      'The podium is centred on the composition, not on the room');

    // ── Widths ──────────────────────────────────────────────────────────
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [1024, 800], [844, 390], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
      await page.screenshot({ path: path.join(output, `lobby-${width}.png`), fullPage: true });
    }

    // ── Signed out ──────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/play-test/?guest');
    await page.getByRole('heading', { name: 'Choose your table' }).waitFor();
    assert.equal(await page.locator('.lob-modes a.ar-btn').getAttribute('href'), '/login',
      'A guest is sent to sign in rather than into a queue');
    assert.ok((await page.locator('.lob-modes').innerText()).includes('Sign in for Casual Online matches'));
    // Vs AI and Pass & Play need no account, so they stay open.
    await page.locator('.lob-modes').getByRole('button', { name: /Vs AI/ }).click();
    assert.equal(await page.locator('.lob-modes a.ar-btn').getAttribute('href'), '/play/mindi/casual/ai');

    // ── Outside the league window ───────────────────────────────────────
    await page.goto(BASE + '/play-test/?off');
    await page.getByRole('heading', { name: 'Choose your table' }).waitFor();
    const quiet = await page.locator('.lob-league').innerText();
    assert.ok(quiet.toUpperCase().includes('FRI – SAT'), 'The chip says when, not "live now"');
    assert.ok(!quiet.toUpperCase().includes('LIVE NOW'));
    assert.ok(quiet.includes('It opens'), 'and the sentence says when it opens');

    assert.deepEqual(errors, [], 'No page errors');
    console.log('✓ Play lobby matches lobby-01 and lobby-02');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exit(1); });
