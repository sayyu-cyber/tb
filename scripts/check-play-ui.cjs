const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const nextWebpack = require('next/dist/compiled/webpack/webpack');
nextWebpack.init();
const { webpack } = nextWebpack;
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const mocks = path.join(__dirname, 'play-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext', '@/contexts/EconomyContext', '@/contexts/SettingsContext', '@/hooks/useRankLock', 'next/link'].map(name => [name + '$', mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(__dirname, 'play-test-entry.tsx'), output: { path: path.join(root, 'artifacts/play-test'), filename: 'component.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], alias }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] }, optimization: { minimize: false } }, (error, stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => node.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(root, 'artifacts/play-test/component.js'), 'utf8');
    await page.route('**/play/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html><head><meta charset="utf-8">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div class="app-shell"><aside style="width:56px;flex-shrink:0"></aside><main class="app-shell-main"><div id="test-root"></div></main></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>` }));
    await page.goto('http://127.0.0.1:3000/play/');
    await page.getByRole('heading', { name: 'Choose Your Game' }).waitFor();
    for (const [width, height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
      await page.screenshot({ path: path.join(root, `artifacts/play-test/play-${width}.png`), fullPage: true });
    }
    for (const game of ['mindi', 'gin-rummy']) {
      const card = page.locator('.play-game-' + game);
      for (const [label, route] of [['Vs AI', 'ai'], ['Pass & Play', 'passplay'], ['Casual', 'online']]) {
        await card.getByRole('button', { name: new RegExp(label) }).click();
        assert.equal(await card.locator('.play-launch').getAttribute('href'), `/play/${game}/casual/${route}`);
        assert.equal(await card.locator('button[aria-pressed=true]').count(), 1);
      }
      assert.equal(await card.locator('.play-room').getAttribute('href'), `/play/${game}/room`);
      assert.equal(await card.locator('.play-ranked').getAttribute('href'), `/play/${game}/${game === 'mindi' ? 'ranked-duo' : 'ranked'}`);
    }
    assert.equal(await page.locator('.play-duo').getAttribute('href'), '/play/gin-rummy/ranked-duo');
    assert.equal(await page.locator('.play-league a').getAttribute('href'), '/tournament');
    await page.goto('http://127.0.0.1:3000/play/?guest');
    await page.getByRole('heading', { name: 'Choose Your Game' }).waitFor();
    assert.equal(await page.locator('.play-room').count(), 0);
    assert.equal(await page.locator('.play-game .play-ranked').count(), 0);
    assert.equal(await page.locator('.play-launch').first().getAttribute('href'), '/login');
    await page.getByRole('button', { name: /Vs AI/ }).first().click();
    assert.equal(await page.locator('.play-launch').first().getAttribute('href'), '/play/mindi/casual/ai');
    await page.goto('http://127.0.0.1:3000/play/?live');
    await page.getByText('LIVE NOW', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Play passed: six viewport sizes, selected modes, existing launch/room/ranked routes, guest guards, live event, no runtime errors.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
