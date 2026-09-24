const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve('artifacts/gameplay-test/cut-reference');
async function run(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    for(const name of ['a','b']){
      const file=`C:/Users/Sayyu/Downloads/${name}_Create_an_8-second_c.mp4`;
      const result=await page.evaluate(async data=>{
        const video=document.createElement('video');video.muted=true;video.preload='auto';
        const ready=new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('Video could not be decoded'));});
        video.src='data:video/mp4;base64,'+data;await ready;
        const width=480,height=Math.round(width*video.videoHeight/video.videoWidth);
        const sheet=document.createElement('canvas');sheet.width=width*3;sheet.height=(height+26)*3;
        const ctx=sheet.getContext('2d');ctx.fillStyle='#10151b';ctx.fillRect(0,0,sheet.width,sheet.height);
        for(let i=0;i<9;i++){
          const time=Math.min(video.duration-.05,i*video.duration/9+.03);
          await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=time;});
          const x=i%3*width,y=Math.floor(i/3)*(height+26);
          ctx.drawImage(video,x,y,width,height);ctx.fillStyle='white';ctx.font='16px sans-serif';ctx.fillText(time.toFixed(2)+'s',x+8,y+height+19);
        }
        return {width:video.videoWidth,height:video.videoHeight,duration:video.duration,png:sheet.toDataURL('image/png').split(',')[1]};
      },fs.readFileSync(file).toString('base64'));
      fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(result.png,'base64'));
      console.log(name,JSON.stringify({width:result.width,height:result.height,duration:result.duration}));
    }
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
