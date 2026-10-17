// NMPL database table (.dat): header {rows,rowSize,strOff,dataOff}, u64 column types (1=string), rows of u64, utf8 string pool
const fs=require('fs');
function load(file){const b=fs.readFileSync(file);const rows=b.readUInt32LE(0),rs=b.readUInt32LE(4),so=b.readUInt32LE(8),ho=b.readUInt32LE(12);
 if(rs%8||(ho-0x10)/8<rs/8)return null;const cols=rs/8;const types=[];for(let c=0;c<cols;c++)types.push(Number(b.readBigUInt64LE(0x10+c*8)));
 const data=[];for(let r=0;r<rows;r++){const row=[];for(let c=0;c<cols;c++){const v=b.readBigUInt64LE(ho+r*rs+c*8);
  if(types[c]===1){const s=so+Number(v);row.push(b.toString('utf8',s,b.indexOf(0,s)));}else row.push(v);}data.push(row);}
 return {file,b,rows,rs,so,ho,cols,types,data,tail:b.slice(so)};}
function save(t,file){const pool=[];const map=new Map();let size=0;const enc=s=>{if(map.has(s))return map.get(s);const o=size;const buf=Buffer.from(s+'\0','utf8');pool.push(buf);size+=buf.length;map.set(s,o);return o;};
 const head=Buffer.from(t.b.slice(0,t.so));
 t.data.forEach((row,r)=>row.forEach((v,c)=>{head.writeBigUInt64LE(t.types[c]===1?BigInt(enc(v)):v,t.ho+r*t.rs+c*8);}));
 const out=Buffer.concat([head,...pool]);fs.writeFileSync(file,out);}
module.exports={load,save};
