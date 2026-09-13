const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/settings-test');
const mocks = path.join(__dirname, 'settings-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/ToastContext','@/lib/admin'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'settings-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');

    await page.route('**/settings-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/settings-test/');

    await page.getByRole('heading',{name:'Settings',exact:true}).waitFor();
    for(const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      await page.screenshot({path:path.join(output,'settings-'+width+'.png'),fullPage:true});
    }
    assert.equal(await page.getByRole('switch',{name:'Notifications',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('link',{name:/Admin Panel/}).count(),0);
    const music = page.getByRole('switch',{name:'Background Music',exact:true});
    await music.click();
    assert.equal(await music.getAttribute('aria-checked'),'true');
    await page.reload();
    assert.equal(await page.getByRole('switch',{name:'Background Music',exact:true}).getAttribute('aria-checked'),'true');
    await page.getByLabel('Language',{exact:true}).selectOption('dv');
    assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
    await page.reload();
    assert.equal(await page.locator('select').inputValue(),'dv');
    await page.locator('select').selectOption('en');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage blocked'); }; });
    const before = await page.getByRole('switch',{name:'Background Music',exact:true}).getAttribute('aria-checked');
    await page.getByRole('switch',{name:'Background Music',exact:true}).click();
    assert.equal(await page.getByRole('switch',{name:'Background Music',exact:true}).getAttribute('aria-checked'),before);
    assert.match(await page.locator('body').getAttribute('data-toast'),/Couldn't save/);
    await page.getByRole('button',{name:'Privacy & Security',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'settings-privacy');
    await page.getByRole('button',{name:/Log Out/i,exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.goto('http://127.0.0.1:3000/settings-test/?admin&fail');
    await page.getByRole('link',{name:/Admin Panel/}).waitFor();
    await page.getByRole('button',{name:/Log Out/i,exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:/Log Out/i,exact:true}).click();
    await page.getByRole('alert').waitFor();
    await page.goto('http://127.0.0.1:3000/settings-test/');
    await page.getByRole('button',{name:/Log Out/i,exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:/Log Out/i,exact:true}).click();
    assert.equal(await page.locator('body').getAttribute('data-logged-out'),'true');
    assert.deepEqual(errors,[]);
    console.log('Settings passed: six sizes, actual local preference persistence, language/RTL, admin gating, section focus, logout cancel/error/success.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
