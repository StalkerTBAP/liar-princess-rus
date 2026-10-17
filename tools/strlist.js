// stringlist.dat -> JSON: node strlist.js <in.dat> <out.json>
const fs=require('fs');const b=fs.readFileSync(process.argv[2]);
const n=b.readUInt32LE(0),rs=b.readUInt32LE(4),so=b.readUInt32LE(8),ho=b.readUInt32LE(12);
const cols=(rs/8);const rows=[];
const str=o=>{const s=so+o;return b.toString('utf8',s,b.indexOf(0,s));};
for(let i=0;i<n;i++){const o=ho+i*rs;const r={id:Number(b.readBigUInt64LE(o))};for(let c=1;c<cols-1;c++)r['c'+c]=str(Number(b.readBigUInt64LE(o+c*8)));rows.push(r);}
fs.writeFileSync(process.argv[3],JSON.stringify({n,rs,so,ho,rows},null,1));
