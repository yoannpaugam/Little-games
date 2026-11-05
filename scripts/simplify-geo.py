#!/usr/bin/env python3
"""Allège la carte du Géoquizz (games/geo/data/world.json) en simplifiant les contours.

Usage : python3 scripts/simplify-geo.py [--eps 0.08] [--min-area 0.01] [--src fichier] [--out fichier]

- Algorithme de Douglas-Peucker, tolérance --eps en degrés.
- Les frontières communes restent identiques entre pays voisins : chaque anneau est coupé aux
  points où le voisin change (jonctions), et chaque tronçon est simplifié de la même façon,
  quel que soit le sens dans lequel il est parcouru. Pas de trous ni de chevauchements.
- Les îles et les trous plus petits que --min-area (en degrés carrés) sont retirés, sauf le
  plus grand morceau de chaque pays.
- Le tracé des terres (`land`, en unités de 1/units degré) est simplifié avec la même tolérance.

Par défaut, le fichier est lu et réécrit sur place. La source d'origine (non simplifiée) est le
fichier « Traque internationale » ; relancer le script sur un fichier déjà simplifié le simplifie
un peu plus, sans dommage.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ROOT / 'games/geo/data/world.json'


def dp(pts, eps):
    """Douglas-Peucker itératif sur une liste de points (le premier et le dernier sont gardés)."""
    n = len(pts)
    if n < 3:
        return list(pts)
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    eps2 = eps * eps
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if l2 == 0:
                d2 = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
                d2 = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d2 > best:
                best, bi = d2, i
        if best > eps2:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


def simplify_chain(chain, eps, cache):
    """Même résultat dans les deux sens de parcours : on simplifie toujours le sens « canonique »."""
    key = tuple(chain)
    rev = key[::-1]
    canon = min(key, rev)
    if canon not in cache:
        cache[canon] = dp(list(canon), eps)
    out = cache[canon]
    return out if canon == key else out[::-1]


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def decode_ring(s):
    t = list(map(int, s.split()))
    x, y = t[0], t[1]
    pts = [(x, y)]
    for i in range(2, len(t) - 1, 2):
        x += t[i]
        y += t[i + 1]
        pts.append((x, y))
    if len(pts) > 1 and pts[-1] == pts[0]:
        pts.pop()  # anneau fermé : on enlève le point répété
    return pts


def encode_ring(pts):
    out = [pts[0][0], pts[0][1]]
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        out += [x2 - x1, y2 - y1]
    return ' '.join(map(str, out))


def simplify_countries(countries, eps, min_area):
    """Coordonnées en centièmes de degré."""
    rings = []  # (pays, polygone, anneau, points)
    for ci, c in enumerate(countries):
        for pi, poly in enumerate(c['p']):
            for ri, s in enumerate(poly):
                rings.append((ci, pi, ri, decode_ring(s)))
    owners = {}
    for k, (_, _, _, pts) in enumerate(rings):
        for p in pts:
            owners.setdefault(p, set()).add(k)

    cache = {}
    result = {}
    for k, (ci, pi, ri, pts) in enumerate(rings):
        n = len(pts)
        sets = [frozenset(owners[p]) for p in pts]
        fixed = [len(sets[i]) >= 3 or sets[i] != sets[i - 1] or sets[i] != sets[(i + 1) % n] for i in range(n)]
        idx = [i for i in range(n) if fixed[i]]
        if not idx:
            # anneau sans jonction (île, ou enclave entourée par un seul voisin) : on part de son plus petit point,
            # le même pour les deux anneaux qui partagent ce contour
            idx = [min(range(n), key=lambda i: pts[i])]
        out = []
        for a, b in zip(idx, idx[1:] + [idx[0] + n]):
            chain = [pts[i % n] for i in range(a, b + 1)]
            out += simplify_chain(chain, eps, cache)[:-1]
        result[k] = out

    out_countries = []
    for ci, c in enumerate(countries):
        polys = []
        for pi, poly in enumerate(c['p']):
            outer = None
            holes = []
            for ri, _ in enumerate(poly):
                k = next(j for j, r in enumerate(rings) if r[:3] == (ci, pi, ri))
                pts = result[k]
                if len(pts) < 3:
                    continue
                if ri == 0:
                    outer = pts
                elif area(pts) / 1e4 >= min_area:
                    holes.append(pts)
            if outer:
                polys.append((area(outer) / 1e4, [outer] + holes))
        if not polys:
            raise SystemExit(f"{c['c']} : plus aucun contour, baisse --eps")
        biggest = max(a for a, _ in polys)
        kept = [p for a, p in polys if a >= min_area or a == biggest]
        out_countries.append({**c, 'p': [[encode_ring(r) for r in poly] for poly in kept]})
    return out_countries


def simplify_land(d, eps, min_area):
    """Tracé « M x y l dx dy … z » en unités de 1/units degré."""
    u = d['units']
    out = []
    for sub in re.findall(r'M[^M]*', d['land']):
        nums = list(map(int, re.findall(r'-?\d+', sub)))
        x, y = nums[0], nums[1]
        pts = [(x, y)]
        for i in range(2, len(nums) - 1, 2):
            x += nums[i]
            y += nums[i + 1]
            pts.append((x, y))
        if len(pts) > 1 and pts[-1] == pts[0]:
            pts.pop()
        if area(pts) / (u * u) < min_area:
            continue
        first = min(range(len(pts)), key=lambda i: pts[i])
        half = (first + len(pts) // 2) % len(pts)
        a, b = sorted([first, half])
        s = dp(pts[a:b + 1], eps * u)[:-1] + dp(pts[b:] + pts[:a + 1], eps * u)[:-1]
        if len(s) < 3:
            continue
        rel = ''.join(f'{x2 - x1} {y2 - y1} ' for (x1, y1), (x2, y2) in zip(s, s[1:]))
        rel = re.sub(r' (-)', r'\1', rel.strip())
        out.append(f'M{s[0][0]} {s[0][1]}l{rel}z')
    return ''.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--eps', type=float, default=0.08, help='tolérance en degrés (défaut 0.08)')
    ap.add_argument('--min-area', type=float, default=0.01, help='îles et trous plus petits retirés (degrés carrés)')
    ap.add_argument('--src', type=Path, default=DEFAULT)
    ap.add_argument('--out', type=Path, default=DEFAULT)
    a = ap.parse_args()
    d = json.loads(a.src.read_text(encoding='utf-8'))
    before = len(json.dumps(d, separators=(',', ':')))
    d['countries'] = simplify_countries(d['countries'], a.eps * 100, a.min_area)
    d['land'] = simplify_land(d, a.eps, a.min_area)
    text = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    a.out.write_text(text, encoding='utf-8')
    pts = sum(len(r.split()) // 2 for c in d['countries'] for p in c['p'] for r in p)
    land = len(re.findall(r'-?\d+', d['land'])) // 2
    print(f'{a.out.name} : {before // 1024} Ko → {len(text) // 1024} Ko ; pays {pts} points, terres {land} points')


if __name__ == '__main__':
    main()
