const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/gameplay-test/arena-gin');
const mocks=path.join(__dirname,'gin-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/SettingsContext','next/navigation'].map(name=>[name+'$',mocks]));alias['@']=root;
async function main(){
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',devtool:false,entry:path.join(__dirname,'arena-game-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})]},(e,s)=>e||s.hasErrors()?reject(e||s.toString()):resolve()));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/login/');
    const urls=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];for(const url of urls){const r=await page.request.get(url);assert.ok(r.ok());css.push(await r.text());}
    const body=await page.locator('body').getAttribute('class'),script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    await page.route('**/arena-check/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(s=>`<style>${s}</style>`).join('')}</head><body class="${body}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    const load=async(query='')=>{await page.goto('http://127.0.0.1:3000/arena-check/'+query);await page.waitForTimeout(900);};
    const point=async(locator)=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width*.3,y:r.top+r.height*.48};});
    const clickCard=async(locator)=>{const p=await point(locator);await page.mouse.move(p.x,p.y);await page.waitForTimeout(250);await page.mouse.down();await page.mouse.up();};
    await load('?mindi');await page.waitForTimeout(1200);
    const legal=page.getByRole('button',{name:'9 of Hearts',exact:true});
    const before=await legal.boundingBox();await clickCard(legal);
    await page.screenshot({path:path.join(output,'mindi-input.png')});
    const after=await legal.boundingBox();assert.ok(Math.abs(after.x-before.x)<4&&Math.abs(after.y-before.y)<60,'Card jumped away from pointer');
    assert.equal(await legal.getAttribute('aria-pressed'),'true','Mindi pointer selection failed');
    await page.getByRole('button',{name:/Play.*9/i}).click();
    assert.ok(await page.locator('body').getAttribute('data-played'),'Mindi card was not played');
    await load();
    // The table is the board's own CSS 3D table (no WebGL): felt, rail, LEDs.
    assert.equal(await page.locator('.stage .table .felt.gin').count(),1,'The board\'s table is drawn');
    assert.equal(await page.locator('.stage .table .leds').count(),1);
    assert.equal(await page.locator('.hand .hc:enabled').count(),0,'Selection enabled during draw phase');
    await page.getByRole('button',{name:/Draw from stock/}).click();
    assert.equal(await page.locator('.hand .hc').count(),11);
    assert.equal(await page.locator('.hand .newtag').count(),1,'The drawn card is tagged New');
    await page.waitForTimeout(350);
    for(const card of await page.locator('.hand .hc').all()){
      await clickCard(card);assert.equal(await card.getAttribute('aria-pressed'),'true','A card is not pointer selectable');
      await page.mouse.move(20,20);await page.waitForTimeout(200);
    }
    const first=page.locator('.hand .hc').first();await first.focus();
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.locator('.hand .hc').nth(1).evaluate(el=>el===document.activeElement),'Arrow navigation failed');
    await page.keyboard.press('Enter');
    const moved=await page.locator('.hand .hc:focus').getAttribute('aria-label');
    await page.keyboard.press('Alt+ArrowRight');
    assert.equal(await page.locator('.hand .hc').nth(2).getAttribute('aria-label'),moved,'Keyboard reorder failed');
    await page.getByRole('group',{name:'Sort hand'}).getByRole('button',{name:'Melds'}).click();
    const discard=page.getByRole('button',{name:'K of diamonds',exact:true});
    await clickCard(discard);assert.equal(await discard.getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByRole('button',{name:'Discard & win',exact:true}).isEnabled(),true);
    if(await page.getByRole('button',{name:'View melds',exact:true}).getAttribute('aria-pressed')!=='true')await page.getByRole('button',{name:'View melds',exact:true}).click();
    assert.equal(await page.locator('.bracket').count(),4,'One bracket per group: 4, 3, 3 and the deadwood');
    // 844x390 is left out on purpose: a phone held sideways gets PGin, the
    // 844x390 composition, not this board (design/arena/MOBILE.md "Tables fit
    // what is visible"). It has its own section further down.
    for(const [width,height] of [[1920,1080],[1440,900],[390,844],[320,700]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal overflow '+width);
      assert.ok(await page.locator('.hand .hc').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})),'Clipped cards '+width);
      await page.screenshot({path:path.join(output,`gin-selected-${width}.png`)});
    }
    await page.setViewportSize({width:1440,height:900});
    await page.getByRole('button',{name:'Discard & win',exact:true}).click();
    await page.getByRole('heading',{name:/You won|Gin!/i}).waitFor();
    await page.screenshot({path:path.join(output,'gin-result.png')});
    await load('?error');await page.getByRole('button',{name:/Draw from stock/}).click();await page.waitForTimeout(1000);
    await clickCard(page.getByRole('button',{name:'K of diamonds',exact:true}));
    await page.getByRole('button',{name:'Discard & win',exact:true}).click();
    await page.getByRole('alert').waitFor();assert.equal(await page.locator('.hand .hc').count(),11);
    assert.equal(await page.getByRole('button',{name:'Discard & win',exact:true}).isEnabled(),true,'Failed action cannot be retried');
    await load('?red');
    assert.equal(await page.locator('.felt.gin').getAttribute('data-skin'),'tt_red');
    assert.ok(await page.locator('.fan .back.cb.inferno').count()>0,'The opponent\'s fan wears their equipped back');
    // Touch, on the desktop composition.
    await page.getByRole('button',{name:/Draw from discard pile/}).tap();
    await page.getByRole('button',{name:'K of diamonds',exact:true}).tap();
    assert.equal(await page.getByRole('button',{name:'Discard & win',exact:true}).isEnabled(),true,'Touch selection failed');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.screenshot({path:path.join(output,'gin-reduced-desktop.png')});

    // ---- held sideways: PGin (design/arena/boards/PGin.dc.html) -----------
    // A different artboard, not this one shrunk, so the seats, the piles and
    // the hand are all somewhere else. What has to survive the swap is the
    // game: the same hand, the same melds, the same taps.
    await page.emulateMedia({reducedMotion:null});
    await load('?red');
    await page.setViewportSize({width:844,height:390});
    // PGin deals its hand in with handIn, 40 ms apart: about 1.1 s to settle.
    await page.waitForTimeout(1300);
    const pgin=page.locator('.arena-pgin');
    assert.equal(await pgin.isVisible(),true,'PGin takes over sideways');
    assert.equal(await page.locator('.arena-gin-board').count(),0,'and the wide board steps aside');
    assert.equal(await pgin.locator('.hc').count(),10,'The same ten cards');
    assert.equal(await pgin.locator('.gtag').count()>0,true,'with a bracket over each meld');
    // The whole composition is scaled to fit the VISIBLE viewport, so nothing
    // - least of all the hand or the action button - hangs off the screen.
    for(const selector of ['.hc','.ar-btn','.who']){
      assert.ok(await pgin.locator(selector).evaluateAll(nodes=>nodes.every(n=>{
        const r=n.getBoundingClientRect();
        return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;
      })),'Clipped '+selector+' sideways');
    }
    await page.screenshot({path:path.join(output,'pgin-844.png')});
    // Drawing and discarding, by touch, on the phone composition.
    await pgin.getByRole('button',{name:/Take the .* from the discard pile/}).tap();
    assert.equal(await pgin.locator('.hc').count(),11,'The drawn card joins the hand');
    await pgin.getByRole('button',{name:'K of diamonds',exact:true}).tap();
    await pgin.getByRole('button',{name:/Discard & win/}).tap();
    await page.getByRole('heading',{name:/You won|Gin!/i}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('Arena passed: Mindi mouse select/play, Gin phase guards, mouse/touch discard, actual winning layout, skins, four wide viewports, PGin sideways with nothing clipped, the board CSS 3D table, failure retry.');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
