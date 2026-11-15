// Uso: node render.js saida_dir fps t0 t1 [passo_worker  total_workers]
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
(async()=>{
  const [,,out,fps,t0,t1,wi='0',wn='1']=process.argv;fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:720,height:1280}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+path.resolve(__dirname,'index.html'));
  const f0=Math.round(t0*fps),f1=Math.round(t1*fps);
  for(let f=f0+ +wi;f<f1;f+=+wn){
    await p.evaluate(t=>window.render(t),f/fps);
    await p.locator('canvas').screenshot({path:`${out}/f${String(f).padStart(6,'0')}.jpg`,type:'jpeg',quality:92});
  }
  if(errs.length)console.error('ERROS',errs.slice(0,3));await b.close();
})();
