// Géoquizz : géométrie sur la sphère, contours des pays et tirage d'une partie.
// Module sans DOM, testé par tests/geo.test.js.

export const QUESTIONS = 10; // pays à placer dans une partie
export const KM_FOR_ZERO_POINTS = 25000; // écart total à partir duquel le score tombe à 0
const EARTH_KM = 6371;

// Pays proposés : assez connus ou assez grands pour un groupe d'amis
export const EASY = new Set('FR ES IT DE GB PT IE NO SE FI PL GR TR UA RU CN JP IN KR TH VN ID AU NZ EG MA DZ LY NG ET KE ZA TZ CD AO SA IQ IR PK AF KZ MN CA US MX CU CO VE PE BR AR CL BO MG SN ML NE TD SD PH MY CH AT BE NL RO HU CZ IS CM GH CI UG ZM MZ NA BW PY UY EC KP SY'.split(' '));
// Régions : on répartit les pays d'une partie et on évite d'enchaîner deux pays du même continent
export const REGIONS = {
  europe: 'FR ES IT DE GB PT IE NO SE FI PL GR UA RU CH AT BE NL RO HU CZ IS',
  afrique: 'EG MA DZ LY NG ET KE ZA TZ CD AO SN ML NE TD SD MG CM GH CI UG ZM MZ NA BW',
  asie: 'TR CN JP IN KR TH VN ID SA IQ IR PK AF KZ MN PH MY KP SY',
  ameriqueNord: 'CA US MX CU',
  ameriqueSud: 'CO VE PE BR AR CL BO PY UY EC',
  oceanie: 'AU NZ',
};
export const REGION_OF = {};
Object.entries(REGIONS).forEach(([r, l]) => l.split(' ').forEach((c) => { REGION_OF[c] = r; }));
const QUOTAS = { europe: 2, afrique: 2, asie: 2, ameriqueNord: 1, ameriqueSud: 1, oceanie: 1 }; // 9 ; le dixième au hasard
const MAX_PER_REGION = 3;

// ---------------------------------------------------------------- sphère
const RAD = Math.PI / 180;
export const vec = (lat, lon) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const angle = (a, b) => Math.atan2(len(cross(a, b)), dot(a, b));
const toLatLon = (v) => ({ lat: Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD, lon: Math.atan2(v[1], v[0]) / RAD });

export function haversineKm(a, b) { return angle(vec(a.lat, a.lon), vec(b.lat, b.lon)) * EARTH_KM; }

// Point de l'arc de grand cercle [a, b] le plus proche de c : { ang, v }
function closestOnArc(c, a, b) {
  const ends = () => { const da = angle(c, a), db = angle(c, b); return da <= db ? { ang: da, v: a } : { ang: db, v: b }; };
  const n = cross(a, b), nl = len(n);
  if (nl < 1e-12) return ends();
  const nh = [n[0] / nl, n[1] / nl, n[2] / nl], k = dot(c, nh);
  const g = [c[0] - k * nh[0], c[1] - k * nh[1], c[2] - k * nh[2]], gl = len(g);
  if (gl < 1e-12) return ends();
  const gn = [g[0] / gl, g[1] / gl, g[2] / gl];
  if (dot(cross(a, gn), nh) >= 0 && dot(cross(gn, b), nh) >= 0) return { ang: angle(c, gn), v: gn };
  return ends();
}

// ---------------------------------------------------------------- contours
// Anneau codé « x0 y0 dx dy dx dy… » en centièmes de degré (longitude, latitude)
export function decodeRing(s) {
  const t = s.split(' ').map(Number), pts = [[t[0] / 100, t[1] / 100]];
  let x = t[0], y = t[1];
  for (let i = 2; i + 1 < t.length; i += 2) { x += t[i]; y += t[i + 1]; pts.push([x / 100, y / 100]); }
  return pts;
}

const cache = new Map();
/** Contours décodés d'un pays { c, n, p } : { polys: [[{ pts, vecs }]], bbox } (mis en cache). */
export function geometry(country) {
  if (cache.has(country.c)) return cache.get(country.c);
  const polys = country.p.map((poly) => poly.map((str) => {
    const pts = decodeRing(str);
    // sommets 3D, les segments longs découpés par pas de 1° (comme ils sont tracés sur la carte)
    const vecs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if (i === pts.length - 1 && x1 === pts[0][0] && y1 === pts[0][1]) break; // anneau déjà fermé
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
      for (let s = 0; s < n; s++) vecs.push(vec(y1 + (y2 - y1) * s / n, x1 + (x2 - x1) * s / n));
    }
    return { pts, vecs };
  }));
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  polys.forEach((p) => p[0].pts.forEach(([x, y]) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }));
  const g = { polys, bbox: { minX, maxX, minY, maxY } };
  cache.set(country.c, g);
  return g;
}

function inRing(pts, lon, lat) { // lancer de rayon dans le plan (lon, lat)
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Écart entre un point et le pays : 0 km s'il est dedans, sinon la distance au point le plus proche de sa frontière. */
export function distanceToCountry(country, lat, lon) {
  const g = geometry(country);
  for (const poly of g.polys) {
    if (inRing(poly[0].pts, lon, lat) && !poly.slice(1).some((r) => inRing(r.pts, lon, lat))) return { km: 0, inside: true, near: { lat, lon } };
  }
  const c = vec(lat, lon);
  let best = { ang: Infinity, v: null };
  for (const poly of g.polys) for (const ring of poly) {
    const v = ring.vecs;
    for (let i = 0; i < v.length; i++) { const r = closestOnArc(c, v[i], v[(i + 1) % v.length]); if (r.ang < best.ang) best = r; }
  }
  return { km: Math.round(best.ang * EARTH_KM), inside: false, near: toLatLon(best.v) };
}

/** Score sur 100 d'après l'écart total. */
export const pointsFromKm = (km) => Math.round(100 * Math.max(0, 1 - km / KM_FOR_ZERO_POINTS));

// ---------------------------------------------------------------- tirage
/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rngFrom(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tire `n` pays répartis sur le globe : quotas par continent, puis jamais deux pays du même continent d'affilée. */
export function pickQuiz(all, n = QUESTIONS, rnd = Math.random) {
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pool = {};
  all.filter((x) => EASY.has(x.c) && REGION_OF[x.c]).forEach((x) => { (pool[REGION_OF[x.c]] ||= []).push(x); });
  Object.keys(pool).forEach((r) => { pool[r] = shuffle(pool[r]); });
  const out = [], count = {};
  const take = (r) => {
    if (!pool[r]?.length) return false;
    out.push(pool[r].pop());
    count[r] = (count[r] || 0) + 1;
    return true;
  };
  const quotas = { ...QUOTAS };
  if (rnd() < 0.5) quotas.oceanie = 0; // l'Océanie (2 pays) n'apparaît qu'une partie sur deux
  Object.entries(quotas).forEach(([r, q]) => { for (let k = 0; k < q && out.length < n; k++) take(r); });
  for (let guard = 0; out.length < n && guard < 200; guard++) {
    const open = shuffle(Object.keys(pool).filter((r) => (r !== 'oceanie' || !count.oceanie) && (count[r] || 0) < MAX_PER_REGION && pool[r].length));
    if (!open.length || !take(open[0])) break;
  }
  if (out.length < n) { const rest = shuffle(all.filter((x) => !out.includes(x))); while (out.length < n && rest.length) out.push(rest.pop()); }
  // Ordre : on pioche toujours dans le continent le plus fourni, différent du précédent
  const order = shuffle(out), res = [];
  while (order.length) {
    const last = res.length ? REGION_OF[res[res.length - 1].c] : null, left = {};
    order.forEach((x) => { left[REGION_OF[x.c]] = (left[REGION_OF[x.c]] || 0) + 1; });
    let k = -1, best = -1;
    order.forEach((x, i) => { const r = REGION_OF[x.c]; if (r !== last && left[r] > best) { best = left[r]; k = i; } });
    if (k < 0) k = 0;
    res.push(order.splice(k, 1)[0]);
  }
  return res;
}
