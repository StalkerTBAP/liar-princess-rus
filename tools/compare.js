// node compare.js <font.bin> '<cfg>' out.png : game Latin vs rendered Latin vs rendered Cyrillic
const F=require('./font.js'),R=require('./render.js'),E=require('./effect.js'),png=require('./png.js'),fs=require('fs');
const f=F.load(process.argv[2]);const cfg=JSON.parse(process.argv[3]);const W=f.cellW,H=f.cellH;
const lat='HxonBpdlmAgk',cyr='АБВГДЖЗИЙЛПФЦЧШЩЪЫЬЭЮЯбвгджзийклмнптфцчшщъыьэюяЁё«»—№';
const r=R.render(cfg,lat+cyr,W,H);const n=Math.max(lat.length,24);const rows=[[...lat].map(c=>F.readCell(f,f.glyphs.find(g=>g.code===F.utf8code(c)).idx)),[...lat].map(c=>fx(r[c]))];
function fx(cov){return cfg.effect==='outlined'?E.outlined(cov,W,H):E.plain(cov,W,H);}
const cy=[...cyr];for(let i=0;i<cy.length;i+=n)rows.push(cy.slice(i,i+n).map(c=>fx(r[c])));
const IW=n*W*0.75|0,IH=rows.length*H;const img=Buffer.alloc(IW*IH);
rows.forEach((row,ri)=>row.forEach((cell,ci)=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++){const X=Math.round(ci*W*0.75+x);if(X>=IW)continue;const p=(y*W+x)*4;const v=Math.round(cell[p]*cell[p+3]/255);const q=(ri*H+y)*IW+X;img[q]=Math.max(img[q],v);}}));
fs.writeFileSync(process.argv[4],png.write(IW,IH,img,1));
