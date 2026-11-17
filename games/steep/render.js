// Steep : dessin d'une descente sur un canvas 2D (ciel, montagnes, terrain, obstacles, pièces, planchiste, météo).
// Tout est dessiné en code : aucune image.

import { worldById } from './worlds.js?v=1.59.0';

const TAU = Math.PI * 2;
const DAY = 140; // durée d'un cycle jour → nuit → jour (s)

/** Échelle (pixels CSS par unité) : on voit assez loin devant, même sur un téléphone étroit. */
export function viewScale(w, h) {
  return Math.max(0.5, Math.min(h / 340, w / 420, 1.7));
}

/** Caméra qui suit le planchiste, lissée. */
export function createCamera() {
  return { x: 0, y: 0, ready: false };
}
export function followCamera(cam, run, w, h, dt) {
  const s = viewScale(w, h);
  const tx = run.x - (w * 0.3) / s;
  // Le planchiste reste vers 42 % de la hauteur ; on regarde un peu plus bas quand ça descend vite
  const ty = run.y + (h * (h > w * 1.2 ? 0.36 : 0.42)) / s + Math.min(60, Math.max(0, -run.vy * 0.15));
  if (!cam.ready) { cam.x = tx; cam.y = ty; cam.ready = true; return cam; }
  const k = 1 - Math.pow(0.0025, dt);
  cam.x = tx; // horizontalement, la caméra suit exactement
  cam.y += (ty - cam.y) * k;
  return cam;
}

// Bruit doux et reproductible pour les montagnes du fond
function ridge(x, seed, rough) {
  return Math.sin(x * 0.0021 + seed) * 0.5
    + Math.sin(x * 0.0047 + seed * 2.1) * 0.28
    + Math.sin(x * 0.011 + seed * 3.7) * 0.14 * rough
    + Math.sin(x * 0.027 + seed * 5.3) * 0.06 * rough;
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const c = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

/** Nuit : 0 (plein jour) à 1 (pleine nuit). La Banquise est toujours de nuit. */
export function nightness(W, t) {
  if (W.night) return 1;
  const p = ((t / DAY) % 1 + 1) % 1; // 0 = matin
  // Jour de 0 à 0,55, crépuscule, nuit vers 0,75, aube vers 0,95
  return Math.max(0, Math.min(1, (Math.cos((p - 0.75) * TAU) - 0.35) / 0.55));
}

/**
 * Dessine une image. view = { w, h } en pixels CSS (le contexte est déjà mis à l'échelle de l'écran).
 * fx = { particles: [], spray: [] } : effets gardés d'une image à l'autre.
 */
export function drawFrame(ctx, run, cam, view, fx, opts = {}) {
  const W = worldById(run.world);
  const C = W.colors;
  const { w, h } = view;
  const s = viewScale(w, h);
  const sx = (x) => (x - cam.x) * s;
  const sy = (y) => (cam.y - y) * s;
  const t = opts.time ?? run.t;
  const night = W.night ? 0 : nightness(W, t); // la Banquise a déjà ses couleurs de nuit

  // ---------------- ciel
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, night ? mix(C.sky[0], '#0a1030', night * 0.85) : C.sky[0]);
  sky.addColorStop(1, night ? mix(C.sky[1], '#2a2f5a', night * 0.8) : C.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Étoiles (nuit)
  const starA = W.night ? 1 : night;
  if (starA > 0.05) {
    ctx.fillStyle = `rgba(255,255,255,${0.8 * starA})`;
    for (let i = 0; i < 70; i++) {
      const px = ((i * 137.5 + 50) % 1000) / 1000 * w - (cam.x * 0.02) % w;
      const x = ((px % w) + w) % w;
      const y = ((i * 71.3) % 600) / 600 * h * 0.6;
      const r = (i % 7 === 0 ? 1.4 : 0.8) * (0.7 + 0.3 * Math.sin(t * 2 + i));
      ctx.fillRect(x, y, r, r);
    }
  }
  // Soleil ou lune
  const p = ((t / DAY) % 1 + 1) % 1;
  if (W.night || night > 0.5) {
    ctx.fillStyle = 'rgba(245,245,230,.92)';
    ctx.beginPath(); ctx.arc(w * 0.78, h * 0.18, Math.max(10, h * 0.035), 0, TAU); ctx.fill();
    ctx.fillStyle = W.night ? C.sky[0] : mix(C.sky[0], '#0a1030', 0.85);
    ctx.beginPath(); ctx.arc(w * 0.78 + h * 0.014, h * 0.18 - h * 0.008, Math.max(9, h * 0.031), 0, TAU); ctx.fill();
  } else {
    const sunY = h * (0.1 + 0.3 * Math.min(1, p / 0.6)); // le soleil descend au fil de la journée
    const glow = ctx.createRadialGradient(w * 0.75, sunY, 2, w * 0.75, sunY, h * 0.18);
    glow.addColorStop(0, 'rgba(255,248,220,.95)');
    glow.addColorStop(0.18, 'rgba(255,240,200,.75)');
    glow.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  // ---------------- montagnes du fond (parallaxe)
  const layers = [
    { k: 0.08, base: 0.5, amp: 0.26, color: C.far, cap: C.farCap, seed: 1.3, rough: W.id === 'dunes' ? 0.2 : 1 },
    { k: 0.22, base: 0.66, amp: 0.15, color: C.mid, cap: null, seed: 4.1, rough: W.id === 'dunes' ? 0.1 : 0.6 },
  ];
  for (const L of layers) {
    const off = cam.x * s * L.k;
    const yAt = (px) => h * L.base - h * L.amp * ridge((px + off) / Math.max(0.5, s), L.seed, L.rough) + Math.min(40, (cam.y * s * L.k * 0.15));
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let px = 0; px <= w + 8; px += 8) ctx.lineTo(px, yAt(px));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = night ? mix(L.color, '#141a33', night * 0.6) : L.color;
    ctx.fill();
    if (L.cap) {
      ctx.strokeStyle = L.cap;
      ctx.globalAlpha = W.id === 'volcan' ? 0.55 + 0.25 * Math.sin(t * 1.5) : 0.75;
      ctx.lineWidth = W.id === 'volcan' ? 3 : 4;
      ctx.beginPath();
      for (let px = 0; px <= w + 8; px += 8) { const y = yAt(px) + 2; if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // Brume légère entre le fond et le terrain
  const haze = ctx.createLinearGradient(0, h * 0.45, 0, h);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, W.id === 'volcan' ? 'rgba(255,90,30,.12)' : 'rgba(255,255,255,.12)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);

  const T = run.terrain;
  const x0 = cam.x - 40, x1 = cam.x + w / s + 40;

  // ---------------- crevasses (derrière le terrain)
  for (const hz of T.hazards) {
    if (hz.type !== 'gap' || hz.x1 < x0 || hz.x0 > x1) continue;
    const top = Math.min(sy(hz.yNear), sy(hz.yFar));
    if (W.id === 'volcan') {
      const lava = ctx.createLinearGradient(0, top, 0, h);
      lava.addColorStop(0, '#ffd04a'); lava.addColorStop(0.25, '#ff5a1f'); lava.addColorStop(1, '#7a1205');
      ctx.fillStyle = lava;
      const ly = sy(Math.min(hz.yNear, hz.yFar) - 70);
      ctx.fillRect(sx(hz.x0) - 2, ly, (hz.x1 - hz.x0) * s + 4, h - ly);
      ctx.fillStyle = 'rgba(255,220,120,.8)';
      for (let i = 0; i < 4; i++) {
        const bx = sx(hz.x0) + ((i + 0.5) / 4) * (hz.x1 - hz.x0) * s;
        const ph = (t * 1.3 + i * 0.37) % 1;
        ctx.beginPath(); ctx.arc(bx, ly + 4 - ph * 10, 2.5 * (1 - ph) * s + 1, 0, TAU); ctx.fill();
      }
    } else {
      const g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, C.gap); g.addColorStop(1, '#05070d');
      ctx.fillStyle = g;
      ctx.fillRect(sx(hz.x0) - 2, top, (hz.x1 - hz.x0) * s + 4, h - top);
      if (W.id === 'foret') { // l'eau du torrent
        const wy = sy(Math.min(hz.yNear, hz.yFar) - 80);
        ctx.fillStyle = '#4fa3c7';
        ctx.fillRect(sx(hz.x0) - 2, wy, (hz.x1 - hz.x0) * s + 4, h - wy);
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let px = sx(hz.x0); px < sx(hz.x1); px += 6) ctx.lineTo(px, wy + Math.sin(px * 0.2 + t * 6) * 1.5);
        ctx.stroke();
      }
    }
  }

  // ---------------- décor du fond (arbres, cactus, glaçons…) posé sur le terrain
  for (const d of T.decor) if (d.back && d.x > x0 - 60 && d.x < x1 + 60) drawDecor(ctx, W, sx(d.x), sy(d.y) + 3 * s, s * d.size * 0.8, d.kind, t, 0.55, night);

  // ---------------- terrain
  const ground = ctx.createLinearGradient(0, sy(cam.y - 120), 0, h + 200);
  ground.addColorStop(0, night ? mix(C.ground[0], '#3a4a70', night * 0.45) : C.ground[0]);
  ground.addColorStop(1, night ? mix(C.ground[1], '#1e2848', night * 0.5) : C.ground[1]);
  for (const piece of T.pieces) {
    if (piece.x1 < x0 || piece.x0 > x1) continue;
    const a = Math.max(piece.x0, x0), b = Math.min(piece.x1, x1);
    const stepX = 6 / s;
    ctx.beginPath();
    ctx.moveTo(sx(a), h + 10);
    for (let x = a; x <= b + stepX; x += stepX) {
      const xx = Math.min(x, b);
      const g = T.ground(xx);
      if (g) ctx.lineTo(sx(xx), sy(g.y));
    }
    ctx.lineTo(sx(b), h + 10);
    ctx.closePath();
    ctx.fillStyle = ground;
    ctx.fill();
    // Liseré du dessus
    ctx.beginPath();
    let first = true;
    for (let x = a; x <= b + stepX; x += stepX) {
      const xx = Math.min(x, b);
      const g = T.ground(xx);
      if (!g) continue;
      if (first) { ctx.moveTo(sx(xx), sy(g.y)); first = false; } else ctx.lineTo(sx(xx), sy(g.y));
    }
    ctx.strokeStyle = C.edge;
    ctx.globalAlpha = night ? 0.5 : 0.9;
    ctx.lineWidth = Math.max(2, 3 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------------- obstacles
  for (const hz of T.hazards) {
    if (hz.type !== 'rock' || hz.x1 < x0 || hz.x0 > x1) continue;
    drawObstacle(ctx, W, sx(hz.x0), sx(hz.x1), sy(hz.y), hz.h * s, s);
  }

  // ---------------- pièces
  for (const c of T.coins) {
    if (c.taken || c.x < x0 || c.x > x1 || c.y == null) continue;
    const px = sx(c.x), py = sy(c.y + Math.sin(t * 3 + c.x * 0.05) * 2);
    const r = 5.5 * s;
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(px, py, r * 1.9, 0, TAU); ctx.fill();
    ctx.fillStyle = C.coin;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { // losange étoilé
      const a1 = (i / 4) * TAU + t * 1.2, a2 = a1 + TAU / 8;
      ctx.lineTo(px + Math.cos(a1) * r * 1.3, py + Math.sin(a1) * r * 1.3);
      ctx.lineTo(px + Math.cos(a2) * r * 0.45, py + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------------- gerbe de neige sous la planche
  if (run.state === 'ride' && run.grounded && fx) {
    for (let i = 0; i < 2; i++) fx.spray.push({ x: run.x - 10, y: run.y + 2, vx: -run.vx * 0.25 - Math.random() * 40, vy: 30 + Math.random() * 60, life: 0.5 });
  }
  if (fx) {
    ctx.fillStyle = W.id === 'volcan' ? 'rgba(90,80,85,.7)' : W.id === 'dunes' ? 'rgba(240,205,140,.8)' : 'rgba(255,255,255,.85)';
    const dt = opts.dt || 1 / 60;
    fx.spray = fx.spray.filter((p) => (p.life -= dt) > 0);
    for (const p of fx.spray) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 260 * dt;
      ctx.globalAlpha = p.life * 1.6;
      ctx.fillRect(sx(p.x), sy(p.y), 2.2 * s, 2.2 * s);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- planchiste
  drawRider(ctx, run, sx(run.x), sy(run.y), s * 1.35, W);
  // Jauge du saut : un arc qui se remplit au-dessus du planchiste tant qu'on reste baissé
  if (run.state === 'ride' && run.holdGround) {
    const gx = sx(run.x), gy = sy(run.y) - 62 * s, r = 9 * s + 4;
    ctx.lineWidth = Math.max(3, 3.5 * s); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(13,12,15,.45)';
    ctx.beginPath(); ctx.arc(gx, gy, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
    ctx.strokeStyle = run.charge >= 1 ? '#ffe27a' : '#8fd3ff';
    ctx.beginPath(); ctx.arc(gx, gy, r, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * run.charge)); ctx.stroke();
  }

  // ---------------- décor du premier plan
  for (const d of T.decor) if (!d.back && d.x > x0 - 60 && d.x < x1 + 60) drawDecor(ctx, W, sx(d.x), sy(d.y) + 10 * s, s * d.size, d.kind, t, 1, night);

  // ---------------- météo
  if (fx) drawWeather(ctx, W, fx, w, h, s, run, opts.dt || 1 / 60);

  // Voile de nuit léger sur tout
  if (night > 0.02) {
    ctx.fillStyle = `rgba(12,18,48,${0.28 * night})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawObstacle(ctx, W, xa, xb, yBase, hh, s) {
  const C = W.colors;
  const cx = (xa + xb) / 2, ww = xb - xa;
  ctx.save();
  switch (W.obstacle.kind) {
    case 'cactus': {
      ctx.fillStyle = C.obstacle;
      const tw = Math.max(4, ww * 0.35);
      roundRect(ctx, cx - tw / 2, yBase - hh * 1.25, tw, hh * 1.25 + 2, tw / 2); ctx.fill();
      roundRect(ctx, cx - ww * 0.62, yBase - hh * 0.95, tw * 0.75, hh * 0.5, tw / 3); ctx.fill();
      roundRect(ctx, cx - ww * 0.62, yBase - hh * 0.55, ww * 0.5, tw * 0.6, tw / 3); ctx.fill();
      roundRect(ctx, cx + ww * 0.3, yBase - hh * 1.05, tw * 0.75, hh * 0.45, tw / 3); ctx.fill();
      roundRect(ctx, cx + ww * 0.1, yBase - hh * 0.68, ww * 0.45, tw * 0.6, tw / 3); ctx.fill();
      ctx.fillStyle = C.obstacleLight;
      ctx.fillRect(cx - tw * 0.15, yBase - hh * 1.15, tw * 0.15, hh);
      break;
    }
    case 'log': {
      ctx.fillStyle = C.obstacle;
      roundRect(ctx, xa - ww * 0.4, yBase - hh, ww * 1.8, hh, hh / 2); ctx.fill();
      ctx.fillStyle = C.obstacleLight;
      ctx.beginPath(); ctx.ellipse(xb + ww * 0.35, yBase - hh / 2, hh * 0.32, hh * 0.48, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.obstacle; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(xb + ww * 0.35, yBase - hh / 2, hh * 0.16, hh * 0.24, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.85; // neige sur le tronc
      roundRect(ctx, xa - ww * 0.3, yBase - hh - 2 * s, ww * 1.4, 4 * s, 2 * s); ctx.fill();
      break;
    }
    case 'ice': {
      ctx.fillStyle = C.obstacle;
      ctx.beginPath();
      ctx.moveTo(xa - 2, yBase + 2); ctx.lineTo(xa + ww * 0.1, yBase - hh * 0.8); ctx.lineTo(cx, yBase - hh * 1.15);
      ctx.lineTo(xb - ww * 0.05, yBase - hh * 0.7); ctx.lineTo(xb + 2, yBase + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.obstacleLight; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(xa + ww * 0.15, yBase - hh * 0.75); ctx.lineTo(cx, yBase - hh * 1.1); ctx.lineTo(cx - ww * 0.05, yBase); ctx.closePath(); ctx.fill();
      break;
    }
    default: { // rocher, basalte
      ctx.fillStyle = C.obstacle;
      ctx.beginPath();
      ctx.moveTo(xa - 3, yBase + 2);
      ctx.quadraticCurveTo(xa - 2, yBase - hh * 0.9, cx - ww * 0.1, yBase - hh);
      ctx.quadraticCurveTo(xb + 2, yBase - hh * 1.05, xb + 3, yBase + 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.obstacleLight;
      ctx.beginPath(); ctx.ellipse(cx - ww * 0.15, yBase - hh * 0.7, ww * 0.22, hh * 0.18, -0.3, 0, TAU); ctx.fill();
      if (W.id === 'volcan') { ctx.fillStyle = 'rgba(255,110,40,.8)'; ctx.fillRect(cx, yBase - hh * 0.5, 1.5 * s, hh * 0.45); }
      else { ctx.fillStyle = 'rgba(255,255,255,.9)'; roundRect(ctx, cx - ww * 0.35, yBase - hh - 1.5 * s, ww * 0.6, 3.5 * s, 2 * s); ctx.fill(); }
    }
  }
  ctx.restore();
}

function drawDecor(ctx, W, x, y, s, kind, t, alpha, night) {
  const C = W.colors;
  ctx.save();
  ctx.globalAlpha = alpha;
  const dark = night ? mix(C.decor, '#0e1630', night * 0.5) : C.decor;
  const light = night ? mix(C.decorLight, '#0e1630', night * 0.5) : C.decorLight;
  switch (W.decor) {
    case 'pine': {
      const hh = 70 * s * (0.8 + kind * 0.5);
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 12 * s);
      for (let i = 0; i < 3; i++) {
        const ty = y - 8 * s - i * hh * 0.26, wd = (24 - i * 6) * s * (0.8 + kind * 0.4);
        ctx.fillStyle = i % 2 ? light : dark;
        ctx.beginPath(); ctx.moveTo(x - wd, ty); ctx.lineTo(x, ty - hh * 0.42); ctx.lineTo(x + wd, ty); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.moveTo(x - wd * 0.35, ty - hh * 0.27); ctx.lineTo(x, ty - hh * 0.42); ctx.lineTo(x + wd * 0.35, ty - hh * 0.27); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'palm': {
      if (kind < 0.55) { // cactus colonne
        const hh = 40 * s * (0.8 + kind);
        ctx.fillStyle = dark;
        roundRect(ctx, x - 4 * s, y - hh, 8 * s, hh, 4 * s); ctx.fill();
        roundRect(ctx, x - 12 * s, y - hh * 0.75, 5 * s, hh * 0.35, 2.5 * s); ctx.fill();
        roundRect(ctx, x - 12 * s, y - hh * 0.45, 10 * s, 4 * s, 2 * s); ctx.fill();
      } else { // palmier
        const hh = 70 * s * (0.8 + kind * 0.3);
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8 * s, y - hh * 0.5, x + 4 * s, y - hh); ctx.stroke();
        ctx.fillStyle = dark;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(t * 1.5 + i) * 0.05;
          ctx.beginPath();
          ctx.ellipse(x + 4 * s + Math.cos(a) * 14 * s, y - hh + Math.sin(a) * 8 * s + 6 * s, 16 * s, 4 * s, a, 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
    case 'birch': {
      const hh = 80 * s * (0.75 + kind * 0.5);
      ctx.fillStyle = '#efe9df'; ctx.fillRect(x - 2.5 * s, y - hh, 5 * s, hh);
      ctx.fillStyle = '#3a3030';
      for (let i = 1; i < 6; i++) ctx.fillRect(x - 2.5 * s, y - hh * (i / 6), 3 * s, 1.5 * s);
      ctx.fillStyle = kind > 0.5 ? light : dark;
      ctx.beginPath(); ctx.ellipse(x, y - hh * 0.95, 18 * s, 26 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = kind > 0.5 ? dark : light;
      ctx.beginPath(); ctx.ellipse(x + 8 * s, y - hh * 0.78, 12 * s, 15 * s, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'smoke': { // fumerolles
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(x - 14 * s, y); ctx.lineTo(x - 5 * s, y - 14 * s); ctx.lineTo(x + 5 * s, y - 14 * s); ctx.lineTo(x + 14 * s, y); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.4 + kind + i * 0.25) % 1);
        ctx.fillStyle = `rgba(180,170,175,${0.35 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(x + Math.sin(ph * 5 + i) * 6 * s, y - 16 * s - ph * 70 * s, (6 + ph * 16) * s, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'iceberg': {
      const hh = 40 * s * (0.7 + kind * 0.8);
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(x - 4 * s, y); ctx.lineTo(x - 1 * s, y - hh); ctx.lineTo(x + 3 * s, y - hh * 0.9); ctx.lineTo(x + 5 * s, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.moveTo(x - 1 * s, y - hh); ctx.lineTo(x + 3 * s, y - hh * 0.9); ctx.lineTo(x + 1 * s, y); ctx.closePath(); ctx.fill();
      if (kind > 0.6) { // drapeau de balise
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.5 * s;
        ctx.beginPath(); ctx.moveTo(x + 14 * s, y); ctx.lineTo(x + 14 * s, y - 30 * s); ctx.stroke();
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath(); ctx.moveTo(x + 14 * s, y - 30 * s); ctx.lineTo(x + 24 * s, y - 26 * s + Math.sin(t * 4) * 1.5 * s); ctx.lineTo(x + 14 * s, y - 22 * s); ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

/** Le planchiste : bonnet à pompon, lunettes, doudoune. Dessiné autour du milieu de la planche. */
export function drawRider(ctx, run, x, y, s, W, colors = {}) {
  const jacket = colors.jacket || '#e2483d';
  const pants = colors.pants || '#2f3a56';
  const hat = colors.hat || '#ffd23f';
  const boardC = W.board === 'sandboard' ? '#2f6f8f' : '#1f2433';
  ctx.save();
  ctx.translate(x, y);
  const crashed = run.state === 'crashed';
  const ct = crashed ? Math.min(1, (run.t - run.crash.t) * 3) : 0;
  ctx.rotate(-(run.angle) + (crashed ? -ct * 1.4 : 0));
  ctx.scale(s, s);
  if (crashed) ctx.translate(0, ct * 6);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Planche
  ctx.strokeStyle = boardC; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(-15, -1.5); ctx.lineTo(13, -1.5); ctx.quadraticCurveTo(17, -1.5, 18, -4); ctx.stroke();
  ctx.strokeStyle = W.board === 'sandboard' ? '#7fd0f0' : '#ff8a3d'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-12, -1.5); ctx.lineTo(10, -1.5); ctx.stroke();
  // Baissé quand on charge le saut (jusqu'à 7 unités), ramassé en l'air
  const crouch = run.grounded || run.holdGround ? (run.holdGround ? 2 + run.charge * 5 : 0) : Math.min(1, run.airTime * 4) * 3;
  // Jambes
  ctx.strokeStyle = pants; ctx.lineWidth = 4.2;
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-4, -11 + crouch); ctx.lineTo(-1, -17 + crouch); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(5, -11 + crouch); ctx.lineTo(1, -17 + crouch); ctx.stroke();
  // Buste (doudoune)
  ctx.strokeStyle = jacket; ctx.lineWidth = 7.5;
  ctx.beginPath(); ctx.moveTo(0, -17 + crouch); ctx.lineTo(1.5, -26 + crouch); ctx.stroke();
  // Bras (écartés pour l'équilibre)
  ctx.lineWidth = 3;
  const wave = run.grounded ? Math.sin(run.t * 6) * 1.2 : -3;
  ctx.beginPath(); ctx.moveTo(1, -24 + crouch); ctx.lineTo(-7, -20 + crouch + wave); ctx.lineTo(-12, -22 + crouch + wave); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -24 + crouch); ctx.lineTo(9, -21 + crouch - wave); ctx.lineTo(13, -18 + crouch - wave); ctx.stroke();
  // Moufles
  ctx.fillStyle = hat;
  ctx.beginPath(); ctx.arc(-12, -22 + crouch + wave, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(13, -18 + crouch - wave, 1.8, 0, TAU); ctx.fill();
  // Tête
  ctx.fillStyle = '#f1c7a0';
  ctx.beginPath(); ctx.arc(2.5, -31 + crouch, 4.4, 0, TAU); ctx.fill();
  // Lunettes de ski
  ctx.fillStyle = '#26324a';
  roundRect(ctx, 2.5, -32.8 + crouch, 5, 2.6, 1.2); ctx.fill();
  ctx.fillStyle = '#7fd8ff'; ctx.fillRect(4.3, -32.3 + crouch, 2.6, 1.4);
  // Bonnet à pompon
  ctx.fillStyle = hat;
  ctx.beginPath(); ctx.arc(2.5, -32.5 + crouch, 4.6, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.2, -33.4 + crouch, 9.4, 1.6);
  ctx.beginPath(); ctx.arc(1.5, -38 + crouch, 2, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawWeather(ctx, W, fx, w, h, s, run, dt) {
  const kind = W.particles;
  if (kind === 'stars') { // aurore discrète : de légères bandes vertes et bleues
    const t = run.t;
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 3; i++) {
      const g = ctx.createLinearGradient(0, h * 0.05, 0, h * 0.35);
      g.addColorStop(0, i === 1 ? '#7affc8' : '#6fb8ff'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.35);
      for (let px = 0; px <= w; px += 16) ctx.lineTo(px, h * (0.1 + i * 0.05) + Math.sin(px * 0.01 + t * 0.3 + i * 2) * h * 0.04);
      ctx.lineTo(w, h * 0.35);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const target = Math.round(w * h / 9000);
  while (fx.particles.length < target) fx.particles.push({ x: Math.random() * w, y: Math.random() * h, z: 0.4 + Math.random() * 0.8, a: Math.random() * TAU });
  const speed = run.state === 'ride' ? run.vx * s : 0;
  const col = W.colors.particle;
  ctx.fillStyle = col;
  for (const p of fx.particles) {
    if (kind === 'snow') { p.x -= (speed * 0.5 * p.z + 10) * dt; p.y += 28 * p.z * dt; }
    else if (kind === 'sand') { p.x -= (speed * 0.9 * p.z + 80) * dt; p.y += Math.sin(p.a += dt * 2) * 8 * dt; }
    else if (kind === 'leaves') { p.x -= (speed * 0.5 * p.z + 25) * dt; p.y += 22 * p.z * dt; p.a += dt * 3; }
    else if (kind === 'ash') { p.x -= (speed * 0.4 * p.z) * dt; p.y -= 14 * p.z * dt; }
    if (p.x < -10) p.x += w + 20;
    if (p.y > h + 10) p.y -= h + 20;
    if (p.y < -10) p.y += h + 20;
    ctx.globalAlpha = kind === 'sand' ? 0.35 : kind === 'ash' ? 0.5 : 0.85;
    if (kind === 'leaves') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.z > 0.8 ? '#c4521f' : col;
      ctx.beginPath(); ctx.ellipse(0, 0, 3.4 * p.z, 1.6 * p.z, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (kind === 'sand') {
      ctx.fillRect(p.x, p.y, 6 * p.z, 1);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * p.z, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
