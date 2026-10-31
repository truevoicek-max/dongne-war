"""한강 중심선 추출. 강을 사이에 둔 북·남안 구 쌍이 맞닿는 변(행정경계는 강 한가운데를 지난다)을 이어 붙인다.
사용: python3 -I build_terrain.py <dong.geojson> <출력 json>
"""
import json, sys
from collections import defaultdict

PREC = 5
def key(p): return (round(p[0], PREC), round(p[1], PREC))

N = {'11440', '11170', '11200', '11215', '41310', '41360'}   # 마포 용산 성동 광진 구리 남양주
S = {'11500', '11470', '11560', '11590', '11650', '11680', '11710', '11740', '41450'}  # 강서 양천 영등포 동작 서초 강남 송파 강동 하남

def main(src, out):
    d = json.load(open(src))
    sides = defaultdict(set)
    for f in d['features']:
        sg = f['properties']['sgg']
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly:
                pts = [key(p) for p in ring]
                for a, b in zip(pts, pts[1:]):
                    if a != b: sides[(a, b) if a < b else (b, a)].add(sg)
    edges = [e for e, s in sides.items() if len(s) == 2 and any(x in N for x in s) and any(x in S for x in s)]
    adj = defaultdict(list)
    for a, b in edges: adj[a].append(b); adj[b].append(a)
    # 연결 성분별로 체인 만들기
    seen = set(); chains = []
    for s in adj:
        if s in seen: continue
        comp = []; st = [s]
        while st:
            x = st.pop()
            if x in seen: continue
            seen.add(x); comp.append(x); st += adj[x]
        ends = [x for x in comp if len(adj[x]) == 1] or [comp[0]]
        cur = ends[0]; ch = [cur]; vis = {cur}
        while True:
            nx = [n for n in adj[cur] if n not in vis]
            if not nx: break
            cur = nx[0]; vis.add(cur); ch.append(cur)
        chains.append(ch)
    chains.sort(key=len, reverse=True)
    for c in chains: print(len(c), c[0], c[-1])
    json.dump({'river': [[list(p) for p in c] for c in chains]}, open(out, 'w'))

main(sys.argv[1], sys.argv[2])
