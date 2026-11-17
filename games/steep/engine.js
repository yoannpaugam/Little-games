// Steep : moteur sans DOM (terrain procédural, physique, figures, score). Testé par tests/steep.test.js.
//
// Repère : x vers la droite, y vers le HAUT (le terrain descend quand x augmente).
// Unités : 10 unités = 1 mètre. Temps en secondes.

import { COURSE_TYPES, worldById } from './worlds.js?v=1.59.0';

export const UNITS_PER_M = 10;
export const GRAVITY = 620;
export const JUMP_MIN = 215;        // saut d'un simple appui (impulsion perpendiculaire à la pente)
export const JUMP_MAX = 400;        // saut complètement chargé
export const CHARGE_TIME = 0.55;    // durée d'appui pour charger complètement le saut (s)
export const CROUCH_PUSH = 90;      // accélération quand on est baissé au sol
export const MIN_SPEED = 150;       // le joueur pousse toujours un peu
export const SPIN = 7.6;            // vitesse de rotation en salto (rad/s)
export const LAND_OK = 0.95;        // écart d'angle toléré à l'atterrissage (rad, ≈ 54°)
export const LAND_PERFECT = 0.28;   // atterrissage parfait (≈ 16°)
export const LEVEL = 2.2;           // redressement automatique en l'air sans appui (rad/s)
export const COYOTE = 0.12;         // on peut encore sauter juste après avoir quitté le sol
export const POINTS = { coin: 10, flip: 100, perfect: 25 };

export const jumpImpulse = (charge) => JUMP_MIN + (JUMP_MAX - JUMP_MIN) * Math.max(0, Math.min(1, charge));

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

  // Un trou : on ferme le morceau, on note le danger, le morceau suivant commence de l'autre côté
  function gapTo(w, dy, kind) {
    const p = last();
    finishPiece(cur.pts);
    T.hazards.push({ type: 'gap', trap: kind, x0: p.x, x1: p.x + w, yNear: p.y, yFar: p.y + dy });
    newPiece(p.x + w, p.y + dy);
    return p;
  }
  // Petit plat (îlot, pilier, réception) de longueur len
  const flat = (len, slope = 0.06) => { const p = last(); push(p.x + len, p.y - len * slope); };
  const coinArc = (x0, x1, y, lift = 45) => {
    const n = Math.max(2, Math.round((x1 - x0) / 32));
    for (let k = 0; k <= n; k++) T.coins.push({ x: x0 + ((x1 - x0) * k) / n, y: y + lift * Math.sin((k / n) * Math.PI) + 18, lift: null, taken: false });
  };

  function addTrap(d) {
    const p0 = last();
    if (p0.x - lastHazardX < 320) return false;
    const r = rng();
    if (r < C.trap * d) {
      const kind = pick(rng, C.traps);
      // Les pièges qui demandent un saut chargé sont précédés d'une pente pour prendre de la vitesse
      if (kind === 'wide' || kind === 'stepUp' || kind === 'pillars') {
        const q = last();
        const len = 260;
        for (let i = 1; i <= 4; i++) push(q.x + (len * i) / 4, q.y - (baseSlope + 0.08) * (len * i) / 4);
      }
      const q = last();
      switch (kind) {
        case 'wide': {
          const w = between(rng, 150, 175 + 45 * d);
          gapTo(w, -between(rng, 30, 70), kind);
          coinArc(q.x, q.x + w, q.y, 70);
          flat(between(rng, 140, 200));
          break;
        }
        case 'stepUp': { // l'autre bord est plus haut : un saut trop faible finit dans le mur
          const w = between(rng, 70, 95 + 20 * d);
          gapTo(w, between(rng, 10, 18 + 14 * d), kind);
          coinArc(q.x, q.x + w, q.y, 60);
          flat(between(rng, 150, 200), 0.02);
          break;
        }
        case 'island': { // un îlot entre deux trous : ni trop court, ni trop loin
          const w1 = between(rng, 70, 105), isl = between(rng, 75, 120 - 25 * d), w2 = between(rng, 80, 115);
          gapTo(w1, -between(rng, 10, 25), kind);
          flat(isl, 0.04);
          const m = last();
          gapTo(w2, -between(rng, 20, 45), kind);
          coinArc(q.x, m.x - isl * 0.3, q.y, 40);
          flat(between(rng, 140, 200));
          break;
        }
        case 'pillars': { // 2 ou 3 piliers étroits au-dessus du vide
          const n = 2 + (rng() < 0.4 + 0.3 * d ? 1 : 0);
          gapTo(between(rng, 65, 95), -between(rng, 5, 20), kind);
          for (let i = 0; i < n; i++) {
            flat(between(rng, 70, 105 - 15 * d), 0.03);
            gapTo(between(rng, 65, 95), -between(rng, 5, 25), kind);
          }
          flat(between(rng, 150, 200));
          break;
        }
        case 'rockLanding': { // un obstacle juste après le trou : sauter plus loin, ou se poser avant et resauter
          const w = between(rng, 70, 105);
          const p = gapTo(w, -between(rng, 20, 50), kind);
          const gapLen = between(rng, 60, 110);
          flat(gapLen + 140);
          const rx = p.x + w + gapLen;
          const g = hermite(cur.pts, rx);
          const rw = between(rng, 18, 26);
          T.hazards.push({ type: 'rock', x0: rx - rw / 2, x1: rx + rw / 2, h: between(rng, 16, 24), y: g.y });
          coinArc(q.x, rx + 20, q.y, 65);
          break;
        }
        default: { // trou simple
          const w = between(rng, 60, 85 + 45 * d);
          gapTo(w, -between(rng, 25, 70), 'gap');
          for (let k = 0; k < 4; k++) T.coins.push({ x: q.x + (w * (k + 0.5)) / 4, y: q.y + 45 - k * 6, lift: null, taken: false });
          flat(90, baseSlope);
        }
      }
      lastHazardX = last().x - 120;
      return true;
    }
    if (r < (C.trap + C.cliff) * d) {
      const p = last();
      const drop = between(rng, 50, 90 + 70 * d);
      finishPiece(cur.pts);
      T.hazards.push({ type: 'cliff', x0: p.x, x1: p.x, yNear: p.y, yFar: p.y - drop });
      newPiece(p.x, p.y - drop); // même x : après le bord, le morceau le plus bas l'emporte
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
        if (!addTrap(d)) {
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
    charge: 0,           // saut en préparation (0 à 1) : on est baissé tant qu'on appuie au sol
    holdGround: false,   // l'appui en cours a commencé au sol (il prépare un saut, pas un salto)
    prevHeld: false,
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

  // Appui et relâchement : on les déduit de l'état « appuyé » d'une image à l'autre
  const held = !!input.held;
  let edges = { held, pressed: held && !run.prevHeld, released: !held && run.prevHeld };
  run.prevHeld = held;
  // Pas internes de 1/240 s pour une physique stable
  let remain = dt;
  while (remain > 1e-6 && run.state === 'ride') {
    const h = Math.min(remain, 1 / 240);
    remain -= h;
    substep(run, h, edges);
    edges = { held, pressed: false, released: false };
  }
  return run;
}

function substep(run, h, input) {
  const T = run.terrain;
  const P = run.physics;
  run.boost = Math.max(0, run.boost - h);

  // Appui au sol : on se baisse et on charge le saut ; relâcher fait sauter
  if (input.pressed) run.holdGround = run.grounded || run.sinceGround < COYOTE;
  if (input.held && run.holdGround) run.charge = Math.min(1, run.charge + h / CHARGE_TIME);
  if (input.released) {
    if (run.holdGround && (run.grounded || run.sinceGround < COYOTE) && run.airTime < COYOTE + 0.01) jump(run, run.charge);
    run.holdGround = false;
    run.charge = 0;
  }

  if (run.grounded) {
    const g = T.ground(run.x);
    if (!g) { run.grounded = false; } else {
      const th = Math.atan(g.slope);
      let s = Math.hypot(run.vx, run.vy) * Math.sign(run.vx * Math.cos(th) + run.vy * Math.sin(th) || 1);
      const acc = -GRAVITY * Math.sin(th) - 0.0034 * P.friction * s * Math.abs(s) + (run.boost > 0 ? 260 : 0) + (run.holdGround && input.held ? CROUCH_PUSH : 0);
      s += acc * h;
      s = Math.max(MIN_SPEED, Math.min(P.maxSpeed + (run.boost > 0 ? 60 : 0) + (run.holdGround && input.held ? 25 : 0), s));
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
    if (input.held && !run.holdGround && run.airTime > 0.05) run.spin += (SPIN - run.spin) * Math.min(1, h * 14);
    else {
      run.spin *= Math.pow(0.001, h); // la rotation s'arrête vite au relâchement
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

/** Saut immédiat (charge de 0 à 1). Sert au relâchement, et aux planchistes automatiques. */
export function jump(run, charge = 0) {
  const g = run.terrain.ground(run.x);
  const th = g ? Math.atan(g.slope) : run.angle;
  const J = jumpImpulse(charge);
  run.vx += -Math.sin(th) * J;
  run.vy += Math.cos(th) * J;
  run.grounded = false;
  run.sinceGround = COYOTE; // pas de second saut
  run.airTime = 0.001;
  run.airSpin = 0;
  run.charge = 0;
  run.holdGround = false;
  run.events.push({ type: 'jump', charge });
}

/**
 * Où retomberait-on en sautant maintenant avec cette charge ? (trajectoire simulée, sans salto)
 * → { ok, reason, x } ; reason : 'gap' | 'wall' | 'rock'.
 */
export function predictJump(run, charge) {
  const T = run.terrain;
  const g0 = T.ground(run.x);
  if (!g0) return { ok: false, reason: 'gap', x: run.x };
  const th = Math.atan(g0.slope);
  const J = jumpImpulse(charge);
  let x = run.x, y = g0.y, vx = run.vx - Math.sin(th) * J, vy = run.vy + Math.cos(th) * J;
  let prevX = x;
  for (let t = 0; t < 5; t += 1 / 120) {
    prevX = x;
    vy -= GRAVITY / 120;
    x += vx / 120; y += vy / 120;
    for (const hz of T.hazards) if (hz.type === 'rock' && x + 6 >= hz.x0 && x - 6 <= hz.x1 && y < hz.y + hz.h - 2) return { ok: false, reason: 'rock', x };
    const g = T.ground(x);
    if (!g) {
      const gap = T.hazards.find((hz) => hz.type === 'gap' && x >= hz.x0 && x <= hz.x1);
      if (gap && y < Math.min(gap.yNear, gap.yFar) - 60) return { ok: false, reason: 'gap', x };
      continue;
    }
    if (t > 0.05 && y <= g.y) {
      if (!T.ground(prevX) && g.y - y > 14) return { ok: false, reason: 'wall', x };
      return { ok: true, x };
    }
  }
  return { ok: false, reason: 'gap', x };
}

/**
 * Planchiste automatique (aperçu du menu, tests) : devant un danger, il cherche le saut le plus faible
 * qui retombe sur du sol, assez loin de l'obstacle suivant. Il triche sur la durée de charge.
 */
export function autoPilot(run, { flips = false } = {}) {
  const T = run.terrain;
  if (run.grounded) {
    const hz = T.hazards.find((z) => (z.type === 'rock' || z.type === 'gap') && z.x1 > run.x - 2);
    const dist = hz ? hz.x0 - run.x : Infinity;
    if (hz && dist < 150) {
      for (const c of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
        const p = predictJump(run, c);
        // Point de chute pas trop près du danger suivant, pour pouvoir resauter
        if (p.ok && p.x > hz.x1 + 4 && !T.hazards.some((z) => z !== hz && z.type !== 'cliff' && p.x > z.x0 - 30 && p.x < z.x0 + 2)) {
          jump(run, c);
          run.__flip = flips && c >= 0.6 && Math.random() < 0.6;
          return { held: false };
        }
      }
      if (dist < 4) { jump(run, 1); run.__flip = false; }
    }
    return { held: false };
  }
  const held = run.__flip && run.airTime > 0.08 && Math.abs(run.airSpin) < Math.PI * 2 - 0.5;
  return { held };
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
