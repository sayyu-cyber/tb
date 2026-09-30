const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {webkit,chromium,devices}=require(process.env.CHECK_PLAYWRIGHT||'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/gameplay-test/mobile-rotation');
const mocks=path.join(__dirname,'mobile-match-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/hooks/useCasualQueue','next/navigation','next/link'].map(name=>[name+'$',mocks]));alias['@']=root;
alias['@/components/rewards/MatchRewardPopup$']=path.join(__dirname,'gin-test-services.tsx');
const renderSurfaces=process.argv.includes('--render-surfaces');
const referenceSurfaces=renderSurfaces||process.argv.includes('--reference-surfaces');
if(referenceSurfaces)alias[path.join(root,'components/game/phone/PhoneTableSurface.tsx')]=path.join(__dirname,'mobile-table-surface-source.tsx');
async function main(){
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',devtool:false,entry:path.join(__dirname,'mobile-match-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})]},(e,s)=>e||s.hasErrors()?reject(e||s.toString()):resolve()));
  const browser=await (process.env.CHECK_BROWSER==='chromium'?chromium:webkit).launch({headless:true,...(process.env.CHECK_BROWSER==='chromium'?{channel:'msedge'}:{})});
  try{
    const device=devices[renderSurfaces?'iPhone 13':process.env.CHECK_DEVICE||'iPhone 14 Pro Max'];
    const portrait=device.screen,landscape={width:portrait.height,height:portrait.width};
    const context=await browser.newContext({...device,reducedMotion:'no-preference'});
    const page=await context.newPage(),errors=[];let documents=0;
    page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser renderer crashed'));
    page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documents++;});
    const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3002';
    await page.goto(base+'/login/');
    const urls=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];for(const url of urls){const response=await page.request.get(url);assert.ok(response.ok());css.push(await response.text());}
    const body=await page.locator('body').getAttribute('class'),script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    await page.route('**/mobile-match-test/**',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(s=>`<style>${s}</style>`).join('')}</head><body class="${body}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.route('**/images/phone-tables/*.png',r=>r.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(root,'public',new URL(r.request().url()).pathname))}));
    for(const game of ['mindi','gin']){
      await page.setViewportSize(portrait);await page.goto(base+'/mobile-match-test/');
      await page.locator('.arena-mplay').waitFor();
      if(game==='gin')await page.getByRole('button',{name:/^Gin Rummy,/}).click();
      await page.getByRole('button',{name:/VS AI/i}).click();
      await page.locator('.arena-mplay .dock button').click();
      await page.getByRole('dialog',{name:/Rotate|Turn|landscape|sideways/i}).waitFor();
      const navigations=documents;
      await page.setViewportSize(landscape);
      const board=page.locator(game==='mindi'?'.arena-pmindi':'.arena-pgin');await board.waitFor();
      await page.waitForTimeout(700);
      const metrics=await board.evaluate(el=>({cards:el.querySelectorAll('.cc').length,hidden:el.querySelectorAll('.cc.hid').length,promoted:[...el.querySelectorAll('.cc.hid')].filter(n=>getComputedStyle(n).willChange!=='auto').length,floor:[...el.querySelectorAll('.floor')].map(n=>({width:n.offsetWidth,height:n.offsetHeight})),phase:el.querySelector('.tag')?.textContent}));
      console.log(JSON.stringify({browser:process.env.CHECK_BROWSER||'webkit',game,metrics,errors}));
      if(renderSurfaces){
        const folder=path.join(root,'public/images/phone-tables');fs.mkdirSync(folder,{recursive:true});
        await page.addStyleTag({content:'.ar > :not(.phone-table-source){display:none !important}'});
        for(const skin of game==='mindi'?['tt_default','tt_red','tt_blue','tt_black']:['gin']){
          if(game==='mindi')await board.locator('.felt').evaluate((el,colour)=>el.style.backgroundColor=colour,{tt_default:'#06323A',tt_red:'#4A1119',tt_blue:'#0E2C4E',tt_black:'#101214'}[skin]);
          await board.locator('.ar').screenshot({path:path.join(folder,game==='gin'?'gin.png':`mindi-${skin}.png`)});
        }
        continue;
      }
      await page.screenshot({path:path.join(output,game+'-opening.png')});
      if(process.argv.includes('--compare-surfaces')){
        const hide=await page.addStyleTag({content:'.ar > :not(.phone-table-source):not(.phone-table-surface){display:none !important}'});
        for(const skin of game==='mindi'?['tt_default','tt_red','tt_blue','tt_black']:['gin']){
          if(game==='mindi'){
            if(referenceSurfaces)await board.locator('.felt').evaluate((el,colour)=>el.style.backgroundColor=colour,{tt_default:'#06323A',tt_red:'#4A1119',tt_blue:'#0E2C4E',tt_black:'#101214'}[skin]);
            else await board.locator('.phone-table-surface').evaluate((el,skin)=>el.style.backgroundImage=`url(/images/phone-tables/mindi-${skin}.png)`,skin);
          }
          await board.locator('.ar').screenshot({path:path.join(output,`${game}-${skin}-${referenceSurfaces?'before':'after'}.png`)});
        }
        await hide.evaluate(el=>el.remove());continue;
      }
      if(process.argv.includes('--diagnose'))continue;
      assert.equal(metrics.promoted,0,'Hidden opening cards must not reserve graphics layers');
      assert.ok(metrics.cards<40,'Future deal cards must not mount during the cut');
      assert.deepEqual(metrics.floor,[],'Phone decoration does not create masked 3D floor surfaces');
      assert.equal(await board.locator('.apron,.felt,.rail,filter').count(),0,'Static table decoration uses no intermediate 3D or blur layers');
      const surface=board.locator('.phone-table-surface');assert.equal(await surface.count(),1);
      const imageUrl=await surface.evaluate(el=>getComputedStyle(el).backgroundImage.slice(5,-2));
      await page.evaluate(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=reject;image.src=url;}),imageUrl);
      await page.waitForTimeout(14000);
      assert.equal(await board.locator('.ccl').count(),0,'Opening graphics are released after the deal');
      const hand=board.getByRole('region',{name:'Your hand'}).locator('button.hc');assert.ok(await hand.count()>0,'Playable hand renders after the opening');
      const ids=await hand.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
      for(let turn=0;turn<3;turn++){
        await page.setViewportSize(portrait);
        await board.waitFor({state:'detached'});
        await page.setViewportSize(landscape);
        await board.waitFor();
      }
      assert.deepEqual(await hand.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),ids,'Rotation preserves the human hand');
      // Safari's address/toolbar chrome can reduce the visible landscape
      // height without another orientation change. The same hand must fit.
      await page.setViewportSize({width:landscape.width,height:landscape.height-86});
      await page.waitForFunction(()=>{const r=document.querySelector('.arena-canvas .ar').getBoundingClientRect();return r.top>=-1&&r.bottom<=innerHeight+1;});
      assert.deepEqual(await hand.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),ids,'Browser toolbar changes preserve the hand');
      if(game==='mindi'){
        const card=board.getByRole('region',{name:'Your hand'}).locator('button.hc:enabled').first();
        await card.focus();await page.keyboard.press('Enter');
        await board.getByRole('button',{name:/^Play /}).tap();
        await page.waitForFunction(n=>document.querySelectorAll('.arena-pmindi [aria-label="Your hand"] button.hc').length===n-1,ids.length);
      }
      assert.equal(documents,navigations,'Rotation and the ceremony do not reload the document');
      assert.deepEqual(errors,[],'No render or runtime errors');
    }
    console.log(renderSurfaces?'Rendered phone decoration assets':process.argv.includes('--compare-surfaces')?'Captured phone decoration comparisons':'Mobile Play → rotate → AI opening and repeated rotation PASS');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
