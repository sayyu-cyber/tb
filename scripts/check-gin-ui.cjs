const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/gin-test');
const mocks = path.join(__dirname, 'gin-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/components/rewards/MatchRewardPopup','next/navigation'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'gin-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');

    await page.route('**/gin-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/gin-test/');

    await page.getByRole('heading',{name:'Gin Rummy',exact:true}).waitFor();
    for(const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      assert.equal(await page.locator('.gin-hand button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),true,'Cards clipped '+width);
      await page.screenshot({path:path.join(output,'gin-'+width+'.png'),fullPage:true});
    }
    assert.equal(await page.locator('.gin-hand button').count(),10);
    assert.equal(await page.locator('.gin-rival-hand button').count(),0);
    assert.equal(await page.getByRole('button',{name:'Discard',exact:true}).isEnabled(),false);
    await page.getByRole('button',{name:/Draw from stock/}).click();
    assert.equal(await page.locator('.gin-hand button').count(),11);
    await page.locator('.gin-hand button').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.gin-hand button[aria-pressed=true]').count(),1);
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    assert.equal(await page.locator('.gin-hand button').count(),10);
    await page.getByRole('button',{name:'Rules',exact:true}).click();
    await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.getByRole('button',{name:'Exit Game',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    await page.goto('http://127.0.0.1:3000/gin-test/?pass&red');
    assert.equal(await page.locator('.gin-hand').count(),0);
    await page.getByRole('button',{name:/ready/}).click();
    await page.getByRole('button',{name:/Draw from stock/}).click();
    await page.locator('.gin-hand button').last().click();
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    assert.equal(await page.locator('.gin-hand').count(),0);
    await page.getByRole('button',{name:/ready/}).click();
    assert.equal(await page.locator('.gin-hand button').count(),10);
    assert.equal(await page.locator('.gin-oval').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(58, 14, 20)');
    assert.deepEqual(errors,[]);
    console.log('Gin passed: six sizes, real local engine draw/discard, selected cards, hidden opponent hands, pass-device privacy, skin, rules and leave cancel.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
