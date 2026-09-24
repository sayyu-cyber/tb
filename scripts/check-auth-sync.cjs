const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/auth-test'),mocks=path.join(__dirname,'auth-test-services.ts');
async function run(){
 await new Promise((resolve,reject)=>compiler.webpack({mode:'development',devtool:false,entry:path.join(__dirname,'auth-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/lib/firebase$':mocks,'firebase/auth$':mocks,'firebase/firestore$':mocks,'@':root}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||stats.toString()):resolve()));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 const script=fs.readFileSync(path.join(output,'component.js'),'utf8');
 await page.route('**/auth-test/**',route=>route.fulfill({contentType:'text/html',body:`<div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script>`}));
 await page.goto('http://127.0.0.1:3000/auth-test/');
 await page.waitForFunction(()=>document.querySelector('output')?.textContent.includes('Bronze'));
 assert.deepEqual(await page.evaluate(()=>window.authTest.subscriptions()),['player-one']);
 await page.evaluate(()=>window.authTest.update());await page.waitForFunction(()=>document.querySelector('output')?.textContent.includes('Silver'));
 assert.equal(JSON.parse(await page.locator('output').textContent()).trophies,30);
 await page.evaluate(()=>window.authTest.signOut());assert.deepEqual(await page.evaluate(()=>window.authTest.subscriptions()),[]);
 await page.evaluate(()=>window.authTest.login());await page.waitForFunction(()=>document.querySelector('output')?.textContent.includes('player-two'));
 assert.deepEqual(await page.evaluate(()=>window.authTest.subscriptions()),['player-two']);assert.deepEqual(errors,[]);
 console.log('Auth sync passed: live trophy/rank updates, sign-out cleanup, account-switch isolation. Firebase mocked.');
 }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
