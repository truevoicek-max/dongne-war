// 지도 카드 이미지 출력 모드.  사용: index.html?card=korea|seoul|gyeonggi&size=1080x1350&week=1
// app.js 뒤에 로드되며, 아래 app.js 전역에 의존한다:
//   SIDO, SGG, TEX, view, sel, vb, anim, resize(), safe(), place(), targetFor(), rebanner()
//   (있으면) home, limit, ctl, boundsFor() — 확대·이동 기능이 쓰는 기준 뷰
// 파라미터가 없으면 아무것도 하지 않는다(일반 화면에는 영향 없음).
(()=>{
  const P=new URLSearchParams(location.search);
  const kind=P.get('card');
  if(!kind)return;
  const CARDS={korea:{sel:null},seoul:{sel:'11'},gyeonggi:{sel:'41'}};
  if(!CARDS[kind])return;

  const [W,H]=(P.get('size')||'1080x1350').split('x').map(Number);
  const week=+P.get('week')||1;
  const u=innerWidth/1080;                       // 1080폭을 기준으로 글자·여백을 비례시킨다
  const tall=H/W>1.6;                            // 1080x1920(릴스·스토리) 같은 세로로 긴 카드
  const top=Math.round(innerHeight*(tall?.135:.165));
  const bot=Math.round(innerHeight*(kind==='korea'?(tall?.225:.25):(tall?.17:.2)));

  document.body.classList.add('card','card-'+kind);
  document.documentElement.style.setProperty('--u',u);
  const link=document.createElement('link');link.rel='stylesheet';link.href='card.css';document.head.appendChild(link);
  document.getElementById('title')?.remove();

  // 지도가 놓일 영역(머리글·바닥글 사이). app.js의 safe()를 카드용으로 대체한다.
  window.safe=function(){return{l:0,t:top,r:0,b:bot}};

  const T={
    korea:()=>({cap:'AI가 점령한 한반도,<br>서울·경기만 수복했다',legend:true}),
    seoul:()=>({cap:`서울 ${SGG.filter(g=>g.sido==='11').length}개 구 현황`}),
    gyeonggi:()=>({cap:`경기 ${SGG.filter(g=>g.sido==='41').length}개 시·군 현황`})
  };

  function buildUI(){
    const t=T[kind]();
    const ui=document.createElement('div');ui.id='cardUI';
    ui.innerHTML=
      `<div class="c-head"><div class="c-logo">동네<em>전쟁</em></div><div class="c-season">SEASON 1 · WEEK ${week}</div></div>`+
      `<div class="c-foot" style="height:${bot}px">`+
        `<div class="c-panel">`+
          `<div class="c-cap">${t.cap}</div>`+
          (t.legend?`<div class="c-legend"><span><i class="lg on"></i>수복 지역</span><span><i class="lg ai"></i>AI 점령 지역</span></div>`:'')+
          `<div class="c-tag">댓글에 동네 이름만 쓰세요.<br>거기에 집이 지어집니다.</div>`+
        `</div>`+
        `<div class="c-src">경계: 통계청 SGIS(공공누리 제1유형) · 가공 vuski/admdongkor(CC BY 4.0) · 단순화한 게임용 근사 경계</div>`+
      `</div>`;
    document.body.appendChild(ui);
    ui.querySelector('.c-head').style.height=top+'px';
  }

  function show(){
    const c=CARDS[kind];
    sel=c.sel;view=c.sel?'city':'korea';anim=null;
    resize();                                    // 새 safe()로 캔버스·지도 영역을 다시 계산한다
    // 보이는 범위를 카드용으로 맞춘다. 확대·이동 기능이 들고 있는 기준 뷰(home)·한계(limit)도 함께 맞춘다.
    const bb=c.sel?SIDO.find(x=>x.code===c.sel).bbox:[125.45,33.0,129.85,38.65];   // 한반도는 동해 끝 섬을 잘라 본토를 크게
    const v=targetFor(bb);
    if(typeof home!=='undefined')home={...v};
    if(typeof limit!=='undefined'&&typeof boundsFor==='function')limit=boundsFor(bb);
    if(typeof ctl!=='undefined'){ctl.z=ctl.zt=1;ctl.a=null}
    vb=v;place();rebanner();
    window.__cardReady=true;
    document.title='card-ready';
  }

  // app.js의 init()(데이터·텍스처 로드 후 비동기 실행)이 끝날 때까지 기다린다.
  let tries=0;
  const wait=setInterval(()=>{
    tries++;
    const ok=typeof SGG!=='undefined'&&SGG.length&&SGG[0].p&&TEX&&typeof resize==='function';
    if(!ok){if(tries>400)clearInterval(wait);return}
    clearInterval(wait);
    buildUI();
    show();
    setTimeout(show,400);                        // 레이아웃이 자리 잡은 뒤 한 번 더 맞춘다
    setTimeout(show,1500);                       // 폰트가 늦게 적용돼도 라벨 위치가 맞도록
  },50);
})();
