const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/gameplay-test');
const mocks=path.join(__dirname,'gameplay-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/components/rewards/MatchRewardPopup','next/navigation','@/lib/matchmaking','@/lib/trophyUpdates','@/contexts/ToastContext','@/hooks/useOpponentProfiles'].map(name=>[name+'$',mocks]));
alias['@/lib/ginRummyEngine$']=path.join(__dirname,'gameplay-gin-engine.ts');
alias['@']=root;
async function run(){
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'gameplay-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/login/');
    const styles=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];
    for(const url of styles){const response=await page.request.get(url);assert.ok(response.ok(),'Stylesheet request failed: '+url);css.push(await response.text());}
    assert.ok(css.join('').includes('.mindi-hud'),'Mindi styles did not load');
    const bodyClass=await page.locator('body').getAttribute('class');
    const script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    await page.route('**/gameplay-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${css.map(text=>`<style>${text}</style>`).join('')}</head><body class="${bodyClass||''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    const open=async(query='')=>{await page.goto('http://127.0.0.1:3000/gameplay-test/?'+query);await page.locator('.gin-room').waitFor();};
    const draw=()=>page.getByRole('button',{name:/Draw from stock/}).click();
    const selectKing=async()=>{await page.locator('[data-card-id=D13] button').focus();await page.keyboard.press('Enter');};
    await open();await draw();
    const ids=await page.locator('.gin-fan-slot').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
    await page.getByRole('combobox',{name:'Sort hand'}).selectOption('rank');
    const ranked=await page.locator('.gin-fan-slot').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
    assert.deepEqual([...ranked].sort(),[...ids].sort(),'Sorting preserves hand');
    assert.deepEqual(ranked.map(id=>+id.slice(1)),ranked.map(id=>+id.slice(1)).sort((a,b)=>a-b));
    await page.locator('.gin-hand button').first().focus();await page.keyboard.press('End');
    assert.equal(await page.locator('.gin-hand button').last().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.gin-hand button').first().evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('.gin-hand button[aria-pressed=true]').count(),0,'Navigation never commits a card');
    await selectKing();
    assert.equal(await page.locator('.gin-deadwood strong').textContent(),'0');
    assert.match(await page.locator('.gin-deadwood').textContent(),/After discard.*Gin ready/);
    await page.getByRole('combobox',{name:'Sort hand'}).selectOption('melds');
    assert.equal(await page.locator('.gin-fan-slot.is-meld').count(),10);
    assert.equal(await page.getByRole('button',{name:'View Melds'}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'View Melds'}).click();
    assert.equal(await page.locator('.gin-fan-slot.is-meld').count(),0);
    await page.getByRole('button',{name:'View Melds'}).click();
    assert.equal(await page.locator('.gin-hand button[aria-pressed=true]').count(),1,'Sorting preserves selection');
    assert.equal(await page.locator('.gin-fan-slot').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.screenshot({path:path.join(output,'gin-preview-mobile.png'),fullPage:true});
    await page.getByRole('button',{name:'Knock',exact:true}).click();
    await page.getByRole('button',{name:'Play Again',exact:true}).waitFor();
    assert.equal(await page.locator('body').getAttribute('data-rewards'),'1','Completion rewards once, including Strict Mode');
    for(let i=0;i<3;i++){
      await page.getByRole('button',{name:'Rewards',exact:true}).click();
      assert.match(await page.getByRole('dialog',{name:'Match rewards'}).textContent(),/Balance 100/);
      await page.getByRole('button',{name:'Close rewards'}).click();
    }
    assert.equal(await page.locator('body').getAttribute('data-rewards'),'1');
    await page.getByRole('button',{name:'Play Again',exact:true}).click();
    assert.equal(await page.locator('.gin-hand button').count(),10);
    await draw();await selectKing();await page.getByRole('button',{name:'Knock',exact:true}).click();
    await page.getByRole('button',{name:'Play Again',exact:true}).waitFor();
    assert.equal(await page.locator('body').getAttribute('data-rewards'),'2','Replay has its own reward guard');
    for(const query of ['empty','online&empty']){
      await open(query);
      assert.equal(await page.getByRole('button',{name:'Draw from discard pile'}).isEnabled(),false);
      await page.getByRole('button',{name:'End hand, stock exhausted'}).click();
      await page.getByRole('heading',{name:/Stock ran out/i}).waitFor();
      assert.equal(await page.locator('body').getAttribute('data-rewards'),null,'No win/loss reward for a draw');
    }
    await open('online&fail');await draw();await selectKing();
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.gin-hand button').count(),11);
    assert.equal(await page.locator('.gin-hand button[aria-pressed=true]').count(),1,'Network error retains selection');
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    assert.equal(await page.locator('.gin-hand button').count(),10);
    assert.equal(await page.locator('body').getAttribute('data-attempts'),'2');
    assert.equal(await page.getByRole('alert').count(),0);
    await open('online');await draw();await selectKing();
    await page.getByRole('button',{name:'Discard',exact:true}).evaluate(el=>{el.click();el.click();});
    await page.waitForFunction(()=>document.querySelectorAll('.gin-hand button').length===10);
    assert.equal(await page.locator('body').getAttribute('data-attempts'),'1','Rapid clicks submit a single discard');
    await open('online&stale');await draw();await selectKing();
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    assert.equal(await page.locator('body').getAttribute('data-applied'),'false','Missing card cannot be discarded from stale client state');

    // Run a complete real Mindi game with accelerated timers, not mocked scoring.
    await page.clock.install();await open('mindi');
    await page.clock.runFor(2000);
    await page.locator('.mindi-intro').waitFor({state:'detached'});
    for(let step=0;step<60;step++){
      if(await page.getByRole('button',{name:'Play Again',exact:true}).count())break;
      const enabled=page.locator('.mindi-hand button:enabled');
      if(await enabled.count()){
        await enabled.first().focus();await page.keyboard.press('Enter');
        await page.getByRole('button',{name:'Play Card',exact:true}).click();
      }
      await page.clock.runFor(6500);
    }
    await page.getByRole('button',{name:'Play Again',exact:true}).waitFor();
    assert.equal(await page.locator('body').getAttribute('data-rewards'),'1','Mindi result rewards exactly once');
    for(let i=0;i<2;i++){
      await page.getByRole('button',{name:'Rewards',exact:true}).click();
      await page.getByRole('button',{name:'Close rewards'}).click();
    }
    assert.equal(await page.locator('body').getAttribute('data-rewards'),'1');
    await page.getByRole('button',{name:'Play Again',exact:true}).click();
    assert.equal(await page.locator('.mindi-hand button').count(),13);
    assert.equal(await page.getByRole('button',{name:'Last Trick'}).isEnabled(),false);
    assert.deepEqual(errors,[]);
    console.log('Gameplay regression passed: sorting, keyboard inspection, meld/knock preview, reduced motion, stock exhaustion (local/online), failed-action retry, stale-card rejection, real Mindi completion, single rewards and replay.');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
