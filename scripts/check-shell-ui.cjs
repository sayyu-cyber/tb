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
 const search=page.getByRole('combobox').first();await search.fill('Gin');await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-destination'),'/play/gin-rummy/casual/online');
 await search.fill('');await search.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-destination'),'/play/mindi/ranked');
 await search.fill('nonexistent-game');assert.equal(await page.locator('#launcher-results [role=option]').count(),0);await page.keyboard.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
 await page.locator('.app-sidebar-toggle').click();assert.equal(await page.locator('.app-shell-main').evaluate(n=>n.inert),true);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
 await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(250);assert.equal(await page.locator('.app-shell-main').evaluate(n=>n.inert),false);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.keyboard.press('Escape');assert.equal(await page.locator('.app-sidebar-toggle').getAttribute('aria-expanded'),'false');
 await page.getByRole('button',{name:'Profile: Test Player'}).click();await page.getByRole('button',{name:/Log Out|Logout|Sign Out/i}).click();assert.equal(await page.locator('body').getAttribute('data-toast'),"Couldn't sign out. Please try again.");
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});await page.locator('.connection-notice').waitFor();
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});window.dispatchEvent(new Event('online'));});assert.equal(await page.locator('.connection-notice').count(),0);
 await page.evaluate(()=>{const match=document.createElement('div');match.className='gin-room';document.querySelector('main').append(match);});assert.equal(await page.locator('.app-sidebar').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('Shell checks passed: six viewports, shared listeners, search keyboard controls, menus, sidebar resize/focus, logout errors, offline notice, private match chrome.');
 }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
