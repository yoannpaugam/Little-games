import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePath, fallbackPath, countTurns, computeScore, LANES, STEPS, MIN_LENGTH, MIN_TURNS } from '../games/path/path.js';

// Générateur pseudo-aléatoire reproductible (mulberry32)
function rngFrom(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkPath(p, { strict = true } = {}) {
  const key = ([s, l]) => s * LANES + l;
  assert.equal(p[0][0], 0, 'départ sur la première étape');
  assert.equal(p[p.length - 1][0], STEPS - 1, 'arrivée sur la dernière étape');
  assert.equal(new Set(p.map(key)).size, p.length, 'aucune case en double');
  for (const [s, l] of p) assert.ok(s >= 0 && s < STEPS && l >= 0 && l < LANES, `case hors grille ${s},${l}`);
  for (let i = 1; i < p.length; i++) {
    const d = Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]);
    assert.equal(d, 1, `cases ${i - 1} et ${i} non voisines`);
  }
  // Sans raccourci : deux cases qui se touchent par un côté sont consécutives dans le chemin
  const idx = new Map(p.map((c, i) => [key(c), i]));
  p.forEach(([s, l], i) => {
    for (const [ds, dl] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const j = idx.get((s + ds) * LANES + (l + dl));
      if (j != null && l + dl >= 0 && l + dl < LANES) assert.equal(Math.abs(i - j), 1, `raccourci entre ${i} et ${j}`);
    }
  });
  assert.equal(p.filter(([s]) => s === 0).length, 1, 'une seule case de départ');
  assert.equal(p.filter(([s]) => s === STEPS - 1).length, 1, 'une seule case d’arrivée');
  if (strict) {
    assert.ok(p.length >= MIN_LENGTH, `longueur ${p.length}`);
    assert.ok(countTurns(p) >= MIN_TURNS, `virages ${countTurns(p)}`);
  }
}

test('les chemins tirés sont valides, longs et sinueux', () => {
  for (let seed = 1; seed <= 300; seed++) checkPath(generatePath(rngFrom(seed)));
});

test('les chemins varient d’une partie à l’autre', () => {
  const sig = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(generatePath(rngFrom(1000 + i)))));
  assert.ok(sig.size >= 28);
});

test('le chemin de secours est valide', () => {
  checkPath(fallbackPath(), { strict: false });
  checkPath(generatePath(() => 0.999999), { strict: false });
});

test('score : −6 par erreur, −8 par affichage supplémentaire, 0 si abandon', () => {
  assert.equal(computeScore(0, 1), 100);
  assert.equal(computeScore(2, 1), 88);
  assert.equal(computeScore(1, 3), 78);
  assert.equal(computeScore(30, 3), 0);
  assert.equal(computeScore(0, 1, true), 0);
  // nouveau parcours après trop d'erreurs : son premier affichage ne coûte rien, les erreurs comptent toujours
  assert.equal(computeScore(5, 2, false, 2), 70);
  assert.equal(computeScore(6, 4, false, 2), 48);
});
