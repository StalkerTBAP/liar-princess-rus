// LZ4 block codec (decompress + simple greedy compressor)
function decompress(src,outSize){const dst=Buffer.alloc(outSize);let s=0,d=0;
 while(s<src.length&&d<outSize){const tok=src[s++];let lit=tok>>4;if(lit===15){let b;do{b=src[s++];lit+=b}while(b===255)}
  src.copy(dst,d,s,s+lit);s+=lit;d+=lit;if(s>=src.length)break;
  const off=src[s]|(src[s+1]<<8);s+=2;let ml=tok&15;if(ml===15){let b;do{b=src[s++];ml+=b}while(b===255)}ml+=4;
  for(let i=0;i<ml;i++,d++)dst[d]=dst[d-off];}
 if(d<outSize)throw new Error("lz4 short "+d);decompress.last=s;return dst;}
function compress(src){const out=[];const H=new Int32Array(1<<16).fill(-1);let anchor=0,i=0;const n=src.length;
 const h=p=>((src.readUInt32LE(p)*2654435761)>>>16)&0xffff;
 const pushLen=(l)=>{while(l>=255){out.push(255);l-=255}out.push(l)};
 while(i+12<n){const k=h(i);const r=H[k];H[k]=i;
  if(r>=0&&i-r<65536&&src.readUInt32LE(r)===src.readUInt32LE(i)){let ml=4;while(i+ml<n-5&&src[r+ml]===src[i+ml])ml++;
   const lit=i-anchor;out.push(((lit>=15?15:lit)<<4)|(ml-4>=15?15:ml-4));if(lit>=15)pushLen(lit-15);
   for(let j=anchor;j<i;j++)out.push(src[j]);const off=i-r;out.push(off&255,off>>8);if(ml-4>=15)pushLen(ml-4-15);
   i+=ml;anchor=i;}else i++;}
 const lit=n-anchor;out.push((lit>=15?15:lit)<<4);if(lit>=15)pushLen(lit-15);for(let j=anchor;j<n;j++)out.push(src[j]);
 return Buffer.from(out);}
module.exports={decompress,compress};
