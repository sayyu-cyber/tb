const { chromium } = require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage();const errors=[];const results=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://localhost:3000')?route.continue():route.abort());
 fs.mkdirSync('artifacts/hub',{recursive:true});
 await page.goto('http://localhost:3000/ui-preview/',{waitUntil:'domcontentloaded'});
 await page.locator('#preview-controls').waitFor({timeout:30000});
 for(const screen of ['shop','inventory','friends','leaderboard','admin']){
  await page.locator('#preview-controls').getByRole('button',{name:screen,exact:true}).click();
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(500);
   results.push({screen,width,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth, nestedButtons:document.querySelectorAll('a button').length}))});
   await page.screenshot({path:`artifacts/hub/${screen}-${width}.png`,fullPage:true});
  }
  if(screen==='shop'){
   await page.getByRole('button',{name:'Permanent',exact:true}).click();
   await page.getByRole('textbox',{name:'Search cosmetics'}).fill('Ocean');
   await page.waitForTimeout(300);
   results.push({shopSearch:await page.locator('.cosmetic-shop-card').count()});
   await page.getByRole('textbox',{name:'Search cosmetics'}).fill('zzzzzz');
   results.push({shopEmpty:await page.locator('.cosmetic-shop-card').count()===0});
  }
  if(screen==='inventory'){
   await page.getByRole('checkbox').check();
   results.push({ownedFilter:await page.locator('.inventory-item').count()});
   await page.getByRole('button',{name:'Tables',exact:true}).click();
   await page.screenshot({path:'artifacts/hub/inventory-table-320.png',fullPage:true});
  }
  if(screen==='friends'){
   await page.getByRole('textbox',{name:'Filter friends'}).fill('Aishath');
   results.push({friendsFilter:await page.locator('.friend-roster-row').count()});
  }
  if(screen==='leaderboard'){
   await page.getByRole('textbox',{name:'Search rankings'}).fill('Sayyu');
   results.push({rankSearch:await page.locator('.leaderboard-list > a').count()});
  }
  if(screen==='admin'){
   for(const name of ['Season','Hall of Fame','Shop','Missions','Ranked']){
    await page.getByRole('navigation',{name:'Administration'}).getByRole('button',{name,exact:true}).click();
    await page.waitForTimeout(200);
    results.push({adminTab:name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
    await page.screenshot({path:`artifacts/hub/admin-${name.replaceAll(' ','-')}-320.png`,fullPage:true});
   }
  }
 }
 console.log(JSON.stringify({results,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
