const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), mock = path.join(__dirname, 'room-auth-test-services.tsx'), output = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-room-auth-'));
async function run() {
  const alias = Object.fromEntries(['@/contexts/AuthContext','@/hooks/useTranslation','next/navigation','next/link'].map(key => [key + '$', mock])); alias['@'] = root;
  await new Promise((resolve,reject) => compiler.webpack({ mode:'development',devtool:false,entry:path.join(__dirname,'room-auth-test-entry.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}] } }, (err,stats) => err || stats.hasErrors() ? reject(err || new Error(stats.toString())) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    for (const oauth of [false,true]) {
      const page = await browser.newPage(); const errors=[];page.on('pageerror', e=>errors.push(e.message));
      const script = fs.readFileSync(path.join(output,'fixture.js'),'utf8');
      await page.route('**/play/mindi/room?**', route => route.fulfill({contentType:'text/html',body:`<div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script>`}));
      const destination = '/play/mindi/room?code=TF2GRQ&invite=invite-token';
      await page.goto('http://127.0.0.1:3000'+destination);
      await page.waitForFunction(() => window.roomAuthFixture.path === '/login');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('thaasbai-room-return')), destination);
      await page.evaluate(oauth => window.roomAuthFixture.signIn(oauth), oauth);
      await page.waitForFunction(() => window.roomAuthFixture.destinations.some(value => value.includes('invite=invite-token')));
      assert.equal(await page.evaluate(() => sessionStorage.getItem('thaasbai-room-return')), null);
      assert.deepEqual(errors, []);
      console.log(`PASS bug 4: ${oauth ? 'OAuth home callback' : 'login'} resumes the same room code and invite token`);
      await page.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => {console.error(error);process.exitCode=1;});
