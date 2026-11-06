// Le chemin : génération du chemin et calcul du score (sans DOM, testé par tests/path.test.js).
// Une case s'écrit [étape, couloir] : l'étape va du départ (0) à l'arrivée (STEPS - 1),
// le couloir de 0 à LANES - 1. En portrait, les étapes sont les lignes ; en paysage, les colonnes.

export const LANES = 11, STEPS = 14;         // 11 colonnes × 14 lignes en portrait (14 × 11 en paysage)
export const MAX_ERRORS = 5, MAX_VIEWS = 3;  // 5 erreurs permises par parcours (puis nouveau chemin), 3 affichages par parcours
export const SHOW_SECONDS = 6;               // durée d'affichage du chemin
export const MIN_TURNS = 7, MIN_LENGTH = 24; // chemin sinueux
export const ERROR_PENALTY = 6, EXTRA_VIEW_PENALTY = 8;

const DIRS = [[0, -1], [0, 1], [1, 0], [-1, 0]];

/** Nombre de virages d'un chemin. */
export function countTurns(path) {
  let t = 0;
  for (let i = 2; i < path.length; i++) {
    const a0 = path[i - 1][0] - path[i - 2][0], a1 = path[i - 1][1] - path[i - 2][1];
    const b0 = path[i][0] - path[i - 1][0], b1 = path[i][1] - path[i - 1][1];
    if (a0 !== b0 || a1 !== b1) t++;
  }
  return t;
}

/** Serpentin déterministe, utilisé seulement si le tirage échoue. */
export function fallbackPath(lanes = LANES, steps = STEPS) {
  const p = [[0, 0]];
  let right = true;
  for (let s = 1; s < steps - 1; s += 2) {
    for (let l = 0; l < lanes; l++) p.push([s, right ? l : lanes - 1 - l]);
    if (s + 2 < steps - 1) p.push([s + 1, right ? lanes - 1 : 0]);
    right = !right;
  }
  const [r, l] = p[p.length - 1];
  for (let s = r + 1; s < steps; s++) p.push([s, l]); // descend jusqu'à l'arrivée
  return p;
}

/**
 * Chemin sans raccourci : chaque nouvelle case ne touche (par un côté) que la précédente.
 * Il part d'une case de la première étape, n'y revient jamais, et s'arrête en atteignant la dernière.
 */
export function generatePath(rng = Math.random, lanes = LANES, steps = STEPS) {
  const key = (s, l) => s * lanes + l;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const path = [[0, Math.floor(rng() * lanes)]];
    const used = new Set([key(0, path[0][1])]);
    let last = -1;
    while (path[path.length - 1][0] < steps - 1) {
      const [s, l] = path[path.length - 1], opts = [];
      DIRS.forEach((d, i) => {
        const ns = s + d[0], nl = l + d[1];
        if (ns < 1 || ns >= steps || nl < 0 || nl >= lanes || used.has(key(ns, nl))) return;
        let touching = 0;
        for (const e of DIRS) if (used.has(key(ns + e[0], nl + e[1]))) touching++;
        if (touching !== 1) return;
        let w = d[0] === 1 ? 2 : d[0] === -1 ? 0.5 : 3; // on avance, on recule peu, on serpente beaucoup
        if (i === last) w *= 1.4;
        opts.push([i, ns, nl, w]);
      });
      if (!opts.length) break;
      let t = rng() * opts.reduce((a, o) => a + o[3], 0), pick = opts[opts.length - 1];
      for (const o of opts) { t -= o[3]; if (t <= 0) { pick = o; break; } }
      last = pick[0];
      path.push([pick[1], pick[2]]);
      used.add(key(pick[1], pick[2]));
    }
    if (path[path.length - 1][0] === steps - 1 && path.length >= MIN_LENGTH && countTurns(path) >= MIN_TURNS) return path;
  }
  return fallbackPath(lanes, steps);
}

/**
 * Score sur 100 : −6 par erreur, −8 par affichage au-delà du premier de chaque parcours, 0 si abandon.
 * `paths` : nombre de parcours joués (un nouveau chemin est tiré après trop d'erreurs).
 */
export function computeScore(errors, views, abandoned = false, paths = 1) {
  if (abandoned) return 0;
  return Math.max(0, 100 - ERROR_PENALTY * errors - EXTRA_VIEW_PENALTY * Math.max(0, views - paths));
}
