(()=>{
  const state={position:'Infield',size:'11.5″',leather:'Japan Kip',shell:'Black',web:'Black',laces:'Gold',webStyle:'I-web',branding:'',quantity:'',market:'',email:'',notes:''};
  const colors={
    shell:[['Black','#242826'],['Brown','#71472f'],['Tan','#bd9868'],['Red','#8d2928'],['Navy','#253c59']],
    web:[['Black','#242826'],['Brown','#71472f'],['Tan','#bd9868'],['White','#edeae2'],['Red','#8d2928'],['Navy','#253c59']],
    laces:[['Gold','#d4a82c'],['Natural','#d5b583'],['Black','#242826'],['White','#edeae2'],['Red','#b83a35']]
  };
  const names={shell:'Shell',web:'Web',laces:'Laces'};
  let step=0,part='shell',baseImage=null,basePixels=null,scaleInfo=null;
  const q=s=>document.querySelector(s),canvas=q('#glove-preview'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const source=new Image();source.src='img/catalog/infield-black-gold.jpg';
  const paths={
    silhouette:[[128,718],[155,570],[208,395],[300,240],[360,160],[434,78],[520,58],[628,72],[747,128],[848,221],[916,350],[967,474],[962,590],[912,710],[866,824],[783,902],[692,960],[555,985],[390,958],[272,900],[195,838],[145,780]],
    web:[[470,170],[540,118],[675,140],[800,225],[855,335],[820,455],[755,545],[675,500],[600,420],[525,370],[455,330],[430,250]]
  };
  function pathMask(points){const c=document.createElement('canvas');c.width=1000;c.height=1000;const g=c.getContext('2d');g.fillStyle='#fff';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();return g.getImageData(0,0,1000,1000).data}
  const shellMask=pathMask(paths.silhouette),webMask=pathMask(paths.web);
  function isGold(r,g,b){return r>95&&g>55&&r>g*1.20&&g>b*1.22&&(r-g)>22}
  function hexRgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
  function tintPixel(data,i,target,mode){const r=data[i],g=data[i+1],b=data[i+2],lum=(r*.2126+g*.7152+b*.0722)/255,factor=mode==='laces'?.55+lum*.65:.42+lum*.86;for(let k=0;k<3;k++)data[i+k]=Math.min(255,target[k]*factor)}
  function fitImage(){
    if(!baseImage)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));
    canvas.width=w;canvas.height=h;
    const ratio=Math.min(w/baseImage.width,h/baseImage.height),dw=baseImage.width*ratio,dh=baseImage.height*ratio,dx=(w-dw)/2,dy=(h-dh)/2;
    ctx.clearRect(0,0,w,h);ctx.drawImage(baseImage,dx,dy,dw,dh);
    const image=ctx.getImageData(0,0,w,h),final=new ImageData(new Uint8ClampedArray(image.data),w,h);
    const shellColor=hexRgb(colors.shell.find(c=>c[0]===state.shell)[1]),webColor=hexRgb(colors.web.find(c=>c[0]===state.web)[1]),laceColor=hexRgb(colors.laces.find(c=>c[0]===state.laces)[1]);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2];
      if(!image.data[i+3]||(r>238&&g>238&&b>238))continue;
      const ox=Math.floor((x-dx)/dw*baseImage.width),oy=Math.floor((y-dy)/dh*baseImage.height);
      if(ox<0||oy<0||ox>=baseImage.width||oy>=baseImage.height)continue;
      const mx=Math.min(999,Math.floor(ox/baseImage.width*1000)),my=Math.min(999,Math.floor(oy/baseImage.height*1000)),mi=(my*1000+mx)*4;
      if(isGold(r,g,b))tintPixel(final.data,i,laceColor,'laces');
      else if(webMask[mi+3])tintPixel(final.data,i,webColor,'web');
      else if(shellMask[mi+3])tintPixel(final.data,i,shellColor,'shell');
    }
    ctx.putImageData(final,0,0);
    canvas.setAttribute('aria-label',`2D photo preview of baseball glove: ${state.shell} shell, ${state.web} web and ${state.laces} laces`)
  }
  source.onload=()=>{baseImage=source;fitImage()};source.onerror=()=>{q('.photo-frame').textContent='Glove photo could not be loaded.'};
  window.addEventListener('resize',fitImage);
  function renderSwatches(){const holder=q('#swatches');holder.replaceChildren();for(const [name,color] of colors[part]){const b=document.createElement('button');b.type='button';b.className='swatch';b.style.backgroundColor=color;b.title=name;b.setAttribute('aria-label',`${name} ${names[part].toLowerCase()}`);b.setAttribute('aria-pressed',state[part]===name);b.addEventListener('click',()=>{state[part]=name;renderSwatches();q('#color-name').textContent=name;fitImage();summary()});holder.appendChild(b)}q('#active-part-name').textContent=names[part];q('#color-name').textContent=state[part]}
  function summary(){const list=q('#summary-list');list.replaceChildren();[['position',state.position],['size',state.size],['leather',state.leather],['shell',state.shell],['web',state.web],['laces',state.laces],['webStyle',state.webStyle]].forEach(([k,v])=>{const e=document.createElement('span');e.className='chip';e.textContent=v;list.appendChild(e)});q('#preview-label').textContent=`Back view · ${state.position} · ${state.size}`;const review=q('#review-summary');if(review){review.replaceChildren();[['',`${state.position} · ${state.size} · ${state.leather}`],['',`Shell: ${state.shell} · Web: ${state.web} · Laces: ${state.laces}`],['',`${state.webStyle} · ${state.quantity||'Personal order'} · ${state.branding||'No personalization specified'}`]].forEach(([unused,line])=>{const p=document.createElement('p');p.textContent=line;review.appendChild(p)})}}
  function show(n){step=Math.max(0,Math.min(3,n));document.querySelectorAll('[data-panel]').forEach(x=>x.hidden=+x.dataset.panel!==step);document.querySelectorAll('.custom-tabs button').forEach(x=>x.setAttribute('aria-selected',+x.dataset.step===step));summary()}
  document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>{state[b.dataset.key]=b.dataset.value;document.querySelectorAll(`[data-key="${b.dataset.key}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b));summary()}));
  document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>{part=b.dataset.part;document.querySelectorAll('[data-part]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSwatches()}));
  q('#size').addEventListener('input',e=>{state.size=e.target.value;summary()});q('#leather').addEventListener('change',e=>{state.leather=e.target.value;summary()});q('#web-style').addEventListener('change',e=>{state.webStyle=e.target.value;summary()});
  ['branding','quantity','market','email','notes'].forEach(id=>q('#'+id)?.addEventListener('input',e=>{state[id]=e.target.value;summary()}));
  document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>show(step+1)));document.querySelectorAll('[data-prev]').forEach(b=>b.addEventListener('click',()=>show(step-1)));document.querySelectorAll('.custom-tabs button').forEach(b=>b.addEventListener('click',()=>show(+b.dataset.step)));
  q('#custom-form').addEventListener('submit',e=>{e.preventDefault();if(!q('#custom-form').reportValidity())return;const body=encodeURIComponent(['Position: '+state.position,'Size: '+state.size,'Leather: '+state.leather,'Shell: '+state.shell,'Web: '+state.web,'Laces: '+state.laces,'Web style: '+state.webStyle,'Branding: '+(state.branding||'None'),'Quantity: '+(state.quantity||'Personal order'),'Market: '+state.market,'Email: '+state.email,'Notes: '+(state.notes||'')].join('\n'));q('#custom-status').textContent='Opening your email app with the brief addressed to BONOECO.';location.href='mailto:info@bonoeco.com?subject='+encodeURIComponent('BONOECO custom glove brief')+'&body='+body});
  renderSwatches();show(0);
})();
