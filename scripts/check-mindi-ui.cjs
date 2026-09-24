const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/gameplay-test/mindi-3d');
const mocks = path.join(__dirname, 'mindi-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/components/rewards/MatchRewardPopup','next/navigation','@/lib/matchmaking','@/lib/trophyUpdates','@/contexts/ToastContext','@/hooks/useOpponentProfiles'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'mindi-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];
    for(const url of styles){const response=await page.request.get(url);assert.ok(response.ok(),'Stylesheet request failed: '+url);css.push(await response.text());}
    assert.ok(css.join('').includes('.mindi-hud'),'Mindi styles did not load');
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');

    await page.route('**/mindi-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${css.map(text=>`<style>${text}</style>`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/mindi-test/');

    // The local modes now open with the draw-for-first-play ceremony. Assert
    // it appears and names a winner once, then dismiss it here and on every
    // later local page load - it is modal, so leaving it up would block every
    // table interaction below.
    const dismissIntro = async () => {
      const intro = page.locator('.mindi-intro');
      // The overlay mounts a tick after navigation resolves, so wait for it
      // rather than sampling count() immediately and racing the first paint.
      await intro.waitFor({timeout:6000}).catch(()=>{});
      if(await intro.count()===0) return;
      await page.getByRole('button',{name:/Skip|Start now/}).click();
      await intro.waitFor({state:'detached'});
    };
    await page.locator('.mindi-intro').waitFor({timeout:8000});
    assert.equal(await page.locator('.mindi-intro-draw li').count(),4,'Four cards drawn, one per seat');
    // The ceremony must REPLACE the table, not sit on top of it. Rendered
    // together, the table paints first and the dialog only opens on the effect
    // after it, so the player sees the table flash before the cut.
    assert.equal(await page.locator('.mindi-hand').count(),0,'Table rendered behind the ceremony');
    // Asserted inside waitForFunction rather than as a separate count() after
    // it: the ceremony moves on to the dealing phase on its own timer, and a
    // slow machine could let the draw row disappear between the two calls.
    await page.waitForFunction(()=>document.querySelectorAll('.mindi-intro-draw li[data-winner=true]').length===1
      && /plays first/.test(document.querySelector('.mindi-intro-sub')?.textContent||''),{},{timeout:8000});
    await dismissIntro();

    await page.getByRole('heading',{name:'Mindi',exact:true}).waitFor();
    const canvasPixels=async(ratio=.25)=>page.evaluate(ratio=>new Promise(resolve=>{
      const canvas=document.querySelector('.mindi-table-canvas');
      const rect=canvas.getBoundingClientRect();
      canvas.parentElement.parentElement.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:rect.left+rect.width*ratio,bubbles:true}));
      // Read in the same frame as the requested render, before the browser
      // clears a non-preserved drawing buffer. No production GPU readbacks.
      requestAnimationFrame(()=>{
        const gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4);
        gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        let filled=0,empty=0,gold=0,checksum=0;
        for(let i=0;i<pixels.length;i+=64){
          if(pixels[i+3]>0){filled++;checksum+=pixels[i]*3+pixels[i+1]*5+pixels[i+2]*7;
            if(pixels[i]>pixels[i+1]*1.1&&pixels[i+1]>pixels[i+2]*1.2)gold++;
          }else empty++;
        }
        resolve({filled,empty,gold,checksum});
      });
    }),ratio);
    for(const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(650);
      await page.locator('.mindi-scene[data-renderer=webgl]').waitFor({timeout:20000});
      const pixels=await canvasPixels();
      assert.ok(pixels.filled>1000&&pixels.empty>1000&&pixels.gold>100,'Nonblank, framed gold table '+width+' '+JSON.stringify(pixels));
      const lit=await canvasPixels(.9);
      assert.notEqual(lit.checksum,pixels.checksum,'Table lighting did not respond '+width);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      assert.equal(await page.locator('.mindi-hand button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),true,'Cards clipped '+width);
      const handBounds=await page.locator('.mindi-hand button').evaluateAll(nodes=>({bottom:Math.max(...nodes.map(n=>n.getBoundingClientRect().bottom)),controls:document.querySelector('.mindi-hud').getBoundingClientRect().top,offset:getComputedStyle(document.querySelector('.mindi-hand')).bottom}));
      assert.ok(handBounds.bottom<=handBounds.controls,'Cards overlap controls '+width+' '+JSON.stringify(handBounds));
      await page.screenshot({path:path.join(output,'mindi-'+width+'.png'),fullPage:true});
    }
    assert.equal(await page.locator('.mindi-hand button').count(),13);
    assert.equal(await page.locator('.mindi-hidden-hand button').count(),0);
    assert.equal(await page.getByRole('button',{name:'Play Card',exact:true}).isEnabled(),false);
    await page.getByRole('button',{name:/Arrange hand/}).click();
    await page.getByRole('menuitemradio',{name:'By rank'}).click();
    await page.getByRole('button',{name:/Arrange hand/}).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('menuitemradio',{name:'By suit'}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button',{name:/Arrange hand/}).evaluate(el=>el===document.activeElement),true);
    const ranks=await page.locator('.mindi-card-slot').evaluateAll(nodes=>nodes.map(n=>+n.dataset.cardId.slice(1)));
    assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));
    // Who leads is now decided by the four-card draw, so the human no longer
    // always plays first. Every seat plays in every trick, so their turn
    // arrives within one trick - wait for it rather than assuming seat 0.
    await page.locator('.mindi-hand button:enabled').first().waitFor({timeout:20000});
    await page.locator('.mindi-hand button:enabled').first().focus();
    await page.keyboard.press('End');
    assert.equal(await page.locator('.mindi-hand button:enabled').last().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.mindi-hand button[aria-pressed=true]').count(),1);
    assert.equal(await page.locator('.mindi-hand button').count(),13);

    // Alt+Arrow moves the focused card without playing it, and switches the
    // hand onto the player's own order.
    const movedId=await page.evaluate(()=>document.activeElement.closest('.mindi-card-slot').dataset.cardId);
    const orderBefore=await page.locator('.mindi-card-slot').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
    // A card already at the right-hand end cannot move right, so pick the
    // direction that has somewhere to go.
    const step=orderBefore.indexOf(movedId)===orderBefore.length-1?-1:1;
    await page.keyboard.press(step===1?'Alt+ArrowRight':'Alt+ArrowLeft');
    const orderAfter=await page.locator('.mindi-card-slot').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
    assert.deepEqual([...orderAfter].sort(),[...orderBefore].sort(),'Rearranging changed the hand contents');
    // Indexed off the focused card, not off slot 0: the focused card is the
    // first *enabled* one, which is not slot 0 when following suit.
    assert.equal(orderAfter.indexOf(movedId),orderBefore.indexOf(movedId)+step,'Card did not move exactly one place');
    assert.equal(await page.locator('.mindi-hand button').count(),13,'Rearranging played a card');
    assert.equal(await page.getByRole('button',{name:'Arrange hand: My order'}).count(),1);
    // Picking a sort again must actually discard the manual order.
    await page.getByRole('button',{name:/Arrange hand/}).click();
    await page.getByRole('menuitemradio',{name:'By suit'}).click();
    assert.equal(await page.getByRole('button',{name:'Arrange hand: By suit'}).count(),1,'Sort must reset manual order');
    await page.getByRole('button',{name:'Play Card',exact:true}).click();
    assert.equal(await page.locator('.mindi-hand button').count(),12);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.mindi-score dd')).some(n=>n.textContent==='1'),{},{timeout:15000});
    await page.getByRole('button',{name:'Last Trick',exact:true}).click();
    assert.equal(await page.locator('.last-trick-review [role=img]').count(),4);
    assert.equal(await page.locator('.last-trick-review [data-winner=true]').count(),1);
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Rules',exact:true}).click();
    await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.getByRole('button',{name:'Exit Game',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    await page.goto('http://127.0.0.1:3000/mindi-test/?pass&red');
    await dismissIntro();
    // A bot may hold the lead after the draw, so wait for a human seat's turn
    // before asserting that the hand stays hidden until they confirm.
    await page.getByRole('button',{name:/ready/}).waitFor({timeout:20000});
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
    assert.equal(await page.locator('.mindi-table-fallback').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(58, 14, 20)');
    await page.goto('http://127.0.0.1:3000/mindi-test/?online');
    await page.getByRole('heading',{name:'Mindi',exact:true}).waitFor();
    assert.deepEqual(await page.locator('.mindi-score').first().locator('dd').allTextContents(),['2','3']);
    assert.equal(await page.locator('.mindi-seat-top strong').textContent(),'Partner');
    assert.equal(await page.locator('.trick-slot-right').getAttribute('data-seat'),'0');
    const led=await page.locator('.trick-slot-right [role=img]').getAttribute('aria-label');
    const playable=await page.locator('.mindi-hand button:enabled').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
    assert.equal(playable.every(name=>name.split(' of ')[1]===led.split(' of ')[1]),true,'Follow suit');
    await page.setViewportSize({width:1440,height:900});
    await page.locator('.mindi-scene[data-renderer=webgl]').waitFor();
    await page.locator('.mindi-hand button:enabled').first().focus();await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(output,'selected-desktop.png'),fullPage:true});
    await page.locator('.mindi-table-canvas').evaluate(canvas=>{
      window.mindiContext=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
      window.mindiContext.loseContext();
    });
    await page.locator('.mindi-scene[data-renderer=fallback]').waitFor();
    await page.getByRole('button',{name:'Play Card',exact:true}).click();
    assert.equal(await page.locator('.mindi-hand button').count(),12);
    await page.evaluate(()=>window.mindiContext.restoreContext());
    await page.locator('.mindi-scene[data-renderer=webgl]').waitFor();
    assert.ok((await canvasPixels()).filled>1000,'Restored WebGL is blank');
    await page.goto('http://127.0.0.1:3000/mindi-test/?online&duel');
    await page.getByRole('heading',{name:'Mindi',exact:true}).waitFor();
    assert.equal(await page.locator('.mindi-hand button').count(),26);
    assert.equal(await page.locator('.mindi-seat').count(),1);
    assert.equal(await page.locator('.trick-slot').count(),2);
    for(const width of [768,390,320]) {
      await page.setViewportSize({width,height:900});await page.waitForTimeout(200);
      await page.screenshot({path:path.join(output,'duel-'+width+'.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Duel page scroll '+width);
      const duelBounds=await page.locator('.mindi-long-hand').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,columns:getComputedStyle(el).gridTemplateColumns,padding:getComputedStyle(el).padding,children:Array.from(el.children).map(n=>({left:n.getBoundingClientRect().left,right:n.firstElementChild.getBoundingClientRect().right,width:getComputedStyle(n).width}))}));
      if(width<=650) assert.ok(duelBounds.scroll<=duelBounds.client+1,'Duel hand scroll '+width+' '+JSON.stringify(duelBounds));
      assert.equal(await page.locator('.mindi-long-hand button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),true,'Duel card bounds '+width);
      assert.equal(await page.locator('.mindi-hand button').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().bottom<=document.querySelector('.mindi-hud').getBoundingClientRect().top)),true,'Duel overlaps controls '+width);
    }
    // Double tap plays the card outright - no selection step, no Play Card.
    const duelBefore=await page.locator('.mindi-hand button').count();
    await page.locator('.mindi-hand button:enabled').first().dblclick({position:{x:7,y:14}});
    assert.equal(await page.locator('.mindi-hand button').count(),duelBefore-1,'Double tap did not play the card');
    await page.getByRole('button',{name:'Last Trick',exact:true}).click();
    assert.equal(await page.locator('.last-trick-review [role=img]').count(),2);
    assert.equal(await page.locator('.last-trick-review [data-winner=true]').count(),1);
    assert.deepEqual((await page.locator('.last-trick-review strong').allTextContents()).sort(),['Sayyu','West']);
    await page.keyboard.press('Escape');
    await page.goto('http://127.0.0.1:3000/mindi-test/?online&fail');
    await page.locator('.mindi-hand button:enabled').first().focus();await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Play Card',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.mindi-hand button').count(),13,'Failed play removed a card');
    assert.equal(await page.locator('.mindi-hand button[aria-pressed=true]').count(),1,'Failed play lost the selection');
    await page.getByRole('button',{name:'Exit Game',exact:true}).click();
    await page.getByRole('button',{name:'Leave Game',exact:true}).click();
    await page.getByRole('dialog').getByRole('alert').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-destination'),null);
    await page.goto('http://127.0.0.1:3000/mindi-test/?online&trump');
    await page.locator('.mindi-trump[data-set=true]').waitFor();
    assert.equal(await page.locator('.mindi-trump').getAttribute('aria-label'),'Trump: hearts');
    assert.equal(await page.locator('.mindi-trump button').count(),0,'Trump is a read-only match state');
    assert.deepEqual(errors,[]);
    console.log('Mindi passed: six sizes, WebGL pixels and interactive lighting, context recovery, card bounds, dealing, real play/trick scoring, keyboard sorting, hidden hands, pass-device privacy, equipped skins, live trump, failed actions and dialogs.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
