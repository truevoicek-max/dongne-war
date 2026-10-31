# 동네전쟁

AI와의 전쟁 이후, 서울·경기만 수복한 한반도. 인스타 댓글로 내 동네에 집을 지어 지역끼리 겨루는 참여형 게임의 **지도 화면 시안**입니다. (참여는 인스타그램에서, 이 사이트는 관전용)

- 타이틀 → 한반도 → 시·도 → 하위 시·구 구획 순으로 들어갑니다.
- 화면의 인구·건물 수 등 모든 수치는 화면 확인용 임의 값입니다.
- 구 진입 후 건물 타일 지도는 `demo/terrain.html`의 코드 시안입니다.

## 실행

정적 파일이라 서버 없이 올릴 수 있습니다. 로컬에서 보려면:

```bash
python3 -m http.server 8000
```

그리고 `http://localhost:8000` 을 엽니다. 타이틀을 건너뛰려면 주소 끝에 `#skip`, 프레임 수를 보려면 `?fps` 를 붙입니다.

## 구성

| 경로 | 내용 |
|---|---|
| `index.html`, `style.css`, `app.js` | 게임 화면 (뼈대·스타일·동작) |
| `card.js`, `card.css` | 인스타 카드 이미지 출력 모드(`?card=`). 일반 화면에는 영향 없음 |
| `data/sido.json`, `data/sgg.json` | 시도·시군구 경계 (단순화) |
| `assets/` | 타이틀 키아트, 수복 지역·AI 점령 지역 질감 |
| `tools/render_cards.sh`, `tools/shot.py` | 카드 이미지를 자동으로 뽑는 스크립트(아래 참고) |
| `cards/` | 출력된 카드 이미지 |
| `tools/build_boundaries.py` | 행정동 경계를 시도·시군구로 합쳐 `data/` 를 만드는 스크립트 |
| `demo/terrain.html` | 구 진입 후 지형·건물 배치 시안 |

## 인스타용 카드 이미지 출력

지도 화면을 그대로 인스타 비율의 이미지로 뽑습니다. 로고, 시즌·주차, 지도(한반도·서울·경기), 문구, 출처 표기가 한 장에 들어갑니다. 수치(인구 등)는 넣지 않습니다.

```bash
bash tools/render_cards.sh                      # 1주차, 1080x1350, 3장(한반도·서울·경기)
bash tools/render_cards.sh -w 2                 # 2주차
bash tools/render_cards.sh -s 1080x1920         # 릴스·스토리 비율
bash tools/render_cards.sh -x                   # 고해상도(2배)
bash tools/render_cards.sh -c "seoul"           # 한 장만(korea, seoul, gyeonggi)
```

- 결과는 `cards/<카드>_w<주차>[_<크기>][@2x].png` 로 저장됩니다. 예: `cards/seoul_w1.png`
- macOS와 Google Chrome이 필요합니다(`CHROME=경로` 로 실행 파일을 바꿀 수 있음). 별도 설치는 없고 파이썬 기본 기능만 씁니다.
- 임시 서버와 Chrome을 띄웠다가 끝나면 닫습니다. 포트가 사용 중이면 다음 포트를 씁니다(`-p` 로 시작 포트 지정).
- 한 장당 3~4초 걸립니다. 느린 기기에서 준비 신호를 못 받으면 `-t 30000` 처럼 기다리는 시간을 늘리세요.
- 브라우저에서 직접 보려면 `index.html?card=seoul&size=1080x1350&week=1`.
- 경기 카드는 시·군이 많아 서로 겹치는 이름 일부(광명·안양 등 서울 근처)는 자동으로 숨겨집니다.

## 출처

경계 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)가 공공누리 제1유형으로 개방한 행정동 경계를 vuski/admdongkor(https://github.com/vuski/admdongkor)가 가공한 것(CC BY 4.0)을 이 저장소에서 다시 합치고 단순화한 것입니다. 일부 지역 경계는 실제 행정경계와 다를 수 있습니다.

`assets/` 의 이미지는 이미지 생성 AI로 만든 것입니다. 이 저장소의 코드와 에셋의 사용 조건은 아직 정하지 않았습니다.
