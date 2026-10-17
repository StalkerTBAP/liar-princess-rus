// Add Cyrillic glyphs to an NMPL font. patchFont(inFile,outFile,cfg)
const F=require('./font.js'),R=require('./render.js'),E=require('./effect.js');
const CYR='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяЁё«»—№';
const LOOK={А:'A',В:'B',Е:'E',К:'K',М:'M',Н:'H',О:'O',Р:'P',С:'C',Т:'T',Х:'X',а:'a',е:'e',о:'o',р:'p',с:'c',у:'y',х:'x'};
function inkWidth(cell,W,H){let mn=1e9,mx=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(cell[(y*W+x)*4+3]>250){mn=Math.min(mn,x);mx=Math.max(mx,x);}return mx<0?0:mx-mn+1;}
function patchFont(inFile,outFile,cfg){const f=F.load(inFile);const W=f.cellW,H=f.cellH;
 const byCode=new Map(f.glyphs.map(g=>[g.code,g]));
 // metric fit from ASCII letters: w = a*ink + b ; centre = median(lsb + w/2)
 const pts=[],cs=[];for(const g of f.glyphs){if(!(g.code>=0x41&&g.code<=0x5a||g.code>=0x61&&g.code<=0x7a))continue;pts.push([inkWidth(F.readCell(f,g.idx),W,H),g.m[1]]);cs.push(g.m[0]+g.m[1]/2);}
 let sx=0,sy=0,sxx=0,sxy=0;for(const [x,y] of pts){sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;}const N=pts.length;const a=(N*sxy-sx*sy)/(N*sxx-sx*sx),b=(sy-a*sx)/N;
 cs.sort((p,q)=>p-q);const C=cs[cs.length>>1];
 let next=Math.max(...f.glyphs.map(g=>g.idx))+1;const cap=f.perRow*Math.floor(f.h/H);
 const todo=[...CYR].filter(ch=>!byCode.has(F.utf8code(ch)));
 const toRender=todo.filter(ch=>!(LOOK[ch]&&byCode.has(LOOK[ch].charCodeAt(0))));
 const ov={...(cfg.override||{})};for(const c of toRender)if(Buffer.byteLength(c)>2)ov[c]={...(ov[c]||{}),centerX:W/2};const rendered=toRender.length?R.render(cfg,toRender.filter(c=>!ov[c]).join(''),W,H):{};for(const c of toRender)if(ov[c])Object.assign(rendered,R.render({...cfg,...ov[c]},c,W,H));
 for(const ch of todo){if(next>=cap)throw new Error('font atlas full');let rgba,m;
  const src=LOOK[ch]&&byCode.get(LOOK[ch].charCodeAt(0));
  if(src){rgba=F.readCell(f,src.idx);m=Buffer.from(src.m);}
  else{const cov=rendered[ch];rgba=cfg.effect==='outlined'?E.outlined(cov,W,H):E.plain(cov,W,H);
   const full=Buffer.byteLength(ch)>2;const w=Math.max(1,Math.min(255,Math.round(a*inkWidth(rgba,W,H)+b)));m=Buffer.from([Math.max(0,Math.round((full?2*C:C)-w/2)),w,0,0]);}
  F.writeCell(f,next,rgba);f.glyphs.push({idx:next,code:F.utf8code(ch),m,tail:f.glyphs[0].tail});next++;}
 F.save(f,outFile);return {added:todo.length,fit:[a.toFixed(2),b.toFixed(2),C]};}
const CFG={
 font0:{font:'Candara',style:'Italic',size:60,scaleX:0.9,maxW:29,centerX:22,baseY:65.5,effect:'outlined',override:{'т':{style:'Regular',shear:0.2}}},
 font1:{font:'MS Gothic',size:88,scaleX:1,centerX:22,baseY:66.5},
 font2:{font:'Bahnschrift Light Condensed',size:62,scaleX:1,maxW:23,centerX:16,baseY:52.5}};
module.exports={patchFont,CFG,CYR};
