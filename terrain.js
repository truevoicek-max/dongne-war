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

// 확대 상태(항공뷰): 구마다 '도시 성격'에 맞는 블록 크기·격자 각도·건물 배치로 위에서 내려다본 모습을 그린다.
// 구 모양으로 잘라(clip) 그려서 구 경계에서 격자가 끊긴다. 단계 0 폐허 / 1 임시 정착 / 2 복구 / 3 번영.
const GU_TYPE={ // 실제 성격에 따른 분류(대략): old 구도심 / biz 고층 업무·고급 / apt 아파트 단지 / ind 공업·물류 / low 저층 주거(기본)
  '11110':'old','11140':'old','11170':'old','11560':'biz','11650':'biz','11680':'biz','11710':'biz',
  '11350':'apt','11320':'apt','11740':'apt','11470':'apt','11500':'apt','11260':'apt','11305':'apt',
  '11530':'ind','11545':'ind'};
const TYPE_B={old:.6,biz:1.05,apt:.95,ind:1.15,low:.66};
function aerialCity(c,pj,gus,S,OX,OY){
  const W=c.canvas.width,H=c.canvas.height,vx0=-OX/S-2,vx1=(W-OX)/S+2,vy0=-OY/S-2,vy1=(H-OY)/S+2;
  const rv=TERRAIN.river.map(pj),pk=TERRAIN.peaks.map(([n,lo,la,r])=>[...pj([lo,la]),r*1.15]);
  const dseg=(x,y)=>{let m=1e9;for(let i=0;i<rv.length-1;i++){const[a,b]=rv[i],[p,q]=rv[i+1],dx=p-a,dy=q-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(x-a-dx*t,y-b-dy*t);if(d<m)m=d}return m};
  const rn=(i,j,s)=>{const v=Math.sin(i*127.1+j*311.7+s*74.7)*43758.5453;return v-Math.floor(v)};
  const base=[['#74777a','#7e8184'],['#b8a679','#c2b184'],['#8d9298','#979ca2'],['#7b8088','#858a92']];
  const ground=['#d6d0c0','#cdb98a','#e0dacb','#dad6cc'];
  gus.forEach(g=>{
    const b=g.bbox,[bx1,by1]=pj([b[0],b[3]]),[bx2,by2]=pj([b[2],b[1]]);
    if(bx2<vx0||bx1>vx1||by2<vy0||by1>vy1)return;
    const st=stageOf(g.code),ty=GU_TYPE[g.code]||'low',B=TYPE_B[ty],seed=parseInt(g.code,10)%97;
    const th=(rn(seed,1,3)-.5)*(ty==='old'?.9:ty==='biz'?.25:.55); // 구마다 격자 각도가 다르다
    const ct=Math.cos(th),sn=Math.sin(th),cx=(bx1+bx2)/2,cy=(by1+by2)/2;
    const x0v=Math.max(bx1,vx0),x1v=Math.min(bx2,vx1),y0v=Math.max(by1,vy0),y1v=Math.min(by2,vy1);
    // 보이는 영역을 감싸는 회전 격자 범위
    const corners=[[x0v,y0v],[x1v,y0v],[x0v,y1v],[x1v,y1v]].map(([x,y])=>[((x-cx)*ct+(y-cy)*sn)/B,(-(x-cx)*sn+(y-cy)*ct)/B]);
    const iMin=Math.floor(Math.min(...corners.map(p=>p[0]))),iMax=Math.ceil(Math.max(...corners.map(p=>p[0]))),jMin=Math.floor(Math.min(...corners.map(p=>p[1]))),jMax=Math.ceil(Math.max(...corners.map(p=>p[1])));
    c.save();c.clip(g.p,'evenodd');
    const cells=[];
    for(let j=jMin;j<=jMax;j++)for(let i=iMin;i<=iMax;i++){
      const lx=i*B,ly=j*B,x=cx+lx*ct-ly*sn,y=cy+lx*sn+ly*ct;
      if(x<vx0||x>vx1||y<vy0||y>vy1)continue;
      const dr=dseg(x,y);if(dr<.7)continue;
      const forest=pk.some(([mx,my,mr])=>Math.hypot((x-mx)/1.5,y-my)<mr)||rn(i,j,seed)<.06;
      const park=dr<1.5&&rn(i,j,2+seed)<.6;
      cells.push({x,y,i,j,k:forest?2:park?1:0,avenue:(i%5===0||j%5===0)});
    }
    // 1) 바닥(도로·인도·공원·숲)
    cells.forEach(({x,y,i,j,k,avenue})=>{
      c.save();c.translate(x,y);c.rotate(th);
      const h=B/2+.012;
      if(k===2){c.fillStyle='#4a8d4a';c.fillRect(-h,-h,B+.024,B+.024)}
      else if(k===1){c.fillStyle='#78b562';c.fillRect(-h,-h,B+.024,B+.024)}
      else{c.fillStyle=base[st][(i+j)&1];c.fillRect(-h,-h,B+.024,B+.024);const m=avenue?.15:.09;c.fillStyle=ground[st];c.fillRect(-h+m,-h+m,B+.024-2*m,B+.024-2*m);
        if(avenue){c.fillStyle='rgba(255,255,255,.35)';c.fillRect(-h,-.01,B+.024,.02)}}
      c.restore();
    });
    // 2) 지붕·나무 목록(로컬 좌표) 만들기
    const items=[];
    cells.forEach(({x,y,i,j,k})=>{
      const w=B-.26,o=-w/2,add=(it)=>items.push({cx:x,cy:y,...it});
      if(k){const n=k===2?7:3;for(let q=0;q<n;q++)add({t:'tree',x:o+rn(i,j,10+q)*w,y:o+rn(i,j,20+q)*w,r:.1+.09*rn(i,j,30+q),f:k===2});return}
      const R=(q,n)=>rn(i,j,q+n);
      if(st===0){ // 폐허
        const nr=ty==='old'?5:3;for(let q=0;q<nr;q++){const rw=(.14+.16*R(q,0))*B/.7,rh=(.12+.16*R(q,4))*B/.7;add({t:'rect',x:o+R(q,8)*(w-rw),y:o+R(q,12)*(w-rh),w:rw,h:rh,c:['#5d6063','#6c7073','#4f5356'][q%3],sh:.05})}
        if(R(0,40)<.5)add({t:'moss',x:o+R(0,41)*w,y:o+R(0,42)*w,r:.13});
        if(R(0,43)<.3)add({t:'circ',x:o,y:o+R(0,44)*w,w});
      }else if(st===1){ // 임시 정착
        for(let q=0;q<5;q++){const rw=.12+.1*R(q,0),rh=.1+.08*R(q,4);add({t:'rect',x:o+R(q,8)*(w-rw),y:o+R(q,12)*(w-rh),w:rw,h:rh,c:['#3d78c2','#d9c58b','#5a8f58','#b5503f','#8e9aa6'][Math.floor(R(q,20)*5)],sh:.04})}
        if(R(0,45)<.4)add({t:'fire',x:o+R(0,46)*w,y:o+R(0,47)*w});
      }else{ // 복구(2) / 번영(3): 도시 성격별 배치
        const P=st===3?['#8fb8d8','#a9c6dc','#c9d6e0','#7fa9c8']:['#d9cfbb','#c4553d','#9bb0c6','#e8e1d1'];
        const sh=st===3?.2:.07,pick=q=>P[Math.floor(R(q,14)*P.length)];
        if(ty==='old'){const n=3;for(let a=0;a<n;a++)for(let b2=0;b2<n;b2++){if(R(a*3+b2,0)<.15)continue;const s0=w/n;add({t:'rect',x:o+a*s0+.02,y:o+b2*s0+.02,w:s0*(.7+.2*R(a,5)),h:s0*(.7+.2*R(b2,9)),c:st===3?pick(a+b2):['#4a4f57','#5a5f66','#6a5a52'][(a+b2)%3],sh:sh*.6})}}
        else if(ty==='biz'){const n=R(0,0)<.5?1:2;for(let q=0;q<n;q++){const rw=n===1?w*.72:w*.46,rh=n===1?w*.72:w*.5;add({t:'rect',x:n===1?o+w*.14:o+q*w*.5+.02,y:n===1?o+w*.14:o+R(q,3)*w*.4,w:rw,h:rh,c:pick(q),sh:sh*1.5,glass:true})}}
        else if(ty==='apt'){for(let q=0;q<3;q++){add({t:'rect',x:o+.02,y:o+q*(w/3)+.04,w:w*.9,h:w/3-.12,c:pick(q),sh:sh*1.1})}add({t:'tree',x:o+w*.5,y:o+w*.5,r:.07,f:false})}
        else if(ty==='ind'){add({t:'rect',x:o+.03,y:o+.03,w:w*.62,h:w*.55,c:['#b9c1c8','#a9b4bc','#c8ccd0'][Math.floor(R(1,2)*3)],sh:sh*.7});add({t:'rect',x:o+w*.7,y:o+w*.5,w:w*.28,h:w*.42,c:'#8d949b',sh:sh*.6});if(R(0,5)<.6)add({t:'rect',x:o+.03,y:o+w*.7,w:w*.18,h:.07,c:'#c4553d',sh:0})}
        else{for(let a=0;a<2;a++)for(let b2=0;b2<2;b2++){if(R(a*2+b2,0)<.12)continue;const rw=w/2-.05,rh=w/2-.05;add({t:'rect',x:o+a*w/2+.03,y:o+b2*w/2+.03,w:rw*(.8+.2*R(a,5)),h:rh*(.8+.2*R(b2,9)),c:pick(a*2+b2),sh})}}
      }
    });
    // 3) 그림자 → 지붕·나무
    const place=(it,fn)=>{c.save();c.translate(it.cx,it.cy);c.rotate(th);fn();c.restore()};
    items.forEach(o=>{if(o.t==='rect'&&o.sh){place(o,()=>{c.fillStyle='rgba(20,30,40,.30)';const d=o.sh;c.beginPath();c.moveTo(o.x+o.w,o.y);c.lineTo(o.x+o.w+d,o.y+d);c.lineTo(o.x+o.w+d,o.y+o.h+d);c.lineTo(o.x+d,o.y+o.h+d);c.lineTo(o.x,o.y+o.h);c.lineTo(o.x+o.w,o.y+o.h);c.closePath();c.fill()})}
      else if(o.t==='tree'){place(o,()=>{c.fillStyle='rgba(20,60,30,.28)';c.beginPath();c.arc(o.x+.05,o.y+.06,o.r,0,7);c.fill()})}});
    items.forEach(o=>{place(o,()=>{
      if(o.t==='rect'){c.fillStyle=o.c;c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle='rgba(255,255,255,.28)';c.fillRect(o.x,o.y,o.w,Math.min(.03,o.h*.2));if(o.glass){c.fillStyle='rgba(255,255,255,.35)';c.fillRect(o.x+o.w*.12,o.y+o.h*.12,o.w*.3,o.h*.3)}}
      else if(o.t==='tree'){c.fillStyle=o.f?'#3f7f40':'#5aa24d';c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill();c.fillStyle='rgba(190,230,140,.55)';c.beginPath();c.arc(o.x-o.r*.3,o.y-o.r*.3,o.r*.5,0,7);c.fill()}
      else if(o.t==='moss'){c.fillStyle='rgba(110,160,80,.65)';c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill()}
      else if(o.t==='circ'){c.strokeStyle='rgba(90,220,255,.8)';c.lineWidth=.025;c.beginPath();c.moveTo(o.x,o.y);c.lineTo(o.x+o.w*.5,o.y);c.lineTo(o.x+o.w*.5,o.y+.18);c.lineTo(o.x+o.w,o.y+.18);c.stroke()}
      else if(o.t==='fire'){c.fillStyle='rgba(255,170,60,.9)';c.beginPath();c.arc(o.x,o.y,.04,0,7);c.fill();c.fillStyle='rgba(255,170,60,.25)';c.beginPath();c.arc(o.x,o.y,.12,0,7);c.fill()}
    })});
    c.restore();
  });
}
