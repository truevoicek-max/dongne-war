#!/usr/bin/env python3
"""랜드마크 원본(마젠타 배경, 왼쪽=온전 / 오른쪽=파손)을 투명 배경 PNG 두 장으로 가공한다.
표준 라이브러리 + 헤드리스 Chrome만 쓴다(설치할 것 없음). 실제 처리는 tools/landmark_key.html 이 캔버스에서 한다.

사용:
  python3 tools/process_landmarks.py [--raw 원본폴더] [--out 출력폴더] [--maxh 640] [--maxw 900] [이름 ...]
기본: --raw assets/landmarks_raw, --out assets/landmarks, 이름은 폴더의 *.png 전부.
결과: <출력폴더>/<이름>_intact.png, <이름>_ruined.png
"""
import argparse, base64, functools, glob, http.server, json, os, sys, tempfile, threading, time
import subprocess, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from shot import WS, CHROME, http as cdp_http   # noqa: E402  (shot.py의 CDP 클라이언트를 재사용)


def make_server(raw_dir):
    class H(http.server.SimpleHTTPRequestHandler):
        def translate_path(self, path):
            p = urllib.parse.unquote(urllib.parse.urlparse(path).path)
            if p.startswith("/raw/"):
                return os.path.join(raw_dir, os.path.basename(p))
            return os.path.join(ROOT, p.lstrip("/"))

        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=os.path.join(ROOT, "assets", "landmarks_raw"))
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "landmarks"))
    ap.add_argument("--maxh", type=int, default=640)
    ap.add_argument("--maxw", type=int, default=900)
    ap.add_argument("--port", type=int, default=9341)
    ap.add_argument("--quad", action="store_true", help="NxN 시트를 칸마다 한 장(<이름>_1~.png)으로 자른다")
    ap.add_argument("--grid", type=int, default=2, help="--quad일 때 한 변의 칸 수(기본 2)")
    ap.add_argument("names", nargs="*")
    a = ap.parse_args()

    names = a.names or sorted(os.path.splitext(os.path.basename(f))[0] for f in glob.glob(os.path.join(a.raw, "*.png")))
    os.makedirs(a.out, exist_ok=True)
    srv = make_server(a.raw)
    base = f"http://127.0.0.1:{srv.server_address[1]}"

    prof = tempfile.mkdtemp(prefix="dnw-lm-")
    proc = subprocess.Popen(
        [CHROME, "--headless=new", f"--remote-debugging-port={a.port}", f"--user-data-dir={prof}", "--disable-gpu",
         "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(80):
            try:
                cdp_http(f"http://127.0.0.1:{a.port}/json/version")
                break
            except Exception:
                time.sleep(.25)
        else:
            raise RuntimeError("Chrome 디버그 포트에 연결하지 못했습니다")
        for n in names:
            tab = cdp_http(f"http://127.0.0.1:{a.port}/json/new?about:blank", "PUT")
            ws = WS(tab["webSocketDebuggerUrl"])
            ws.call("Page.enable")
            url = f"{base}/tools/landmark_key.html?src=/raw/{urllib.parse.quote(n)}.png&maxh={a.maxh}&maxw={a.maxw}{('&quad=1&grid=%d' % a.grid) if a.quad else ''}"
            ws.call("Page.navigate", {"url": url})
            deadline = time.time() + 90
            while time.time() < deadline:
                r = ws.call("Runtime.evaluate", {"expression": "window.__done===true", "returnByValue": True})
                if r.get("result", {}).get("value") is True:
                    break
                time.sleep(.3)
            res = ws.call("Runtime.evaluate", {"expression": "JSON.stringify(window.__out)", "returnByValue": True})
            out = json.loads(res["result"]["value"])
            if "error" in out:
                print(n, "실패:", out["error"])
                continue
            if a.quad:
                for i, durl in enumerate(out["quad"], 1):
                    pth = os.path.join(a.out, f"{n}_{i}.png")
                    with open(pth, "wb") as f:
                        f.write(base64.b64decode(durl.split(",", 1)[1]))
                    print(f"{n}_{i}.png  {out['sizes'][i-1][0]}x{out['sizes'][i-1][1]}  {os.path.getsize(pth)//1024}KB")
                continue
            for state in ("intact", "ruined"):
                data = out[state].split(",", 1)[1]
                p = os.path.join(a.out, f"{n}_{state}.png")
                with open(p, "wb") as f:
                    f.write(base64.b64decode(data))
                print(f"{n}_{state}.png  {out[state + 'Size'][0]}x{out[state + 'Size'][1]}  {os.path.getsize(p)//1024}KB")
            print(f"  분리 위치 x={out['split']['x']} (빈 열 {'있음' if out['split']['empty'] else '없음'}, 원본 {out['size'][0]}x{out['size'][1]})")
            try:
                cdp_http(f"http://127.0.0.1:{a.port}/json/close/{tab['id']}")
            except Exception:
                pass
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        srv.shutdown()


if __name__ == "__main__":
    main()
