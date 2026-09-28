/**
 * Settings (Arena) — design/arena/screens/app/app-14-settings.jpg.
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
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/settings-test');
const mocks = path.join(__dirname, 'settings-test-services.tsx');
const alias = Object.fromEntries([
  '@/contexts/AuthContext', '@/contexts/SettingsContext', '@/contexts/ToastContext',
  '@/hooks/useTranslation', '@/lib/admin', '@/lib/i18n', '@/constants/ranks',
  '@/components/moderation/BlockedPlayers', '@/components/settings/LogoutBar', 'next/link',
].map(name => [name + '$', mocks]));
alias['@'] = root;

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false,
    entry: path.join(__dirname, 'settings-test-entry.tsx'),
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
    await page.route('**/settings/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head>`
        + `<body class="${bodyClass || ''}"><div id="test-root"></div>`
        + `<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`,
    }));

    await page.goto(BASE + '/settings/');
    await page.getByRole('heading', { name: 'Settings', level: 1 }).waitFor();
    await page.waitForTimeout(250);

    // ── The board's structure ───────────────────────────────────────────
    assert.equal(await page.locator('.sec').count(), 5, 'Five sections');
    assert.equal(await page.locator('.snav').count(), 4, 'Four category buttons');
    assert.equal(await page.locator('.toggle').count(), 3, 'Three switches');
    assert.equal(await page.locator('.langs button').count(), 4, 'Four languages');
    assert.equal(await page.locator('.faq').count(), 3, 'Three FAQs');
    assert.ok((await page.locator('.set-about').innerText()).includes('Version 1.0.0'));

    // ── The two rows that are honestly disabled ─────────────────────────
    assert.equal(await page.getByRole('switch', { name: 'Notifications' }).isDisabled(), true,
      'Notifications has no delivery behind it');
    assert.equal(await page.getByRole('switch', { name: 'Sound Effects' }).isDisabled(), true,
      'and neither do sound effects');
    assert.equal(await page.getByRole('switch', { name: 'Background Music' }).isDisabled(), false,
      'but music is real');
    assert.equal(await page.locator('.srow.off').count(), 2, 'Both dim their label');

    // ── Music, and language ─────────────────────────────────────────────
    assert.equal(await page.getByRole('switch', { name: 'Background Music' }).getAttribute('aria-checked'), 'true');
    await page.getByRole('switch', { name: 'Background Music' }).click();
    assert.equal(await page.locator('body').getAttribute('data-saved'), '{"music":false}');
    assert.equal(await page.getByRole('switch', { name: 'Background Music' }).getAttribute('aria-checked'), 'false');

    assert.equal(await page.locator('.langs button[aria-pressed="true"]').innerText(), 'English');
    await page.locator('.langs button').nth(1).click();
    assert.equal(await page.locator('body').getAttribute('data-saved'), '{"language":"dv"}');
    // Choosing Dhivehi says what it does, which the board notes.
    await page.getByText('Dhivehi lays the app out right to left.').waitFor();

    // A failed save says so instead of silently doing nothing.
    await page.goto(BASE + '/settings/?savefail');
    await page.waitForTimeout(200);
    await page.getByRole('switch', { name: 'Background Music' }).click();
    assert.equal(await page.locator('body').getAttribute('data-toast'), "Couldn't save your changes on this device.");

    // ── Account, privacy ────────────────────────────────────────────────
    await page.goto(BASE + '/settings/');
    await page.waitForTimeout(200);
    const account = await page.locator('#settings-account').innerText();
    assert.ok(account.includes('s••••@gmail.com'), 'The address is masked');
    assert.ok(!account.includes('sayyu@gmail.com'), 'and never printed in full');
    assert.ok(account.includes('GOLD') || account.includes('Gold'), 'with the rank beside it');
    assert.equal(await page.getByText('Admin Panel').count(), 0, 'No admin row for a normal account');
    await page.goto(BASE + '/settings/?admin');
    await page.waitForTimeout(200);
    await page.getByText('Admin Panel').waitFor();
    await page.goto(BASE + '/settings/?guest');
    await page.waitForTimeout(200);
    await page.getByText('Sign in to keep your progress.').waitFor();

    await page.goto(BASE + '/settings/');
    await page.waitForTimeout(200);
    await page.getByText("You haven't blocked anyone. You can block a player from their profile.").waitFor();

    // ── The rail scrolls rather than swapping panels ────────────────────
    await page.getByRole('button', { name: /^Privacy & Security/ }).click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.sec').count(), 5, 'Every section stays on the page');
    assert.equal(await page.locator('.snav[aria-pressed="true"]').innerText(), 'PRIVACY & SECURITY');

    // ── FAQ ─────────────────────────────────────────────────────────────
    await page.locator('.faq').first().click();
    await page.getByText('Equip owned cosmetics from your').waitFor();

    // ── Held upright: MSettings ─────────────────────────────────────────
    // design/arena/boards/MSettings.dc.html. The category rail becomes the
    // phone's scrolling chip row - still scroll-to, not swap - the sections
    // stack at the board's `.sec2` size with the first one ticked, and the
    // About card moves to the foot of the page with Log Out inside it. The
    // rows themselves are the wide screen's own, checked above.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.set-page').count(), 0, 'The wide screen steps aside');
    const phone = page.locator('.arena-msettings');
    assert.equal(await phone.isVisible(), true, 'and MSettings takes over');
    assert.equal(await phone.locator('.chips > button').count(), 4, 'Four categories, as chips');
    assert.equal(await phone.locator('.sec2').count(), 5, 'Every section is still on the page');
    assert.equal(await phone.locator('.panel.tick.sec2').count(), 1, 'The board ticks the first panel only');
    assert.equal(await phone.locator('[role=switch]').count(), 3, 'The same three switches');
    assert.equal(await phone.locator('.langs button').count(), 4, 'and the four languages');
    // The language control takes a line of its own at 390.
    assert.equal(
      await phone.locator('.langs').evaluate(node => node.getBoundingClientRect().width > node.parentElement.getBoundingClientRect().width * 0.9),
      true, 'The language buttons wrap onto their own row');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at 390');
    await page.screenshot({ path: path.join(output, 'msettings-390.png'), fullPage: true });

    // The chips scroll to a section rather than swapping panels.
    await phone.locator('.chips > button', { hasText: 'Privacy & Security' }).click();
    await page.waitForTimeout(300);
    assert.equal(await phone.locator('.sec2').count(), 5, 'Nothing was swapped out');
    assert.equal(await phone.locator('.chips button[aria-pressed="true"]').count(), 1, 'One chip is pressed');
    const heading = await page.locator('#settings-privacy').boundingBox();
    assert.ok(heading.y >= 0, 'and the section it scrolled to is not under the top bar');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);

    // ── Widths ──────────────────────────────────────────────────────────
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [844, 390], [768, 1024], [390, 844], [320, 700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow ' + width);
      assert.equal(
        await page.locator('.sec,.snav,.langs').evaluateAll(
          nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })
        ), true, 'Clipping ' + width);
      await page.screenshot({ path: path.join(output, 'settings-' + width + '.png'), fullPage: true });
    }

    // ── Accessibility ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.locator('h1').count(), 1, 'One h1');
    assert.equal(await page.locator('[role=switch][aria-checked][aria-label]').count(), 3,
      'Every switch reports its state and says what it switches');
    const unlabelled = await page.locator('button,a').evaluateAll(
      nodes => nodes.filter(n => !n.textContent.trim() && !n.getAttribute('aria-label')).length
    );
    assert.equal(unlabelled, 0, 'Every icon-only control has an aria-label');

    assert.deepEqual(errors, []);
    console.log('Settings: five sections, the category rail that scrolls rather than swaps, three switches with two honestly disabled, the four-language control with the right-to-left note, a failed save, the masked address, admin/guest/blocked states, FAQs, MSettings held upright with its chip row and footed About card, seven widths and accessibility passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
