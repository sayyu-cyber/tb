const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/room-test'), compare = path.join(root,'artifacts/compare');
const mocks = path.join(__dirname, 'room-test-services.tsx');
const alias = Object.fromEntries(['@/contexts/AuthContext','./AuthContext','@/contexts/EconomyContext','../../contexts/EconomyContext','@/contexts/ToastContext','@/contexts/SettingsContext','@/contexts/HomeSocialContext','@/lib/rooms','@/lib/friends','@/lib/publicProfile','next/navigation','next/link','./ProtectedRoute','@/components/audio/BackgroundMusicPlayer','@/components/economy/CoinTopupWatcher','@/components/system/PresenceHeartbeat','./ConnectionNotice','@/components/system/ConnectionNotice'].map(name => [name+'$',mocks]));
alias['@'] = root;
async function run() {
  await new Promise((resolve,reject) => compiler.webpack({mode:'development',plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1}),new compiler.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],devtool:false,entry:path.join(__dirname,'room-test-entry.tsx'),output:{path:output,filename:'component.js'},resolve:{extensions:['.tsx','.ts','.js'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'friends-test-loader.cjs')}]},optimization:{minimize:false}},(error,stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  fs.mkdirSync(compare,{recursive:true});
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  const errors = [];
  try {
    const source=await browser.newPage(); await source.goto('http://127.0.0.1:3000/login/');
    const styles=await source.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    const htmlClass=await source.locator('html').getAttribute('class')||'', bodyClass=await source.locator('body').getAttribute('class')||'';
    const css=await Promise.all(styles.map(async url=>(await source.request.get(url)).text())); await source.close();
    const script=fs.readFileSync(path.join(output,'component.js'),'utf8');
    async function fixture(query='',width=1440,height=1250) {
      const page=await browser.newPage({viewport:{width,height}}); page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(android=>{
        Object.defineProperty(screen.orientation,'lock',{configurable:true,value:android ? async value=>{window.orientationCalls=(window.orientationCalls||[]).concat(value);} : undefined});
        if(android) Element.prototype.requestFullscreen=async()=>{window.fullscreenRequested=true;};
      },query.includes('android'));
      await page.route('**/room-test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html class="${htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(text=>`<style>${text}</style>`).join('')}</head><body class="${bodyClass}"><div id="test-root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`}));
      await page.goto('http://127.0.0.1:3000/room-test/'+query); await page.locator('.room-page').waitFor(); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(600); return page;
    }
    async function shot(page,name,reference) {
      await page.waitForTimeout(450);
      const png=await page.screenshot({path:path.join(output,name+'.png'),fullPage:!(await page.getByRole('dialog').count())});
      if(process.argv.includes('--compare')) {
        if(reference){ const a=await sharp(png).metadata(); const b=await sharp(path.join(root,'design/arena/screens',reference+'.jpg')).resize({width:a.width}).png().toBuffer();await sharp({create:{width:a.width*2+16,height:Math.max(a.height,(await sharp(b).metadata()).height),channels:3,background:'#ff00ff'}}).composite([{input:png,left:0,top:0},{input:b,left:a.width+16,top:0}]).png().toFile(path.join(compare,name+'.png')); }
        else fs.writeFileSync(path.join(compare,name+'.png'),png);
      }
    }
    const page=await fixture();
    const create=page.locator('#create-room'),join=page.locator('.room-join-form'),roomCode=join.getByRole('textbox',{name:'Room code',exact:true});
    await shot(page,'rooms-active','app/app-15-private-room');
    await create.getByRole('button',{name:/Gin Rummy/}).click();
    assert.equal(await create.getByRole('button',{name:'4 · Two teams',exact:true}).isDisabled(),true);
    assert.equal(await create.getByRole('button',{name:'2 · Head to head',exact:true}).getAttribute('aria-pressed'),'true');
    await create.getByRole('switch').click(); await create.getByLabel('Password',{exact:true}).fill('secret');
    await create.getByRole('button',{name:'Show password'}).click(); assert.equal(await create.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
    await create.getByRole('button',{name:'Create a room',exact:true}).click(); assert.equal(await page.evaluate(()=>window.destination),'/play/gin-rummy/room?code=NEW234');
    await create.getByRole('button',{name:/Mindi/}).click();await create.getByRole('button',{name:'4 · Two teams',exact:true}).click(); await roomCode.fill('TF2GRQ'); await shot(page,'rooms-code-password','app/app-15b-code-and-password');
    await roomCode.fill('TF2GRX'); await join.getByRole('button',{name:'Join room',exact:true}).click(); await page.getByRole('alert').filter({hasText:'Room not found'}).waitFor(); await shot(page,'rooms-not-found','app/app-15e-code-not-found');
    for(const [code,text] of [['FULL23','This room is full'],['START2','already started']]) { await roomCode.fill(code);await join.getByRole('button',{name:'Join room',exact:true}).click();await page.getByRole('alert').filter({hasText:text}).waitFor(); }
    await roomCode.fill('tf2grq'); await roomCode.press('Enter'); const dialog=page.getByRole('dialog'); await dialog.waitFor(); await shot(page,'rooms-password','app/app-15c-room-password');
    await dialog.getByLabel('Join room password',{exact:true}).fill('wrong'); await dialog.getByRole('button',{name:'Join room',exact:true}).click();await dialog.getByRole('alert').waitFor();
    await dialog.getByLabel('Join room password',{exact:true}).fill('secret');await dialog.getByRole('button',{name:'Join room',exact:true}).click();await page.waitForFunction(()=>window.destination==='/play/mindi/room?code=TF2GRQ');assert.equal(await page.locator('dialog[open]').count(),0);
    for(const width of [1280,768,360,390,430]) { await page.setViewportSize({width,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);await shot(page,'rooms-width-'+width); }
    await page.close();
    const noCard=await fixture('?no-card');assert.equal(await noCard.locator('#create-room').getByRole('button',{name:'Create a room',exact:true}).isDisabled(),true);await shot(noCard,'rooms-no-card','app/app-15d-no-room-card');await noCard.close();
    const mobile=await fixture('',390,844);assert.equal(await mobile.getByRole('tab',{name:'Join a room'}).getAttribute('aria-selected'),'true');await shot(mobile,'phone-private-room-join','phone/phone-17-private-room-join');
    await mobile.getByRole('textbox',{name:'Room code',exact:true}).fill('TF2GRQ');await shot(mobile,'phone-code-pasted','phone/phone-17b-code-pasted');await mobile.locator('.room-join-form').getByRole('button',{name:'Join room',exact:true}).click();await mobile.getByRole('dialog').waitFor();await shot(mobile,'phone-room-password','phone/phone-17c-room-password-sheet');await mobile.getByRole('button',{name:'Cancel',exact:true}).click();
    await mobile.getByRole('textbox',{name:'Room code',exact:true}).fill('TF2GRX');await mobile.locator('.room-join-form').getByRole('button',{name:'Join room',exact:true}).click();await mobile.getByRole('alert').waitFor();await shot(mobile,'phone-code-not-found','phone/phone-17e-code-not-found');await mobile.getByRole('tab',{name:'Create a room'}).click();await shot(mobile,'phone-create-room','phone/phone-17d-create-room');await mobile.close();
    const guest=await fixture('?guest');assert.equal(await guest.locator('#create-room button[type=submit]').isDisabled(),true);assert.equal(await guest.locator('.room-join-form button[type=submit]').isDisabled(),true);await guest.close();
    const pasted=await fixture('',390,844);
    await pasted.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=> ' tf2 grq '}}));
    await pasted.getByRole('button',{name:'Paste code',exact:true}).click();await pasted.waitForFunction(()=>document.querySelector('.code input').value==='TF2GRQ');assert.equal(await pasted.locator('.code i.on').count(),6);
    await pasted.locator('.room-invites .inv').first().getByRole('button',{name:'Join',exact:true}).click();await pasted.waitForFunction(()=>window.calls?.some(call=>call[0]==='dismiss'&&call[1]==='iv1'));assert.equal(await pasted.evaluate(()=>window.destination),'/play/mindi/room?code=K7Q2MX');await pasted.close();
    const phoneNoCard=await fixture('?no-card',390,844);await shot(phoneNoCard,'phone-no-room-card');await phoneNoCard.getByRole('link',{name:'Get one'}).click();assert.equal(await phoneNoCard.evaluate(()=>window.destination),'/room-cards');await phoneNoCard.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: private room boards, desktop/phone sizes, game and seats, password validation, invites, recents, clipboard and Room Card gating.');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
