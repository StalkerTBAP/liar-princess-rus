// disassemble .text of a PE64 into lines "VA  bytes  instr"
const fs=require('fs');const {Decoder,DecoderOptions,Formatter,FormatterSyntax}=require('iced-x86');
const b=fs.readFileSync(process.argv[2]);const pe=b.readUInt32LE(0x3c);const nsec=b.readUInt16LE(pe+6),optSz=b.readUInt16LE(pe+20);
const imageBase=b.readBigUInt64LE(pe+24+24);let secOff=pe+24+optSz;const secs=[];
for(let i=0;i<nsec;i++){const o=secOff+i*40;secs.push({name:b.toString('latin1',o,o+8).replace(/\0/g,''),va:b.readUInt32LE(o+12),vsz:b.readUInt32LE(o+8),raw:b.readUInt32LE(o+20),rsz:b.readUInt32LE(o+16)});}
console.error(imageBase.toString(16),secs.map(s=>s.name+' '+s.va.toString(16)+' '+s.rsz.toString(16)).join(' | '));
fs.writeFileSync('sections.json',JSON.stringify({imageBase:imageBase.toString(),secs}));
const t=secs.find(s=>s.name==='.text');const code=b.subarray(t.raw,t.raw+t.rsz);
const dec=new Decoder(64,code,DecoderOptions.None);dec.ip=imageBase+BigInt(t.va);const fmt=new Formatter(FormatterSyntax.Masm);
const out=fs.openSync(process.argv[3],'w');let buf=[];
while(dec.canDecode){const ins=dec.decode();buf.push(ins.ip.toString(16)+'  '+fmt.format(ins));if(buf.length>50000){fs.writeSync(out,buf.join('\n')+'\n');buf=[];}ins.free();}
fs.writeSync(out,buf.join('\n')+'\n');
