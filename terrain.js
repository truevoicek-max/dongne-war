// 지형 특징(한강·주요 산) 그리기. app.js의 drawBase()가 drawTerrainFeatures(ctx, info)를 부른다.
// 데이터: data/terrain.json (한강 중심선은 구 경계에서 추출, 산은 주요 봉우리 위치만; tools/build_terrain.py)
let TERRAIN=null;
// 가까이 확대하면 구 단위 추상 블록 대신 4단계(폐허→임시 정착→복구→번영) 도시 타일이 보인다. 단계는 소부족 수(지금은 가짜 값)로 정한다.
const TILES=[1,2,3,4].map(i=>{const im=new Image();im.onload=()=>window.markBaseDirty&&markBaseDirty();im.src='assets/tiles/downtown_'+i+'.png';return im});
const stageOf=code=>((parseInt(code,10)*2654435761)>>>16)%4; // 임시: 구마다 단계를 달리 보이게 하는 가짜 값(나중에 실제 소부족 수로 교체)
fetch('data/terrain.json').then(r=>r.json()).then(t=>{TERRAIN=t;if(window.markBaseDirty)markBaseDirty()}).catch(()=>{});
function drawTerrainFeatures(c,{S,OX,OY,DPR,quick,sel,view,OPEN,SIDO,SGG}){
  if(!TERRAIN)return;
  const pj=([lo,la])=>[(lo-124.4)*81,(38.7-la)*100];
  const open=SIDO.filter(s=>OPEN.has(s.code)&&(!sel||s.code===sel||sel==='41'||sel==='11'));
  c.save();
  const clip=new Path2D();open.forEach(s=>clip.addPath(s.p));
  c.clip(clip,'evenodd');
  // 바탕: 숲·논밭 그림을 옅게 덮어 '도시 근교' 느낌으로 맞추고, 평지에는 시가지 블록을 깐다.
  
  if(sel==='11'||sel==='41')urban(c,pj,SGG.filter(g=>g.sido===sel),sel==='11'?.42:.8,S,OX,OY,S/DPR>=14);
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
  if(!(S/DPR>=14&&(sel==='11'||sel==='41')))mounds.sort((p,q)=>p[1]-q[1]).forEach(([x,y,w])=>{
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
function urban(c,pj,gus,step,S,OX,OY,close){
  if(close)return aerialCity(c,pj,gus,S,OX,OY);
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

// 확대 상태(항공뷰): 구마다 블록 격자로 도로·지붕·숲을 위에서 내려다본 모습으로 그린다. 단계 0 폐허 / 1 임시 정착 / 2 복구 / 3 번영.
function aerialCity(c,pj,gus,S,OX,OY){
  const W=c.canvas.width,H=c.canvas.height,vx0=-OX/S-2,vx1=(W-OX)/S+2,vy0=-OY/S-2,vy1=(H-OY)/S+2;
  const rv=TERRAIN.river.map(pj),pk=TERRAIN.peaks.map(([n,lo,la,r])=>[...pj([lo,la]),r*1.15]);
  const dseg=(x,y)=>{let m=1e9;for(let i=0;i<rv.length-1;i++){const[a,b]=rv[i],[p,q]=rv[i+1],dx=p-a,dy=q-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(x-a-dx*t,y-b-dy*t);if(d<m)m=d}return m};
  const rn=(i,j,s)=>{const v=Math.sin(i*127.1+j*311.7+s*74.7)*43758.5453;return v-Math.floor(v)};
  const B=.9,cells=[];
  gus.forEach(g=>{
    const b=g.bbox,[bx1,by1]=pj([b[0],b[3]]),[bx2,by2]=pj([b[2],b[1]]);
    if(bx2<vx0||bx1>vx1||by2<vy0||by1>vy1)return;
    const st=stageOf(g.code);
    for(let j=Math.floor(Math.max(by1,vy0)/B);j<=Math.min(by2,vy1)/B;j++)for(let i=Math.floor(Math.max(bx1,vx0)/B);i<=Math.min(bx2,vx1)/B;i++){
      const x=(i+.5)*B,y=(j+.5)*B;
      if(!c.isPointInPath(g.p,x*S+OX,y*S+OY))continue;
      const dr=dseg(x,y);if(dr<.75)continue; // 강 위는 비움
      const forest=pk.some(([mx,my,mr])=>Math.hypot((x-mx)/1.5,y-my)<mr)||rn(i,j,1)<.07;
      const park=dr<1.5&&rn(i,j,2)<.6;
      cells.push({x,y,i,j,st,k:forest?2:park?1:0});
    }
  });
  const pal=[['#74777a','#7e8184'],['#b8a679','#c2b184'],['#8d9298','#979ca2'],['#7b8088','#858a92']];
  // 1) 바닥(도로)·공원·숲
  cells.forEach(({x,y,i,j,st,k})=>{
    const x0=x-B/2,y0=y-B/2;
    if(k===2){c.fillStyle='#4a8d4a';c.fillRect(x0-.01,y0-.01,B+.02,B+.02);return}
    if(k===1){c.fillStyle='#78b562';c.fillRect(x0-.01,y0-.01,B+.02,B+.02);return}
    c.fillStyle=pal[st][(i+j)&1];c.fillRect(x0-.01,y0-.01,B+.02,B+.02);
    c.fillStyle=st===1?'#cdb98a':'#d6d0c0';c.fillRect(x0+.1,y0+.1,B-.2,B-.2); // 인도·블록 바닥
  });
  // 2) 그림자 → 지붕·나무 (그림자가 지붕을 덮지 않게 한 번 더 나눔)
  const roofs=[];
  cells.forEach(({x,y,i,j,st,k})=>{
    const x0=x-B/2+.14,y0=y-B/2+.14,w=B-.28;
    if(k){const n=k===2?7:3;for(let q=0;q<n;q++){const tx=x0+rn(i,j,10+q)*w,ty=y0+rn(i,j,20+q)*w,r=.1+.09*rn(i,j,30+q);roofs.push({t:'tree',x:tx,y:ty,r,f:k===2})}return}
    if(st===0){ // 폐허: 부서진 지붕 조각, 잡초, 푸른 회로선
      for(let q=0;q<3;q++){const rw=.16+.16*rn(i,j,q),rh=.14+.16*rn(i,j,q+4);roofs.push({t:'rect',x:x0+rn(i,j,q+8)*(w-rw),y:y0+rn(i,j,q+12)*(w-rh),w:rw,h:rh,c:['#5d6063','#6c7073','#4f5356'][q%3],sh:.05})}
      if(rn(i,j,40)<.5)roofs.push({t:'moss',x:x0+rn(i,j,41)*w,y:y0+rn(i,j,42)*w,r:.13});
      if(rn(i,j,43)<.3)roofs.push({t:'circ',x:x0,y:y0+rn(i,j,44)*w,w});
    }else if(st===1){ // 임시 정착: 천막과 컨테이너
      for(let q=0;q<5;q++){const rw=.12+.1*rn(i,j,q),rh=.1+.08*rn(i,j,q+4);roofs.push({t:'rect',x:x0+rn(i,j,q+8)*(w-rw),y:y0+rn(i,j,q+12)*(w-rh),w:rw,h:rh,c:['#3d78c2','#d9c58b','#5a8f58','#b5503f','#8e9aa6'][Math.floor(rn(i,j,q+20)*5)],sh:.04})}
      if(rn(i,j,45)<.4)roofs.push({t:'fire',x:x0+rn(i,j,46)*w,y:y0+rn(i,j,47)*w});
    }else if(st===2){ // 복구: 단정한 지붕
      for(let a=0;a<2;a++)for(let b=0;b<2;b++){if(rn(i,j,a*2+b)<.12)continue;const rw=w/2-.06,rh=w/2-.06;roofs.push({t:'rect',x:x0+a*w/2+.03,y:y0+b*w/2+.03,w:rw*(.8+.2*rn(i,j,a+5)),h:rh*(.8+.2*rn(i,j,b+9)),c:['#d9cfbb','#c4553d','#9bb0c6','#e8e1d1'][Math.floor(rn(i,j,a*2+b+14)*4)],sh:.07})}
    }else{ // 번영: 큰 유리 건물, 긴 그림자
      const n=rn(i,j,0)<.5?1:2;
      for(let q=0;q<n;q++){const rw=n===1?w*.72:w*.46,rh=n===1?w*.72:w*.5;roofs.push({t:'rect',x:x0+(n===1?w*.14:q*w*.5+.02),y:y0+(n===1?w*.14:rn(i,j,q+3)*w*.4),w:rw,h:rh,c:['#8fb8d8','#a9c6dc','#c9d6e0','#7fa9c8'][Math.floor(rn(i,j,q+6)*4)],sh:.22,glass:true})}
    }
  });
  roofs.forEach(o=>{
    if(o.t==='rect'&&o.sh){c.fillStyle='rgba(20,30,40,.30)';c.beginPath();const d=o.sh;c.moveTo(o.x+o.w,o.y);c.lineTo(o.x+o.w+d,o.y+d);c.lineTo(o.x+o.w+d,o.y+o.h+d);c.lineTo(o.x+d,o.y+o.h+d);c.lineTo(o.x,o.y+o.h);c.lineTo(o.x+o.w,o.y+o.h);c.closePath();c.fill()}
    if(o.t==='tree'){c.fillStyle='rgba(20,60,30,.28)';c.beginPath();c.arc(o.x+.05,o.y+.06,o.r,0,7);c.fill()}
  });
  roofs.forEach(o=>{
    if(o.t==='rect'){c.fillStyle=o.c;c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle='rgba(255,255,255,.28)';c.fillRect(o.x,o.y,o.w,Math.min(.03,o.h*.2));if(o.glass){c.fillStyle='rgba(255,255,255,.35)';c.fillRect(o.x+o.w*.12,o.y+o.h*.12,o.w*.3,o.h*.3)}}
    else if(o.t==='tree'){c.fillStyle=o.f?'#3f7f40':'#5aa24d';c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill();c.fillStyle='rgba(190,230,140,.55)';c.beginPath();c.arc(o.x-o.r*.3,o.y-o.r*.3,o.r*.5,0,7);c.fill()}
    else if(o.t==='moss'){c.fillStyle='rgba(110,160,80,.65)';c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill()}
    else if(o.t==='circ'){c.strokeStyle='rgba(90,220,255,.8)';c.lineWidth=.025;c.beginPath();c.moveTo(o.x,o.y);c.lineTo(o.x+o.w*.5,o.y);c.lineTo(o.x+o.w*.5,o.y+.18);c.lineTo(o.x+o.w,o.y+.18);c.stroke()}
    else if(o.t==='fire'){c.fillStyle='rgba(255,170,60,.9)';c.beginPath();c.arc(o.x,o.y,.04,0,7);c.fill();c.fillStyle='rgba(255,170,60,.25)';c.beginPath();c.arc(o.x,o.y,.12,0,7);c.fill()}
  });
}
