// Build russifier package: node build.js <exDir> <trDir> <pkgDir>
const fs=require('fs'),path=require('path');const T=require('./table.js'),P=require('./fontpatch.js'),F=require('./font.js');
const [,,EX,TR,PKG]=process.argv;const FILES=path.join(PKG,'files');fs.rmSync(FILES,{recursive:true,force:true});
const put=(rel)=>{const p=path.join(FILES,rel);fs.mkdirSync(path.dirname(p),{recursive:true});return p;};
// wrap text to English line geometry unless translator put explicit breaks
function wrap(ru,en){const nl=en.includes('\r\n')?'\r\n':'\n';const paras=ru.split(/\r?\n/);
 if(!/\n/.test(en))return paras.join(nl);
 const max=Math.max(...en.split(/\r?\n/).map(l=>l.trimEnd().length));const lim=Math.max(20,Math.round(max*1.08));
 const out=[];for(const p of paras){let cur='';for(const w of p.split(/ +/)){if(cur&&(cur+' '+w).length>lim){out.push(cur);cur=w;}else cur=cur?cur+' '+w:w;}out.push(cur);}
 return out.join(nl);}
const used=new Set();let stats=[];
for(const f of fs.readdirSync(TR).filter(x=>x.startsWith('ru_'))){const name=f.slice(3).replace('.json','.dat');
 const ru=JSON.parse(fs.readFileSync(path.join(TR,f),'utf8'));const en=JSON.parse(fs.readFileSync(path.join(TR,'en_'+f.slice(3)),'utf8'));
 const t=T.load(path.join(EX,'database',name));let n=0;
 for(const [k,v] of Object.entries(ru)){if(v==null||v==='')continue;const [r,c]=k.split(':').map(Number);
  if(!t.data[r]||t.types[c]!==1)throw new Error(name+' bad key '+k);
  const s=wrap(v.replace(/ +— +/g,"—").replace(/ +—$/gm,"—"),en[k]??t.data[r][c]);t.data[r][c]=s;for(const ch of s)used.add(ch);n++;}
 T.save(t,put('database/'+name));stats.push(name+': '+n+'/'+Object.keys(en).length);}
const cfgOf={font0_en:'font0',font1_en:'font1',font1:'font1',font2_en:'font2'};
for(const [fn,c] of Object.entries(cfgOf))P.patchFont(path.join(EX,'font',fn+'.bin'),put('font/'+fn+'.bin'),P.CFG[c]);
// check every used char exists in font0_en
const f0=F.load(path.join(FILES,'font/font0_en.bin'));const have=new Set(f0.glyphs.map(g=>g.code));
const missing=[...used].filter(ch=>ch>' '&&!/[Ⓐ-ⓩ]|🄫/u.test(ch)&&!have.has(F.utf8code(ch)));
console.log(stats.join('\n'));if(missing.length)console.log('MISSING GLYPHS:',missing.join(' '));
