// Photos du jeu « Visages » : stockage sur l'appareil (IndexedDB), import,
// détection du visage (face-api, chargé seulement au premier import) et dessin du masque.
//
// Un enregistrement :
//   { key: 'portrait:omar-sy', id, kind: 'portrait'|'enfance', blob, thumb, w, h,
//     zones: { eyes, nose, mouth, ears, top: [forme…], face: { cx, eyeY, fw } },
//     crop: { x, y, w, h },   // cadre 2:3 affiché, en pixels de l'image
//     auto: bool,             // visage détecté automatiquement
//     manual: bool, t }       // placé à la main

const DB_NAME = 'little-games-visages';
const STORE = 'photos';
const MAX_SIDE = 1100;

export const PARTS = ['eyes', 'mouth', 'nose', 'ears', 'top'];
export const PHOTOS = new Map();
export let persistent = true;

let db = null;
let ready = null;

export const pkey = (kind, id) => `${kind}:${id}`;
export const has = (kind, id) => PHOTOS.has(pkey(kind, id));
export const get = (kind, id) => PHOTOS.get(pkey(kind, id));
export function count(kind) { let n = 0; for (const r of PHOTOS.values()) if (r.kind === kind) n++; return n; }

// ------------------------------------------------------------------ IndexedDB
export function init() {
  if (ready) return ready;
  ready = (async () => {
    db = await new Promise((res) => {
      let rq;
      try { rq = indexedDB.open(DB_NAME, 1); } catch { return res(null); }
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE, { keyPath: 'key' });
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
      rq.onblocked = () => res(null);
    });
    if (!db) { persistent = false; return; }
    try { (await run('readonly', (st) => st.getAll()) || []).forEach((r) => PHOTOS.set(r.key, r)); }
    catch { persistent = false; }
  })();
  return ready;
}
function run(mode, fn) {
  if (!db) return Promise.resolve(null);
  return new Promise((res, rej) => {
    try {
      const tx = db.transaction(STORE, mode);
      const rq = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(rq && rq.result);
      tx.onerror = tx.onabort = () => rej(tx.error);
    } catch (e) { rej(e); }
  });
}
export async function put(rec) {
  PHOTOS.set(rec.key, rec); dropCache(rec.key);
  try { await run('readwrite', (st) => st.put(rec)); } catch { persistent = false; }
}
export async function remove(key) {
  PHOTOS.delete(key); dropCache(key);
  try { await run('readwrite', (st) => st.delete(key)); } catch { /* ignore */ }
}
export async function clearAll() {
  for (const k of [...PHOTOS.keys()]) dropCache(k);
  PHOTOS.clear();
  try { await run('readwrite', (st) => st.clear()); } catch { /* ignore */ }
}

// ------------------------------------------------------------------ images en mémoire
const BITMAPS = new Map();
const THUMBS = new Map();
function dropCache(key) {
  BITMAPS.delete(key);
  if (THUMBS.has(key)) { URL.revokeObjectURL(THUMBS.get(key)); THUMBS.delete(key); }
}
async function decode(blob) {
  try { return await createImageBitmap(blob); } catch { /* repli ci-dessous */ }
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(blob);
  });
}
export async function bitmap(key) {
  if (BITMAPS.has(key)) return BITMAPS.get(key);
  const rec = PHOTOS.get(key);
  if (!rec) return null;
  const bmp = await decode(rec.blob);
  BITMAPS.set(key, bmp);
  if (BITMAPS.size > 8) BITMAPS.delete(BITMAPS.keys().next().value);
  return bmp;
}
export function thumbUrl(key) {
  if (!THUMBS.has(key)) {
    const rec = PHOTOS.get(key);
    if (!rec) return '';
    THUMBS.set(key, URL.createObjectURL(rec.thumb || rec.blob));
  }
  return THUMBS.get(key);
}
/** Précharge en mémoire (sans bloquer) les photos des cartes voisines. */
export function preload(keys) { keys.forEach((k) => { if (PHOTOS.has(k)) bitmap(k).catch(() => {}); }); }

// ------------------------------------------------------------------ détection du visage
let detector = null;
export function loadDetector() {
  if (detector) return detector;
  detector = new Promise((res) => {
    const s = document.createElement('script');
    s.src = new URL('./vendor/face-api.js', import.meta.url).href;
    s.onload = async () => {
      try {
        const fa = window.faceapi;
        try { await fa.tf.setBackend('webgl'); } catch { await fa.tf.setBackend('cpu'); }
        await fa.tf.ready();
        const models = new URL('./models/', import.meta.url).href;
        await fa.nets.ssdMobilenetv1.loadFromUri(models);
        await fa.nets.faceLandmark68Net.loadFromUri(models);
        res(true);
      } catch (e) { console.warn('[visages] détection indisponible', e); res(false); }
    };
    s.onerror = () => res(false);
    document.head.append(s);
  });
  return detector;
}
async function detect(canvas) {
  if (!(await loadDetector())) return null;
  try {
    const fa = window.faceapi;
    const all = await fa.detectAllFaces(canvas, new fa.SsdMobilenetv1Options({ minConfidence: 0.35 })).withFaceLandmarks();
    if (!all.length) return null;
    all.sort((a, b) => b.detection.box.area - a.detection.box.area); // le plus grand visage
    return all[0].landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
  } catch (e) { console.warn(e); return null; }
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Zones à partir des 68 points de repère (indices iBUG 300-W). */
function zonesFromLandmarks(p) {
  const fw = Math.hypot(p[16].x - p[0].x, p[16].y - p[0].y);
  const cx = (p[0].x + p[16].x) / 2;
  const box = (idx) => {
    const xs = idx.map((i) => p[i].x), ys = idx.map((i) => p[i].y);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const ell = (b, sx, sy, min) => ({ t: 'e', cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2,
    rx: Math.max(((b.x1 - b.x0) / 2) * sx, min), ry: Math.max(((b.y1 - b.y0) / 2) * sy, min) });
  const eyeY = (p[39].y + p[42].y) / 2;
  const noseBottom = p[33].y;
  const browTop = Math.min(...range(17, 26).map((i) => p[i].y));
  const earCy = (eyeY + noseBottom) / 2;
  const earRy = Math.max((noseBottom - eyeY) * 1.05, fw * 0.17);
  return {
    eyes: [ell(box([...range(36, 41), ...range(17, 21)]), 1.3, 1.4, fw * 0.08), ell(box([...range(42, 47), ...range(22, 26)]), 1.3, 1.4, fw * 0.08)],
    nose: [ell(box(range(28, 35)), 1.7, 1.2, fw * 0.07)],
    mouth: [ell(box(range(48, 59)), 1.3, 1.75, fw * 0.06)],
    ears: [
      { t: 'e', cx: p[1].x - fw * 0.07, cy: earCy, rx: fw * 0.14, ry: earRy },
      { t: 'e', cx: p[15].x + fw * 0.07, cy: earCy, rx: fw * 0.14, ry: earRy },
    ],
    top: [{ t: 'r', x0: cx - fw * 1.1, x1: cx + fw * 1.1, y0: -99999, y1: browTop - fw * 0.03 }],
    face: { cx, eyeY, fw },
  };
}

/** Zones à partir de deux points : A = milieu des yeux, B = centre de la bouche. */
export function zonesFromPoints(A, B) {
  const d = Math.max(8, Math.hypot(B.x - A.x, B.y - A.y));
  const fw = 2.1 * d;
  return {
    eyes: [
      { t: 'e', cx: A.x - 0.22 * fw, cy: A.y - 0.05 * fw, rx: 0.17 * fw, ry: 0.13 * fw },
      { t: 'e', cx: A.x + 0.22 * fw, cy: A.y - 0.05 * fw, rx: 0.17 * fw, ry: 0.13 * fw },
    ],
    nose: [{ t: 'e', cx: A.x + (B.x - A.x) * 0.45, cy: A.y + (B.y - A.y) * 0.48, rx: 0.13 * fw, ry: 0.3 * d }],
    mouth: [{ t: 'e', cx: B.x, cy: B.y, rx: 0.21 * fw, ry: 0.1 * fw }],
    ears: [
      { t: 'e', cx: A.x - 0.56 * fw, cy: A.y + 0.36 * d, rx: 0.13 * fw, ry: 0.23 * fw },
      { t: 'e', cx: A.x + 0.56 * fw, cy: A.y + 0.36 * d, rx: 0.13 * fw, ry: 0.23 * fw },
    ],
    top: [{ t: 'r', x0: A.x - 1.1 * fw, x1: A.x + 1.1 * fw, y0: -99999, y1: A.y - 0.2 * fw }],
    face: { cx: A.x, eyeY: A.y, fw },
  };
}

/** Cadre 2:3 centré (repli quand aucun visage n'est trouvé). */
function coverCrop(W, H) {
  let w = W, h = W * 1.5;
  if (h > H) { h = H; w = H / 1.5; }
  return { x: (W - w) / 2, y: (H - h) * 0.2, w, h };
}
/** Cadre 2:3 autour du visage : même cadrage pour toutes les photos d'un mode. */
export function faceCrop(face, W, H, kind) {
  const share = kind === 'enfance' ? 0.4 : 0.55;  // largeur du visage / largeur du cadre
  const eyeAt = kind === 'enfance' ? 0.4 : 0.42;  // hauteur des yeux dans le cadre
  let w = face.fw / share, h = w * 1.5;
  const k = Math.min(1, W / w, H / h);
  w *= k; h *= k;
  return { x: clamp(face.cx - w / 2, 0, W - w), y: clamp(face.eyeY - h * eyeAt, 0, H - h), w, h };
}
function defaultPoints(W, H) {
  const c = coverCrop(W, H);
  const A = { x: c.x + c.w / 2, y: c.y + c.h * 0.42 };
  return [A, { x: A.x, y: A.y + c.h * 0.17 }];
}
const toBlob = (cv, q) => new Promise((r) => cv.toBlob(r, 'image/jpeg', q));
function makeThumb(src, crop) {
  const t = document.createElement('canvas');
  t.width = 120; t.height = 180;
  t.getContext('2d').drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, 120, 180);
  return toBlob(t, 0.8);
}

/** Importe un fichier image pour une célébrité. → true si le visage a été détecté. */
export async function importFile(file, id, kind) {
  const img = await decode(file);
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  const s = Math.min(1, MAX_SIDE / Math.max(iw, ih));
  const W = Math.round(iw * s), H = Math.round(ih * s);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.getContext('2d').drawImage(img, 0, 0, W, H);
  const lm = await detect(cv);
  let zones, crop;
  if (lm) { zones = zonesFromLandmarks(lm); crop = faceCrop(zones.face, W, H, kind); }
  else { const [A, B] = defaultPoints(W, H); zones = zonesFromPoints(A, B); crop = coverCrop(W, H); }
  const [blob, thumb] = await Promise.all([toBlob(cv, 0.88), makeThumb(cv, crop)]);
  await put({ key: pkey(kind, id), id, kind, blob, thumb, w: W, h: H, zones, crop, auto: !!lm, manual: false, t: Date.now() });
  return !!lm;
}

/** Placement manuel : recalcule zones et cadrage à partir des deux points touchés. */
export async function placeManually(key, A, B) {
  const rec = PHOTOS.get(key);
  const img = await bitmap(key);
  const zones = zonesFromPoints(A, B);
  const crop = faceCrop(zones.face, rec.w, rec.h, rec.kind);
  const thumb = await makeThumb(img, crop);
  await put({ ...rec, zones, crop, thumb, manual: true });
}

// ------------------------------------------------------------------ dessin
let holes = null, mask = null;

/** Dessine la photo recadrée dans le canvas, masquée sauf les parties `parts` (opacité du masque : maskA). */
export function drawPhoto(canvas, img, rec, parts, maskA) {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const c = canvas.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.fillStyle = '#121015';
  c.fillRect(0, 0, W, H);
  if (!img || !rec) return;
  const cr = rec.crop, s = W / cr.w;
  c.drawImage(img, cr.x, cr.y, cr.w, cr.h, 0, 0, W, H);
  if (maskA <= 0) return;

  holes ||= document.createElement('canvas');
  mask ||= document.createElement('canvas');
  for (const x of [holes, mask]) if (x.width !== W || x.height !== H) { x.width = W; x.height = H; }

  // Trous à bords doux : on dessine les formes hors du canvas et seule leur ombre floue y tombe.
  const hc = holes.getContext('2d');
  hc.setTransform(1, 0, 0, 1, 0, 0);
  hc.clearRect(0, 0, W, H);
  const OFF = W * 2 + 500;
  hc.shadowColor = '#000';
  hc.shadowBlur = Math.max(6, W * 0.03);
  hc.shadowOffsetX = OFF;
  hc.fillStyle = '#000';
  for (const p of parts) for (const z of rec.zones[p] || []) {
    hc.beginPath();
    if (z.t === 'e') hc.ellipse((z.cx - cr.x) * s - OFF, (z.cy - cr.y) * s, z.rx * s, z.ry * s, 0, 0, Math.PI * 2);
    else {
      const y0 = Math.max(-50, (z.y0 - cr.y) * s), y1 = (z.y1 - cr.y) * s;
      if (y1 > y0) hc.rect((z.x0 - cr.x) * s - OFF, y0, (z.x1 - z.x0) * s, y1 - y0);
    }
    hc.fill();
  }

  const mc = mask.getContext('2d');
  mc.setTransform(1, 0, 0, 1, 0, 0);
  mc.globalCompositeOperation = 'source-over';
  const g = mc.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2a2530');
  g.addColorStop(1, '#121015');
  mc.fillStyle = g;
  mc.fillRect(0, 0, W, H);
  mc.globalCompositeOperation = 'destination-out';
  mc.drawImage(holes, 0, 0);
  mc.globalCompositeOperation = 'source-over';

  c.globalAlpha = maskA;
  c.drawImage(mask, 0, 0);
  c.globalAlpha = 1;
}

const PART_COLORS = { eyes: '#e8b04a', mouth: '#ff6b6b', nose: '#5fd08a', ears: '#6fb6ff', top: '#c58cff' };

/** Aperçu : photo entière, cadre affiché et zones. → géométrie pour convertir un toucher en coordonnées image. */
export function drawPreview(canvas, img, rec, point) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const sc = Math.min(W / rec.w, H / rec.h), ox = (W - rec.w * sc) / 2, oy = (H - rec.h * sc) / 2;
  c.clearRect(0, 0, W, H);
  if (!img) return null;
  c.drawImage(img, ox, oy, rec.w * sc, rec.h * sc);
  const X = (x) => ox + x * sc, Y = (y) => oy + y * sc, cr = rec.crop;
  c.fillStyle = '#000a';
  c.beginPath();
  c.rect(ox, oy, rec.w * sc, rec.h * sc);
  c.rect(X(cr.x), Y(cr.y), cr.w * sc, cr.h * sc);
  c.fill('evenodd');
  c.strokeStyle = '#fff';
  c.lineWidth = 2 * dpr;
  c.strokeRect(X(cr.x), Y(cr.y), cr.w * sc, cr.h * sc);
  if (rec.kind === 'portrait') {
    c.save();
    c.beginPath(); c.rect(X(cr.x), Y(cr.y), cr.w * sc, cr.h * sc); c.clip();
    for (const p of PARTS) for (const z of rec.zones[p]) {
      c.strokeStyle = PART_COLORS[p];
      c.setLineDash(p === 'top' ? [6 * dpr, 4 * dpr] : []);
      c.beginPath();
      if (z.t === 'e') c.ellipse(X(z.cx), Y(z.cy), z.rx * sc, z.ry * sc, 0, 0, Math.PI * 2);
      else { const y0 = Math.max(Y(z.y0), Y(cr.y)); c.rect(X(z.x0), y0, (z.x1 - z.x0) * sc, Y(z.y1) - y0); }
      c.stroke();
    }
    c.restore();
  }
  if (point) { c.fillStyle = '#e8b04a'; c.beginPath(); c.arc(X(point.x), Y(point.y), 6 * dpr, 0, Math.PI * 2); c.fill(); }
  return {
    toImage(clientX, clientY) {
      const b = canvas.getBoundingClientRect();
      const x = ((clientX - b.left) * dpr - ox) / sc, y = ((clientY - b.top) * dpr - oy) / sc;
      return x < 0 || y < 0 || x > rec.w || y > rec.h ? null : { x, y };
    },
  };
}
