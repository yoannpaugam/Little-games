// Steep : moteur sans DOM (terrain procédural, physique, figures, score). Testé par tests/steep.test.js.
//
// Repère : x vers la droite, y vers le HAUT (le terrain descend quand x augmente).
// Unités : 10 unités = 1 mètre. Temps en secondes.

import { COURSE_TYPES, worldById } from './worlds.js?v=1.58.0';

export const UNITS_PER_M = 10;
export const GRAVITY = 620;
export const JUMP = 300;            // impulsion du saut, perpendiculaire à la pente
export const MIN_SPEED = 150;       // le joueur pousse toujours un peu
export const SPIN = 7.6;            // vitesse de rotation en salto (rad/s)
export const LAND_OK = 0.95;        // écart d'angle toléré à l'atterrissage (rad, ≈ 54°)
export const LAND_PERFECT = 0.28;   // atterrissage parfait (≈ 16°)
export const LEVEL = 2.2;          // redressement automatique en l'air sans appui (rad/s)
export const COYOTE = 0.12;         // on peut encore sauter juste après avoir quitté le sol
export const MAX_GAP = 150;         // largeur maximale d'une crevasse (unités) : franchissable à la vitesse minimale
export const POINTS = { coin: 10, flip: 100, perfect: 25, grind: 0 };

const TAU = Math.PI * 2;

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rngFrom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Angle ramené dans ]-π, π]. */
export function wrapAngle(a) {
  a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a === -Math.PI ? Math.PI : a;
}

const pick = (rng, weights) => {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let r = rng() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) { r -= w; if (r < 0) return k; }
  return entries[entries.length - 1][0];
};
const between = (rng, a, b) => a + rng() * (b - a);

// ------------------------------------------------------------------ terrain
// Le terrain est une suite de « morceaux » continus (pieces), chacun une liste de points
// lissés par interpolation de Hermite. Entre deux morceaux : une crevasse (vide) ou une falaise (marche vers le bas).

function hermite(p, x) {
  // p : points triés { x, y, m } ; renvoie { y, slope } au point x (x dans [p0.x, pn.x])
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p[mid].x <= x) lo = mid; else hi = mid; }
  const a = p[lo], b = p[hi];
  const h = b.x - a.x || 1;
  const t = Math.min(1, Math.max(0, (x - a.x) / h));
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const y = h00 * a.y + h10 * h * a.m + h01 * b.y + h11 * h * b.m;
  const d00 = 6 * t2 - 6 * t, d10 = 3 * t2 - 4 * t + 1, d01 = -6 * t2 + 6 * t, d11 = 3 * t2 - 2 * t;
  const slope = (d00 * a.y + d01 * b.y) / h + d10 * a.m + d11 * b.m;
  return { y, slope };
}

function finishPiece(pts) {
  // Pentes de Hermite : différences centrées, limitées pour éviter les rebonds (Fritsch-Carlson simplifié)
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    pts[i].m = pts[i].m ?? (b.y - a.y) / ((b.x - a.x) || 1);
  }
  return pts;
}

/**
 * Crée un générateur de terrain pour un monde et un type de parcours.
 * Le terrain est produit au fur et à mesure (extend) et oublié derrière le joueur (trim).
 */
export function createTerrain({ course = 'balade', seed = 1 } = {}) {
  const C = COURSE_TYPES[course] || COURSE_TYPES.balade;
  const rng = rngFrom(seed);
  const T = {
    pieces: [],   // { x0, x1, pts }
    hazards: [],  // { type: 'rock' | 'gap' | 'cliff', x0, x1, top? }
    coins: [],    // { x, y, taken }
    decor: [],    // { x, y, kind (0..1), size }
    end: 0,
    course,
  };
  let cur = null;        // morceau en cours
  let lastHazardX = 0;   // dernier obstacle (on garde de la place entre deux)
  const baseSlope = between(rng, C.slope[0], C.slope[1]);

  function difficulty(x) {
    // Monte doucement avec la distance : 40 % au départ, 100 % à 2 km
    return Math.min(1, 0.4 + x / (2000 * UNITS_PER_M) * 0.6);
  }

  function newPiece(x, y) {
    cur = { x0: x, x1: x, pts: [{ x, y }] };
    T.pieces.push(cur);
  }
  const last = () => cur.pts[cur.pts.length - 1];
  const push = (x, y, extra) => { cur.pts.push({ x, y, ...extra }); cur.x1 = x; T.end = x; };

  function addRun(len, d) {
    const { x: x0, y: y0 } = last();
    const steps = Math.max(2, Math.round(len / 60));
    const wob = between(rng, 0, 10);
    for (let i = 1; i <= steps; i++) {
      const x = x0 + (len * i) / steps;
      push(x, y0 - baseSlope * (x - x0) + Math.sin(i * 1.7 + wob) * 3);
    }
    // Obstacle au milieu de la ligne droite
    const mid = x0 + len * between(rng, 0.45, 0.7);
    if (len > 320 && mid - lastHazardX > 380 && rng() < C.rocks * d) {
      const w = between(rng, 18, 28), hgt = between(rng, 16, 26);
      T.hazards.push({ type: 'rock', x0: mid - w / 2, x1: mid + w / 2, h: hgt });
      lastHazardX = mid;
      // Pièces en arc au-dessus de l'obstacle : elles montrent qu'il faut sauter
      for (let k = -2; k <= 2; k++) T.coins.push({ x: mid + k * 26, y: null, lift: 62 - k * k * 6, taken: false });
    } else if (rng() < 0.45) {
      const cx = x0 + len * between(rng, 0.2, 0.6);
      for (let k = 0; k < 5; k++) T.coins.push({ x: cx + k * 24, y: null, lift: 20, taken: false });
    }
  }

  function addBumps(d) {
    const { x: x0, y: y0 } = last();
    const n = 1 + Math.floor(rng() * 3);
    const wl = between(rng, 300, 460);
    const amp = between(rng, 22, 40) * (0.7 + 0.3 * d);
    const len = n * wl;
    const steps = Math.round(len / 30);
    for (let i = 1; i <= steps; i++) {
      const dx = (len * i) / steps;
      push(x0 + dx, y0 - baseSlope * dx + amp * (1 - Math.cos((dx / wl) * TAU)) * 0.5 * (i === steps ? 0 : 1));
    }
    if (rng() < 0.5) {
      const cx = x0 + wl * 0.5;
      for (let k = -2; k <= 2; k++) T.coins.push({ x: cx + k * 28, y: null, lift: 70 - k * k * 7, taken: false });
    }
  }

  function addKicker(d) {
    // Creux, rampe qui remonte, lèvre, puis pente de réception plus raide
    const { x: x0, y: y0 } = last();
    const rise = between(rng, 26, 46) * (0.75 + 0.25 * d);
    const run = between(rng, 120, 170);
    push(x0 + 80, y0 - baseSlope * 80 - 10);
    push(x0 + 80 + run * 0.5, y0 - baseSlope * 80 - 10 + rise * 0.35);
    const lipX = x0 + 80 + run, lipY = y0 - baseSlope * 80 - 10 + rise;
    push(lipX, lipY, { m: 0.55 });
    // La réception commence un peu plus bas, raide
    const land = between(rng, 220, 320);
    push(lipX + 30, lipY - 6, { m: -0.35 });
    push(lipX + land, lipY - 6 - land * (baseSlope + 0.25));
    push(lipX + land + 80, lipY - 6 - land * (baseSlope + 0.25) - 80 * baseSlope);
    // Pièces sur la trajectoire du saut
    for (let k = 1; k <= 5; k++) T.coins.push({ x: lipX + k * 40, y: lipY + 60 + 22 * Math.sin((k / 6) * Math.PI) - k * 6, lift: null, taken: false });
  }

  function addBoundary(d) {
    const p = last();
    if (p.x - lastHazardX < 300) return false;
    const r = rng();
    if (r < C.gap * d) {
      const w = between(rng, 60, 80 + (MAX_GAP - 80) * d);
      const drop = between(rng, 25, 70);
      finishPiece(cur.pts);
      T.hazards.push({ type: 'gap', x0: p.x, x1: p.x + w, yNear: p.y, yFar: p.y - drop });
      // Pièces au-dessus de la crevasse
      for (let k = 0; k < 4; k++) T.coins.push({ x: p.x + (w * (k + 0.5)) / 4, y: p.y + 45 - k * 6, lift: null, taken: false });
      newPiece(p.x + w, p.y - drop);
      // Le bord d'arrivée est plat un moment, pour se poser
      push(p.x + w + 90, p.y - drop - 90 * baseSlope);
      lastHazardX = p.x + w;
      return true;
    }
    if (r < (C.gap + C.cliff) * d) {
      const drop = between(rng, 50, 90 + 70 * d);
      finishPiece(cur.pts);
      T.hazards.push({ type: 'cliff', x0: p.x, x1: p.x, yNear: p.y, yFar: p.y - drop });
      newPiece(p.x + 0.5, p.y - drop);
      push(p.x + 140, p.y - drop - 140 * (baseSlope + 0.12));
      lastHazardX = p.x;
      return true;
    }
    return false;
  }

  function addDecor(x0, x1) {
    for (let x = x0 + rng() * 120; x < x1; x += between(rng, 70, 260)) {
      if (T.hazards.some((hz) => x > hz.x0 - 40 && x < hz.x1 + 40)) continue;
      T.decor.push({ x, kind: rng(), size: between(rng, 0.7, 1.35), back: rng() < 0.6 });
    }
  }

  T.extend = (toX) => {
    while (T.end < toX) {
      const from = T.end;
      const d = difficulty(from);
      if (!cur) {
        // Départ : une longue pente tranquille, qui commence hors de l'écran à gauche
        newPiece(-900, baseSlope * 900 * 0.8);
        for (let x = -840; x <= 720; x += 60) push(x, -baseSlope * x * 0.8);
        lastHazardX = 900;
      } else {
        if (!addBoundary(d)) {
          const f = pick(rng, C.features);
          if (f === 'run') addRun(between(rng, 260, 620), d);
          else if (f === 'bumps') addBumps(d);
          else addKicker(d);
        }
      }
      finishPiece(cur.pts);
      addDecor(from, T.end);
    }
    // Hauteur des pièces posées sur le sol
    for (const c of T.coins) if (c.y == null) { const g = T.ground(c.x); c.y = g ? g.y + c.lift : 0; }
    for (const hz of T.hazards) if (hz.type === 'rock' && hz.y == null) { const g = T.ground((hz.x0 + hz.x1) / 2); hz.y = g ? g.y : 0; }
    for (const dc of T.decor) if (dc.y == null) { const g = T.ground(dc.x); dc.y = g ? g.y : 0; }
  };

  T.trim = (fromX) => {
    const keep = (o) => (o.x1 ?? o.x) >= fromX;
    T.pieces = T.pieces.filter((p) => p === cur || p.x1 >= fromX);
    T.hazards = T.hazards.filter(keep);
    T.coins = T.coins.filter(keep);
    T.decor = T.decor.filter(keep);
  };

  /** Sol au point x : { y, slope } ou null (crevasse). À une falaise, le morceau le plus bas l'emporte après le bord. */
  T.ground = (x) => {
    let found = null;
    for (const p of T.pieces) {
      if (x >= p.x0 && x <= p.x1 && p.pts.length > 1) found = p; // le dernier morceau qui contient x (celui d'après une falaise)
    }
    return found ? hermite(found.pts, x) : null;
  };

  T.extend(3000);
  return T;
}

// ------------------------------------------------------------------ une descente

export function createRun({ world = 'cimes', course = 'balade', seed = 1 } = {}) {
  const W = worldById(world) || worldById('cimes');
  const terrain = createTerrain({ course, seed });
  const g0 = terrain.ground(40);
  return {
    world: W.id, course, seed,
    physics: W.physics,
    terrain,
    t: 0,
    x: 40, y: g0.y,
    vx: 190, vy: -190 * g0.slope,
    angle: Math.atan(g0.slope),
    spin: 0,             // vitesse de rotation (rad/s)
    airSpin: 0,          // rotation cumulée depuis le décollage
    grounded: true,
    airTime: 0, sinceGround: 0,
    state: 'ride',       // ride → crashed
    crash: null,         // { reason, t }
    score: 0, coins: 0, flips: 0, perfects: 0, bestCombo: 0,
    combo: 0,            // figures enchaînées sans toucher un obstacle (multiplie les points)
    boost: 0,            // accélération après un atterrissage parfait (s)
    events: [],
  };
}

export const distanceM = (run) => Math.max(0, Math.floor(run.x / UNITS_PER_M));
export const totalScore = (run) => distanceM(run) + run.score;

function crash(run, reason) {
  if (run.state === 'crashed') return;
  run.state = 'crashed';
  run.crash = { reason, t: run.t, x: run.x, y: run.y };
  run.events.push({ type: 'crash', reason });
}

/**
 * Avance la descente de dt secondes. input = { held: bool, pressed: bool (appui depuis la dernière image) }.
 * Les événements (saut, figure, pièce, chute…) sont ajoutés à run.events.
 */
export function step(run, dt, input = {}) {
  if (run.state !== 'ride') {
    // Après la chute : la planche glisse encore et s'arrête
    run.t += dt;
    run.vx *= Math.pow(0.15, dt);
    run.x += run.vx * dt;
    return run;
  }
  const T = run.terrain;
  T.extend(run.x + 3000);
  if (Math.floor(run.t) !== Math.floor(run.t + dt)) T.trim(run.x - 1200);
  run.t += dt;

  // Pas internes de 1/240 s pour une physique stable
  let remain = dt;
  while (remain > 1e-6 && run.state === 'ride') {
    const h = Math.min(remain, 1 / 240);
    remain -= h;
    substep(run, h, input);
    input = { held: input.held, pressed: false };
  }
  return run;
}

function substep(run, h, input) {
  const T = run.terrain;
  const P = run.physics;
  run.boost = Math.max(0, run.boost - h);

  // Saut (aussi juste après avoir quitté le sol)
  if (input.pressed && (run.grounded || run.sinceGround < COYOTE) && run.airTime < COYOTE + 0.01) {
    const g = T.ground(run.x);
    const th = g ? Math.atan(g.slope) : run.angle;
    run.vx += -Math.sin(th) * JUMP;
    run.vy += Math.cos(th) * JUMP;
    run.grounded = false;
    run.sinceGround = COYOTE; // pas de second saut
    run.airTime = 0.001;
    run.airSpin = 0;
    run.events.push({ type: 'jump' });
  }

  if (run.grounded) {
    const g = T.ground(run.x);
    if (!g) { run.grounded = false; } else {
      const th = Math.atan(g.slope);
      let s = Math.hypot(run.vx, run.vy) * Math.sign(run.vx * Math.cos(th) + run.vy * Math.sin(th) || 1);
      const acc = -GRAVITY * Math.sin(th) - 0.0034 * P.friction * s * Math.abs(s) + (run.boost > 0 ? 260 : 0);
      s += acc * h;
      s = Math.max(MIN_SPEED, Math.min(P.maxSpeed + (run.boost > 0 ? 60 : 0), s));
      run.vx = s * Math.cos(th);
      run.vy = s * Math.sin(th);
      run.angle = th;
      run.spin = 0;
      run.sinceGround = 0;
      // Décollage sur une bosse ou une lèvre de tremplin : la courbure demande plus que la pesanteur
      const curv = (T.ground(run.x + 2)?.slope ?? g.slope) - (T.ground(run.x - 2)?.slope ?? g.slope);
      const ypp = curv / 4;
      if (ypp < 0 && s * s * -ypp / Math.pow(1 + g.slope * g.slope, 1.5) > GRAVITY * Math.cos(th)) {
        run.grounded = false;
        run.airTime = 0.001;
        run.airSpin = 0;
      }
    }
  }

  // Déplacement
  const prevX = run.x;
  if (!run.grounded) {
    run.vy -= GRAVITY * h;
    run.airTime += h;
    run.sinceGround += h;
    // Salto : rotation tant qu'on appuie (vers l'arrière), elle s'amortit au relâchement
    if (input.held && run.airTime > 0.05) run.spin += (SPIN - run.spin) * Math.min(1, h * 14);
    else {
      run.spin *= Math.pow(0.02, h);
      // Sans appui, le corps se replace doucement face à la pente d'arrivée (au plus près de son angle actuel)
      if (Math.abs(run.spin) < 1.5) {
        const below = T.ground(run.x + run.vx * 0.15) || T.ground(run.x);
        const target = below ? Math.atan(below.slope) : Math.atan2(run.vy, run.vx) * 0.5;
        const d = wrapAngle(target - run.angle);
        const stepA = Math.sign(d) * Math.min(Math.abs(d), LEVEL * h);
        run.angle += stepA;
        run.airSpin += stepA;
      }
    }
    run.angle += run.spin * h;
    run.airSpin += run.spin * h;
  }
  run.x += run.vx * h;
  run.y += run.vy * h;

  // Obstacles (rochers…) : touchés au sol, ou en l'air trop bas
  for (const hz of T.hazards) {
    if (hz.type !== 'rock' || hz.hit) continue;
    if (run.x + 6 >= hz.x0 && run.x - 6 <= hz.x1 && run.y < hz.y + hz.h - 2) {
      hz.hit = true;
      crash(run, 'obstacle');
      return;
    }
  }

  // Pièces
  for (const c of T.coins) {
    if (c.taken) continue;
    if (Math.abs(c.x - run.x) < 18 && Math.abs(c.y - (run.y + 14)) < 24) {
      c.taken = true;
      run.coins++;
      run.score += POINTS.coin;
      run.events.push({ type: 'coin' });
    }
  }

  const g = T.ground(run.x);
  if (!g) {
    // Au-dessus du vide : on tombe si on passe bien sous le bord
    run.grounded = false;
    const gap = T.hazards.find((hz) => hz.type === 'gap' && run.x >= hz.x0 && run.x <= hz.x1);
    if (gap && run.y < Math.min(gap.yNear, gap.yFar) - 60) crash(run, 'gap');
    return;
  }

  if (run.grounded) {
    if (g.y < run.y - 3) { run.grounded = false; run.airTime = 0.001; run.airSpin = 0; return; } // bord de falaise
    run.y = g.y;
    return;
  }

  if (run.y <= g.y) {
    // Contact avec le sol : mur (on arrive sous le bord d'arrivée) ou atterrissage
    const groundPrev = T.ground(prevX);
    if (!groundPrev && g.y - run.y > 14) { crash(run, 'wall'); return; }
    land(run, g);
  }
}

function land(run, g) {
  const th = Math.atan(g.slope);
  const diff = Math.abs(wrapAngle(run.angle - th));
  run.y = g.y;
  if (diff > LAND_OK) { crash(run, 'landing'); return; }
  // Figures : un salto compte à partir de 300° de rotation
  const turns = Math.floor((Math.abs(run.airSpin) + Math.PI / 6) / (Math.PI * 2));
  const perfect = diff < LAND_PERFECT;
  let pts = 0;
  if (turns > 0) {
    run.combo += turns;
    run.flips += turns;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    pts += POINTS.flip * turns * turns * Math.min(run.combo, 5) / turns; // double salto = 4×, enchaînements multipliés
  }
  if (perfect && run.airTime > 0.35) { pts += POINTS.perfect; run.perfects++; run.boost = turns > 0 ? 1.4 : 0.6; }
  pts = Math.round(pts);
  run.score += pts;
  // On garde la vitesse le long de la pente
  const s = run.vx * Math.cos(th) + run.vy * Math.sin(th);
  run.vx = Math.max(MIN_SPEED, s) * Math.cos(th);
  run.vy = Math.max(MIN_SPEED, s) * Math.sin(th);
  run.angle = th;
  run.spin = 0;
  const air = run.airTime;
  run.airTime = 0;
  run.airSpin = 0;
  run.grounded = true;
  if (air > 0.12 || turns) run.events.push({ type: 'land', turns, perfect, pts, combo: run.combo, air });
}

/** Message de chute affiché au joueur. */
export function crashText(reason, world) {
  const W = worldById(world);
  switch (reason) {
    case 'obstacle': return `Aïe, le ${W?.obstacle.name || 'rocher'} !`;
    case 'gap': return W?.fall || 'Tombé dans le vide !';
    case 'wall': return 'Saut trop court !';
    case 'landing': return 'Mauvaise réception !';
    default: return 'Chute !';
  }
}
