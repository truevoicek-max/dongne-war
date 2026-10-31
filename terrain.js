// 지형 특징(한강·주요 산) 그리기. app.js의 drawBase()가 drawTerrainFeatures(ctx, info)를 부른다.
// 데이터: data/terrain.json (한강 중심선은 구 경계에서 추출, 산은 주요 봉우리 위치만; tools/build_terrain.py)
let TERRAIN=null;
fetch('data/terrain.json').then(r=>r.json()).then(t=>{TERRAIN=t;if(window.markBaseDirty)markBaseDirty()}).catch(()=>{});
function drawTerrainFeatures(c,{S,OX,OY,DPR,quick,sel,view,OPEN,SIDO,SGG}){
  if(!TERRAIN)return;
  const pj=([lo,la])=>[(lo-124.4)*81,(38.7-la)*100];
  const open=SIDO.filter(s=>OPEN.has(s.code)&&(!sel||s.code===sel||sel==='41'||sel==='11'));
  c.save();
  const clip=new Path2D();open.forEach(s=>clip.addPath(s.p));
  c.clip(clip,'evenodd');
  // 바탕: 숲·논밭 그림을 옅게 덮어 '도시 근교' 느낌으로 맞추고, 평지에는 시가지 블록을 깐다.
  
  if(sel==='11'||sel==='41')urban(c,pj,SGG.filter(g=>g.sido===sel),sel==='11'?.42:.8,S,OX,OY);
  // 산: 능선을 따라 작은 봉우리를 겹쳐 놓는다(왼쪽 면은 밝게, 오른쪽 면은 어둡게). 위치는 고정 시드라 항상 같다.
  const mounds=[];
  TERRAIN.peaks.forEach(([n,lo,la,r,deg,h],pi)=>{
    const [x,y]=pj([lo,la]),a=deg*Math.PI/180,cnt=Math.round(r*2.4)+2;
    for(let i=0;i<cnt;i++){
      const k=Math.sin((pi+1)*91.7+i*37.3),k2=Math.sin((pi+1)*53.1+i*17.9);
      const t=(i/(cnt-1)-.5)*2*r,off=k*r*.28,mid=1-Math.abs(i/(cnt-1)-.5)*1.2;
      const px=x+Math.cos(a)*t-Math.sin(a)*off,py=y+Math.sin(a)*t*.45+Math.cos(a)*off*.45;
      mounds.push([px,py,(.32+.18*k2)*r**.5*(.6+.5*mid)*(.8+.3*h)]);
    }
  });
  mounds.sort((p,q)=>p[1]-q[1]).forEach(([x,y,w])=>{
    const hh=w*1.25;
    c.fillStyle='rgba(20,60,40,.22)';c.beginPath();c.ellipse(x+w*.25,y+w*.12,w*1.15,w*.3,0,0,7);c.fill();
    c.beginPath();c.moveTo(x-w,y);c.quadraticCurveTo(x-w*.35,y-hh*.55,x-w*.04,y-hh);c.lineTo(x+w*.04,y-hh);c.lineTo(x,y);c.closePath();
    const lg=c.createLinearGradient(x-w,y-hh,x,y);lg.addColorStop(0,'#e4efc4');lg.addColorStop(1,'#8fbb6c');c.fillStyle=lg;c.fill();
    c.beginPath();c.moveTo(x-w*.04,y-hh);c.quadraticCurveTo(x+w*.4,y-hh*.55,x+w,y);c.lineTo(x,y);c.closePath();
    c.fillStyle='#3d7a4a';c.fill();
    c.beginPath();c.moveTo(x-w,y);c.quadraticCurveTo(x,y+w*.22,x+w,y);c.fillStyle='rgba(30,80,50,.5)';c.fill();
  });
  // 한강: 흰 물가 + 푸른 물줄기 + 하이라이트
  const pts=TERRAIN.river.map(pj);
  const path=()=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y))};
  c.lineJoin='round';c.lineCap='round';
  [[1.6,'rgba(255,255,255,.5)'],[1.15,'#3d9ed8'],[.5,'rgba(150,215,245,.55)']].forEach(([w,col])=>{path();c.lineWidth=w;c.strokeStyle=col;c.stroke()});
  if(!quick){path();c.lineWidth=.1;c.strokeStyle='rgba(255,255,255,.0)';c.stroke()}
  c.restore();
}

// 시가지: 구마다 밀도를 달리해 회색·베이지 건물 블록을 격자(약간 기울임)로 깐다. 강·산 가까이는 비운다.
function urban(c,pj,gus,step,S,OX,OY){
  const rv=TERRAIN.river.map(pj),pk=TERRAIN.peaks.map(([n,lo,la,r])=>[...pj([lo,la]),r*1.1]);
  const sc=pj([126.978,37.566]);
  const dseg=(x,y)=>{let m=1e9;for(let i=0;i<rv.length-1;i++){const[a,b]=rv[i],[p,q]=rv[i+1],dx=p-a,dy=q-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(x-a-dx*t,y-b-dy*t);if(d<m)m=d}return m};
  const rnd=(i,j)=>{const v=Math.sin(i*127.1+j*311.7)*43758.5453;return v-Math.floor(v)};
  const cols=['#d9d2c0','#cfc8b6','#e3dccb','#bdb8aa','#c9c1ae'];
  gus.forEach(g=>{
    const b=g.bbox,[x1,y1]=pj([b[0],b[3]]),[x2,y2]=pj([b[2],b[1]]);
    for(let y=y1;y<y2;y+=step)for(let x=x1;x<x2;x+=step){
      const i=Math.round(x/step),j=Math.round(y/step),r=rnd(i,j);
      const px=x+(r-.5)*step*.5,py=y+(rnd(j,i)-.5)*step*.5;
      const dc=Math.hypot(px-sc[0],py-sc[1]);
      const dens=Math.max(.45,1.15-dc/(g.sido==='11'?48:90));
      if(r>dens)continue;
      if(!c.isPointInPath(g.p,px*S+OX,py*S+OY))continue;
      if(dseg(px,py)<1.1)continue;
      if(pk.some(([mx,my,mr])=>Math.hypot((px-mx)/1.6,py-my)<mr))continue;
      const w=step*(.5+.3*rnd(i+3,j)),h=w*(.7+.5*rnd(i,j+5));
      c.fillStyle='rgba(60,70,60,.22)';c.fillRect(px-w/2+.12,py-h/2+.12,w,h);
      c.fillStyle=cols[(i*7+j*3)&3];c.fillRect(px-w/2,py-h/2,w,h);
    }
  });
}
