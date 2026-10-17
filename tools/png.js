// minimal PNG writer/reader (8-bit gray or RGBA)
const zlib=require('zlib');
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0};
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);}
function write(w,h,data,ch){const ct={1:0,2:4,3:2,4:6}[ch];const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=ct;
 const raw=Buffer.alloc((w*ch+1)*h);for(let y=0;y<h;y++){raw[y*(w*ch+1)]=0;data.copy(raw,y*(w*ch+1)+1,y*w*ch,(y+1)*w*ch);}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
function read(buf){let p=8,w,h,ct,idat=[];while(p<buf.length){const l=buf.readUInt32BE(p),t=buf.toString('latin1',p+4,p+8),d=buf.slice(p+8,p+8+l);
 if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];if(d[8]!==8)throw'bitdepth'}if(t==='IDAT')idat.push(d);p+=12+l;}
 const ch={0:1,4:2,2:3,6:4}[ct];const raw=zlib.inflateSync(Buffer.concat(idat));const s=w*ch,out=Buffer.alloc(s*h);
 for(let y=0;y<h;y++){const f=raw[y*(s+1)],r=raw.slice(y*(s+1)+1,(y+1)*(s+1));for(let x=0;x<s;x++){const a=x>=ch?out[y*s+x-ch]:0,b=y?out[(y-1)*s+x]:0,c=x>=ch&&y?out[(y-1)*s+x-ch]:0;let v=r[x];
  if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}out[y*s+x]=v&255;}}
 return {w,h,ch,data:out};}
module.exports={write,read};
