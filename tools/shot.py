#!/usr/bin/env python3
"""Chrome 헤드리스로 페이지가 '준비됨'(window.__cardReady)이 될 때까지 기다린 뒤 PNG로 저장한다.
표준 라이브러리만 쓴다(Chrome DevTools Protocol을 직접 말함).

사용: python3 shot.py <URL> <출력.png> <너비> <높이> [배율=1] [대기ms=20000] [포트=9333]
환경변수 CHROME 으로 Chrome 실행 파일 경로를 바꿀 수 있다.
"""
import base64, json, os, socket, struct, subprocess, sys, tempfile, time, urllib.request

CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


class WS:
    def __init__(self, url):
        assert url.startswith("ws://")
        host, _, path = url[5:].partition("/")
        h, _, p = host.partition(":")
        self.s = socket.create_connection((h, int(p)), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{path} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        if b" 101 " not in buf.split(b"\r\n")[0]:
            raise RuntimeError("WebSocket 연결 실패: " + buf.decode(errors="replace")[:200])
        self.rest = buf.split(b"\r\n\r\n", 1)[1]
        self.id = 0

    def _read(self, n):
        while len(self.rest) < n:
            chunk = self.s.recv(1 << 20)
            if not chunk:
                raise EOFError("연결이 끊겼습니다")
            self.rest += chunk
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def _send_frame(self, op, data):
        mask = os.urandom(4)
        n = len(data)
        head = bytes([0x80 | op])
        if n < 126:
            head += bytes([0x80 | n])
        elif n < 65536:
            head += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            head += bytes([0x80 | 127]) + struct.pack(">Q", n)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.s.sendall(head + mask + masked)

    def _recv_message(self):
        payload, op0 = b"", None
        while True:
            b1, b2 = self._read(2)
            fin, op = b1 & 0x80, b1 & 0x0F
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._read(8))[0]
            data = self._read(n)
            if op == 9:                                  # ping → pong
                self._send_frame(10, data)
                continue
            if op == 8:
                raise EOFError("서버가 연결을 닫았습니다")
            if op in (1, 2):
                op0, payload = op, data
            elif op == 0:
                payload += data
            if fin:
                return payload.decode("utf-8", "replace")

    def call(self, method, params=None):
        self.id += 1
        mid = self.id
        self._send_frame(1, json.dumps({"id": mid, "method": method, "params": params or {}}).encode())
        while True:
            msg = json.loads(self._recv_message())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})


def http(url, method="GET"):
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def main():
    if len(sys.argv) < 5:
        print(__doc__)
        sys.exit(1)
    url, out, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    wait_ms = int(sys.argv[6]) if len(sys.argv) > 6 else 20000
    port = int(sys.argv[7]) if len(sys.argv) > 7 else 9333

    prof = tempfile.mkdtemp(prefix="dnw-chrome-")
    proc = subprocess.Popen(
        [CHROME, "--headless=new", f"--remote-debugging-port={port}", f"--user-data-dir={prof}", "--disable-gpu",
         "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(80):
            try:
                http(f"http://127.0.0.1:{port}/json/version")
                break
            except Exception:
                time.sleep(.25)
        else:
            raise RuntimeError("Chrome 디버그 포트에 연결하지 못했습니다")
        tab = http(f"http://127.0.0.1:{port}/json/new?about:blank", "PUT")
        ws = WS(tab["webSocketDebuggerUrl"])
        ws.call("Page.enable")
        ws.call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": scale, "mobile": False})
        ws.call("Page.navigate", {"url": url})
        deadline = time.time() + wait_ms / 1000
        ready = False
        while time.time() < deadline:
            r = ws.call("Runtime.evaluate", {"expression": "window.__cardReady===true", "returnByValue": True})
            if r.get("result", {}).get("value") is True:
                ready = True
                break
            time.sleep(.2)
        if not ready:
            print("경고: 준비 신호(__cardReady)를 받지 못하고 찍습니다", file=sys.stderr)
        time.sleep(1.2)                                   # 라벨·질감·애니메이션 한 프레임 안정화
        shot = ws.call("Page.captureScreenshot", {"format": "png", "fromSurface": True,
                                                   "clip": {"x": 0, "y": 0, "width": w, "height": h, "scale": 1}})
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        with open(out, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("저장:", out)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
