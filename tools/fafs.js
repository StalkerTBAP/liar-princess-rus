// FAFULLFS archive reader: node fafs.js <data.dat> <outdir> [regex]
const fs=require('fs'),path=require('path');
const [,,arc,out,re]=process.argv;
const fd=fs.openSync(arc,'r');const h=Buffer.alloc(0x28);fs.readSync(fd,h,0,0x28,0);
const count=h.readUInt32LE(8),nameOff=Number(h.readBigUInt64LE(0x10)),nameSize=Number(h.readBigUInt64LE(0x18)),entOff=Number(h.readBigUInt64LE(0x20));
const names=Buffer.alloc(nameSize);fs.readSync(fd,names,0,nameSize,nameOff);
const ents=Buffer.alloc(count*48);fs.readSync(fd,ents,0,ents.length,entOff);
const list=[];
for(let i=0;i<count;i++){const o=i*48;const no=Number(ents.readBigUInt64LE(o+8));const name=names.toString('latin1',no,names.indexOf(0,no));
 list.push({i,name,hash:ents.readBigUInt64LE(o).toString(16),size:Number(ents.readBigUInt64LE(o+24)),off:Number(ents.readBigUInt64LE(o+32)),c:ents.readBigUInt64LE(o+16).toString(16),t:ents.readUInt32LE(o+40),g:ents.readUInt32LE(o+44)});}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'_list.json'),JSON.stringify(list,null,1));
if(re){const r=new RegExp(re);for(const e of list)if(r.test(e.name)){const b=Buffer.alloc(e.size);fs.readSync(fd,b,0,e.size,e.off);const p=path.join(out,e.name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);}}
console.log('count',count);
