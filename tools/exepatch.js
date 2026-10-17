// build exe patch list: make 1-2 byte UTF-8 chars half-width in text measure/draw
const fs=require('fs');const {Encoder,Decoder,DecoderOptions,Formatter,FormatterSyntax}=require('iced-x86');
const exe=fs.readFileSync(process.argv[2]);const S=require('./sections.json');const t=S.secs.find(s=>s.name==='.text');
const va2off=va=>va-0x140000000-t.va+t.raw;
// [site VA, length of original block]
const sites=[0x140257345,0x140257c1e,0x1402585ce,0x140258783];
const patches=[];const fmt=new Formatter(FormatterSyntax.Masm);
for(const va of sites){const off=va2off(va);const orig=exe.subarray(off,off+24);
 const dec=new Decoder(64,orig,DecoderOptions.None);dec.ip=BigInt(va);const ins=[];while(ins.length<6){ins.push(dec.decode());}
 // expect: cmp X,7F ; setbe A ; [mov [rbp+30h],r8b] ; jbe END ; cmp X,0DF ; ja L3
 let i=0;const cmp1=ins[i++];const setbe=ins[i++];let mov=null;if(fmt.format(ins[i]).startsWith('mov'))mov=ins[i++];const jbe=ins[i++];const cmp2=ins[i++];const ja=ins[i++];
 const txt=[cmp1,setbe,mov,jbe,cmp2,ja].filter(Boolean).map(x=>fmt.format(x));
 if(!/,7Fh$/.test(txt[0])||!txt[1].startsWith('setbe')||!txt[mov?3:2].startsWith('jbe')||!/,0DFh$/.test(txt[mov?4:3])||!txt[mov?5:4].startsWith('ja'))throw new Error('unexpected code at '+va.toString(16)+': '+txt.join('; '));
 const end=Number(ja.ip)+ja.length;const blockLen=end-va;
 // new order: cmp X,0DF ; setbe A ; [mov] ; ja L3 ; cmp X,7F ; jbe END
 const b=[];const take=x=>[...exe.subarray(va2off(Number(x.ip)),va2off(Number(x.ip))+x.length)];
 const c2=take(cmp1);c2[c2.length-1]=0xDF;b.push(...c2);b.push(...take(setbe));if(mov)b.push(...take(mov));
 const jaTarget=Number(ja.nearBranchTarget),jbeTarget=Number(jbe.nearBranchTarget);
 let pos=va+b.length;b.push(0x77,(jaTarget-(pos+2))&0xff);pos+=2;
 b.push(...take(cmp1));pos+=cmp1.length;b.push(0x76,(jbeTarget-(pos+2))&0xff);
 if(b.length!==blockLen)throw new Error('size mismatch');
 const r1=jaTarget-(va+b.length-cmp1.length-4)-0; // sanity on rel8 ranges
 const origBytes=exe.subarray(va2off(va),va2off(va)+blockLen);
 patches.push({va:va.toString(16),off:va2off(va),orig:origBytes.toString('hex'),new:Buffer.from(b).toString('hex')});
 // disasm new
 const d2=new Decoder(64,Buffer.from(b),DecoderOptions.None);d2.ip=BigInt(va);const out=[];while(d2.canDecode)out.push(fmt.format(d2.decode()));console.log(va.toString(16),'|',txt.join('; '),'\n   =>',out.join('; '));}
fs.writeFileSync(process.argv[3],JSON.stringify(patches,null,1));
