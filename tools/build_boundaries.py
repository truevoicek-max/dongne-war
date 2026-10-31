"""행정동 GeoJSON(vuski/admdongkor, 통계청 SGIS 가공)을 시도·시군구 경계로 합쳐 게임용 JSON으로 만든다.
사용: python3 -I build_boundaries.py <dong.geojson> <출력폴더>
방식: 같은 시도/시군구에 속한 행정동 폴리곤의 변 중 두 번 나오는(내부) 변을 지우고 남은 바깥 변을 고리로 잇는다.
출처: 통계청 SGIS(공공누리 제1유형), 가공 vuski/admdongkor (CC BY 4.0)
"""
import json, sys, os
from collections import defaultdict

PREC = 5
PROVINCES = {'41', '51', '43', '44', '52', '47', '48', '50'}  # 경기·강원·충북·충남·전북·경북·경남·제주

def key(p): return (round(p[0], PREC), round(p[1], PREC))

def dissolve(polys):
    cnt = defaultdict(int)
    for rings in polys:
        for ring in rings:
            pts = [key(p) for p in ring]
            for a, b in zip(pts, pts[1:]):
                if a == b: continue
                cnt[(a, b) if a < b else (b, a)] += 1
    adj = defaultdict(list)
    for (a, b), c in cnt.items():
        if c % 2 == 1:
            adj[a].append(b); adj[b].append(a)
    used = set(); rings = []
    for start in list(adj):
        for nxt in list(adj[start]):
            e = (start, nxt) if start < nxt else (nxt, start)
            if e in used: continue
            ring = [start]; prev = start; cur = nxt; used.add(e)
            while True:
                ring.append(cur)
                if cur == start: break
                cand = None
                for n in adj[cur]:
                    e2 = (cur, n) if cur < n else (n, cur)
                    if e2 not in used: cand = (n, e2); break
                if not cand: break
                n, e2 = cand; used.add(e2); prev, cur = cur, n
            if len(ring) > 3 and ring[0] == ring[-1]: rings.append(ring)
    return rings

def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = (dx*dx + dy*dy) ** .5
    best, idx = -1, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy*(x-x1) - dx*(y-y1)) / L if L else ((x-x1)**2 + (y-y1)**2) ** .5
        if d > best: best, idx = d, i
    if best > eps:
        return dp(pts[:idx+1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]

def area_centroid(r):
    a = cx = cy = 0
    for (x1, y1), (x2, y2) in zip(r, r[1:]):
        c = x1*y2 - x2*y1; a += c; cx += (x1+x2)*c; cy += (y1+y2)*c
    if a == 0: return 0, r[0]
    return a/2, (cx/(3*a), cy/(3*a))

def build(groups, eps):
    out = []
    for gk, (meta, polys) in groups.items():
        rings = []
        for r in dissolve(polys):
            if len(r) < 5 and eps > .002: continue
            s = dp(r, eps)
            if len(s) >= 4: rings.append([[round(x, 4), round(y, 4)] for x, y in s])
        if not rings: continue
        big = max(rings, key=lambda r: abs(area_centroid(r)[0]))
        c = area_centroid(big)[1]
        xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
        meta = dict(meta); meta['center'] = [round(c[0], 4), round(c[1], 4)]
        meta['bbox'] = [min(xs), min(ys), max(xs), max(ys)]; meta['rings'] = rings
        out.append(meta)
    return out

def main(src, outdir):
    feats = json.load(open(src))['features']
    sido, sgg = {}, {}
    for f in feats:
        p = f['properties']; g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        sido.setdefault(p['sido'], ({'code': p['sido'], 'name': p['sidonm']}, []))[1].extend(polys)
        code, nm = p['sgg'], p['sggnm']
        # 도(道) 안의 '수원시장안구' 같은 구는 시 단위로 합친다(광역시·서울의 구는 그대로 둔다)
        if p['sido'] in PROVINCES and '시' in nm and not nm.endswith('시') and nm.index('시') < len(nm) - 1:
            nm = nm[:nm.index('시') + 1]; code = code[:4] + '0'
        sgg.setdefault(code, ({'code': code, 'sido': p['sido'], 'name': nm, 'sidoName': p['sidonm']}, []))[1].extend(polys)
    os.makedirs(outdir, exist_ok=True)
    for name, groups, eps in [('sido', sido, .006), ('sgg', sgg, .0012)]:
        data = build(groups, eps)
        path = os.path.join(outdir, name + '.json')
        json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
        print(name, len(data), os.path.getsize(path) // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
