const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const nextWebpack = require('next/dist/compiled/webpack/webpack');
nextWebpack.init();
const { webpack } = nextWebpack;
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const mocks = path.join(__dirname,'friends-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/ToastContext','next/navigation','next/link','@/lib/friends','@/lib/rooms','@/lib/presence','@/hooks/useTranslation'].map(name=>[name+'$',mocks]));
alias['@']=root;
async function run() {
  await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.join(__dirname,'friends-test-entry.tsx'),output:{path:path.join(root,'artifacts/friends-test'),filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:3000/login/');
    const styles=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(node=>node.href));
    const script=fs.readFileSync(path.join(root,'artifacts/friends-test/component.js'),'utf8');
    await page.route('**/friends/**',route=>route.fulfill({contentType:'text/html',body:`<html><head>${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body><div class="app-shell"><aside style="width:56px;flex-shrink:0" aria-hidden="true"></aside><main class="app-shell-main"><div id="test-root"></div></main></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    for(const state of ['', '?populated=1','?failure=1']) {
      await page.goto('http://127.0.0.1:3000/friends/'+state);
      await page.getByRole('heading',{name:'Friends',exact:true}).waitFor();
      await page.waitForTimeout(250);
      for(const width of [1920,1440,1280,768,390,320]) {
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow: ${state} ${width}`);
        await page.screenshot({path:path.join(root,`artifacts/friends-test/${state.includes('populated')?'populated':state.includes('failure')?'error':'empty'}-${width}.png`)});
      }
    }
    await page.goto('http://127.0.0.1:3000/friends/?populated=1');
    await page.getByRole('button',{name:'Add Friend',exact:true}).first().click();
    await page.getByRole('textbox',{name:'Username or player ID'}).fill('Nova');
    await page.getByRole('button',{name:'Search players',exact:true}).click();
    await page.getByRole('button',{name:'Add ZxNova',exact:true}).click();
    await page.getByRole('button',{name:'Requested ZxNova',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.sentRequest),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.getByRole('textbox',{name:'Search friends by username'}).fill('Aishath');
    assert.equal(await page.locator('.social-roster .social-person').count(),1);
    await page.getByRole('tab',{name:/Requests/}).click();
    await page.getByRole('button',{name:'Accept Hussain'}).click();
    await page.getByText('No pending requests.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.accepted),true);
    await page.getByRole('tab',{name:'Friends',exact:true}).click();
    await page.getByRole('textbox',{name:'Search friends by username'}).fill('');
    await page.getByRole('button',{name:'Filter friends',exact:true}).click();
    await page.getByRole('checkbox',{name:'Online only'}).check();
    assert.equal(await page.locator('.social-roster .social-person').count(),1);
    await page.locator('summary[aria-label="Actions for Aishath"]').click();
    await page.getByRole('button',{name:'Invite to Gin Rummy'}).click();
    await page.waitForFunction(()=>window.lastNavigation==='/play/gin-rummy/room?code=TEST01');
    await page.getByRole('button',{name:'Remove Friend',exact:true}).click();
    await page.getByRole('button',{name:'Remove',exact:true}).click();
    await page.waitForFunction(()=>window.lastToast==='Friend removed');
    console.log('Friends UI: six viewport widths, empty/populated/error, filtering, modal, search, request sending and accepting passed.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
