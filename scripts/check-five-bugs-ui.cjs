const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-five-bugs-'));
const mock = path.join(__dirname, 'five-bugs-test-services.tsx');
async function run() {
  const alias = Object.fromEntries(['@/contexts/AuthContext','./AuthContext','@/contexts/ToastContext','./ToastContext','@/lib/supabase/client','@/hooks/useTranslation','@/lib/profileHistory','next/navigation','next/link'].map(key => [key + '$', mock])); alias['@'] = root;
  await new Promise((resolve, reject) => compiler.webpack({ mode: 'development', devtool: false,
    entry: path.join(__dirname, 'five-bugs-test-entry.tsx'), output: { path: output, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx','.ts','.js'], alias },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
  }, (err, stats) => err || stats.hasErrors() ? reject(err || new Error(stats.toString())) : resolve()));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const css = await page.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => node.href));
    const styles = await Promise.all(css.map(async url => (await page.request.get(url)).text()));
    const script = fs.readFileSync(path.join(output, 'fixture.js'), 'utf8');
    await page.route('**/five-bugs-test/**', route => route.fulfill({ contentType: 'text/html', body: `<html><head>${styles.map(text => `<style>${text}</style>`).join('')}</head><body><div class="arena-app arena-phone"><div id="test-root"></div></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>` }));
    await page.goto('http://127.0.0.1:3000/five-bugs-test/');
    await page.locator('#chip').getByText('71,760', { exact: true }).waitFor();
    await page.getByPlaceholder('Player ID').fill('YWD54FH');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByText('Current balance: 71,760 coins', { exact: true }).waitFor();
    await page.evaluate(() => { window.bugsFixture.coins = 80001; window.bugsFixture.version++; window.bugsFixture.reconnect(); });
    await page.locator('#chip').getByText('80,001', { exact: true }).waitFor();
    await page.getByText('Current balance: 80,001 coins', { exact: true }).waitFor();
    await page.getByRole('spinbutton', { name: 'Amount to deposit' }).fill('37');
    await page.getByRole('button', { name: 'Deposit', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.locator('#chip').getByText('80,038', { exact: true }).waitFor();
    await page.getByText('Current balance: 80,038 coins', { exact: true }).waitFor();
    await page.evaluate(() => { window.bugsFixture.coins = 81000; window.bugsFixture.version++; window.bugsFixture.navigate('/shop'); });
    await page.locator('#chip').getByText('81,000', { exact: true }).waitFor();
    await page.evaluate(() => window.bugsFixture.economy.addCoins(999999, 'match_victory', 'Victory'));
    await page.locator('#chip').getByText('81,010', { exact: true }).waitFor();
    await page.evaluate(() => window.bugsFixture.economy.spendCoins(13, 'Spend'));
    await page.locator('#chip').getByText('80,997', { exact: true }).waitFor();
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => window.bugsFixture.walletUploads), 0);
    console.log('PASS bug 1: cache overridden, equal chip/admin values, reconnect, navigation, deposit and server credit/debit responses; no wallet upload');
    await page.getByRole('button', { name: /Claim Day 1:/ }).click({ clickCount: 2 });
    await page.getByText(/Next claim in 23:59:/).waitFor();
    assert.equal(await page.getByRole('button', { name: /Claim Day/ }).count(), 0);
    const before = await page.evaluate(() => window.bugsFixture.coins);
    assert.equal(await page.evaluate(() => window.bugsFixture.economy.claimDailyReward(2)), false);
    assert.equal(await page.evaluate(() => window.bugsFixture.coins), before);
    console.log('PASS bug 5: double-click yields one claim, server denial does not award coins, cooldown removes claim affordance');
    await page.goto('http://127.0.0.1:3000/five-bugs-test/?profile');
    await page.getByRole('button', { name: 'Copy player ID' }).first().waitFor();
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => window.copiedId = value } }));
    await page.getByRole('button', { name: 'Copy player ID' }).first().click();
    await page.waitForFunction(() => window.copiedId === 'YWD54FH');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('Denied'); } } });
      document.execCommand = () => { window.copiedId = document.querySelector('textarea[readonly]').value; return true; };
      window.copiedId = '';
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Copy player ID' }).filter({ visible: true }).click();
    await page.waitForFunction(() => window.copiedId === 'YWD54FH');
    assert.equal(await page.locator('textarea[readonly]').count(), 0);
    await page.evaluate(() => { document.execCommand = () => false; });
    await page.getByRole('button', { name: 'Copy player ID' }).filter({ visible: true }).click();
    await page.waitForFunction(() => window.bugsFixture.toasts.includes("Couldn't copy User ID."));
    assert.deepEqual(errors, []);
    console.log('PASS bug 2: full ID copied on desktop/phone, denied API falls back, cleanup and native failure toast');
    await page.goto('http://127.0.0.1:3000/five-bugs-test/?slow');
    await page.locator('#chip').getByText('71,760', { exact: true }).waitFor();
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#chip').innerText(), '71,760', 'Slow inventory hydration/fallback cannot overwrite a fetched wallet');
    console.log('PASS bug 1: delayed unrelated hydration cannot restore cached coins over a server balance');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
