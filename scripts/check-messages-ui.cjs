/**
 * Messages (Arena) — design/arena/screens/app/app-05-messages.jpg.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/messages-test');
const mocks = path.join(__dirname, 'messages-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/ToastContext', '@/contexts/HomeSocialContext',
  'next/navigation', '@/lib/messages', '@/lib/clubs', '@/lib/presence', '@/lib/rooms', '@/lib/friends',
  '@/hooks/useTranslation', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'messages-test-entry.tsx'),
    output: { path: output, filename: 'component.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
    plugins: [new webpack.NormalModuleReplacementPlugin(/\.css$/, 'data:text/javascript,export default {};')],
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
    await page.route(/\/messages(?:-test)?\//, route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}" style="margin:0"><style>${fs.readFileSync(path.join(root, 'components/messages/message-history.css'), 'utf8')}</style>`
        + `<div class="arena-app app-shell ar-stage"><main class="app-shell-main">`
        + `<div id="test-root"></div></main></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/messages/');
    await page.getByRole('heading', { name: 'Messages' }).waitFor();
    await page.waitForTimeout(300);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.conv').count(), 5, 'Five conversations');
    assert.equal(await page.locator('.conv.unread').count(), 1, 'One unread');
    assert.equal(await page.locator('.udot').count(), 1, 'and it carries the blue dot');
    // Both panes are on screen at once - the board's proposal.
    assert.equal(await page.locator('.msg-list').isVisible(), true, 'The conversation list');
    assert.equal(await page.locator('.msg-chat').isVisible(), true, 'and the open chat, side by side');
    // With no ?with= the newest conversation opens, so the pane is never blank.
    assert.equal(await page.locator('.conv[aria-current="true"]').count(), 1, 'One conversation is current');
    assert.ok((await page.locator('.msg-chat-head').innerText()).toLowerCase().includes('mariyam'));

    // ── The board's thread ──────────────────────────────────────────────
    assert.equal(await page.locator('.bub').count(), 6, 'Six messages');
    assert.equal(await page.locator('.bub.them').count(), 3, 'Three from them');
    assert.equal(await page.locator('.bub.me').count(), 3, 'Three from me');
    assert.equal(await page.locator('.day').count(), 1, 'One day separator');
    assert.equal(await page.locator('.day').first().innerText(), 'TODAY');
    assert.equal(await page.locator('.bub').first().innerText(), 'Weekend League is live. Mindi tonight?');
    assert.equal(await page.locator('.bub').last().innerText(), 'Sending the invite now');

    // ── The composer's counter ──────────────────────────────────────────
    assert.equal(await page.locator('.composer .counter').innerText(), '0 / 500');
    await page.getByRole('textbox', { name: 'Message…' }).fill('Good game');
    assert.equal(await page.locator('.composer .counter').innerText(), '9 / 500');
    // It refuses to go past 500 rather than silently truncating on send.
    await page.getByRole('textbox', { name: 'Message…' }).fill('x'.repeat(600));
    assert.equal(await page.locator('.composer .counter').innerText(), '500 / 500');
    await page.getByRole('textbox', { name: 'Message…' }).fill('Good game');
    await page.getByRole('button', { name: 'Send message' }).click();
    assert.equal(await page.locator('body').getAttribute('data-said'), 'Good game');
    assert.equal(await page.locator('.composer .counter').innerText(), '0 / 500', 'and the field clears');

    // Send is disabled with nothing to send.
    assert.equal(await page.getByRole('button', { name: 'Send message' }).isDisabled(), true);

    // ── Switching conversation swaps the pane, no navigation ────────────
    await page.locator('.conv').nth(1).click();
    await page.waitForTimeout(200);
    assert.ok((await page.locator('.msg-chat-head').innerText()).toLowerCase().includes('hussain'));
    assert.ok((await page.locator('body').getAttribute('data-opened') || '').includes('with=hussain'));
    // A conversation with no messages says so rather than showing nothing.
    await page.locator('.conv').nth(4).click();
    await page.waitForTimeout(200);
    await page.getByText('Say hello to Aishath').waitFor();

    // ── Invite to Mindi ─────────────────────────────────────────────────
    await page.locator('.conv').first().click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Invite to Mindi' }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('body').getAttribute('data-invited'), 'yes');
    assert.ok((await page.locator('body').getAttribute('data-destination') || '').includes('/play/mindi/room?code='));

    // ── Empty, guest and error states ───────────────────────────────────
    await page.goto(BASE + '/messages/?empty');
    await page.getByText('No conversations yet').waitFor();
    await page.getByText('Pick a conversation, or message a friend from the Friends tab.').waitFor();
    await page.goto(BASE + '/messages/?failure');
    await page.getByText('Conversations could not be loaded.').waitFor();
    await page.goto(BASE + '/messages/?guest');
    await page.getByText('Sign in to message your friends.').waitFor();
    assert.equal(await page.getByRole('link', { name: /^Sign In$/i }).getAttribute('href'), '/login');

    // ── Widths ──────────────────────────────────────────────────────────
    for (const state of ['', '?empty']) {
      await page.goto(BASE + '/messages/' + state);
      await page.waitForTimeout(300);
      // The wide screen's sizes. A phone gets LMessages, checked below.
      for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [768, 1024]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${state} ${width}`);
        await page.screenshot({ path: path.join(output, `${state ? 'empty' : 'thread'}-${width}.png`), fullPage: true });
      }
    }

    // Under 900px it falls back to one pane with a back arrow.
    await page.goto(BASE + '/messages/');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.msg-list').isVisible(), false, 'Narrow: the list hides while a thread is open');
    assert.equal(await page.locator('.msg-back').isVisible(), true, 'and a back arrow appears');
    await page.locator('.msg-back').click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.msg-list').isVisible(), true, 'which returns to the list');

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/messages/');
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'One h1 on screen');
    // Two are in the DOM - the wide screen's and MMessages's - and CSS
    // hides one; the accessibility tree must only see the one on screen.
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');
    assert.equal(await page.locator('input[aria-label="Message…"]').count(), 1, 'The composer is labelled');

    assert.deepEqual(errors, []);
    // ── On a phone: LMessages and LChat ─────────────────────────────────
    // design/arena/boards/LMessages.dc.html and LChat.dc.html. The phone is
    // landscape only (design/arena/LANDSCAPE.md): a fixed screen with both
    // panes. Nothing opens by itself - "Select a conversation" until one is
    // picked - and exactly one ChatView exists at a time.
    // scripts/check-landscape-screens.cjs holds both against their references.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(BASE + '/messages-test/');
    const phone = page.locator('.arena-lmessages');
    await phone.locator('.conv').first().waitFor();
    assert.equal(await page.locator('.msg-page').count(), 0, 'The wide screen is unmounted');
    assert.equal(await phone.locator('.conv').count(), 5, 'The five conversations');
    assert.equal(await phone.locator('.conv.unread .udot').count(), 1, 'Hussain unread');
    assert.ok(await phone.locator('.cdiv').count() > 0, 'separated by the hairlines');
    assert.ok((await phone.locator('.em').innerText()).toUpperCase().includes('SELECT A CONVERSATION'), 'Nothing open yet');
    assert.equal(await phone.getByRole('link', { name: 'Go to Friends' }).getAttribute('href'), '/friends');
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true, 'A fixed screen: the page does not scroll');
    await page.screenshot({ path: path.join(output, 'lmessages-844.png') });

    await phone.locator('.conv').first().click();
    await phone.locator('.ch').waitFor();
    await phone.locator('.mg.day').waitFor();
    assert.equal(await phone.locator('.conv').count(), 5, 'The list stays beside the thread');
    assert.equal(await phone.locator('.mg.day').count(), 1, 'The day separator');
    assert.equal(await phone.locator('.mg.me, .mg.them').count(), 6, 'and the six messages');
    assert.equal(await phone.getByRole('region', { name: 'Message history' }).count(), 1, 'One thread');
    assert.ok((await phone.locator('.ch').innerText()).toLowerCase().includes('invite to mindi'), 'with the invite');
    await phone.getByRole('textbox', { name: 'Message…' }).fill('On my way');
    assert.ok((await phone.locator('.cmp').innerText()).includes('9 / 500'), 'The counter');
    await phone.getByRole('button', { name: 'Send message' }).click();
    assert.equal(await page.locator('body').getAttribute('data-said'), 'On my way');
    await page.screenshot({ path: path.join(output, 'lchat-844.png') });
    for (const size of [[740, 360], [932, 430]]) {
      await page.setViewportSize({ width: size[0], height: size[1] });
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at ' + size[0]);
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Messages: LMessages and LChat on a phone, both panes, five conversations with the unread dot, the board\'s six-message thread and day separator, the 500-character counter, sending, switching, Invite to Mindi, empty/guest/error states, four wide-screen widths, the narrow fallback and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
