const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/room-test');
const mocks = path.join(__dirname, 'room-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','@/contexts/EconomyContext','@/contexts/ToastContext','@/lib/rooms','next/navigation','next/link'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'room-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:3000/login/');
    const styles = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const bodyClass = await page.locator('body').getAttribute('class');
    const script = fs.readFileSync(path.join(output,'component.js'),'utf8');

    await page.route('**/room-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body class="${bodyClass || ''}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
    await page.goto('http://127.0.0.1:3000/room-test/');
    await page.getByRole('heading',{name:'Private Room',exact:true}).waitFor();
    for (const [width,height] of [[1920,1080],[1440,900],[1280,900],[768,1024],[390,844],[320,700]]) {
      await page.setViewportSize({width,height}); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
      await page.screenshot({path:path.join(output,'room-'+width+'.png'),fullPage:true});
    }
    await page.getByRole('combobox',{name:'Select Game'}).selectOption('gin-rummy');
    assert.equal(await page.getByRole('combobox',{name:'Max Players'}).inputValue(),'2');
    assert.equal(await page.getByRole('combobox',{name:'Max Players'}).locator('option').count(),1);
    await page.getByRole('switch').check();
    await page.getByRole('textbox',{name:'Room password',exact:true}).count();
    await page.locator('input[aria-label="Room password"]').fill('secret');
    await page.getByRole('button',{name:'Create Room',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.destination),'/play/gin-rummy/room?code=NEW234');
    const roomCode=page.getByRole('textbox',{name:'Room Code',exact:true});
    await roomCode.fill('BAD234'); await page.getByRole('button',{name:'Join Room',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Room not found'}).waitFor();
    await roomCode.fill('FULL23'); await page.getByRole('button',{name:'Join Room',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'This room is full'}).waitFor();
    await roomCode.fill('lock23'); await roomCode.press('Enter');
    await page.getByRole('dialog').waitFor();
    await page.getByLabel('Join room password',{exact:true}).fill('wrong');
    await page.getByRole('dialog').getByRole('button',{name:'Join Room',exact:true}).click();
    await page.getByRole('dialog').getByRole('alert').waitFor();
    await page.getByLabel('Join room password',{exact:true}).fill('secret');
    await page.getByRole('dialog').getByRole('button',{name:'Join Room',exact:true}).click();
    await page.waitForFunction(()=>window.destination==='/play/gin-rummy/room?code=LOCK23');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.goto('http://127.0.0.1:3000/room-test/?no-card');
    await page.getByRole('heading',{name:'Private Room',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Create Room',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Join Room',exact:true}).isDisabled(),false);
    assert.deepEqual(errors,[]);
    console.log('Private rooms: six sizes, game limits, hosting restrictions, create, missing/full rooms, password retry and cross-game joining passed.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
