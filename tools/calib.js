// node calib.js <font.bin> '<json cfg>' : compare rendered Latin vs game glyph core boxes
const F=require('./font.js'),R=require('./render.js');
const f=F.load(process.argv[2]);const cfg=JSON.parse(process.argv[3]);const chars='HxonBpdlmAgk';
const r=R.render(cfg,chars,f.cellW,f.cellH);let out=[];let ws=0,wg=0;
for(const ch of chars){const g=f.glyphs.find(g=>g.code===F.utf8code(ch));const c=F.readCell(f,g.idx);const a=Buffer.alloc(f.cellW*f.cellH);for(let i=0;i<a.length;i++)a[i]=c[i*4+3];
 const t=cfg.thr||250;const qg=R.bbox(a,f.cellW,f.cellH,t),qr=R.bbox(r[ch],f.cellW,f.cellH,cfg.rthr||128);ws+=qr[1]-qr[0];wg+=qg[1]-qg[0];out.push(ch+' g'+qg.join(',')+' r'+qr.join(','));}
console.log(out.join(' | '));console.log('width ratio game/render',(wg/ws).toFixed(3));
