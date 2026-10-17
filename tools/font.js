// NMPL font (.bin) reader/writer
const fs=require('fs'),lz=require('./lz4.js'),bc=require('./bc7.js');
function load(file){const b=fs.readFileSync(file);const hdr=b.slice(0,0x28);const n=b.readUInt32LE(0x18);
 const cellW=b.readUInt16LE(4),cellH=b.readUInt16LE(6);const glyphs=[];
 for(let i=0;i<n;i++){const o=0x28+i*24;glyphs.push({idx:b.readUInt32LE(o),code:b.readUInt32LE(o+8),m:b.slice(o+16,o+20),tail:b.readUInt32LE(o+20)});}
 const e=0x10+b.readUInt32LE(0xc);const post=b.slice(e,e+16);const t=e+16;const texHdr=b.slice(t,t+0x80);
 const w=texHdr.readUInt32LE(0x18),h=texHdr.readUInt32LE(0x1c);const y=t+texHdr.readUInt32LE(0x34);
 if(b.toString('latin1',y,y+8)!=='YKCMP_V1'||b.readUInt32LE(y+8)!==9)throw new Error('unexpected texture compression');
 const raw=lz.decompress(b.slice(y+20,y+b.readUInt32LE(y+12)),b.readUInt32LE(y+16));
 return {file,hdr,glyphs,post,texHdr,w,h,raw,cellW,cellH,perRow:Math.floor(w/cellW)};}
function save(f,file){f.glyphs.sort((a,b)=>a.code-b.code);const n=f.glyphs.length;
 const tbl=Buffer.alloc(n*24);f.glyphs.forEach((g,i)=>{const o=i*24;tbl.writeUInt32LE(g.idx,o);tbl.writeUInt32LE(g.code,o+8);g.m.copy(tbl,o+16);tbl.writeUInt32LE(g.tail,o+20);});
 const hdr=Buffer.from(f.hdr);hdr.writeUInt32LE(n*24+0x18,0xc);hdr.writeUInt32LE(n,0x18);
 const comp=lz.compress(f.raw);const yk=Buffer.alloc(20);yk.write('YKCMP_V1',0,'latin1');yk.writeUInt32LE(9,8);yk.writeUInt32LE(comp.length+20,12);yk.writeUInt32LE(f.raw.length,16);
 const th=Buffer.from(f.texHdr);th.writeUInt32LE(comp.length+20,0x30);const tex=Buffer.concat([th,yk,comp]);
 const post=Buffer.from(f.post);post.writeUInt32LE(tex.length,4);
 fs.writeFileSync(file,Buffer.concat([hdr,tbl,post,tex]));}
const BW=w=>w/4;
function getBlockRGBA(f,bx,by,out){bc.decodeBlock(f.raw.subarray((by*BW(f.w)+bx)*16,(by*BW(f.w)+bx)*16+16),out);}
function readCell(f,idx){const cx=(idx%f.perRow)*f.cellW,cy=Math.floor(idx/f.perRow)*f.cellH;const out=Buffer.alloc(f.cellW*f.cellH*4);const blk=Buffer.alloc(64);
 for(let by=0;by<f.cellH/4;by++)for(let bx=0;bx<f.cellW/4;bx++){getBlockRGBA(f,(cx>>2)+bx,(cy>>2)+by,blk);for(let y=0;y<4;y++)blk.copy(out,((by*4+y)*f.cellW+bx*4)*4,y*16,y*16+16);}return out;}
function writeCell(f,idx,rgba){const cx=(idx%f.perRow)*f.cellW,cy=Math.floor(idx/f.perRow)*f.cellH;const blk=Buffer.alloc(64);
 for(let by=0;by<f.cellH/4;by++)for(let bx=0;bx<f.cellW/4;bx++){for(let y=0;y<4;y++)rgba.copy(blk,y*16,((by*4+y)*f.cellW+bx*4)*4,((by*4+y)*f.cellW+bx*4+4)*4);
  let empty=true;for(let i=3;i<64;i+=4)if(blk[i]){empty=false;break;}
  const enc=empty?Buffer.from('10ffffff3f0000000000000000000000','hex'):bc.encodeBlock6(blk);
  enc.copy(f.raw,(((cy>>2)+by)*BW(f.w)+(cx>>2)+bx)*16);}}
const utf8code=ch=>parseInt(Buffer.from(ch,'utf8').toString('hex'),16);
module.exports={load,save,readCell,writeCell,utf8code};
