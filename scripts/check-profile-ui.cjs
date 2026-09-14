const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/profile-test');
const mocks = path.join(__dirname, 'profile-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/ToastContext','@/hooks/useTranslation','@/lib/profileHistory','@/lib/firebase'].map(name=>[name+'$',mocks])); alias['@']=root;
async function run() {
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'profile-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/login/');
    const styles=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass=await page.locator('body').getAttribute('class');
    const script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    await page.route('**/profile-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass||''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/profile-test/');
    await page.getByRole('heading',{name:'Test Player'}).waitFor();
    for(const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height}); await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      assert.equal(await page.locator('.profile-stat,.profile-hero,.profile-game').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),true,'Clipping '+width);
      await page.screenshot({path:path.join(output,'profile-'+width+'.png'),fullPage:true});
    }
    assert.deepEqual(await page.locator('.profile-stat strong').allTextContents(),['20','12','8','60%']);
    assert.equal(await page.getByText('ADMIN',{exact:true}).count(),0);
    assert.equal(await page.locator('progress').first().getAttribute('value'),'1');
    await page.getByRole('button',{name:'History',exact:true}).click();
    assert.equal(await page.locator('.profile-history article').count(),2);
    await page.getByRole('button',{name:'Edit Profile',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('textbox').evaluate(n=>document.activeElement===n),true);
    await page.getByRole('textbox').fill('Renamed Player');
    await page.getByRole('button',{name:'Save Changes'}).click();
    await page.waitForFunction(()=>document.body.dataset.saved==='Renamed Player');
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('button',{name:'Edit Profile',exact:true}).click();
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(),0);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{document.body.dataset.copied=value;}}}));
    await page.getByRole('button',{name:'Copy User ID'}).click();
    assert.equal(await page.locator('body').getAttribute('data-copied'),'TEST123');
    assert.equal(await page.locator('body').getAttribute('data-toast'),'User ID copied.');
    await page.goto('http://127.0.0.1:3000/profile-test/?error');
    await page.getByText('Game statistics and history unavailable.').waitFor();
    assert.deepEqual(await page.locator('.profile-stat strong').allTextContents(),['--','--','--','--']);
    await page.goto('http://127.0.0.1:3000/profile-test/?empty');
    await page.getByRole('button',{name:'History',exact:true}).click();
    await page.getByText('No recorded online matches yet.').waitFor();
    await page.goto('http://127.0.0.1:3000/profile-test/?admin');
    await page.getByText('ADMIN',{exact:true}).waitFor();
    await page.goto('http://127.0.0.1:3000/profile-test/?savefail');
    await page.getByRole('button',{name:'Edit Profile',exact:true}).click();
    await page.getByRole('button',{name:'Save Changes'}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('dialog').count(),1);
    assert.deepEqual(errors,[]);
    console.log('Profile: six responsive sizes, totals, achievements, history, edit, Escape, copy and empty/error states passed. Backend calls mocked.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
