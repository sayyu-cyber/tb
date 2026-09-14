const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/mindi-test');
const mocks = path.join(__dirname, 'mindi-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/components/rewards/MatchRewardPopup','next/navigation','@/lib/matchmaking','@/lib/trophyUpdates','@/contexts/ToastContext','@/hooks/useOpponentProfiles'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'mindi-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');

    await page.route('**/mindi-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/mindi-test/');

    await page.getByRole('heading',{name:'Mindi',exact:true}).waitFor();
    for(const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      assert.equal(await page.locator('.mindi-hand button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),true,'Cards clipped '+width);
      await page.screenshot({path:path.join(output,'mindi-'+width+'.png'),fullPage:true});
    }
    assert.equal(await page.locator('.mindi-hand button').count(),13);
    assert.equal(await page.locator('.mindi-hidden-hand button').count(),0);
    assert.equal(await page.getByRole('button',{name:'Play Card',exact:true}).isEnabled(),false);
    await page.locator('.mindi-hand button:enabled').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.mindi-hand button[aria-pressed=true]').count(),1);
    assert.equal(await page.locator('.mindi-hand button').count(),13);
    await page.getByRole('button',{name:'Play Card',exact:true}).click();
    assert.equal(await page.locator('.mindi-hand button').count(),12);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.mindi-score dd')).some(n=>n.textContent==='1'),{},{timeout:15000});
    await page.getByRole('button',{name:'Rules',exact:true}).click();
    await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.getByRole('button',{name:'Exit Game',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    await page.goto('http://127.0.0.1:3000/mindi-test/?pass&red');
    assert.equal(await page.locator('.mindi-hand').count(),0);
    await page.getByRole('button',{name:/ready/}).click();
    const ownNames=await page.locator('.mindi-hand button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
    await page.locator('.mindi-hand button:enabled').first().focus();await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Play Card',exact:true}).click();
    const remaining=await page.locator('.mindi-hand button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
    assert.equal(remaining.length,12);
    assert.equal(remaining.every(name=>ownNames.includes(name)),true,'Bot hand exposed during passplay');
    await page.getByRole('button',{name:/ready/}).waitFor({timeout:10000});
    assert.equal(await page.locator('.mindi-hand').count(),0);
    await page.getByRole('button',{name:/ready/}).click();
    assert.equal(await page.locator('.mindi-hand button').count(),13);
    assert.equal(await page.locator('.gin-oval').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(58, 14, 20)');
    await page.goto('http://127.0.0.1:3000/mindi-test/?online');
    await page.getByRole('heading',{name:'Mindi',exact:true}).waitFor();
    assert.deepEqual(await page.locator('.mindi-score').first().locator('dd').allTextContents(),['2','3']);
    assert.equal(await page.locator('.mindi-seat-top strong').textContent(),'Partner');
    assert.equal(await page.locator('.trick-slot-right').getAttribute('data-seat'),'0');
    const led=await page.locator('.trick-slot-right [role=img]').getAttribute('aria-label');
    const playable=await page.locator('.mindi-hand button:enabled').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
    assert.equal(playable.every(name=>name.split(' of ')[1]===led.split(' of ')[1]),true,'Follow suit');
    await page.locator('.mindi-hand button:enabled').first().focus();await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Play Card',exact:true}).click();
    assert.equal(await page.locator('.mindi-hand button').count(),12);
    await page.goto('http://127.0.0.1:3000/mindi-test/?online&duel');
    await page.getByRole('heading',{name:'Mindi',exact:true}).waitFor();
    assert.equal(await page.locator('.mindi-hand button').count(),26);
    assert.equal(await page.locator('.mindi-seat').count(),1);
    assert.equal(await page.locator('.trick-slot').count(),2);
    await page.goto('http://127.0.0.1:3000/mindi-test/?online&fail');
    await page.getByRole('button',{name:'Exit Game',exact:true}).click();
    await page.getByRole('button',{name:'Leave Game',exact:true}).click();
    await page.getByRole('dialog').getByRole('alert').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-destination'),null);
    assert.deepEqual(errors,[]);
    console.log('Mindi passed: six sizes, card bounds, real local engine play/trick scoring, keyboard selection, hidden hands, pass-device privacy, skin and dialogs.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
