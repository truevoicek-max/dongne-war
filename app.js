(()=>{const t=document.getElementById('title'),bg=document.getElementById('tbg');
  const go=()=>{t.classList.add('out');setTimeout(()=>t.remove(),1000)};
  t.addEventListener('click',go);addEventListener('keydown',e=>{if(document.getElementById('title')&&(e.key==='Enter'||e.key===' '))go()});
  t.addEventListener('mousemove',e=>{const x=(e.clientX/innerWidth-.5)*-14,y=(e.clientY/innerHeight-.5)*-8;bg.style.marginLeft=x+'px';bg.style.marginTop=y+'px'});
  if(location.hash==='#skip')t.remove();})();
const OPEN=new Set(['11','41']);
const $=id=>document.getElementById(id);
const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return((h^(h>>>15))>>>0)/4294967295};
const proj=([lo,la])=>[(lo-124.4)*81,(38.7-la)*100];
const pathD=rings=>rings.map(r=>'M'+r.map(p=>proj(p).map(v=>v.toFixed(1)).join(' ')).join('L')+'Z').join('');
const cv=$('cv'),ctx=cv.getContext('2d',{alpha:false}),mc=$('mc'),mctx=mc.getContext('2d');
const base={x:-30,y:-20,w:667,h:610};
let SIDO=[],SGG=[],vb={...base},view='korea',sel=null,hoverGu=null,hover=null,S=1,OX=0,OY=0,DPR=1,TEX=null,TEXAI=null,toastT,anim=null,banners=[];
// 화면 확인용 임의 수치
const tribes=c=>OPEN.has(c.slice(0,2))?Math.floor(hash(c)*28)+1:0;
const cityTribes=s=>SGG.filter(g=>g.sido===s).reduce((a,g)=>a+tribes(g.code),0);

// ---------- 질감: 수복 지역용 풀·숲 텍스처 (GPT 페인팅이 있으면 그것, 없으면 임시 생성) ----------
function proceduralTile(){const n=256,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');
  const v=(x,y,s)=>{const f=(a,b)=>{let h=(a*374761393+b*668265263+s*1442695041)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295};
    const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),w=yf*yf*(3-2*yf);return f(xi,yi)*(1-u)*(1-w)+f(xi+1,yi)*u*(1-w)+f(xi,yi+1)*(1-u)*w+f(xi+1,yi+1)*u*w};
  const im=g.createImageData(n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=v(x/28,y/28,1)*.6+v(x/9,y/9,2)*.3+v(x/3,y/3,3)*.1;
    const c1=[150,214,120],c2=[104,184,100],t=Math.min(1,Math.max(0,(a-.3)*2));const i=(y*n+x)*4;
    im.data[i]=c1[0]+(c2[0]-c1[0])*t;im.data[i+1]=c1[1]+(c2[1]-c1[1])*t;im.data[i+2]=c1[2]+(c2[2]-c1[2])*t;im.data[i+3]=255}
  g.putImageData(im,0,0);return c}
function mirrorTile(img){const w=img.width,h=img.height,c=document.createElement('canvas');c.width=w*2;c.height=h*2;const g=c.getContext('2d');
  g.drawImage(img,0,0);g.save();g.scale(-1,1);g.drawImage(img,-w*2,0);g.restore();g.save();g.scale(1,-1);g.drawImage(img,0,-h*2);g.restore();g.save();g.scale(-1,-1);g.drawImage(img,-w*2,-h*2);g.restore();return c}
function loadTexture(){return new Promise(res=>{const im=new Image();im.onload=()=>(im.decode?im.decode().catch(()=>{}):Promise.resolve()).then(()=>res(im));im.onerror=()=>res(proceduralTile());im.src='assets/terrain.jpg'})}

Promise.all([fetch('data/sido.json').then(r=>r.json()),fetch('data/sgg.json').then(r=>r.json()),loadTexture(),new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src='assets/ai.jpg'})]).then(([a,b,t,ai])=>{SIDO=a;SGG=b;TEX=mirrorTile(t);TEXAI=ai?mirrorTile(ai):null;init()});

function init(){
  SIDO.forEach(s=>{s.p=new Path2D(pathD(s.rings));s.proj=proj(s.center)});
  SGG.forEach(g=>{g.p=new Path2D(pathD(g.rings));g.proj=proj(g.center)});
  $('sOpen').textContent=OPEN.size+'/'+SIDO.length;
  const opens=SGG.filter(g=>OPEN.has(g.sido));
  $('sPop').textContent=(opens.reduce((a,g)=>a+tribes(g.code),0)*100).toLocaleString();$('sBld').textContent=opens.reduce((a,g)=>a+tribes(g.code),0)*3;
  resize();paint(0);panel();crumb();bind();setInterval(ticker,6000);requestAnimationFrame(tick);
}
function resize(){DPR=Math.min(2,devicePixelRatio||1);while(innerWidth*innerHeight*DPR*DPR>5.2e6&&DPR>1)DPR=Math.max(1,DPR-.25);cv.width=innerWidth*DPR;cv.height=innerHeight*DPR;
  mc.width=190*DPR;mc.height=165*DPR;PAT=null;PATAI=null;baseDirty=true;
  // 창 크기가 바뀌어도 사용자가 맞춰 둔 확대 배율·중심은 유지한다
  const z=home.w/vb.w,cx=vb.x+vb.w/2,cy=vb.y+vb.h/2;
  home=view==='korea'?{...base}:targetFor(SIDO.find(x=>x.code===sel).bbox);
  const w=home.w/z,h=home.h/z;vb={x:cx-w/2,y:cy-h/2,w,h};ctl.z=ctl.zt=z;place();rebanner()}
// 지도가 패널 아래로 깔리지 않게 오른쪽 여백을 둔다
function safe(){const nar=innerWidth<=820;return nar?{l:0,t:56,r:0,b:innerHeight*.36+80}:{l:0,t:64,r:(innerWidth<=980?290:330),b:74}}
function place(){baseDirty=true;const m=safe(),W=cv.width/DPR-m.l-m.r,H=cv.height/DPR-m.t-m.b;S=Math.min(W/vb.w,H/vb.h)*DPR;
  OX=(m.l*DPR+(W*DPR-vb.w*S)/2)-vb.x*S;OY=(m.t*DPR+(H*DPR-vb.h*S)/2)-vb.y*S}
function targetFor(b){const [x1,y1]=proj([b[0],b[3]]),[x2,y2]=proj([b[2],b[1]]);const m=safe(),R=(innerWidth-m.l-m.r)/(innerHeight-m.t-m.b);
  let w=(x2-x1)*1.18,h=(y2-y1)*1.18;if(w/h<R)w=h*R;else h=w/R;return{x:(x1+x2)/2-w/2,y:(y1+y2)/2-h/2,w,h}}
const wx=(x)=>(x*S+OX)/DPR, wy=(y)=>(y*S+OY)/DPR;

// ---------- 그리기 ----------
// ---- 성능: 정적 층은 오프스크린에 캐시하고, 움직이는 것만 매 프레임 덧그린다 ----
const bc=document.createElement('canvas'),bctx=bc.getContext('2d',{alpha:false});
let baseDirty=true,PAT=null,PATAI=null,lastFull=0,miniDirty=true;
window.markBaseDirty=()=>{baseDirty=true};
const mkPat=()=>{const p=bctx.createPattern(TEX,'repeat');p.setTransform(new DOMMatrix().scale(110/TEX.width));return p};
function drawBase(quick){ // quick=true: 이동 애니메이션 중에는 비싼 블러 그림자를 생략
  if(bc.width!==cv.width||bc.height!==cv.height){bc.width=cv.width;bc.height=cv.height}
  const c=bctx,W=bc.width,H=bc.height;if(!PAT){PAT=mkPat();if(TEXAI){PATAI=bctx.createPattern(TEXAI,'repeat');PATAI.setTransform(new DOMMatrix().scale(150/TEXAI.width))}}
  c.setTransform(1,0,0,1,0,0);
  const sg=c.createLinearGradient(0,0,0,H);sg.addColorStop(0,'#c9f0fb');sg.addColorStop(.55,'#9fdcf1');sg.addColorStop(1,'#6fc3e6');c.fillStyle=sg;c.fillRect(0,0,W,H);
  const lg=c.createRadialGradient(W*.3,H*.1,0,W*.3,H*.1,W*.7);lg.addColorStop(0,'rgba(255,255,255,.45)');lg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=lg;c.fillRect(0,0,W,H);
  c.setTransform(S,0,0,S,OX,OY);c.lineJoin='round';const lw=1.2*DPR/S;
  c.save();
  if(quick){c.translate(0,7*DPR/S);c.fillStyle='rgba(8,50,90,.28)'}else{c.shadowColor='rgba(8,50,90,.38)';c.shadowBlur=22*DPR;c.shadowOffsetY=9*DPR;c.fillStyle='#5aa66a'}
  SIDO.forEach(s=>c.fill(s.p,'evenodd'));c.restore();
  const dim=sel?.45:1;
  SIDO.forEach(s=>{if(s.code===sel)return;c.save();c.globalAlpha=dim;
    if(OPEN.has(s.code)){c.fillStyle=PAT;c.fill(s.p,'evenodd');c.clip(s.p,'evenodd');c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=7*DPR/S;c.stroke(s.p);c.strokeStyle='rgba(20,70,40,.28)';c.lineWidth=2.5*DPR/S;c.stroke(s.p)}
    else{c.fillStyle=PATAI||'#142238';c.fill(s.p,'evenodd');c.fillStyle='rgba(8,16,40,.28)';c.fill(s.p,'evenodd')}
    c.restore();c.save();c.globalAlpha=dim;c.strokeStyle=OPEN.has(s.code)?'rgba(255,255,255,.95)':'rgba(111,227,255,.55)';c.lineWidth=lw;c.stroke(s.p);c.restore()});
  if(sel){SGG.filter(g=>g.sido===sel).forEach(g=>{
    c.fillStyle=PAT;c.fill(g.p,'evenodd');
    c.save();c.clip(g.p,'evenodd');c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=5*DPR/S;c.stroke(g.p);c.restore();
    c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=lw*.9;c.stroke(g.p)})}
  // 지형 특징(한강·산 등)은 terrain.js가 그린다
  if(window.drawTerrainFeatures){c.save();c.setTransform(S,0,0,S,OX,OY);drawTerrainFeatures(c,{S,OX,OY,DPR,quick,sel,view,OPEN,SIDO,SGG});c.restore()}
  baseDirty=false;miniDirty=true;
}
function paint(t){
  if(baseDirty)drawBase(!!anim||ctl.busy);
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bc,0,0);
  // 반짝임(가벼운 사각형만)
  ctx.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<30;i++){const x=hash('s'+i)*cv.width,y=hash('t'+i)*cv.height,a=(Math.sin(t/900+i)+1)/2;ctx.globalAlpha=.1+a*.35;ctx.fillRect(x,y,10*DPR,1.4*DPR)}ctx.globalAlpha=1;
  ctx.setTransform(S,0,0,S,OX,OY);ctx.lineJoin='round';
  // AI 점령 지역의 디지털 효과만 매 프레임 갱신
  SIDO.forEach(s=>{if(OPEN.has(s.code)||s.code===sel)return;ctx.save();ctx.globalAlpha=sel?.45:1;aiFill(s,t);ctx.restore()});
  // 호버/선택 강조
  if(!sel&&hover&&hover.sido&&OPEN.has(hover.sido)){const s=SIDO.find(x=>x.code===hover.sido);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fill(s.p,'evenodd')}
  if(sel){SGG.forEach(g=>{if(g.sido!==sel)return;const on=hoverGu===g.code,hv=hover&&hover.gu===g.code;if(!on&&!hv)return;
    ctx.fillStyle=on?'rgba(255,232,150,.35)':'rgba(255,255,255,.25)';ctx.fill(g.p,'evenodd');ctx.strokeStyle=on?'#ffd36a':'rgba(255,255,255,1)';ctx.lineWidth=2.4*DPR/S;ctx.stroke(g.p)})}
  if(miniDirty&&!anim){minimap();miniDirty=false}
  else if(anim&&Math.floor(t/100)%2===0)minimap();
}
function aiFill(s,t){ // AI 점령 지역: 격자 + 스캔 + 글리치(채움 색은 정적 층에 이미 있음)
  ctx.save();ctx.clip(s.p,'evenodd');
  ctx.strokeStyle='rgba(111,227,255,.20)';ctx.lineWidth=1*DPR/S;const gsz=16*DPR/S;
  const b=s.bbox,[x1,y1]=proj([b[0],b[3]]),[x2,y2]=proj([b[2],b[1]]);
  ctx.beginPath();for(let x=Math.floor(x1/gsz)*gsz;x<x2;x+=gsz){ctx.moveTo(x,y1);ctx.lineTo(x,y2)}for(let y=Math.floor(y1/gsz)*gsz;y<y2;y+=gsz){ctx.moveTo(x1,y);ctx.lineTo(x2,y)}ctx.stroke();
  const sy=y1+((t/20)%((y2-y1)+60))-30,gr=ctx.createLinearGradient(0,sy-24,0,sy+24);gr.addColorStop(0,'rgba(111,227,255,0)');gr.addColorStop(.5,'rgba(111,227,255,.26)');gr.addColorStop(1,'rgba(111,227,255,0)');
  ctx.fillStyle=gr;ctx.fillRect(x1,sy-24,x2-x1,48);
  const ph=Math.floor(t/180);for(let i=0;i<3;i++){const r=hash(s.code+ph+i);if(r>.55){const gy=y1+hash(s.code+ph+'y'+i)*(y2-y1),gx=x1+hash(s.code+ph+'x'+i)*(x2-x1);ctx.fillStyle=i%2?'rgba(255,93,115,.45)':'rgba(111,227,255,.5)';ctx.fillRect(gx,gy,(x2-x1)*.25*r,1.6*DPR/S)}}
  ctx.restore()}
function minimap(){
  const W=mc.width,H=mc.height;mctx.setTransform(1,0,0,1,0,0);mctx.clearRect(0,0,W,H);
  const s=Math.min(W/base.w,H/base.h)*.98,ox=(W-base.w*s)/2-base.x*s,oy=(H-base.h*s)/2-base.y*s;mctx.setTransform(s,0,0,s,ox,oy);
  SIDO.forEach(d=>{mctx.fillStyle=OPEN.has(d.code)?'#8fd67c':'#1d2f4a';mctx.fill(d.p,'evenodd');mctx.strokeStyle=OPEN.has(d.code)?'#fff':'rgba(111,227,255,.5)';mctx.lineWidth=1*DPR/s;mctx.stroke(d.p)});
  const m=safe();const vx=vb.x,vy=vb.y;mctx.strokeStyle='#ffd36a';mctx.lineWidth=2*DPR/s;mctx.setLineDash([4*DPR/s,3*DPR/s]);
  mctx.strokeRect(vx,vy,vb.w,vb.h);mctx.setLineDash([]);
}
// ---------- 배너 (반투명 도형 + 글자) ----------
function rebanner(){banners.forEach(b=>b.el.remove());banners=[];
  const mk=(txt,sub,x,y,cls,code,kind)=>{const e=document.createElement('div');e.className='banner '+cls;e.innerHTML=(cls.includes('ai')?'':'<span class="dot g" style="margin:0"></span>')+txt+(sub?`<span>${sub}</span>`:'');e.onclick=()=>{if(kind==='sido'){OPEN.has(code)?enter(code):toast('AI가 점령한 지역입니다. 수복 작전 신청이 모이면 열려요.')}else{hoverGu=code;panel();rebanner()}};document.body.appendChild(e);banners.push({el:e,x,y,off:BOFF[code]||[0,0],pri:cls.includes('on')?3:(cls.includes('ai')?0:2)})};
  if(!sel){SIDO.forEach(s=>{const open=OPEN.has(s.code),short=s.name.replace(/(특별자치도|특별자치시|특별시|광역시|통합특별시|도)$/,'');
    if(open)mk(short,(cityTribes(s.code)*100).toLocaleString(),s.proj[0],s.proj[1],'',s.code,'sido');
    else if((s.bbox[2]-s.bbox[0])>.9)mk(short,'AI','ai'===1?0:s.proj[0],s.proj[1],'ai',s.code,'sido')})}
  else{const gl=SGG.filter(g=>g.sido===sel);gl.forEach(g=>{const w=(g.bbox[2]-g.bbox[0])*81*S/DPR;if(w<g.name.length*12+30&&hoverGu!==g.code)return;mk(g.name,tribes(g.code)*100||'',g.proj[0],g.proj[1],hoverGu===g.code?'on':'',g.code,'gu')})}
  layout();declutter()}
const BOFF={'11':[-62,-18],'41':[58,34],'28':[-58,-4]};   // 서울·경기·인천 라벨이 겹치지 않게 비켜 놓음
function layout(){banners.forEach(b=>{b.el.style.left=(wx(b.x)+b.off[0])+'px';b.el.style.top=(wy(b.y)+b.off[1])+'px'})}
function declutter(){ // 겹치는 라벨은 우선순위 낮은 쪽을 숨긴다
  banners.forEach(b=>b.el.classList.remove('hide'));
  const placed=[];[...banners].sort((a,b)=>b.pri-a.pri).forEach(b=>{const r=b.el.getBoundingClientRect(),m=4;
    const hit=placed.some(q=>!(r.right+m<q.left||r.left-m>q.right||r.bottom+m<q.top||r.top-m>q.bottom));
    if(hit&&b.pri<3)b.el.classList.add('hide');else placed.push(r)})}
// ---------- 이동 ----------
function go(to){const from={...vb},t0=performance.now(),D=800;banners.forEach(b=>b.el.style.opacity=0);
  anim=()=>{let p=Math.min(1,(performance.now()-t0)/D);p=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
    vb={x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p,w:from.w+(to.w-from.w)*p,h:from.h+(to.h-from.h)*p};place();if(p>=1){anim=null;baseDirty=true;rebanner()}}}
let lastT=0,fpsN=0,fpsT=0;const FPS=location.search.includes('fps');
function tick(t){
  if(document.hidden){requestAnimationFrame(tick);return}
  if(!anim&&!ctl.busy&&t-lastT<33){requestAnimationFrame(tick);return}  // 가만히 있을 땐 30fps, 확대·이동 중엔 풀 프레임
  lastT=t;if(FPS){fpsN++;if(t-fpsT>1000){document.title='FPS '+fpsN;fpsN=0;fpsT=t}}
  if(anim)anim();
  stepControls();
  paint(t);if(!anim)layout();
  if(window.updateLandmarks)updateLandmarks({wx,wy,S,DPR,sel,view,vb,home,anim:!!anim,t});   // 랜드마크 이미지(landmarks.js)
  zoomLabel();
  requestAnimationFrame(tick)}
// 이동이 끝나면 고품질(블러 그림자 포함) 정적 층으로 한 번 다시 그린다
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2800)}
function enter(code){const b=SIDO.find(x=>x.code===code).bbox;sel=code;view='city';hoverGu=null;hover=null;home=targetFor(b);limit=boundsFor(b);ctl.z=ctl.zt=1;ctl.a=null;go({...home});panel();crumb()}
function back(){sel=null;view='korea';hoverGu=null;hover=null;home={...base};limit={...base};ctl.z=ctl.zt=1;ctl.a=null;go({...home});panel();crumb()}
// ---------- 확대·이동 (휠·드래그·핀치·버튼·키보드) ----------
// 아래 <zoom-pure> 구간은 화면·DOM 없이 계산만 하는 순수 함수라 따로 떼어 검증할 수 있다.
//<zoom-pure>
const ZMIN=.8,ZMAX=12;                       // 맞춤 화면 대비 배율 한계
const clampZ=z=>Math.min(ZMAX,Math.max(ZMIN,z));
const scaleOf=(w,h,W,H,dpr)=>Math.min(W/w,H/h)*dpr;   // 월드 1칸 = 장치 픽셀 수 (place()와 같은 식)
// 뷰박스 크기(w,h)에서, 월드점 (px,py)가 화면(장치 px) (sx,sy)에 오도록 뷰박스 원점을 구한다
function originFor(w,h,px,py,sx,sy,m,W,H,dpr){const S=scaleOf(w,h,W,H,dpr);
  return{x:px+(m.l*dpr+(W*dpr-w*S)/2-sx)/S,y:py+(m.t*dpr+(H*dpr-h*S)/2-sy)/S}}
function viewAtZoom(home,z,px,py,sx,sy,m,W,H,dpr){const w=home.w/z,h=home.h/z,o=originFor(w,h,px,py,sx,sy,m,W,H,dpr);return{x:o.x,y:o.y,w,h}}
// 뷰의 중심이 경계 사각형 b 밖으로 나가지 않게 한다
function clampCenter(v,b){const cx=Math.min(b.x+b.w,Math.max(b.x,v.x+v.w/2)),cy=Math.min(b.y+b.h,Math.max(b.y,v.y+v.h/2));return{x:cx-v.w/2,y:cy-v.h/2,w:v.w,h:v.h}}
// 휠 한 눈금(deltaY≈100)이 약 12%. 트랙패드 핀치(ctrl+wheel)는 델타가 작아 계수를 키운다
function wheelFactor(dy,mode,ctrl){const d=dy*(mode===1?16:1);return ctrl?Math.exp(-Math.max(-40,Math.min(40,d))*.012):Math.exp(-Math.max(-300,Math.min(300,d))*.0013)}
//</zoom-pure>
const boundsFor=b=>{const [x1,y1]=proj([b[0],b[3]]),[x2,y2]=proj([b[2],b[1]]),px=(x2-x1)*.12,py=(y2-y1)*.12;return{x:x1-px,y:y1-py,w:x2-x1+2*px,h:y2-y1+2*py}};
let home={...base},limit={...base},drag=null,pinch=null,suppress=false,zlab=null,lm=null;
const ctl={z:1,zt:1,a:null,busy:false,timer:0};
const ptrs=new Map();
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const metrics=()=>{const m=safe();return{m,W:cv.width/DPR-m.l-m.r,H:cv.height/DPR-m.t-m.b}};
const worldAt=(sx,sy)=>({px:(sx-OX)/S,py:(sy-OY)/S});
const centerDev=()=>{const k=metrics();return{sx:(k.m.l+k.W/2)*DPR,sy:(k.m.t+k.H/2)*DPR}};
function setView(v){vb=clampCenter(v,limit);place()}
function applyZoom(z,sx,sy,px,py){const k=metrics();ctl.z=z;setView(viewAtZoom(home,z,px,py,sx,sy,k.m,k.W,k.H,DPR))}
function busy(){ctl.busy=true;clearTimeout(ctl.timer);ctl.timer=setTimeout(()=>{ctl.busy=false;baseDirty=true;
  if(!anim)rebanner();                                   // 이동 애니메이션 중이면 그 끝에서 go()가 정리한다
  if(lm&&!(drag&&drag.moved))hover=hit(lm)},150)}        // 멈춘 뒤 고품질로 한 번 다시 그리고, 커서 아래 지역 강조도 새로 계산
// 목표 배율만 바꾸고, 실제 배율은 매 프레임 부드럽게 따라간다(한계에서도 부드럽게 멈춤)
function zoomBy(f,sx,sy){if(anim)return;const w=worldAt(sx,sy);ctl.zt=clampZ(ctl.zt*f);ctl.a={sx,sy,px:w.px,py:w.py};
  if(reduced){applyZoom(ctl.zt,sx,sy,w.px,w.py);ctl.a=null}busy()}
function stepControls(){if(anim||!ctl.a||ctl.z===ctl.zt)return;
  let z=ctl.z+(ctl.zt-ctl.z)*.25;if(Math.abs(ctl.zt-z)<.002)z=ctl.zt;
  applyZoom(z,ctl.a.sx,ctl.a.sy,ctl.a.px,ctl.a.py);busy();if(z===ctl.zt)ctl.a=null}
function resetView(){ctl.z=ctl.zt=1;ctl.a=null;if(reduced){vb={...home};place();rebanner()}else go({...home})}
function zoomLabel(){if(!zlab)return;const t='×'+(home.w/vb.w).toFixed(1);if(zlab.textContent!==t)zlab.textContent=t}
function pinchState(){const [a,b]=[...ptrs.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2}}
function pinchMove(){const n=pinchState(),w=worldAt(pinch.mx*DPR,pinch.my*DPR);
  applyZoom(clampZ(ctl.z*n.d/pinch.d),n.mx*DPR,n.my*DPR,w.px,w.py);ctl.zt=ctl.z;ctl.a=null;pinch=n;busy()}
function bindControls(){
  cv.style.touchAction='none';cv.style.cursor='grab';
  cv.addEventListener('wheel',e=>{e.preventDefault();if(anim)return;zoomBy(wheelFactor(e.deltaY,e.deltaMode,e.ctrlKey),e.clientX*DPR,e.clientY*DPR)},{passive:false});
  cv.addEventListener('pointerdown',e=>{if(anim||(e.pointerType==='mouse'&&e.button!==0))return;
    if(e.pointerType==='mouse')ptrs.clear();            // 창 밖에서 놓쳐 남은 포인터가 있어도 초기화
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cv.setPointerCapture(e.pointerId)}catch(_){}
    if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};
    else if(ptrs.size===2){drag=null;pinch=pinchState();ctl.a=null;ctl.zt=ctl.z}});
  cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p||anim)return;p.x=e.clientX;p.y=e.clientY;
    if(ptrs.size>=2&&pinch){pinchMove();return}
    if(!drag)return;
    if(!drag.moved){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5)return;drag.moved=true;hover=null;cv.style.cursor='grabbing'}  // 5px 넘게 움직여야 드래그
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    ctl.a=null;ctl.zt=ctl.z;setView({x:vb.x-dx*DPR/S,y:vb.y-dy*DPR/S,w:vb.w,h:vb.h});busy()});
  const end=e=>{if(!ptrs.delete(e.pointerId))return;
    if((drag&&drag.moved)||pinch){suppress=true;setTimeout(()=>{suppress=false},80)}   // 드래그 직후의 click은 지역 선택으로 처리하지 않는다
    if(ptrs.size<2)pinch=null;
    if(ptrs.size===0){drag=null;cv.style.cursor='grab'}
    else if(ptrs.size===1){const q=[...ptrs.values()][0];drag={x:q.x,y:q.y,sx:q.x,sy:q.y,moved:true}}};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  addEventListener('keydown',e=>{if(document.getElementById('title')||e.metaKey||e.ctrlKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    const k=e.key,c=centerDev();
    if(k==='+'||k==='='){zoomBy(1.25,c.sx,c.sy)}else if(k==='-'||k==='_'){zoomBy(1/1.25,c.sx,c.sy)}else if(k==='0'){resetView()}
    else if(k.startsWith('Arrow')){const st=.12,dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;
      setView({x:vb.x+dx*vb.w,y:vb.y+dy*vb.h,w:vb.w,h:vb.h});busy()}else return;
    e.preventDefault()});
}
function buildZoomUI(){
  const l=document.createElement('link');l.rel='stylesheet';l.href='controls.css?v=3';document.head.appendChild(l);
  const box=document.createElement('div');box.className='glass zoomctl';box.setAttribute('role','group');box.setAttribute('aria-label','지도 확대·축소');
  const ico=d=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
  const mk=(label,svg,fn)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=svg;b.onclick=fn;box.appendChild(b);return b};
  mk('확대',ico('<path d="M12 5v14M5 12h14"/>'),()=>{const c=centerDev();zoomBy(1.4,c.sx,c.sy)});
  mk('축소',ico('<path d="M5 12h14"/>'),()=>{const c=centerDev();zoomBy(1/1.4,c.sx,c.sy)});
  mk('보기 초기화',ico('<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5"/>'),resetView);
  zlab=document.createElement('div');zlab.className='lv';zlab.textContent='×1.0';box.appendChild(zlab);
  ($('hud')||document.body).appendChild(box)}
// ---------- 입력 ----------
function hit(e){const x=(e.clientX*DPR-OX)/S,y=(e.clientY*DPR-OY)/S;ctx.setTransform(1,0,0,1,0,0);
  if(sel){for(const g of SGG)if(g.sido===sel&&ctx.isPointInPath(g.p,x,y,'evenodd'))return{gu:g.code}}else{for(const s of SIDO)if(ctx.isPointInPath(s.p,x,y,'evenodd'))return{sido:s.code}}return null}
function bind(){
  cv.addEventListener('click',e=>{if(suppress){suppress=false;return}const h=hit(e);if(!h)return;if(h.sido){OPEN.has(h.sido)?enter(h.sido):toast('AI가 점령한 지역입니다. 수복 작전 신청이 모이면 열려요.')}else{hoverGu=h.gu;panel();rebanner()}});
  cv.addEventListener('mousemove',e=>{lm={clientX:e.clientX,clientY:e.clientY};if(drag&&drag.moved)return;const h=hit(e);hover=h;cv.style.cursor=h&&(h.gu||OPEN.has(h.sido))?'pointer':'grab'});
  $('mini').addEventListener('click',()=>{if(sel)back()});
  $('act').onclick=()=>toast('신청 게시글은 인스타그램에서 열려요. (데모 화면)');
  addEventListener('resize',resize);
  bindControls();buildZoomUI();
}
const TICK=['AI 신호 감지: 충청권 경계에서 이상 활동. 수복 지역은 방어 태세를 유지합니다.','곰 한 마리가 서울 은평구 외곽에서 목격되었습니다. 대응 투표 D-2.','경기 성남시에서 재건축 요청 접수: 초가 → 슬레이트.','신규 소부족 3개가 수원시에 정착했습니다.'];
let tki=0;function ticker(){tki=(tki+1)%TICK.length;$('tk').textContent=TICK[tki]}
function crumb(){const c=$('crumb');c.innerHTML='';const b=document.createElement('button');b.textContent='한반도';if(sel)b.onclick=back;else b.className='cur';c.appendChild(b);
  if(sel){c.append('›');const s=document.createElement('button');s.className='cur';s.textContent=SIDO.find(x=>x.code===sel).name;c.appendChild(s)}}
function panel(){
  const P=$('side');
  if(view==='korea'){
    const opens=SIDO.filter(s=>OPEN.has(s.code)),mx=Math.max(...opens.map(s=>cityTribes(s.code)));
    P.innerHTML=`<div class="eyebrow"><span class="dot g"></span>STATUS</div><h2>한반도 현황</h2><div class="sub">AI와의 전쟁 이후 서울·경기만 수복했다. 나머지는 AI 점령 지역이다.</div><div class="hr"></div>
    ${opens.map(s=>`<div class="kv"><span>${s.name}</span><b>${(cityTribes(s.code)*100).toLocaleString()}</b></div><div class="bar"><i style="width:${cityTribes(s.code)/mx*100}%"></i></div>`).join('')}
    <div class="hr"></div><div class="sub"><span class="dot"></span>AI 점령 지역 ${SIDO.length-opens.length}곳 · 수복 작전 신청이 모이면 순차 개방</div>
    <div class="note">수치는 화면 확인용 임의 값입니다.<br>경계: 통계청 SGIS(공공누리 제1유형) 행정동 경계를 vuski/admdongkor가 가공(<span style="white-space:nowrap">CC BY 4.0</span>), 이 화면에서 단순화.</div>`;
  }else{
    const s=SIDO.find(x=>x.code===sel),gs=SGG.filter(g=>g.sido===sel).map(g=>({g,t:tribes(g.code)})).sort((a,b)=>b.t-a.t),cur=hoverGu&&SGG.find(g=>g.code===hoverGu);
    P.innerHTML=`<div class="eyebrow"><span class="dot g"></span>RECLAIMED</div><h2>${s.name}</h2><div class="sub">${gs.length}개 구역 · 인구 ${(cityTribes(sel)*100).toLocaleString()}</div><div class="hr"></div>
    ${cur?`<div style="font-size:19px;font-weight:800;margin-bottom:2px">${cur.name}</div><div class="kv"><span>소부족</span><b>${tribes(cur.code)}</b></div><div class="kv"><span>인구</span><b>${(tribes(cur.code)*100).toLocaleString()}</b></div><div class="kv"><span>건물</span><b>${tribes(cur.code)*3}</b></div>
      <a class="go" href="demo/terrain.html" target="_blank"><span>${cur.name} 진입</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1405" stroke-width="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><div class="hr"></div>`:'<div class="sub" style="padding:6px 0 10px">지도에서 구역을 선택하세요.</div>'}
    <div class="eyebrow" style="margin-bottom:6px">인구 순위</div><div class="rank">${gs.map((x,i)=>`<button class="${x.g.code===hoverGu?'on':''}" data-c="${x.g.code}"><i>${String(i+1).padStart(2,'0')}</i><span>${x.g.name}</span><b>${(x.t*100).toLocaleString()}</b></button>`).join('')}</div>
    <div class="note">수치는 화면 확인용 임의 값입니다.</div>`;
    P.querySelectorAll('.rank button').forEach(b=>b.onclick=()=>{hoverGu=b.dataset.c;panel();rebanner()});
  }
}
