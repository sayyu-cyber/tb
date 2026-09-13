const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/shop-test');
const mocks = path.join(__dirname, 'shop-test-services.tsx');
const alias = Object.fromEntries(['../../contexts/AuthContext','../../contexts/EconomyContext','../../contexts/ToastContext','../../lib/coinTopups','@/contexts/SettingsContext'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'shop-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');

    await page.route('**/shop-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/shop-test/');

    await page.getByRole('heading',{name:'Shop',exact:true}).waitFor();
    for (const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height}); await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      await page.screenshot({path:path.join(output,'shop-'+width+'.png'),fullPage:true});
    }
    await page.getByRole('button',{name:'Permanent',exact:true}).click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox',{name:'Search cosmetics'}).fill('Maldives Sunset');
    await page.getByRole('button',{name:'Preview Maldives Sunset'}).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.locator('.store-buy').click();
    await page.getByRole('dialog').getByRole('button',{name:/Buy for/}).click();
    await page.locator('.store-equip').click();
    await page.getByRole('button',{name:'Equipped',exact:true}).waitFor();
    await page.getByRole('textbox',{name:'Search cosmetics'}).fill('nonexistent item');
    assert.equal(await page.locator('.store-item').count(),0);
    await page.goto('http://127.0.0.1:3000/shop-test/?poor');
    await page.getByRole('heading',{name:'Shop',exact:true}).waitFor();
    await page.locator('.store-buy').first().click();
    await page.getByRole('dialog').getByRole('button',{name:'Get Coins'}).click();
    await page.getByText('Prices in MVR. Top-ups require admin approval before coins are credited.').waitFor();
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.goto('http://127.0.0.1:3000/shop-test/?vip');
    await page.getByText('Your extra weekly cosmetic slot is unlocked.').waitFor();
    assert.equal(await page.getByRole('button',{name:'View VIP Plans'}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('Shop passed: six sizes, preview/Escape, purchase confirmation, equip, search, insufficient funds, coin tab and VIP banner.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
