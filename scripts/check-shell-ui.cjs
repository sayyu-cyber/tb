const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/shell-test'),mocks=path.join(__dirname,'shell-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/AuthContext','./AuthContext','@/contexts/EconomyContext','../../contexts/EconomyContext','@/contexts/SettingsContext','@/contexts/ToastContext','@/hooks/useRankLock','@/hooks/useSeasonInfo','next/link','next/navigation','@/lib/friends','@/lib/messages','./ProtectedRoute','@/components/audio/BackgroundMusicPlayer','@/components/economy/CoinTopupWatcher','@/components/system/PresenceHeartbeat'].map(name=>[name+'$',mocks]));alias['@']=root;
async function run(){
 await new Promise((resolve,reject)=>compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'shell-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
 await page.goto('http://127.0.0.1:3000/login/');const styles=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));const bodyClass=await page.locator('body').getAttribute('class');
 const script=fs.readFileSync(path.join(output,'component.js'),'utf8');
 await page.route('**/shell-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass||''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
 await page.goto('http://127.0.0.1:3000/shell-test/');await page.getByRole('combobox').first().waitFor();
 assert.equal(await page.locator('body').getAttribute('data-watch-chats'),'1','Only one chat subscription');
 // ---- desktop: unchanged at 768 wide and up with a normal height --------
 for(const [width,height] of [[1440,900],[1280,800],[768,1024]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
  await page.getByRole('button',{name:'Notifications',exact:true}).click();
  const bounds=await page.locator('.notification-popover').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,'Notification bounds '+width);
  await page.keyboard.press('Escape');await page.screenshot({path:path.join(output,'shell-'+width+'.png'),fullPage:true});
  assert.equal(await page.locator('.mrail').isVisible(),false,'No phone rail on the desktop at '+width);
 }

 // ---- the rail: right edge, one width, no way to change it --------------
 // The nav used to widen to 300px, which took 216px off the content and -
 // while the shell still centred that content - slid the whole page
 // sideways with it. There is no expanded state any more, so the only
 // thing to prove is that it cannot appear: no toggle, no drawer, and the
 // same geometry at every width.
 assert.equal(await page.locator('.app-sidebar-toggle').count(),0,'The rail has no expand control');
 assert.equal(await page.locator('.app-sidebar-backdrop').count(),0,'and no drawer backdrop');
 const geometry=async()=>{
  const nav=await page.locator('.app-sidebar-panel').boundingBox();
  const main=await page.locator('.app-shell-main').boundingBox();
  return {navLeft:nav.x,navRight:nav.x+nav.width,navWidth:nav.width,mainLeft:main.x,mainRight:main.x+main.width};
 };
 for(const [width,height] of [[1800,1000],[1280,800],[1024,800]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const g=await geometry();
  assert.ok(Math.abs(g.navWidth-84)<2,`Rail is 84px at ${width} (got ${Math.round(g.navWidth)})`);
  assert.ok(Math.abs(g.navRight-width)<2,`Rail is against the right edge at ${width}`);
  assert.ok(g.mainLeft<2,`Content starts at the left edge at ${width} (got ${Math.round(g.mainLeft)})`);
  assert.ok(Math.abs(g.mainRight-g.navLeft)<2,
   `and ends where the rail begins at ${width} (${Math.round(g.mainRight)} vs ${Math.round(g.navLeft)})`);
 }

 // ---- the phone shell, held sideways (design/arena/LANDSCAPE.md) --------
 // On (orientation: landscape) and (max-height: 500px) the desktop rail
 // steps aside for the phone's own chrome: a 76px rail down the left and a
 // 52px top bar after it. The rail carries exactly Home, Friends, Play,
 // Shop and More, and every other destination is in the More panel, two
 // taps from anywhere.
 const TABS=['HOME','FRIENDS','PLAY','SHOP','MORE'];
 const slotNames=async sel=>(await page.locator(sel+' > a, '+sel+' > button').allInnerTexts())
   .map(t=>t.trim().split('\n')[0].replace(/\d+\+?$/,'').trim().toUpperCase());
 for(const [width,height] of [[844,390],[740,360],[932,430]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  assert.equal(await page.locator('.app-sidebar').isVisible(),false,'The desktop rail steps aside at '+width);
  assert.equal(await page.locator('.app-shell-toolbar').isVisible(),false,'and so does its top bar at '+width);
  assert.deepEqual(await slotNames('.mrail'),TABS,'The rail holds exactly the five slots at '+width);
  const rail=await page.locator('.mrail').boundingBox();
  assert.ok(Math.abs(rail.width-76)<2,`The rail is 76px (got ${Math.round(rail.width)})`);
  assert.ok(rail.x<2&&Math.abs(rail.height-height)<2,'down the left, full height at '+width);
  const bar=await page.locator('.mtop').boundingBox();
  assert.ok(Math.abs(bar.height-52)<2,`The top bar is 52px (got ${Math.round(bar.height)})`);
  assert.ok(Math.abs(bar.x-76)<2&&Math.abs(bar.x+bar.width-width)<2,'from the rail to the right edge at '+width);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow at '+width+'x'+height);
  await page.screenshot({path:path.join(output,'shell-land-'+width+'.png')});
 }
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 // The rail is shell chrome, so no page namespace reaches it - it has to be
 // drawn by the shell's own sheet. Geometry alone would not notice.
 assert.notEqual(await page.locator('.mrail').evaluate(n=>getComputedStyle(n).backgroundImage),'none',
  'The rail is drawn, not just sized');
 assert.equal(await page.locator('.mrail a[aria-current=page] .ti').evaluate(n=>getComputedStyle(n).backgroundColor),
  'rgb(198, 255, 51)','and the slot you are on wears the lime pill');
 assert.equal(await page.locator('.mrail .pw .fc').count(),1,'Play is the raised diamond');
 assert.equal(await page.locator('.mrail a.play').getAttribute('href'),'/play','and goes straight to the Play lobby');
 // Home's bar is the wordmark; the right side is coins, the bell and you.
 assert.equal((await page.locator('.mtop .word').innerText()).trim().toUpperCase(),'THAASBAI','Home shows the wordmark');
 assert.equal(await page.locator('.mtop .tr .coins').count(),1,'with the coins chip');
 for(const sel of ['.mtop .coins','.mtop .bell .ibtn','.mtop .meb .ava']){
  const box=await page.locator(sel).boundingBox();
  assert.ok(Math.abs(box.height-34)<2,`${sel} is 34px (got ${Math.round(box.height)})`);
 }

 // Everything the rail cannot reach is in the More panel: a 540px side
 // panel off the rail, on sideIn.
 await page.locator('.mrail').getByRole('button',{name:/More/}).click();
 await page.getByRole('dialog').waitFor();await page.waitForTimeout(500); // sideIn is .38s
 const panel=await page.locator('.sheet.w2').boundingBox();
 assert.ok(Math.abs(panel.x-76)<2&&Math.abs(panel.width-540)<2,`More is a 540px panel off the rail (got ${Math.round(panel.x)}, ${Math.round(panel.width)})`);
 assert.ok(Math.abs(panel.height-390)<2,'full height');
 assert.equal(await page.locator('.sheet.w2').evaluate(n=>getComputedStyle(n).animationName),'sideIn','It slides in from the rail');
 assert.equal(await page.locator('.more-grid .ltile').count(),9,'Explore is a 3x3 grid');
 const inPanel=await page.locator('.more-grid a, .acts2 a, .sheet .link').evaluateAll(
   nodes=>nodes.map(n=>n.getAttribute('href')));
 for(const href of ['/leaderboard','/tournament','/clubs','/messages','/inventory',
                    '/achievements','/rewards','/missions','/hall-of-fame','/settings','/profile']){
  assert.ok(inPanel.includes(href),`More reaches ${href}`);
 }
 assert.equal(await page.locator('.mrail').getByRole('button',{name:/More/}).getAttribute('aria-expanded'),'true','More says it is open');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden','The page behind a panel stops scrolling');
 await page.screenshot({path:path.join(output,'shell-land-more.png')});
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0,'Escape closes the panel');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'','and gives scrolling back');
 // A page reached from More lights More; Friends lights itself.
 await page.locator('.mrail').getByRole('button',{name:/More/}).click();await page.getByRole('dialog').waitFor();
 await page.locator('.more-grid a[href="/leaderboard"]').click();
 assert.equal(await page.getByRole('dialog').count(),0,'Choosing a destination closes the panel');
 assert.equal(await page.locator('.mrail button[aria-current=page]').count(),1,'Leaderboard lights More');
 assert.equal((await page.locator('.mtop .pg h1').innerText()).trim().toUpperCase(),'LEADERBOARD','and the bar names the page');
 assert.equal((await page.locator('.mtop .pg .lbl').innerText()).trim().toUpperCase(),'COMPETE AND CLIMB THE RANKS','under its lime label');
 await page.locator('.mrail a[href="/friends"]').click();
 assert.equal(await page.locator('.mrail a[aria-current=page]').getAttribute('href'),'/friends','Friends lights itself');
 await page.locator('.mrail a[href="/home"]').click();

 // Every destination is reachable by name even though no label is drawn.
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(250);
 assert.ok(await page.locator('.app-sidebar-item[aria-label]').count()>=8,
  'Every icon carries its own name for assistive tech');

 const search=page.getByRole('combobox').first();await search.fill('Gin');await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-destination'),'/play/gin-rummy/casual/online');
 await search.fill('');await search.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-destination'),'/play/mindi/ranked');
 await search.fill('nonexistent-game');assert.equal(await page.locator('#launcher-results [role=option]').count(),0);await page.keyboard.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
 // The rail never covers the page, so it never inerts it or locks scroll.
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
 assert.equal(await page.locator('.app-shell-main').evaluate(n=>n.inert),false,'Content is never inert');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'','and the body never locks');
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(250);
 await page.getByRole('button',{name:'Profile: Test Player'}).click();await page.getByRole('button',{name:/Log Out|Logout|Sign Out/i}).click();assert.equal(await page.locator('body').getAttribute('data-toast'),"Couldn't sign out. Please try again.");
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});await page.locator('.connection-notice').waitFor();
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});window.dispatchEvent(new Event('online'));});assert.equal(await page.locator('.connection-notice').count(),0);
 await page.evaluate(()=>{const match=document.createElement('div');match.className='gin-room';document.querySelector('main').append(match);});assert.equal(await page.locator('.app-sidebar').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('Shell checks passed: desktop at three sizes with a right-hand rail, unchanged; held sideways at 844x390, 740 and 932 the 76px rail of exactly Home, Friends, Play, Shop and More, the 52px top bar in its kinds, the 540px More panel holding every other destination, rail lighting; named icons, shared listeners, search keyboard controls, menus, logout errors, offline notice.');
 }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
