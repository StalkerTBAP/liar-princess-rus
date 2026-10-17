// render glyph coverage via glyphs.ps1
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
function render(cfg,chars,cellW,cellH){const tmp=path.join(os.tmpdir(),'claude','gl_'+process.pid);
 fs.writeFileSync(tmp+'.txt',chars,'utf8');
 execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'glyphs.ps1'),'-out',tmp+'.bin','-font',cfg.font,'-style',cfg.style||'Regular','-size',String(cfg.size),'-scaleX',String(cfg.scaleX||1),'-cellW',String(cellW),'-cellH',String(cellH),'-centerX',String(cfg.centerX),'-baseY',String(cfg.baseY),'-charsFile',tmp+'.txt','-bold',String(cfg.bold||0),'-maxW',String(cfg.maxW||999),'-shear',String(cfg.shear||0)]);
 const b=fs.readFileSync(tmp+'.bin');const res={};[...chars].forEach((c,i)=>res[c]=b.subarray(i*cellW*cellH,(i+1)*cellW*cellH));return res;}
function bbox(a,w,h,t){let q=[999,-1,999,-1];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(a[y*w+x]>t){q[0]=Math.min(q[0],x);q[1]=Math.max(q[1],x);q[2]=Math.min(q[2],y);q[3]=Math.max(q[3],y);}return q;}
module.exports={render,bbox};
