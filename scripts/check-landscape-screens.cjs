// The landscape app screens (design/arena/LANDSCAPE.md "Screens"), each in the
// phone shell (scripts/land-frame.tsx) and fed its board's own sample data
// through the screen's existing fixture services - never app code.
//
// Every state is screenshotted as its reference is drawn: 844x390 for a
// one-screen board, the whole page for a scrolling one; the shot goes beside
// the reference in artifacts/compare/landscape-<screen>.png (not committed).
// Each screen is then checked at 740x360, 844x390 and 932x430: nothing
// scrolls sideways, nothing hides under the rail, and the top bar names it.
//
//   node scripts/check-landscape-screens.cjs [screen ...]   (dev server on :3000)
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/landscape-screens'),compareDir=path.join(root,'artifacts/compare');
const refs=path.join(root,'design/arena/screens/landscape');
const base='http://127.0.0.1:3000';
const loader={test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')};

/**
 * One entry per screen. `mocks` and `aliases` are the screen's own desktop
 * check's, plus next/navigation for the route the shell reads. `states` are
 * its references: `full` for a scrolling board, `before` to put the page in
 * that reference's state. `route` is the app route whose stylesheets the
 * fixture also needs (a component's own CSS ships with its route).
 */
const SCREENS={
  home:{
    entry:'land-home-entry.tsx',mocks:'home-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/SettingsContext','@/contexts/HomeSocialContext','@/hooks/useRankLock','@/hooks/useSeasonInfo','@/hooks/useNews','next/link','next/navigation'],
    title:'THAASBAI',
    states:[
      {file:'home',ref:'landscape-01-home',query:'?live',full:true},
      {file:'more-panel',ref:'landscape-01b-more-panel',query:'?live',before:async page=>{
        await page.locator('.mrail').getByRole('button',{name:/More/}).click();
      }},
    ],
  },
  profile:{
    entry:'land-profile-entry.tsx',mocks:'profile-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/ToastContext','@/hooks/useTranslation','@/lib/profileHistory','@/lib/supabase/client','next/navigation'],
    title:'PROFILE',
    states:[{file:'profile',ref:'landscape-02-profile',full:true}],
  },
  inventory:{
    entry:'land-inventory-entry.tsx',mocks:'inventory-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/EconomyContext','@/hooks/useTranslation','next/link','next/navigation'],
    title:'INVENTORY',
    states:[
      {file:'inventory',ref:'landscape-03-inventory',full:true},
      {file:'inventory-room-cards',ref:'landscape-03b-inventory-room-cards',query:'?roomcards'},
      {file:'card-preview-owned',ref:'landscape-03c-card-preview-owned',before:async page=>{
        await page.getByRole('button',{name:'Preview Deep Ocean'}).click();
      }},
      {file:'card-preview-buy',ref:'landscape-03d-card-preview-buy',before:async page=>{
        await page.getByRole('button',{name:'Preview Neon Cyber'}).click();
      }},
    ],
  },
  friends:{
    entry:'land-friends-entry.tsx',mocks:'friends-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/ToastContext','@/contexts/EconomyContext','next/navigation','next/link','@/lib/friends','@/lib/rooms','@/lib/presence','@/hooks/useTranslation'],
    title:'FRIENDS',
    states:[
      {file:'friends',ref:'landscape-04-friends',query:'?populated'},
      {file:'friend-requests',ref:'landscape-04b-friend-requests',query:'?populated',before:async page=>{
        await page.locator('.fhead').getByRole('button',{name:/^Requests/}).click();
      }},
      {file:'friend-actions',ref:'landscape-04c-friend-actions',query:'?populated',before:async page=>{
        await page.getByRole('button',{name:'More for Mariyam'}).click();
      }},
    ],
  },
  messages:{
    entry:'land-messages-entry.tsx',mocks:'messages-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/ToastContext','@/contexts/HomeSocialContext','@/contexts/EconomyContext','next/navigation','@/lib/messages','@/lib/clubs','@/lib/presence','@/lib/rooms','@/lib/friends','@/hooks/useTranslation','next/link'],
    title:'MESSAGES',route:'/messages/',
    states:[
      {file:'messages',ref:'landscape-05-messages'},
      {file:'chat',ref:'landscape-05b-chat',query:'?with=mariyam&name=Mariyam'},
    ],
  },
  clubs:{
    entry:'land-clubs-entry.tsx',mocks:'clubs-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/ToastContext','@/contexts/EconomyContext','next/navigation','@/lib/clubs','@/lib/messages','@/lib/friends','@/hooks/useTranslation','next/link'],
    title:'CLUBS',route:'/clubs/',
    states:[
      {file:'clubs',ref:'landscape-06-clubs',query:'?roster',full:true},
      {file:'club-chat',ref:'landscape-06b-club-chat',query:'?roster',full:true,before:async page=>{
        await page.getByRole('button',{name:'Club Chat'}).click();
      }},
    ],
  },
  leaderboard:{
    entry:'land-leaderboard-entry.tsx',mocks:'leaderboard-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/HomeSocialContext','@/hooks/useLeaderboard','@/hooks/useTranslation','@/constants/ranks','next/link','next/navigation'],
    title:'LEADERBOARD',route:'/leaderboard/',
    states:[{file:'leaderboard',ref:'landscape-07-leaderboard'}],
  },
  achievements:{
    entry:'land-achievements-entry.tsx',mocks:'achievements-test-services.tsx',
    aliases:['@/contexts/EconomyContext','@/contexts/AuthContext','@/hooks/useTranslation','next/link','next/navigation'],
    title:'ACHIEVEMENTS',route:'/achievements/',
    states:[
      {file:'achievements',ref:'landscape-08-achievements',full:true},
      {file:'achievements-ranks',ref:'landscape-08b-achievements-ranks',before:async page=>{
        await page.locator('.chips').getByRole('button',{name:/^Ranks/}).click();
      }},
    ],
  },
  league:{
    entry:'land-league-entry.tsx',mocks:'league-test-services.tsx',
    aliases:['@/contexts/AuthContext','@/contexts/EconomyContext','@/hooks/useTranslation','@/lib/weekendLeague','@/constants/ranks','next/navigation','next/link'],
    title:'WEEKEND LEAGUE',route:'/tournament/',
    states:[{file:'weekend-league',ref:'landscape-09-weekend-league',full:true}],
  },
};

function build(name){
  const screen=SCREENS[name];
  const alias=Object.fromEntries(screen.aliases.map(n=>[n+'$',path.join(__dirname,screen.mocks)]));alias['@']=root;
  return new Promise((resolve,reject)=>compiler.webpack({mode:'development',devtool:false,entry:path.join(__dirname,screen.entry),output:{path:path.join(output,name),filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[loader]},plugins:[new compiler.webpack.NormalModuleReplacementPlugin(/\.css$/,'data:text/javascript,export default {};'),new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})]},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
}

/** Ours on the left, the reference scaled to our size on the right. */
async function sideBySide(ours,reference,file){
  const a=sharp(ours),meta=await a.metadata();
  const b=await sharp(reference).resize(meta.width,meta.height,{fit:'fill'}).png().toBuffer();
  await sharp({create:{width:meta.width*2+16,height:meta.height,channels:3,background:'#ff00ff'}})
    .composite([{input:await a.png().toBuffer(),left:0,top:0},{input:b,left:meta.width+16,top:0}]).png().toFile(file);
}

async function main(){
  const only=process.argv.slice(2);
  const names=Object.keys(SCREENS).filter(n=>!only.length||only.includes(n));
  fs.mkdirSync(compareDir,{recursive:true});
  for(const name of names) await build(name);
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const errors=[];
  try{
    const source=await browser.newPage();
    const urls=new Set();
    for(const route of ['/login/',...names.map(n=>SCREENS[n].route).filter(Boolean)]){
      await source.goto(base+route);
      for(const href of await source.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href))) urls.add(href.replace(/\?v=\d+$/,''));
    }
    const css=[];for(const url of urls){const r=await source.request.get(url);assert.ok(r.ok());css.push(await r.text());}
    await source.goto(base+'/login/');
    const body=await source.locator('body').getAttribute('class');await source.close();
    async function open(name,query='',{width=844,height=390}={}){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
      const script=fs.readFileSync(path.join(output,name,'component.js'),'utf8');
      await page.route(`**/land-${name}/**`,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(s=>`<style>${s}</style>`).join('')}</head><body class="${body}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
      await page.goto(`${base}/land-${name}/${query}`);
      await page.locator('.mrail').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);
      return page;
    }
    for(const name of names){
      const screen=SCREENS[name];
      for(const state of screen.states){
        if(state.skip) continue;
        const page=await open(name,state.query||'');
        if(state.before){await state.before(page);await page.waitForTimeout(600);}
        await page.mouse.move(1,1);
        const out=path.join(output,state.file+'.png');
        // A state's set-up click can scroll the page; the reference is drawn from the top.
        if(state.full) await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:out,fullPage:!!state.full});
        if(state.ref) await sideBySide(out,path.join(refs,state.ref+'.jpg'),path.join(compareDir,'landscape-'+state.file+'.png'));
        await page.context().close();
      }
      // The sizes the boards hold at: 740 to 932 wide, 360 to 430 tall.
      const page=await open(name,screen.states[0].query||'');
      for(const [width,height] of [[740,360],[844,390],[932,430]]){
        await page.setViewportSize({width,height});await page.waitForTimeout(400);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name}: nothing scrolls sideways at ${width}x${height}`);
        const rail=await page.locator('.mrail').boundingBox();
        assert.ok(Math.abs(rail.width-76)<2&&Math.abs(rail.height-height)<2,`${name}: the rail is there at ${width}`);
        const left=await page.locator('.app-shell-main .mpage').first().evaluate(n=>n.getBoundingClientRect().left+parseFloat(getComputedStyle(n).paddingLeft));
        assert.ok(left>=76,`${name}: the content starts after the rail at ${width} (${Math.round(left)})`);
        // A side scroller (.chips, .hs) runs to the screen edge on purpose: what is
        // past the edge is a swipe away, not cut off.
        const clipped=await page.locator('.app-shell-main .mpage').first().evaluate(n=>[...n.querySelectorAll('button, a')].filter(el=>{const r=el.getBoundingClientRect();let p=el.parentElement;while(p&&p!==n){if(/auto|scroll/.test(getComputedStyle(p).overflowX))return false;p=p.parentElement;}return r.width&&(r.left<76-1||r.right>innerWidth+1);}).map(el=>(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40)));
        assert.deepEqual(clipped,[],`${name}: no control is cut off at the sides at ${width}`);
      }
      const bar=(await page.locator('.mtop').innerText()).toUpperCase();
      assert.ok(bar.includes(screen.title),`${name}: the top bar reads ${screen.title} (${bar})`);
      await page.context().close();
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS: landscape screens ${names.join(', ')} - each state beside its reference, and at 740x360, 844x390 and 932x430 nothing scrolls sideways, nothing hides under the rail, and the top bar names the screen.`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
