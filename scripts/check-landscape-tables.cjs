// The landscape tables (design/arena/LANDSCAPE.md "Screens": the P* boards):
// PLobby, PMindi, PGin and PResult, each an 844x390 composition scaled evenly
// to the visible viewport. Fed their boards' own sample data through the
// fixtures (never app code), screenshotted in the state of each reference,
// and checked at 740x360, 844x390, 932x430 and 667x375: the board fits, the
// hand and the action button are never cropped, nothing scrolls sideways.
// Held upright, a match keeps MRotate over the live table, which stays
// mounted, blurred, and keeps its state through the turn.
//
//   node scripts/check-landscape-tables.cjs   (dev server on :3000)
// Writes artifacts/landscape-tables/*.png, and artifacts/compare/landscape-*.png
// beside each reference (not committed).
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/landscape-tables'),compareDir=path.join(root,'artifacts/compare');
const refs=path.join(root,'design/arena/screens/phone');
const base='http://127.0.0.1:3000';

const loader={test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')};
function aliasFor(mocks,names){const alias=Object.fromEntries(names.map(name=>[name+'$',path.join(__dirname,mocks)]));alias['@']=root;return alias;}
const BUILDS={
  tables:{entry:'landscape-tables-test-entry.tsx',alias:aliasFor('gin-test-services.tsx',['@/contexts/SettingsContext','next/navigation'])},
  play:{entry:'play-test-entry.tsx',alias:aliasFor('play-test-services.tsx',['@/contexts/AuthContext','@/contexts/EconomyContext','@/hooks/useTranslation','@/hooks/useCasualQueue','@/lib/weekendLeague','@/lib/orientationLock','next/link','next/navigation'])},
  result:{entry:'result-test-entry.tsx',alias:aliasFor('result-test-services.tsx',['@/hooks/useTranslation','next/link'])},
};
function build(name){const {entry,alias}=BUILDS[name];return new Promise((resolve,reject)=>compiler.webpack({mode:'development',devtool:false,entry:path.join(__dirname,entry),output:{path:path.join(output,name),filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[loader]},plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})]},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));}

/** Ours on the left, the reference (2x) scaled to our size on the right. */
async function sideBySide(ours,reference,file){
  const a=sharp(ours),meta=await a.metadata();
  const b=await sharp(reference).resize(meta.width,meta.height,{fit:'fill'}).png().toBuffer();
  await sharp({create:{width:meta.width*2+16,height:meta.height,channels:3,background:'#ff00ff'}})
    .composite([{input:await a.png().toBuffer(),left:0,top:0},{input:b,left:meta.width+16,top:0}]).png().toFile(file);
}

async function main(){
  fs.mkdirSync(compareDir,{recursive:true});
  for(const name of Object.keys(BUILDS)) await build(name);
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const errors=[];
  try{
    const source=await browser.newPage();
    await source.goto(base+'/login/');
    const urls=await source.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const css=[];for(const url of urls){const r=await source.request.get(url);assert.ok(r.ok());css.push(await r.text());}
    const body=await source.locator('body').getAttribute('class');await source.close();
    // The shell's own root classes, as every page in the app has them.
    async function open(name,query='',{width=844,height=390,touch=false,reduced=true}={}){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',...(touch?{isMobile:true,hasTouch:true}:{})});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
      const script=fs.readFileSync(path.join(output,name,'component.js'),'utf8');
      await page.route(`**/${name}-landscape/**`,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(s=>`<style>${s}</style>`).join('')}</head><body class="${body}"><div id="test-root" class="arena-app"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
      await page.goto(`${base}/${name}-landscape/${query}`);
      await page.locator('.arena-canvas').first().waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
      return page;
    }
    async function shot(page,file,reference){
      // Off the board, so a hover lift is not mistaken for the design.
      await page.mouse.move(1,1);await page.waitForTimeout(300);
      const out=path.join(output,file+'.png');await page.screenshot({path:out});
      if(reference) await sideBySide(out,path.join(refs,reference+'.jpg'),path.join(compareDir,'landscape-'+file+'.png'));
    }
    /** The board fits the screen, the given parts are wholly on it, and every
     *  card of the hand shows its index. The boards run the hand off their
     *  own bottom edge on purpose - the board clips it - so a card counts as
     *  visible when its corner index is, not its whole face. */
    async function fits(page,label,parts,hand){
      const view=page.viewportSize();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${label}: nothing scrolls sideways at ${view.width}x${view.height}`);
      const canvas=await page.locator('.arena-canvas').first().boundingBox();
      assert.ok(canvas.x>=-1&&canvas.y>=-1&&canvas.x+canvas.width<=view.width+1&&canvas.y+canvas.height<=view.height+1,`${label}: the board fits ${view.width}x${view.height} ${JSON.stringify(canvas)}`);
      assert.ok(Math.abs(canvas.width/844-canvas.height/390)<0.01,`${label}: scaled evenly`);
      assert.ok(Math.abs(canvas.width-view.width)<2||Math.abs(canvas.height-view.height)<2,`${label}: as large as the screen allows`);
      for(const selector of parts){
        const boxes=await page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];}));
        assert.ok(boxes.length>0,`${label}: ${selector} is drawn`);
        for(const [l,t,r,b] of boxes) assert.ok(l>=-1&&t>=-1&&r<=view.width+1&&b<=view.height+1,`${label}: ${selector} is not cropped at ${view.width}x${view.height} (${[l,t,r,b].map(Math.round)})`);
      }
      if(hand){
        const scale=canvas.width/844;
        const cards=await page.locator(hand).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right];}));
        assert.ok(cards.length>0,`${label}: the hand is drawn`);
        for(const [l,t,r] of cards) assert.ok(l>=-1&&r<=view.width+1&&t>=-1&&t+36*scale<=view.height,`${label}: every card's index is on screen at ${view.width}x${view.height} (${[l,t,r].map(Math.round)}, canvas ${JSON.stringify(canvas)})`);
      }
    }
    const SIZES=[[740,360],[844,390],[932,430],[667,375]];

    // ---- PLobby -----------------------------------------------------------
    {
      const page=await open('play');
      assert.equal(await page.locator('.arena-plobby').count(),1,'A phone gets PLobby');
      assert.equal(await page.locator('.mrail, .mtab').count(),0,'immersive: no rail, no tab bar');
      assert.equal(await page.getByRole('dialog').count(),0,'and no rotate sheet');
      await shot(page,'lobby','phone-land-01-lobby');
      for(const [width,height] of SIZES){await page.setViewportSize({width,height});await page.waitForTimeout(500);await fits(page,'PLobby',['.arena-plobby button.ar-btn']);}
      await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
      await page.getByRole('button',{name:/^Gin Rummy,/}).click();
      await page.getByRole('button',{name:/Play Gin Rummy/i}).click();
      await page.getByRole('button',{name:/Finding a table/i}).waitFor();
      assert.equal(await page.getByRole('dialog').count(),0,'Finding a table needs no sheet held sideways');
      await shot(page,'lobby-gin-finding','phone-land-01b-lobby-gin-finding');
      await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(300);
      assert.equal(await page.locator('.arena-plobby').count(),0,'The desktop keeps its own lobby');
      await page.context().close();
    }

    // ---- PMindi -----------------------------------------------------------
    {
      const page=await open('tables','?mindi');
      assert.equal(await page.locator('.arena-pmindi').count(),1,'A phone gets PMindi');
      await page.getByRole('button',{name:/10 of spades/i}).first().click();
      await page.waitForTimeout(400);
      assert.match(await page.locator('.arena-pmindi .hint').innerText(),/Tap the 10 again to play it/i,'The board narrates the pick');
      await shot(page,'mindi','phone-land-02-mindi');
      for(const [width,height] of SIZES){await page.setViewportSize({width,height});await page.waitForTimeout(500);await fits(page,'PMindi',['.arena-pmindi button.ar-btn'],'.arena-pmindi section[aria-label="Your hand"] .hc');}
      await page.context().close();
    }

    // ---- PGin -------------------------------------------------------------
    {
      const page=await open('tables','?gin');
      assert.equal(await page.locator('.arena-pgin').count(),1,'A phone gets PGin');
      await page.getByRole('button',{name:/Draw from the stock/i}).click();
      await page.waitForTimeout(900);
      assert.match(await page.locator('.arena-pgin .hint').innerText(),/You drew the 3 of spades/i,'The board narrates the draw');
      await shot(page,'gin','phone-land-03-gin');
      await page.getByRole('button',{name:/^K of diamonds/i}).first().click();await page.waitForTimeout(400);
      assert.match(await page.locator('.arena-pgin button.ar-btn').last().innerText(),/Discard & win/i,'The winning card is the go button');
      await shot(page,'gin-discard-selected','phone-land-03b-gin-discard-selected');
      for(const [width,height] of SIZES){await page.setViewportSize({width,height});await page.waitForTimeout(500);await fits(page,'PGin',['.arena-pgin button.ar-btn'],'.arena-pgin .hand .hc');}
      await page.context().close();
    }

    // ---- PGin, the hand won: the board's won state, with the real result --
    {
      const page=await open('tables','?gin&won');
      assert.equal(await page.locator('.arena-pgin .reveal .mini').count(),10,"Hussain's hand turns face up");
      assert.equal(await page.locator('.arena-pgin .reveal .mini.dead').count(),3,'his deadwood dimmed');
      assert.equal(await page.locator('.arena-pgin .hc.lift').count(),10,'your melds lift');
      assert.equal(await page.locator('.arena-pgin .gtag.hot').count(),3,'under lit brackets');
      const banner=page.locator('.arena-pgin .banner');await banner.waitFor();
      const text=(await banner.innerText()).replace(/\s+/g,' ');
      for(const part of ['GIN','YOU WON','Three melds: 4, 3 and 3, all ten cards.','47','25 for going out + 22','22','Hussain’s J, 10 and 2','+10','Balance 1,250'])
        assert.ok(text.toUpperCase().includes(part.toUpperCase()),`The Gin card says "${part}" (${text})`);
      await shot(page,'gin-won','phone-land-03c-gin-won');
      for(const [width,height] of SIZES){await page.setViewportSize({width,height});await page.waitForTimeout(500);await fits(page,'PGin won',['.arena-pgin .banner']);}
      await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
      await banner.getByRole('button',{name:'Continue'}).click();
      assert.equal(await page.evaluate(()=>document.body.dataset.continued),'1','and its button goes on');
      await page.context().close();
      const lost=await open('tables','?gin&won&lost');
      const lostText=(await lost.locator('.arena-pgin .banner').innerText()).replace(/\s+/g,' ');
      for(const part of ['HUSSAIN WON','Your J, 10 and 2','+2']) assert.ok(lostText.toUpperCase().includes(part.toUpperCase()),`A lost hand says "${part}" (${lostText})`);
      assert.equal(await lost.locator('.arena-pgin .hc.lift').count(),0,'and nothing lifts');
      await shot(lost,'gin-lost');
      await lost.context().close();
    }

    // ---- PResult ----------------------------------------------------------
    {
      const page=await open('result');
      assert.equal(await page.locator('.arena-presult').count(),1,'A phone gets PResult');
      await page.waitForTimeout(2500);
      await shot(page,'result','phone-land-04-result');
      for(const [width,height] of SIZES){await page.setViewportSize({width,height});await page.waitForTimeout(500);await fits(page,'PResult',['.arena-presult button.ar-btn, .arena-presult a.ar-btn']);}
      await page.context().close();
    }

    // ---- a match held upright: MRotate over the live table -----------------
    {
      const page=await open('tables','?mindi&gate',{width:844,height:390,touch:true});
      await page.getByRole('button',{name:/10 of spades/i}).first().click();await page.waitForTimeout(300);
      for(let turn=0;turn<2;turn++){
        await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
        assert.equal(await page.locator('.rotate-gate').isVisible(),true,'Upright, the match shows MRotate');
        assert.equal(await page.locator('.arena-pmindi').count(),1,'over the phone table, still mounted');
        assert.match(await page.locator('.app-shell-match .arena-frame').evaluate(n=>getComputedStyle(n).filter),/blur/,'which shows blurred behind it');
        if(turn===0) await page.screenshot({path:path.join(output,'mindi-upright.png')});
        await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);
        assert.equal(await page.locator('.rotate-gate').isVisible(),false,'Sideways again, the gate goes');
        assert.equal(await page.getByRole('button',{name:/10 of spades/i}).first().getAttribute('aria-pressed'),'true','and the table is as it was: the 10 still picked');
      }
      await page.context().close();
    }

    assert.deepEqual(errors,[]);
    console.log('PASS: the landscape tables - PLobby (Mindi, and Gin finding a table), PMindi, PGin (drawn, the winning discard picked, the hand won and lost) and PResult - each beside its reference, fitting 740x360, 844x390, 932x430 and 667x375 evenly with the hand and the action button never cropped; PLobby immersive with no rotate sheet; a match held upright keeps MRotate over the live, blurred table, and turning back finds it unchanged.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
