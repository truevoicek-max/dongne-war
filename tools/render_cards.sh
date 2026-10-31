#!/usr/bin/env bash
# 지도 화면을 인스타용 카드 이미지(PNG)로 출력한다. (macOS, Chrome 헤드리스 사용)
#   bash tools/render_cards.sh                      # 1주차, 1080x1350, 3장(korea seoul gyeonggi)
#   bash tools/render_cards.sh -w 2 -s 1080x1920    # 2주차, 세로로 긴 릴스·스토리 비율
#   bash tools/render_cards.sh -x                   # 고해상도(기기 배율 2배)
#   bash tools/render_cards.sh -c "seoul" -p 8800   # 서울 카드만, 포트 지정
#   -t 30000  페이지가 준비될 때까지 최대 기다리는 시간(ms, 기본 20000)
# 결과: cards/<카드>_w<주차>[_<크기>][@2x].png
set -euo pipefail

WEEK=1; SIZE=1080x1350; HIRES=0; PORT=8793; CARDS="korea seoul gyeonggi"; OUT=""; WAIT=20000; DEBUG_PORT=9333
while getopts "w:s:xp:c:o:t:h" o; do
  case $o in
    w) WEEK=$OPTARG;; s) SIZE=$OPTARG;; x) HIRES=1;; p) PORT=$OPTARG;; c) CARDS=$OPTARG;; o) OUT=$OPTARG;; t) WAIT=$OPTARG;;
    h|*) sed -n 2,10p "$0" | sed 's/^# \{0,1\}//'; exit 0;;
  esac
done

HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${OUT:-$HERE/cards}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[[ -x "$CHROME" ]] || { echo "Chrome을 찾을 수 없습니다: $CHROME (CHROME=경로 로 지정)"; exit 1; }
[[ "$SIZE" =~ ^[0-9]+x[0-9]+$ ]] || { echo "크기는 1080x1350 형식으로 쓰세요"; exit 1; }
W="${SIZE%x*}"; H="${SIZE#*x}"
mkdir -p "$OUT"

# 비어 있는 포트를 찾는다(이미 쓰이면 다음 포트로)
port_busy(){ lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
for _ in $(seq 1 20); do port_busy "$PORT" || break; PORT=$((PORT+1)); done
port_busy "$PORT" && { echo "빈 포트를 찾지 못했습니다"; exit 1; }

for _ in $(seq 1 20); do port_busy "$DEBUG_PORT" || break; DEBUG_PORT=$((DEBUG_PORT+1)); done
cd "$HERE"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -fs "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1 && break; sleep .25; done

SCALE=1; SUFFIX=""
[[ "$SIZE" != "1080x1350" ]] && SUFFIX="_$SIZE"
if [[ $HIRES == 1 ]]; then SCALE=2; SUFFIX="$SUFFIX@2x"; fi

for c in $CARDS; do
  FILE="$OUT/${c}_w${WEEK}${SUFFIX}.png"
  URL="http://127.0.0.1:$PORT/index.html?card=$c&size=$SIZE&week=$WEEK"
  if python3 -I "$HERE/tools/shot.py" "$URL" "$FILE" "$W" "$H" "$SCALE" "$WAIT" "$DEBUG_PORT" >/dev/null; then echo "저장: $FILE"; else echo "실패: $c" >&2; fi
done
