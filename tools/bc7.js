// BC7 decoder (all modes) + mode-6 encoder for single blocks
const P2=[0xcccc,0x8888,0xeeee,0xecc8,0xc880,0xfeec,0xfec8,0xec80,0xc800,0xffec,0xfe80,0xe800,0xffe8,0xff00,0xfff0,0xf000,0xf710,0x008e,0x7100,0x08ce,0x008c,0x7310,0x3100,0x8cce,0x088c,0x3110,0x6666,0x366c,0x17e8,0x0ff0,0x718e,0x399c,0xaaaa,0xf0f0,0x5a5a,0x33cc,0x3c3c,0x55aa,0x9696,0xa55a,0x73ce,0x13c8,0x324c,0x3bdc,0x6996,0xc33c,0x9966,0x0660,0x0272,0x04e4,0x4e40,0x2720,0xc936,0x936c,0x39c6,0x639c,0x9336,0x9cc6,0x817e,0xe718,0xccf0,0x0fcc,0x7744,0xee22];
const P3=["0011001102210222","0001001102211222","0000200122112211","0222002200110111","0000000011221122","0011001100220022","0022002211111111","0011001122112211","0000000011112222","0000111111112222","0000111122222222","0012001200120012","0112011201120112","0122012201220122","0011011211221222","0011200122002220","0001001101121122","0111001120012200","0000112211221122","0022002200221111","0111011102220222","0001000122212221","0000001101220122","0000110022102210","0122012200110000","0012001211222222","0110122112210110","0000011012211221","0022110211020022","0110011020022222","0011012201220011","0000200022112221","0000000211221222","0222002200120011","0011001200220222","0120012001200120","0000111122220000","0120120120120120","0120201212010120","0011220011220011","0011112222000011","0101010122222222","0000000021212121","0022112200221122","0022001100220011","0220122102201221","0101222222220101","0000212121212121","0101010101012222","0222011102220111","0002111200021112","0000211221122112","0222011101110222","0002111211120002","0110011001102222","0000000021122112","0110011022222222","0022001100110022","0022112211220022","0000000000002112","0002000100020001","0222122202221222","0101222222222222","0111201122012220"].map(s=>[...s].map(Number));
const A2=[15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,2,8,2,2,8,8,15,2,8,2,2,8,8,2,2,15,15,6,8,2,8,15,15,2,8,2,2,2,15,15,6,6,2,6,8,15,15,2,2,15,15,15,15,15,2,2,15];
const A3a=[3,3,15,15,8,3,15,15,8,8,6,6,6,5,3,3,3,3,8,15,3,3,6,10,5,8,8,6,8,5,15,15,8,15,3,5,6,10,8,15,15,3,15,5,15,15,15,15,3,15,5,5,5,8,5,10,5,10,8,13,15,12,3,3];
const A3b=[15,8,8,3,15,15,3,8,15,15,15,15,15,15,15,8,15,8,15,3,15,8,15,8,3,15,6,10,15,15,10,8,15,3,15,10,10,8,9,10,6,15,8,15,3,6,6,8,15,3,15,15,15,15,15,15,15,15,15,15,3,15,15,8];
const W={2:[0,21,43,64],3:[0,9,18,27,37,46,55,64],4:[0,4,9,13,17,21,26,30,34,38,43,47,51,55,60,64]};
const M=[{ns:3,pb:4,cb:4,ab:0,ep:1,sp:0,ib:3,ib2:0},{ns:2,pb:6,cb:6,ab:0,ep:0,sp:1,ib:3,ib2:0},{ns:3,pb:6,cb:5,ab:0,ep:0,sp:0,ib:2,ib2:0},{ns:2,pb:6,cb:7,ab:0,ep:1,sp:0,ib:2,ib2:0},
{ns:1,pb:0,cb:5,ab:6,ep:0,sp:0,ib:2,ib2:3,rb:2,isb:1},{ns:1,pb:0,cb:7,ab:8,ep:0,sp:0,ib:2,ib2:2,rb:2},{ns:1,pb:0,cb:7,ab:7,ep:1,sp:0,ib:4,ib2:0},{ns:2,pb:6,cb:5,ab:5,ep:1,sp:0,ib:2,ib2:0}];
function decodeBlock(b,out){ // out: 64 bytes RGBA
 let pos=0;const bit=n=>{let v=0;for(let i=0;i<n;i++){v|=((b[(pos>>3)]>>(pos&7))&1)<<i;pos++;}return v;};
 let mode=0;while(mode<8&&!bit(1))mode++;if(mode>=8){out.fill(0);return;}
 const m=M[mode];const part=bit(m.pb);const rot=m.rb?bit(m.rb):0;const isb=m.isb?bit(1):0;
 const ne=m.ns*2;const ep=[];for(let i=0;i<ne;i++)ep.push([0,0,0,255]);
 for(let c=0;c<3;c++)for(let i=0;i<ne;i++)ep[i][c]=bit(m.cb);
 if(m.ab)for(let i=0;i<ne;i++)ep[i][3]=bit(m.ab);
 let cb=m.cb,ab=m.ab;
 if(m.ep){for(let i=0;i<ne;i++){const p=bit(1);for(let c=0;c<3;c++)ep[i][c]=(ep[i][c]<<1)|p;if(ab)ep[i][3]=(ep[i][3]<<1)|p;}cb++;if(ab)ab++;}
 if(m.sp){for(let s=0;s<m.ns;s++){const p=bit(1);for(const i of [s*2,s*2+1])for(let c=0;c<3;c++)ep[i][c]=(ep[i][c]<<1)|p;}cb++;}
 const ex=(v,n)=>{v<<=8-n;return v|(v>>n);};
 for(const e of ep){for(let c=0;c<3;c++)e[c]=ex(e[c],cb);e[3]=ab?ex(e[3],ab):255;}
 const sub=i=>m.ns===1?0:m.ns===2?((P2[part]>>i)&1):P3[part][i];
 const anchor=(s)=>s===0?0:m.ns===2?A2[part]:(s===1?A3a[part]:A3b[part]);
 const isAnchor=i=>{const s=sub(i);return anchor(s)===i;};
 const idx=[],idx2=[];for(let i=0;i<16;i++)idx.push(bit(m.ib-((i===0||(m.ns>1&&isAnchor(i)))?1:0)));
 if(m.ib2)for(let i=0;i<16;i++)idx2.push(bit(m.ib2-(i===0?1:0)));
 for(let i=0;i<16;i++){const s=sub(i);const e0=ep[s*2],e1=ep[s*2+1];
  let ci=idx[i],ai=m.ib2?idx2[i]:idx[i],cbits=m.ib,abits=m.ib2||m.ib;if(isb){[ci,ai]=[ai,ci];[cbits,abits]=[abits,cbits];}
  const wc=W[cbits][ci],wa=W[abits][ai];const px=[0,0,0,0];
  for(let c=0;c<3;c++)px[c]=((64-wc)*e0[c]+wc*e1[c]+32)>>6;px[3]=((64-wa)*e0[3]+wa*e1[3]+32)>>6;
  if(rot){const t=px[3];px[3]=px[rot-1];px[rot-1]=t;}
  out.set(px,i*4);}}
function decode(data,w,h){const out=Buffer.alloc(w*h*4);const blk=Buffer.alloc(64);const bw=w/4;
 for(let by=0;by<h/4;by++)for(let bx=0;bx<bw;bx++){decodeBlock(data.subarray((by*bw+bx)*16,(by*bw+bx)*16+16),blk);
  for(let y=0;y<4;y++)blk.copy(out,((by*4+y)*w+bx*4)*4,y*16,y*16+16);}return out;}
// mode 6 encoder: px = 64-byte RGBA. Exhaustive-ish endpoint search on PCA line.
function encodeBlock6(px){
 const p=[];for(let i=0;i<16;i++)p.push([px[i*4],px[i*4+1],px[i*4+2],px[i*4+3]]);
 const mean=[0,0,0,0];for(const q of p)for(let c=0;c<4;c++)mean[c]+=q[c]/16;
 // principal axis via power iteration
 const cov=[...Array(4)].map(()=>[0,0,0,0]);for(const q of p)for(let a=0;a<4;a++)for(let b=0;b<4;b++)cov[a][b]+=(q[a]-mean[a])*(q[b]-mean[b]);
 let ax=[1,1,1,1];for(let it=0;it<8;it++){const n=[0,0,0,0];for(let a=0;a<4;a++)for(let b=0;b<4;b++)n[a]+=cov[a][b]*ax[b];const l=Math.hypot(...n)||1;ax=n.map(v=>v/l);}
 let mn=1e9,mx=-1e9;for(const q of p){const t=q.reduce((s,v,c)=>s+(v-mean[c])*ax[c],0);mn=Math.min(mn,t);mx=Math.max(mx,t);}
 let e0=mean.map((v,c)=>v+ax[c]*mn),e1=mean.map((v,c)=>v+ax[c]*mx);
 let best=null;
 for(const p0 of [0,1])for(const p1 of [0,1]){
  const q=(e,pb)=>e.map(v=>Math.max(0,Math.min(127,Math.round((Math.max(0,Math.min(255,v))-pb)/2))));
  const a=q(e0,p0),b=q(e1,p1);const A=a.map(v=>(v<<1)|p0),B=b.map(v=>(v<<1)|p1);
  const pal=W[4].map(w=>A.map((v,c)=>((64-w)*v+w*B[c]+32)>>6));
  let err=0;const ind=[];for(const s of p){let bi=0,be=1e18;for(let k=0;k<16;k++){let d=0;for(let c=0;c<4;c++){const x=s[c]-pal[k][c];d+=x*x;}if(d<be){be=d;bi=k;}}ind.push(bi);err+=be;}
  if(!best||err<best.err)best={err,a,b,p0,p1,ind};}
 let {a,b,p0,p1,ind}=best;
 if(ind[0]&8){[a,b]=[b,a];[p0,p1]=[p1,p0];ind=ind.map(i=>15-i);}
 const out=Buffer.alloc(16);let pos=0;const put=(v,n)=>{for(let i=0;i<n;i++){if((v>>i)&1)out[pos>>3]|=1<<(pos&7);pos++;}};
 put(1<<6,7);for(let c=0;c<4;c++){put(a[c],7);put(b[c],7);}put(p0,1);put(p1,1);
 for(let i=0;i<16;i++)put(ind[i],i===0?3:4);return out;}
module.exports={decode,decodeBlock,encodeBlock6};
