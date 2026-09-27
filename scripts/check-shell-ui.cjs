const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/shell-test'),mocks=path.join(__dirname,'shell-test-services.tsx');
const alias=Object.fromEntries(['@/contexts/AuthContext','./AuthContext','@/contexts/EconomyContext','../../contexts/EconomyContext','@/contexts/SettingsContext','@/contexts/ToastContext','@/hooks/useRankLock','@/hooks/useSeasonInfo','next/link','next/navigation','@/lib/friends','@/lib/messages','@/lib/firebase','./ProtectedRoute','@/components/audio/BackgroundMusicPlayer','@/components/economy/CoinTopupWatcher','@/components/system/PresenceHeartbeat'].map(name=>[name+'$',mocks]));alias['@']=root;
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
 for(const [width,height] of [[1440,900],[1280,800],[844,390],[768,1024],[390,844],[320,700]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
  await page.getByRole('button',{name:'Notifications',exact:true}).click();
  const bounds=await page.locator('.notification-popover').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,'Notification bounds '+width);
  await page.keyboard.press('Escape');await page.screenshot({path:path.join(output,'shell-'+width+'.png'),fullPage:true});
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
 // ---- the phone shell (design/arena/MOBILE.md) --------------------------
 // Below 768px the desktop rail steps aside for the phone's own chrome:
 // a 60px top bar and a five-slot tab bar. The bar carries exactly Home,
 // Friends, Play, Shop and More - the version that scrolled sideways
 // through all ten destinations hid the last three behind a swipe - and
 // everything else lives in the More sheet, two taps from anywhere.
 const TABS=['Home','Friends','Play','Shop','More'];
 const slotNames=async sel=>(await page.locator(sel+' > a, '+sel+' > button').allInnerTexts())
   .map(t=>t.trim().split('\n')[0].replace(/\d+\+?$/,'').trim());

 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 assert.equal(await page.locator('.app-sidebar').isVisible(),false,'The desktop rail steps aside');
 assert.equal(await page.locator('.app-shell-toolbar').isVisible(),false,'and so does its top bar');
 assert.deepEqual(await slotNames('.mtab'),TABS,'The tab bar holds exactly the five slots');
 assert.equal(await page.locator('.mtab .pw').count(),1,'Play is the raised diamond');
 const tabBar=await page.locator('.mtab').boundingBox();
 assert.ok(Math.abs(tabBar.width-390)<2,'The bar spans the screen');
 assert.ok(Math.abs((tabBar.y+tabBar.height)-844)<2,'and sits on the bottom edge');
 assert.ok(Math.abs((await page.locator('.mtop').boundingBox()).height-60)<2,'The top bar is 60px');

 // Everything the bar cannot reach is in the More sheet.
 await page.locator('.mtab').getByRole('button',{name:/More/}).click();
 await page.getByRole('dialog').waitFor();
 const inSheet=await page.locator('.more-grid a, .acts2 a, .more-who a').evaluateAll(
   nodes=>nodes.map(n=>n.getAttribute('href')));
 for(const href of ['/leaderboard','/tournament','/clubs','/messages','/inventory',
                    '/achievements','/rewards','/missions','/hall-of-fame','/settings','/profile']){
  assert.ok(inSheet.includes(href),`More reaches ${href}`);
 }
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden','The page behind a sheet stops scrolling');
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0,'Escape closes the sheet');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'','and gives scrolling back');

 // ---- held sideways: the same five stand up as a rail -------------------
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 assert.deepEqual(await slotNames('.mrail'),TABS,'The rail holds the same five');
 const rail=await page.locator('.mrail').boundingBox();
 assert.ok(Math.abs(rail.width-76)<2,`The rail is 76px (got ${Math.round(rail.width)})`);
 assert.ok(rail.x<2&&Math.abs(rail.height-390)<2,'down the left, full height');
 assert.equal(await page.locator('.mtab').isVisible(),false,'and the bar is put away');
 assert.ok(Math.abs((await page.locator('.mtop').boundingBox()).height-52)<2,'The top bar shortens to 52px');
 // Every destination is reachable by name even though no label is drawn.
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(250);
 assert.ok(await page.locator('.app-sidebar-item[aria-label]').count()>=8,
  'Every icon carries its own name for assistive tech');

 const search=page.getByRole('combobox').first();await search.fill('Gin');await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-destination'),'/play/gin-rummy/casual/online');
 await search.fill('');await search.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-destination'),'/play/mindi/ranked');
 await search.fill('nonexistent-game');assert.equal(await page.locator('#launcher-results [role=option]').count(),0);await page.keyboard.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
 // The rail never covers the page, so it never inerts it or locks scroll.
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
 assert.equal(await page.locator('.app-shell-main').evaluate(n=>n.inert),false,'Content is never inert');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'','and the body never locks');
 await page.getByRole('button',{name:'Profile: Test Player'}).click();await page.getByRole('button',{name:/Log Out|Logout|Sign Out/i}).click();assert.equal(await page.locator('body').getAttribute('data-toast'),"Couldn't sign out. Please try again.");
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});await page.locator('.connection-notice').waitFor();
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});window.dispatchEvent(new Event('online'));});assert.equal(await page.locator('.connection-notice').count(),0);
 await page.evaluate(()=>{const match=document.createElement('div');match.className='gin-room';document.querySelector('main').append(match);});assert.equal(await page.locator('.app-sidebar').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('Shell checks passed: six viewports, a right-hand rail at three desktop widths, the phone five-slot bar and More sheet at 390, and the same five as a rail at 844x390, named icons, shared listeners, search keyboard controls, menus, logout errors, offline notice, private match chrome.');
 }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
