const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/home-test');
const mocks = path.join(__dirname, 'home-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/contexts/HomeSocialContext','@/hooks/useRankLock','@/hooks/useSeasonInfo','next/link'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'home-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');
    await page.route('**/home/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/home/');
    await page.getByRole('heading',{name:'Thaasbai.'}).waitFor();
    for (const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height}); await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      await page.screenshot({path:path.join(output,'home-'+width+'.png'),fullPage:true});
    }
    for (const mode of ['ai','passplay','online']) {
      await page.getByRole('combobox',{name:'Select quick play mode'}).selectOption(mode);
      assert.equal(await page.locator('.game-cover').first().getAttribute('href'),'/play/mindi/casual/'+mode);
      assert.equal(await page.locator('.game-cover').nth(1).getAttribute('href'),'/play/gin-rummy/casual/'+mode);
    }
    await page.getByRole('button',{name:/Season 1 Ranked Launch/}).click();
    assert.equal(await page.locator('dialog[open]').count(),1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    assert.equal(await page.locator('.home-shortcut-grid a').count(),9);
    await page.goto('http://127.0.0.1:3000/home/?guest');
    await page.getByRole('heading',{name:'Thaasbai.'}).waitFor();
    assert.equal(await page.locator('.game-cover').first().getAttribute('href'),'/play/mindi/casual/ai');
    for (const state of ['loading','error','live']) {
      await page.goto('http://127.0.0.1:3000/home/?'+state);
      await page.setViewportSize({width:1440,height:900});
      await page.getByRole('heading',{name:'Thaasbai.'}).waitFor();
      await page.screenshot({path:path.join(output,state+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    console.log('Home: six viewport sizes, mode routes, guest defaults, nine shortcuts, news dialog/Escape, loading/error/live states passed.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
