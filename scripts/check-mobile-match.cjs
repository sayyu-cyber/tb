const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {webkit,chromium,devices}=require(process.env.CHECK_PLAYWRIGHT||'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/gameplay-test/mobile-rotation');
const mocks=path.join(__dirname,'mobile-match-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/hooks/useCasualQueue','next/navigation','next/link'].map(name=>[name+'$',mocks]));alias['@']=root;
alias['@/components/rewards/MatchRewardPopup$']=path.join(__dirname,'gin-test-services.tsx');
async function main(){
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',devtool:false,entry:path.join(__dirname,'mobile-match-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})]},(e,s)=>e||s.hasErrors()?reject(e||s.toString()):resolve()));
  const browser=await (process.env.CHECK_BROWSER==='chromium'?chromium:webkit).launch({headless:true,...(process.env.CHECK_BROWSER==='chromium'?{channel:'msedge'}:{})});
  try{
    const context=await browser.newContext({...devices['iPhone 13'],reducedMotion:'no-preference'});
    const page=await context.newPage(),errors=[];let documents=0;
    page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser renderer crashed'));
    page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documents++;});
    const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3002';
    await page.goto(base+'/login/');
    const urls=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];for(const url of urls){const response=await page.request.get(url);assert.ok(response.ok());css.push(await response.text());}
    const body=await page.locator('body').getAttribute('class'),script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    await page.route('**/mobile-match-test/**',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(s=>`<style>${s}</style>`).join('')}</head><body class="${body}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    for(const game of ['mindi','gin']){
      await page.setViewportSize({width:390,height:844});await page.goto(base+'/mobile-match-test/');
      await page.locator('.arena-mplay').waitFor();
      if(game==='gin')await page.getByRole('button',{name:/^Gin Rummy,/}).click();
      await page.getByRole('button',{name:/VS AI/i}).click();
      await page.locator('.arena-mplay .dock button').click();
      await page.getByRole('dialog',{name:/Rotate|Turn|landscape|sideways/i}).waitFor();
      const navigations=documents;
      await page.setViewportSize({width:844,height:390});
      const board=page.locator(game==='mindi'?'.arena-pmindi':'.arena-pgin');await board.waitFor();
      await page.waitForTimeout(700);
      const metrics=await board.evaluate(el=>({cards:el.querySelectorAll('.cc').length,hidden:el.querySelectorAll('.cc.hid').length,promoted:[...el.querySelectorAll('.cc.hid')].filter(n=>getComputedStyle(n).willChange!=='auto').length,floor:[...el.querySelectorAll('.floor')].map(n=>({width:n.offsetWidth,height:n.offsetHeight})),phase:el.querySelector('.tag')?.textContent}));
      console.log(JSON.stringify({browser:process.env.CHECK_BROWSER||'webkit',game,metrics,errors}));
      await page.screenshot({path:path.join(output,game+'-opening.png')});
      const hide=await page.addStyleTag({content:'.arena-pmindi .table,.arena-pgin .table,.arena-pdeal .ar > :not(.bg):not(.stage){visibility:hidden !important}'});
      await page.screenshot({path:path.join(output,game+'-floor-after.png')});
      const original=fs.readFileSync(path.join(root,'styles/arena-phone.css'),'utf8').match(/\.arena-phone \.floor\{([^}]+)\}/)[1];
      const old=await page.addStyleTag({content:`.arena-phone .arena-pdeal .stage .floor{${original};left:-1578px;top:-772px;transform:rotateX(50deg) scale(.5) translateZ(-420px)}`});
      await page.screenshot({path:path.join(output,game+'-floor-before.png')});await old.evaluate(el=>el.remove());await hide.evaluate(el=>el.remove());
      if(process.argv.includes('--diagnose'))continue;
      assert.equal(metrics.promoted,0,'Hidden opening cards must not reserve graphics layers');
      assert.ok(metrics.cards<40,'Future deal cards must not mount during the cut');
      assert.deepEqual(metrics.floor,[{width:2000,height:950}],'Phone floor surface is bounded');
      await page.waitForTimeout(14000);
      assert.equal(await board.locator('.ccl').count(),0,'Opening graphics are released after the deal');
      const hand=board.getByRole('region',{name:'Your hand'}).locator('button.hc');assert.ok(await hand.count()>0,'Playable hand renders after the opening');
      const ids=await hand.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
      for(let turn=0;turn<3;turn++){
        await page.setViewportSize({width:390,height:844});
        // Flush WebKit's lazy media-query evaluation after emulated rotation;
        // the application still receives the browser's real change event.
        await page.waitForFunction(()=>!matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)').matches);
        await board.waitFor({state:'detached'});
        await page.setViewportSize({width:844,height:390});
        await page.waitForFunction(()=>matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)').matches);
        await board.waitFor();
      }
      assert.deepEqual(await hand.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),ids,'Rotation preserves the human hand');
      if(game==='mindi'){
        const card=board.getByRole('region',{name:'Your hand'}).locator('button.hc:enabled').first();
        await card.focus();await page.keyboard.press('Enter');
        await board.getByRole('button',{name:/^Play /}).tap();
        await page.waitForFunction(n=>document.querySelectorAll('.arena-pmindi [aria-label="Your hand"] button.hc').length===n-1,ids.length);
      }
      assert.equal(documents,navigations,'Rotation and the ceremony do not reload the document');
      assert.deepEqual(errors,[],'No render or runtime errors');
    }
    console.log('Mobile Play → rotate → AI opening and repeated rotation PASS');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
