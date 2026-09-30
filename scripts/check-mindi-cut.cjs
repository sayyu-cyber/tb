// The opening deal (design/arena/DEAL_AND_ROOMS.md section 1) on the real
// tables, fed the Cut boards' sample data by scripts/mindi-cut-test-entry.tsx.
//
//   node scripts/check-mindi-cut.cjs            assertions, desktop and phone
//   node scripts/check-mindi-cut.cjs --compare  also writes artifacts/compare/
//                                               deal-*.png beside each reference
//
// Needs the dev server on 127.0.0.1:3000 for the app's stylesheets.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/gameplay-test/mindi-cut'),compareDir=path.join(root,'artifacts/compare');
const refs=path.join(root,'design/arena/screens');
const COMPARE=process.argv.includes('--compare');
const mocks=path.join(__dirname,'gin-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/SettingsContext','next/navigation'].map(name=>[name+'$',mocks]));
alias['@']=root;

/** Our screenshot on the left, the board's 2x reference (scaled) on the right. */
async function sideBySide(ours,reference,file){
  const a=sharp(ours),meta=await a.metadata();
  const b=await sharp(reference).resize(meta.width,meta.height,{fit:'fill'}).png().toBuffer();
  const gap=16;
  await sharp({create:{width:meta.width*2+gap,height:meta.height,channels:3,background:'#ff00ff'}})
    .composite([{input:await a.png().toBuffer(),left:0,top:0},{input:b,left:meta.width+gap,top:0}]).png().toFile(file);
}

async function run(){
  await new Promise((resolve,reject)=>compiler.webpack({mode:'development',plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'mindi-cut-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
  fs.mkdirSync(compareDir,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const errors=[];
  try{
    const source=await browser.newPage();await source.goto('http://127.0.0.1:3000/login/');
    const styles=await source.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    // next/font exposes the Arena faces as variables on these classes.
    const htmlClass=await source.locator('html').getAttribute('class')||'',bodyClass=await source.locator('body').getAttribute('class')||'';
    const css=[];for(const url of styles){const response=await source.request.get(url);assert.ok(response.ok());css.push(await response.text());}
    await source.close();
    assert.ok(css.join('').includes('.arena-deal .ccl'),'The ported Cut sheet is in the app');
    assert.ok(!css.join('').includes('.mindi-cut-stage'),'The old lounge styles are gone');
    const script=fs.readFileSync(path.join(output,'component.js'),'utf8');

    /** A fixture page. `phone` is a phone held sideways: coarse pointer, 844x390. */
    async function fixture(query,{phone=false,width=phone?844:1440,height=phone?390:900,reduced=false,clock=false}={}){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference',...(phone?{isMobile:true,hasTouch:true,deviceScaleFactor:1}:{})});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      if(clock){await page.clock.install();await page.clock.pauseAt(new Date());}
      await page.route('**/cut-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html class="${htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(text=>`<style>${text}</style>`).join('')}</head><body class="${bodyClass}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
      await page.goto('http://127.0.0.1:3000/cut-test/'+query);
      await page.locator('.arena-canvas').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForTimeout(clock?0:250);
      return page;
    }

    // ---- every frozen moment, desktop and phone, beside its reference ----
    const SHOTS=[
      ['mindi','Cut','deal-02-cut','phone-land-05-deal-cut'],
      ['mindi','Reveal','deal-03-reveal','phone-land-05b-deal-reveal'],
      ['mindi','First player','deal-04-first-player','phone-land-05c-deal-first-player'],
      ['mindi','Deal','deal-05-dealing','phone-land-05d-dealing'],
      ['mindi','Ready','deal-06-ready','phone-land-05e-deal-ready'],
      ['gin','First player','deal-gin-04-first-player','phone-land-06-gin-deal-first-player'],
      ['gin','Ready','deal-gin-06-ready','phone-land-06b-gin-deal-ready'],
      ['duel','First player',null,null],
      ['duel','Ready',null,null],
    ];
    for(const [game,phase,desk,land] of SHOTS){
      for(const phone of [false,true]){
        const page=await fixture(`?game=${game}&phase=${encodeURIComponent(phase)}`,{phone});
        // Frozen means still: nothing is animating the cards.
        assert.equal(await page.locator('.ar.frozen').count(),1,`${game} ${phase} frozen`);
        const name=`${phone?'phone-land-':''}deal-${game==='mindi'?'':game+'-'}${phase.toLowerCase().replace(/ /g,'-')}.png`;
        const file=path.join(output,name);
        await page.waitForTimeout(phase==='Ready'?2200:700);
        await page.screenshot({path:file});
        const ref=phone?land&&path.join(refs,'phone',land+'.jpg'):desk&&path.join(refs,'deal',desk+'.jpg');
        if(COMPARE&&ref) await sideBySide(file,ref,path.join(compareDir,name));
        await page.context().close();
      }
    }
    // The shuffle has no still frame on the board; take it live, 600 ms in.
    for(const phone of [false,true]){
      const page=await fixture('?game=mindi',{phone});await page.waitForTimeout(450);
      const name=`${phone?'phone-land-':''}deal-shuffle.png`;await page.screenshot({path:path.join(output,name)});
      if(COMPARE&&!phone) await sideBySide(path.join(output,name),path.join(refs,'deal','deal-01-shuffle.jpg'),path.join(compareDir,name));
      await page.context().close();
    }
    // ---- other sizes: a 1280 laptop, and phones 360 and 430 tall ----
    // The stage scales the whole board, so each size is the same composition
    // smaller or larger; nothing may be clipped or scroll the page.
    for(const [phase,desk,land] of [['First player','deal-04-first-player','phone-land-05c-deal-first-player'],['Ready','deal-06-ready','phone-land-05e-deal-ready']]){
      for(const [phone,width,height,tag] of [[false,1280,800,'1280'],[true,780,360,'360'],[true,932,430,'430']]){
        const page=await fixture(`?game=mindi&phase=${encodeURIComponent(phase)}`,{phone,width,height});
        await page.waitForTimeout(phase==='Ready'?2200:700);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,`Overflow at ${tag}, ${phase}`);
        const box=await page.locator('.arena-canvas').boundingBox();
        assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`The board fits ${tag}, ${phase}: ${JSON.stringify(box)}`);
        const name=`${phone?'phone-land-':''}deal-${phase.toLowerCase().replace(/ /g,'-')}-${tag}.png`;
        await page.screenshot({path:path.join(output,name)});
        if(COMPARE) await sideBySide(path.join(output,name),phone?path.join(refs,'phone',land+'.jpg'):path.join(refs,'deal',desk+'.jpg'),path.join(compareDir,name));
        await page.context().close();
      }
    }
    // ---- the clock: phases, Skip, Escape, the unskippable deal ----
    // A paused fake clock drives the ceremony's own timer exactly, so each
    // moment is asserted at the spec's millisecond rather than guessed at.
    const status=page=>page.locator('.status').innerText();
    const panelTitle=page=>page.locator('.swap .ctitle').innerText();
    {
      const page=await fixture('?game=mindi',{clock:true});
      await page.clock.runFor(100);
      assert.equal((await panelTitle(page)).trim().toUpperCase(),'SHUFFLE');
      assert.equal(await status(page),'Shifa is shuffling');
      assert.equal(await page.locator('.hand .hc').count(),0,'No hand until the deal has been dealt');
      assert.equal(await page.locator('.fan.off').count(),3,'The seat fans wait for the deal');
      assert.equal(await page.locator('.cutrow').count(),4,'One cut row per seat');
      assert.ok(await page.getByRole('button',{name:'Skip to deal'}).evaluate(el=>el===document.activeElement),'Focus starts on Skip to deal');
      assert.equal(await page.locator('.pf .dtag').count(),1,'The dealer wears the Dealer tag');
      assert.ok((await page.locator('.pf:has(.dtag) b').innerText()).toUpperCase().includes('SHIFA'));
      await page.clock.runFor(1100);assert.equal(await status(page),'The pack is spread for the cut');
      await page.clock.runFor(800);assert.equal(await status(page),'Everyone draws one card');
      await page.clock.runFor(1300);assert.equal(await status(page),'Turning the cards over');
      assert.equal(await page.locator('.cutrow .mini.pop').count(),4,'The right panel fills in on the reveal');
      await page.clock.runFor(1200);
      assert.equal(await status(page),'Ace of hearts wins the cut');
      assert.equal((await panelTitle(page)).trim().toUpperCase(),'MARIYAM PLAYS FIRST');
      assert.equal(await page.locator('.cutrow.win').count(),1);
      assert.ok((await page.locator('.cutrow.win').innerText()).toUpperCase().includes('FIRST TO PLAY'));
      assert.equal(await page.locator('.ccl .cc.win').count(),1,'The winning card gets its ring');
      assert.equal(await page.locator('.ccl .halo.on').count(),1,'and its halo on the felt');
      assert.equal(await page.locator('.ccl .stand').count(),1,'and the standee');
      assert.equal(await page.locator('.pf.first').count(),1,'The winner\'s plate turns lime');
      await page.clock.runFor(1400);
      assert.equal(await status(page),'Shifa is dealing');
      assert.equal(await page.getByRole('button',{name:'Dealing…'}).isDisabled(),true,'The deal cannot be skipped');
      await page.keyboard.press('Escape');await page.clock.runFor(50);
      assert.equal(await status(page),'Shifa is dealing','Escape cannot skip the deal either');
      // Counts tick up as cards land: after 26 flights, 6 or 7 each.
      await page.clock.runFor(500+26*40);
      const counts=(await page.locator('.pf .ct').allInnerTexts()).map(Number);
      const landed=counts.reduce((a,b)=>a+b,0);
      assert.ok(landed>=24&&landed<=26&&Math.max(...counts)-Math.min(...counts)<=1,'Counts follow the cards that have landed, one at a time round the table '+counts);
      await page.clock.runFor(2000);
      assert.equal(await page.locator('#ready').innerText(),'1','Ready at 8680 ms');
      assert.equal(await page.locator('.hand .hc').count(),13,'The hand is up');
      assert.equal(await page.locator('.fan.off').count(),0,'The fans are back');
      assert.equal(await page.locator('.swap > .out').count(),2,'Both ceremony panels have faded out');
      assert.ok((await page.locator('.swap').first().innerText()).toUpperCase().includes('TENS'),'Left panel is Tens');
      assert.ok((await page.locator('.swap').nth(1).innerText()).toUpperCase().includes('TRUMP'),'Right panel is Trump');
      assert.equal(await status(page),'Mariyam leads the first trick');
      assert.deepEqual((await page.locator('.pf .ct').allInnerTexts()).map(Number),[13,13,13,13],'Thirteen each');
      assert.ok((await page.locator('.pf.turn').innerText()).includes('LEADS')||(await page.locator('.pf.turn').innerText()).includes('Leads'),'Mariyam\'s plate reads Leads');
      await page.context().close();
    }
    {
      // Skip jumps the clock to the deal; so does Escape.
      for(const how of ['skip','escape']){
        const page=await fixture('?game=mindi',{clock:true});
        await page.clock.runFor(300);
        if(how==='skip') await page.getByRole('button',{name:'Skip to deal'}).click();
        else await page.keyboard.press('Escape');
        await page.clock.runFor(60);
        assert.equal(await status(page),'Shifa is dealing',`${how} goes to the deal`);
        assert.equal(await page.locator('#ready').innerText(),'0',`${how} does not skip the deal`);
        await page.clock.runFor(3100);
        assert.equal(await page.locator('#ready').innerText(),'1',`the deal runs out after ${how}`);
        await page.context().close();
      }
    }
    {
      // Reduced motion: no riffle, spread or flights; ~1.9 s; the hand is still dealt.
      const page=await fixture('?game=mindi',{clock:true,reduced:true});
      await page.clock.runFor(100);
      assert.equal(await page.locator('.ar.deal-reduced').count(),1);
      assert.equal(await page.locator('.ccl .cc.rif, .ccl .cc.go, .ccl .cc.flip').count(),0,'Nothing flies');
      assert.equal(await page.locator('.ccl .cc.lg:not(.hid)').count(),4,'The cut cards are face up at their spots');
      await page.clock.runFor(1000);
      assert.equal((await page.locator('.pf .ct').allInnerTexts()).map(Number).join(),'13,13,13,13','Piles appear with their counts at 900 ms');
      assert.equal(await page.locator('#ready').innerText(),'0');
      await page.clock.runFor(900);
      assert.equal(await page.locator('#ready').innerText(),'1','Ready in about 1.9 s');
      assert.equal(await page.locator('.hand .hc').count(),13,'The hand is dealt on screen');
      await page.context().close();
    }
    {
      // The whole pack wears the viewer's equipped back.
      const page=await fixture('?game=mindi&back=cb_fire&phase=Cut');
      const backs=await page.locator('.ccl .back').evaluateAll(n=>n.map(e=>e.className));
      assert.ok(backs.length>=30&&backs.every(c=>c==='back cb inferno'),'Every card in the pack wears the Inferno back');
      await page.context().close();
    }
    {
      // Gin: 20 cards 62 ms apart, the upcard turns at 7738, ready at 8188.
      const page=await fixture('?game=gin',{clock:true});
      await page.clock.runFor(7700);
      assert.equal(await page.locator('.ccl .cc.two.hid').count(),0,'The upcard is on its way');
      await page.clock.runFor(450);
      assert.equal(await page.locator('#ready').innerText(),'0');
      await page.clock.runFor(100);
      assert.equal(await page.locator('#ready').innerText(),'1','Gin is ready at 8188 ms');
      assert.deepEqual((await page.locator('.pf .ct').allInnerTexts()).map(Number),[10,10],'Ten each');
      assert.equal(await status(page),'Your turn. Take the 6 or draw from the stock.');
      await page.context().close();
    }
    {
      // Mindi 1v1: two seats, 26 each, 40 ms apart, no upcard.
      const page=await fixture('?game=duel',{clock:true});
      await page.clock.runFor(8700);
      assert.equal(await page.locator('#ready').innerText(),'1','The 1v1 deal is ready at 8680 ms, like Mindi');
      assert.deepEqual((await page.locator('.pf .ct').allInnerTexts()).map(Number),[26,26],'Twenty-six each');
      assert.equal(await page.locator('.ccl .cc.two').count(),0,'No upcard');
      assert.equal(await page.locator('.hand .hc').count(),26);
      await page.context().close();
    }
    {
      // The phone keeps its bars: steps top left, the cut top right, a compact Skip.
      const page=await fixture('?game=mindi',{phone:true,clock:true});
      await page.clock.runFor(100);
      assert.equal(await page.locator('.bar .sdots i').count(),4,'Four step dashes');
      assert.equal(await page.locator('.bar .cchip').count(),4,'One chip per seat in the cut strip');
      assert.equal(await page.locator('.hint').count(),0,'No hint pill until ready');
      assert.equal(await page.getByRole('button',{name:'Skip',exact:true}).count(),1,'The compact Skip');
      await page.clock.runFor(8700);
      assert.equal(await page.locator('.hint').innerText(),'Mariyam leads the first trick');
      await page.context().close();
    }
    // ---- played for real: the clients and their engines, vs AI and online ----
    // The cut's winner must open the hand, and every seat must hold the
    // right number of cards when the deal hands over.
    const playBuilds={
      mindi:{mocks:'mindi-test-services.tsx',names:['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/components/rewards/MatchRewardPopup','next/navigation','@/lib/matchmaking','@/lib/trophyUpdates','@/contexts/ToastContext','@/hooks/useOpponentProfiles']},
      gin:{mocks:'gameplay-test-services.tsx',names:['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/components/rewards/MatchRewardPopup','next/navigation','@/lib/matchmaking','@/lib/trophyUpdates','@/contexts/ToastContext','@/hooks/useOpponentProfiles']},
    };
    const played={};
    for(const [key,build] of Object.entries(playBuilds)){
      const out=path.join(output,'play-'+key);
      const playAlias=Object.fromEntries(build.names.map(name=>[name+'$',path.join(__dirname,build.mocks)]));playAlias['@']=root;
      await new Promise((resolve,reject)=>compiler.webpack({mode:'development',plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'deal-play-test-entry.tsx'),output:{path:out,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:playAlias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
      played[key]=fs.readFileSync(path.join(out,'component.js'),'utf8');
    }
    async function play(key,query,{phone=false}={}){
      const context=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1440,height:900},...(phone?{isMobile:true,hasTouch:true}:{})});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.clock.install();await page.clock.pauseAt(new Date());
      await page.route('**/play-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html class="${htmlClass}"><head><meta charset="utf-8">${css.map(text=>`<style>${text}</style>`).join('')}</head><body class="${bodyClass}"><div id="test-root"></div><script>${played[key].replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
      await page.goto('http://127.0.0.1:3000/play-test/'+query);
      await page.locator('.arena-canvas').waitFor();
      return page;
    }
    const plateNames=page=>page.locator('.pf .nm b, .who > div > b').evaluateAll(n=>n.map(e=>(e.childNodes[0]?.textContent||'').trim().toUpperCase()));
    const plateCounts=async page=>(await page.locator('.pf .ct, .who .ct').allInnerTexts()).map(Number);
    for(const [key,query,seats,each,phone] of [
      ['mindi','?mindi-ai',4,13,false],['mindi','?mindi-ai',4,13,true],
      ['mindi','?mindi-online&intro',4,13,false],['mindi','?mindi-online&intro&duel',2,26,false],['mindi','?mindi-online&intro&duel',2,26,true],
      ['gin','?gin-ai',2,10,false],['gin','?gin-online&intro',2,10,false],['gin','?gin-online&intro',2,10,true],
    ]){
      const page=await play(key,query,{phone});
      const label=`${query}${phone?' (phone)':''}`;
      // At "First player" the cut names its winner on the table's own plate.
      await page.clock.runFor(5000);
      const winner=(await page.locator('.pf.first .nm b, .who.first > div > b').first().evaluate(e=>(e.childNodes[0]?.textContent||'').trim().toUpperCase()));
      assert.ok(winner,`${label}: the cut has a winner`);
      const selfName=(await page.locator(phone?'.who[style*="bottom"] > div > b':'.pf[style*="top: 800px"] .nm b').first().evaluate(e=>(e.childNodes[0]?.textContent||'').trim().toUpperCase()));
      await page.clock.runFor(4000);
      assert.equal((await plateNames(page)).length,seats,`${label}: ${seats} seats`);
      assert.deepEqual(await plateCounts(page),Array(seats).fill(each),`${label}: ${each} cards each`);
      const handCount=await page.locator(phone?'section[aria-label="Your hand"] .hc':'.hand .hc').count();
      assert.equal(handCount,each,`${label}: your hand holds ${each}`);
      // Whoever won the cut opens: their plate is the one on turn, or it is
      // yours and the table says so.
      const leader=await page.locator('.pf.turn .nm b, .who.first > div > b').first().evaluate(e=>(e.childNodes[0]?.textContent||'').trim().toUpperCase()).catch(()=>'');
      if(winner===selfName) {
        const line=await page.locator(phone?'.hint':'.status').innerText();
        assert.ok(/Your turn/.test(line),`${label}: you won the cut and open the hand ("${line}")`);
      } else {
        assert.equal(leader,winner,`${label}: ${winner} won the cut and ${leader} is on turn`);
      }
      await page.screenshot({path:path.join(output,`played-${label.replace(/[^a-z0-9]+/gi,'-')}.png`)});
      await page.context().close();
    }

    assert.deepEqual(errors,[]);
    console.log('PASS: opening deal frozen at every board phase, Mindi, Gin and the 1v1 variant, desktop and phone; the timeline to the millisecond, Skip, Escape, the unskippable deal, reduced motion, the equipped back and the phone bars; and played for real vs AI and online (Mindi 4 seats, the 1v1 variant, Gin): the cut\'s winner opens and every seat holds its cards.');
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
