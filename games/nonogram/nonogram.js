// Nonogramme : tirage d'une grille, indices et résolution logique (sans dépendance au DOM, testé par tests/nonogram.test.js).
// Une grille est un tableau plat de n × n valeurs : 1 = case noire, 0 = case blanche (index = ligne * n + colonne).

export const LEVELS = [
  { id: 'facile', label: 'Facile', size: 5 },
  { id: 'moyen', label: 'Moyen', size: 10 },
  { id: 'difficile', label: 'Difficile', size: 15 },
];
export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

/** Indices d'une ligne : longueurs des blocs de cases noires ([] si la ligne est vide). */
export function lineClue(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
}

export const rowOf = (grid, n, r) => grid.slice(r * n, r * n + n);
export const colOf = (grid, n, c) => Array.from({ length: n }, (_, r) => grid[r * n + c]);

/** Indices des lignes et des colonnes. */
export function cluesOf(grid, n) {
  return {
    rows: Array.from({ length: n }, (_, r) => lineClue(rowOf(grid, n, r))),
    cols: Array.from({ length: n }, (_, c) => lineClue(colOf(grid, n, c))),
  };
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** La ligne (cases noires = 1, le reste = blanc ou croix) respecte-t-elle son indice ? */
export function lineMatches(line, clue) {
  return same(lineClue(line.map((v) => (v === 1 ? 1 : 0))), clue);
}

/** Toutes les lignes et colonnes respectent leurs indices : la grille est résolue. */
export function isSolved(cells, n, clues) {
  for (let i = 0; i < n; i++) {
    if (!lineMatches(rowOf(cells, n, i), clues.rows[i])) return false;
    if (!lineMatches(colOf(cells, n, i), clues.cols[i])) return false;
  }
  return true;
}

/**
 * Résout une ligne : `known` contient -1 (inconnu), 0 (blanc) ou 1 (noir).
 * Renvoie la ligne complétée de tout ce qui est certain, ou null si aucune disposition n'est possible.
 */
export function solveLine(known, clue) {
  const n = known.length, k = clue.length;
  // ok(pos, j) : les blocs j… peuvent-ils se placer à partir de la case pos ?
  const memo = new Map();
  const ok = (pos, j) => {
    if (pos >= n) return j === k;
    const key = pos * (k + 1) + j;
    if (memo.has(key)) return memo.get(key);
    let r = false;
    if (known[pos] !== 1 && ok(pos + 1, j)) r = true;
    else if (j < k && fits(pos, clue[j]) && ok(Math.min(n, pos + clue[j] + 1), j + 1)) r = true;
    memo.set(key, r);
    return r;
  };
  const fits = (pos, len) => {
    if (pos + len > n) return false;
    for (let i = pos; i < pos + len; i++) if (known[i] === 0) return false;
    return pos + len === n || known[pos + len] !== 1;
  };
  if (!ok(0, 0)) return null;
  const canFill = new Array(n).fill(false), canEmpty = new Array(n).fill(false);
  const seen = new Set();
  const stack = [[0, 0]];
  while (stack.length) {
    const [pos, j] = stack.pop();
    if (pos >= n) continue;
    const key = pos * (k + 1) + j;
    if (seen.has(key)) continue;
    seen.add(key);
    if (known[pos] !== 1 && ok(pos + 1, j)) { canEmpty[pos] = true; stack.push([pos + 1, j]); }
    if (j < k && fits(pos, clue[j])) {
      const next = Math.min(n, pos + clue[j] + 1);
      if (ok(next, j + 1)) {
        for (let i = pos; i < pos + clue[j]; i++) canFill[i] = true;
        if (pos + clue[j] < n) canEmpty[pos + clue[j]] = true;
        stack.push([next, j + 1]);
      }
    }
  }
  return known.map((v, i) => (v !== -1 ? v : canFill[i] && !canEmpty[i] ? 1 : canEmpty[i] && !canFill[i] ? 0 : -1));
}

/**
 * Résolution par raisonnement ligne par ligne, sans jamais deviner.
 * Renvoie la grille (-1 pour les cases restées inconnues) et `solved` : vrai si tout est déduit,
 * ce qui garantit une solution unique trouvable par logique.
 */
export function solveLogic(n, clues) {
  const g = new Array(n * n).fill(-1);
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n; r++) {
      const line = solveLine(rowOf(g, n, r), clues.rows[r]);
      if (!line) return { grid: g, solved: false, contradiction: true };
      line.forEach((v, c) => { if (g[r * n + c] !== v) { g[r * n + c] = v; changed = true; } });
    }
    for (let c = 0; c < n; c++) {
      const line = solveLine(colOf(g, n, c), clues.cols[c]);
      if (!line) return { grid: g, solved: false, contradiction: true };
      line.forEach((v, r) => { if (g[r * n + c] !== v) { g[r * n + c] = v; changed = true; } });
    }
  }
  return { grid: g, solved: g.every((v) => v !== -1) };
}

// Grille au hasard : bruit, puis lissage (les cases noires se regroupent en formes, les indices restent courts)
function randomGrid(n, rnd) {
  const density = n <= 5 ? 0.6 : 0.55;
  let g = Array.from({ length: n * n }, () => (rnd() < density ? 1 : 0));
  if (n > 5) {
    const next = g.map((v, i) => {
      const r = Math.floor(i / n), c = i % n;
      let s = 0, t = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        s += g[rr * n + cc]; t++;
      }
      const p = s / t;
      return p > 0.55 ? 1 : p < 0.45 ? 0 : (rnd() < 0.5 ? 1 : 0);
    });
    g = next;
  }
  return g;
}

/**
 * Tire une grille n × n qui a une solution unique, trouvable par logique.
 * Rejette les grilles trop vides ou trop pleines, et celles qui ont une ligne ou une colonne vide.
 */
export function generate(n, rnd = Math.random, maxTries = 400) {
  let last = null;
  for (let t = 0; t < maxTries; t++) {
    const g = randomGrid(n, rnd);
    const filled = g.reduce((a, b) => a + b, 0) / (n * n);
    if (filled < 0.4 || filled > 0.72) continue;
    const clues = cluesOf(g, n);
    if (clues.rows.some((c) => !c.length) || clues.cols.some((c) => !c.length)) continue;
    last = { grid: g, clues };
    if (solveLogic(n, clues).solved) return { grid: g, clues, tries: t + 1 };
  }
  // En pratique on n'arrive pas ici ; à défaut, une grille valide (peut-être à plusieurs solutions)
  if (last) return { ...last, tries: maxTries };
  const g = Array.from({ length: n * n }, (_, i) => ((Math.floor(i / n) + (i % n)) % 2 ? 0 : 1));
  return { grid: g, clues: cluesOf(g, n), tries: maxTries };
}

/** Temps lisible : 75 000 ms → « 1:15 », 3 725 000 → « 1:02:05 ». */
export function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (x) => String(x).padStart(2, '0');
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${mm}:${p(ss)}`;
}
