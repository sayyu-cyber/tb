const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/gameplay-test/mindi-cut');
async function run(){
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1})],devtool:false,entry:path.join(__dirname,'mindi-cut-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const source=await browser.newPage();await source.goto('http://127.0.0.1:3000/login/');
    const styles=await source.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];for(const url of styles){const response=await source.request.get(url);assert.ok(response.ok());css.push(await response.text());}
    assert.ok(css.join('').includes('.mindi-cut-stage'));
    const script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    const errors=[];
    async function fixture({width=1440,height=900,reduced=false,fallback=false,query=''}={}){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
      page.on('pageerror',e=>errors.push(e.message));
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      if(fallback)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
      await page.route('**/cut-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${css.map(text=>`<style>${text}</style>`).join('')}</head><body><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
      await page.goto('http://127.0.0.1:3000/cut-test/'+query);
      await page.locator('.mindi-intro').waitFor();
      await page.clock.runFor(80);
      return page;
    }
    async function pixelFrame(page){
      // Inspect rendered canvas pixels, not a discarded WebGL drawing buffer.
      const buffer=await page.locator('.mindi-cut-scene canvas').screenshot();
      const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let filled=0,checksum=0;for(let i=0;i<data.length;i+=info.channels*16){if(data[i]+data[i+1]+data[i+2]>150)filled++;checksum+=data[i]*3+data[i+1]*5+data[i+2]*7;}
      return {filled,checksum};
    }
    for(const [width,height] of [[1440,900],[390,844],[844,390],[320,700],[320,568]]){
      const page=await fixture({width,height});
      await page.clock.runFor(650);
      assert.equal(await page.locator('.mindi-cut-scene').getAttribute('data-renderer'),'webgl');
      await page.screenshot({path:path.join(output,`${width}-cut.png`)});
      const first=await pixelFrame(page);assert.ok(first.filled>200,'Blank canvas '+JSON.stringify(first));
      await page.clock.runFor(950);await page.screenshot({path:path.join(output,`${width}-fan.png`)});
      const second=await pixelFrame(page);assert.notEqual(first.checksum,second.checksum,'No animation');
      await page.clock.runFor(2800);await page.screenshot({path:path.join(output,`${width}-reveal.png`)});
      await page.clock.runFor(1200);
      assert.equal(await page.locator('.mindi-intro-draw li[data-winner=true]').getAttribute('data-seat'),'1','Real K-heart winner');
      assert.match(await page.locator('.mindi-intro-sub').innerText(),/Aishath.*plays first/);
      const bounds=await page.locator('.mindi-intro-draw li').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
      const footer=await page.locator('.mindi-cut-footer').boundingBox();
      for(const r of bounds)assert.ok(r.x>=0&&r.right<=width&&r.y>=0&&r.bottom<=footer.y,`Label clipped or behind controls ${width}: ${JSON.stringify(r)}`);
      for(let a=0;a<bounds.length;a++)for(let b=a+1;b<bounds.length;b++){
        const x=bounds[a],y=bounds[b];assert.ok(x.right<=y.x||y.right<=x.x||x.bottom<=y.y||y.bottom<=x.y,'Player labels overlap '+width);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(output,`${width}-winner.png`)});
      await page.clock.runFor(1500);await page.screenshot({path:path.join(output,`${width}-deal.png`)});
      await page.clock.runFor(1300);assert.equal(await page.locator('#done').innerText(),'1');
      assert.equal(await page.locator('.mindi-intro').count(),0);await page.clock.runFor(1000);assert.equal(await page.locator('#done').innerText(),'1');
      await page.close();
    }
    const duel=await fixture({query:'?duel&skin'});await duel.clock.runFor(5600);
    assert.equal(await duel.locator('.mindi-intro-draw li').count(),2);
    assert.equal(await duel.locator('.mindi-cut-scene').getAttribute('data-skin'),'tt_lava');
    await duel.screenshot({path:path.join(output,'duel-skin.png')});
    await duel.keyboard.press('Escape');assert.equal(await duel.locator('#done').innerText(),'1');await duel.close();
    const skip=await fixture();await skip.getByRole('button',{name:'Skip',exact:true}).evaluate(el=>el.click());
    assert.equal(await skip.locator('#done').innerText(),'1');await skip.close();
    const lost=await fixture({width:390,height:844});await lost.clock.runFor(5600);
    await lost.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
    assert.equal(await lost.locator('.mindi-cut').getAttribute('data-three'),'false');
    assert.equal(await lost.locator('.mindi-intro-draw li').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<document.querySelector('.mindi-cut-footer').getBoundingClientRect().top;})),true,'Lost-context fallback is clipped');
    await lost.screenshot({path:path.join(output,'context-lost.png')});
    await lost.clock.runFor(3000);assert.equal(await lost.locator('#done').innerText(),'1');await lost.close();
    const reduced=await fixture({reduced:true});assert.equal(await reduced.locator('canvas').count(),0);
    await reduced.screenshot({path:path.join(output,'reduced.png')});await reduced.clock.runFor(1600);assert.equal(await reduced.locator('#done').innerText(),'1');await reduced.close();
    const fallback=await fixture({fallback:true,width:390,height:844});await fallback.clock.runFor(7000);
    assert.equal(await fallback.locator('.mindi-intro-draw li[data-winner=true]').getAttribute('data-seat'),'1');
    await fallback.screenshot({path:path.join(output,'fallback.png')});await fallback.clock.runFor(3000);assert.equal(await fallback.locator('#done').innerText(),'1');await fallback.close();
    assert.deepEqual(errors,[]);console.log('PASS: cut/fan/reveal/winner/deal, actual result, 5 viewports, GPU motion, duel, skins, StrictMode completion once, Skip, Escape, context loss, reduced motion and no-WebGL fallback.');
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
