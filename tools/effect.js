// Turn coverage mask into game-style RGBA cell
function plain(cov,w,h){const o=Buffer.alloc(w*h*4);for(let i=0;i<w*h;i++){o[i*4]=o[i*4+1]=o[i*4+2]=255;o[i*4+3]=cov[i];}return o;}
// white fill, dark outline (~2px, a=140, rgb=115), glow fading 27/px; colour = 255-alpha outside core
function outlined(cov,w,h,{ol=2.2,glowA=147,fall=27}={}){
 const pts=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(cov[y*w+x]>=128)pts.push([x,y]);
 const o=Buffer.alloc(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let d=1e9;for(const [px,py] of pts){const dd=(px-x)**2+(py-y)**2;if(dd<d)d=dd;}d=Math.sqrt(d);
  let ao=d<=ol?140:Math.max(0,glowA-(d-ol)*fall);if(ao>140)ao=140;const co=255-ao;
  const M=cov[y*w+x]/255;const a=M*255+(1-M)*ao;const c=a>0?(M*255*255+(1-M)*ao*co)/a:255;
  const i=(y*w+x)*4;o[i]=o[i+1]=o[i+2]=Math.round(c);o[i+3]=Math.round(a);}
 return o;}
module.exports={plain,outlined};
