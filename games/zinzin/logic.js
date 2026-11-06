// Compète de zinzin : règles du jeu de plateau, sans DOM (testé par tests/zinzin.test.js).
// Toute la partie tient dans un état G sérialisable en JSON. Il n'est modifié que par applyAction(G, action, env) :
// la même fonction sert sur un seul téléphone et chez l'arbitre en multi.
//   env.now  : heure de l'arbitre (ms)
//   env.rnd  : générateur aléatoire (Math.random par défaut)
//   env.pick : (jeu, déjàVus, rnd) → défi tiré dans le catalogue du jeu ({ id, ... }) ou null

export const BOARD_COLS = 6, BOARD_ROWS = 10;           // plateau en anneau : 6 × 10 en portrait (10 × 6 en paysage)
export const BOARD_SIZE = 2 * BOARD_COLS + 2 * (BOARD_ROWS - 2); // 28 cases, la case 0 est le départ
export const MIN_TEAMS = 2, MAX_TEAMS = 6;
export const MIN_LAPS = 1, MAX_LAPS = 3;
export const TEAM_COLORS = ['#ff4d6d', '#ffe14d', '#f4f1ea', '#b8f24a', '#ff9a3c', '#3dd6ff'];

// Durée de l'animation : le dé tourne, puis le pion avance case par case, puis le défi s'ouvre.
export const DICE_MS = 900, STEP_MS = 260, PAUSE_MS = 450;
export const REVEAL_MS = 4500;   // la réponse reste affichée sur tous les écrans avant le tour suivant
export const GRACE_MS = 4000;    // l'arbitre déclare le défi raté s'il n'a pas reçu de résultat après le délai + cette marge

// Durée de chaque défi (secondes)
export const DURATION = { affiches: 45, visages: 45, livres: 40, geoquizz: 50, chemin: 40, nonogramme: 90 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Position (colonne, ligne) de la case i sur l'anneau, dans le sens des aiguilles d'une montre depuis le coin en haut à gauche. */
export function cellPos(i, cols = BOARD_COLS, rows = BOARD_ROWS) {
  const top = cols, right = rows - 2, bottom = cols;
  if (i < top) return [i, 0];
  if (i < top + right) return [cols - 1, i - top + 1];
  if (i < top + right + bottom) return [cols - 1 - (i - top - right), rows - 1];
  return [0, rows - 2 - (i - top - right - bottom)];
}

export const MAX_WEIGHT = 3; // proportion d'un jeu sur le plateau : 0 (absent) à 3 (beaucoup)

/**
 * Nombre de cases de chaque jeu sur `cells` cases, proportionnel à son poids (méthode du plus fort reste).
 * weights : { jeu: poids } (poids absent = 1). → { jeu: nombre de cases }
 */
export function boardCounts(games, weights = {}, cells = BOARD_SIZE - 1) {
  const w = games.map((g) => Math.max(0, weights[g] ?? 1));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const exact = w.map((x) => (x * cells) / total);
  const out = exact.map(Math.floor);
  let left = cells - out.reduce((a, b) => a + b, 0);
  exact.map((x, i) => [x - Math.floor(x), i]).filter(([, i]) => w[i] > 0).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return Object.fromEntries(games.map((g, i) => [g, out[i]]));
}

/**
 * Plateau : la case 0 est le départ, les autres prennent les jeux dans les proportions demandées,
 * dans un ordre tiré au hasard et jamais deux fois le même jeu d'affilée quand c'est possible.
 */
export function makeBoard(games, rnd = Math.random, size = BOARD_SIZE, weights = {}) {
  const board = ['depart'];
  const counts = boardCounts(games, weights, size - 1);
  const left = { ...counts };
  for (let i = 1; i < size; i++) {
    const remaining = size - i;
    const prev = board[i - 1];
    const avail = games.filter((g) => left[g] > 0);
    if (!avail.length) break;
    let opts = avail.filter((g) => g !== prev);
    // un jeu qui occupe plus de la moitié des cases restantes doit passer maintenant, sinon il finirait collé
    const urgent = opts.find((g) => left[g] > remaining / 2);
    if (urgent) opts = [urgent];
    if (!opts.length) opts = avail; // inévitable : seul ce jeu reste
    let r = rnd() * opts.reduce((a, g) => a + left[g], 0), g = opts[opts.length - 1];
    for (const o of opts) { r -= left[o]; if (r <= 0) { g = o; break; } }
    left[g]--;
    board.push(g);
  }
  return board;
}

/** Nouvel état de partie. teams : [{ cid, name }] */
export function newGame({ mode = 'solo', laps = 1, maxTeams = 4, games = [], weights = {}, teams = [] }, env = {}) {
  const rnd = env.rnd || Math.random;
  const w = Object.fromEntries(games.map((g) => [g, clamp(weights[g] ?? 1, 0, MAX_WEIGHT)]));
  if (!games.some((g) => w[g] > 0)) games.forEach((g) => { w[g] = 1; }); // au moins un jeu
  games = games.filter((g) => w[g] > 0);
  return {
    v: 1,
    mode,
    phase: mode === 'multi' ? 'lobby' : 'play',
    laps: clamp(laps | 0, MIN_LAPS, MAX_LAPS),
    maxTeams: clamp(maxTeams | 0, MIN_TEAMS, MAX_TEAMS),
    games,
    weights: w,
    board: makeBoard(games, rnd, BOARD_SIZE, w),
    teams: teams.map((t, i) => team(t, i)),
    turn: { team: 0, n: 1, stage: 'roll', roll: null, ch: null, live: null, last: null, final: null },
    used: {},
    winner: null,
    seq: 0,
  };
}

function team(t, i) {
  return { cid: t.cid || 'local', name: cleanName(t.name) || `Équipe ${i + 1}`, color: TEAM_COLORS[i % TEAM_COLORS.length], steps: 0, stuck: false, away: false };
}

export function cleanName(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 18);
}

/** Tour de plateau (1, 2…) et case d'une équipe. */
export const lapOf = (G, t) => Math.min(G.laps, Math.floor(t.steps / G.board.length) + 1);
export const cellOf = (G, t) => t.steps % G.board.length;
export const goalOf = (G) => G.laps * G.board.length;

/** Classement : la plus avancée d'abord (le vainqueur en tête). */
export function ranking(G) {
  return G.teams.map((t, i) => ({ ...t, i }))
    .sort((a, b) => (b.i === G.winner) - (a.i === G.winner) || b.steps - a.steps || a.i - b.i);
}

/** Heure à laquelle le défi d'un lancer s'ouvre (dé + déplacement + pause). */
export const challengeStart = (rollAt, value) => rollAt + DICE_MS + value * STEP_MS + PAUSE_MS;

const isHost = (G, a) => G.mode !== 'multi' || a.cid === G.teams[0]?.cid;
const isActive = (G, a) => G.mode !== 'multi' || a.cid === G.teams[G.turn.team]?.cid;
const findTeam = (G, cid) => G.teams.findIndex((t) => t.cid === cid);

/**
 * Applique une action à l'état (modifié sur place). Renvoie true si l'état a changé.
 * Actions : join, name, leave, settings, start, roll, retry, live, result, timeout, restart.
 */
export function applyAction(G, a, env = {}) {
  const now = env.now ?? Date.now();
  const rnd = env.rnd || Math.random;
  const T = G.turn;
  switch (a.t) {
    case 'join': {
      const i = findTeam(G, a.cid);
      if (i >= 0) {
        if (!G.teams[i].away) return false;
        G.teams[i].away = false; // retour après une coupure ou une sortie
        return bump(G);
      }
      if (G.phase !== 'lobby' || G.teams.length >= G.maxTeams) return false;
      G.teams.push(team({ cid: a.cid, name: a.name }, G.teams.length));
      return bump(G);
    }
    case 'name': {
      const i = findTeam(G, a.cid);
      const name = cleanName(a.name);
      if (i < 0 || !name || G.teams[i].name === name) return false;
      G.teams[i].name = name;
      return bump(G);
    }
    case 'leave': {
      const i = findTeam(G, a.cid);
      if (i <= 0) return false; // l'arbitre ne quitte pas sa propre partie
      if (G.phase === 'lobby') {
        G.teams.splice(i, 1);
        G.teams.forEach((t, k) => { t.color = TEAM_COLORS[k % TEAM_COLORS.length]; });
      } else {
        G.teams[i].away = true;
        if (G.phase === 'play' && T.team === i && T.stage !== 'challenge') nextTeam(G);
      }
      return bump(G);
    }
    case 'settings': {
      if (!isHost(G, a) || G.phase !== 'lobby') return false;
      if (a.laps != null) G.laps = clamp(a.laps | 0, MIN_LAPS, MAX_LAPS);
      if (a.maxTeams != null) G.maxTeams = clamp(a.maxTeams | 0, Math.max(MIN_TEAMS, G.teams.length), MAX_TEAMS);
      return bump(G);
    }
    case 'start': {
      if (!isHost(G, a) || G.phase !== 'lobby' || G.teams.length < MIN_TEAMS) return false;
      G.phase = 'play';
      G.turn = { team: 0, n: 1, stage: 'roll', roll: null, ch: null, live: null, last: G.turn.last, final: null };
      return bump(G);
    }
    case 'roll': {
      if (G.phase !== 'play' || T.stage !== 'roll' || !isActive(G, a)) return false;
      const t = G.teams[T.team];
      const value = 1 + Math.floor(rnd() * 6); // c'est l'arbitre qui lance le dé
      const from = t.steps;
      t.steps = Math.min(goalOf(G), from + value);
      T.roll = { id: (T.roll?.id || 0) + 1, value, from, to: t.steps, at: now, team: T.team };
      if (t.steps >= goalOf(G)) { // arrivée : un défi de chaque jeu du plateau, à la suite
        const games = G.games.length ? shuffle(G.games, rnd) : ['chemin'];
        T.final = { from, games, k: 0 };
        openChallenge(G, games[0], challengeStart(now, value), env);
        return bump(G);
      }
      const game = G.board[cellOf(G, t)];
      if (game === 'depart') { // case départ : pas de défi
        T.last = null;
        nextTeam(G);
        return bump(G);
      }
      openChallenge(G, game, challengeStart(now, value), env);
      return bump(G);
    }
    case 'retry': {
      if (G.phase !== 'play' || T.stage !== 'retry' || !isActive(G, a)) return false;
      const t = G.teams[T.team];
      openChallenge(G, G.board[cellOf(G, t)], now + PAUSE_MS, env);
      return bump(G);
    }
    case 'live': {
      if (G.phase !== 'play' || T.stage !== 'challenge' || !isActive(G, a) || a.ch !== T.ch?.id) return false;
      T.live = a.L ?? null;
      return bump(G);
    }
    case 'result':
    case 'timeout': {
      if (G.phase !== 'play' || T.stage !== 'challenge' || a.ch !== T.ch?.id) return false;
      if (a.t === 'result' && !isActive(G, a)) return false;
      if (a.t === 'timeout' && now < T.ch.deadline + GRACE_MS) return false;
      const ok = a.t === 'result' && Boolean(a.ok);
      if (a.L !== undefined) T.live = a.L;
      const t = G.teams[T.team];
      // le défi terminé reste affiché (avec son état final) pendant la révélation
      T.last = { team: T.team, ok, game: T.ch.game, ch: T.ch.id, at: now, c: T.ch, L: T.live ?? null };
      const fin = T.final;
      if (fin) { // série de l'arrivée
        if (ok && fin.k + 1 < fin.games.length) {
          fin.k++;
          openChallenge(G, fin.games[fin.k], now + REVEAL_MS + 300, env);
          return bump(G);
        }
        T.final = null;
        if (ok) { // tous les défis de l'arrivée réussis : victoire
          G.winner = T.team;
          G.phase = 'end';
          G.endAt = now + REVEAL_MS;
          T.stage = 'done';
          return bump(G);
        }
        t.steps = fin.from; // raté : retour à la case d'où l'équipe venait (déjà résolue)
        t.stuck = false;
        nextTeam(G);
        return bump(G);
      }
      t.stuck = !ok; // raté : l'équipe reste sur la case et retente au prochain tour
      nextTeam(G);
      return bump(G);
    }
    case 'restart': {
      if (!isHost(G, a) || G.phase !== 'end') return false;
      G.board = makeBoard(G.games, rnd, BOARD_SIZE, G.weights || {});
      G.teams.forEach((t) => { t.steps = 0; t.stuck = false; });
      G.winner = null;
      G.phase = 'play';
      G.used = {};
      G.turn = { team: 0, n: 1, stage: 'roll', roll: null, ch: null, live: null, last: null, final: null };
      return bump(G);
    }
    default:
      return false;
  }
}

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function bump(G) { G.seq = (G.seq || 0) + 1; return true; }

function openChallenge(G, game, startAt, env) {
  const rnd = env.rnd || Math.random;
  const used = (G.used[game] ||= []);
  let payload = env.pick?.(game, used, rnd) || null;
  let g = game;
  if (!payload) { // catalogue indisponible : on se rabat sur un défi qui n'a pas besoin de données
    g = 'chemin';
    payload = env.pick?.('chemin', [], rnd) || { path: randomPath(rnd) };
  }
  for (const id of payload.ids || (payload.id != null ? [payload.id] : [])) used.push(id); // déjà sortis
  while (used.length > 200) used.shift();
  const T = G.turn;
  T.ch = { id: (T.ch?.id || 0) + 1, game: g, cell: game, p: payload, startAt, deadline: startAt + (DURATION[g] || 45) * 1000 };
  if (T.final) T.ch.final = { k: T.final.k, n: T.final.games.length }; // « Arrivée 2/6 »
  T.live = null;
  T.stage = 'challenge';
}

/** Équipe suivante (en sautant les absentes). Une équipe bloquée retente son défi au lieu de lancer le dé. */
export function nextTeam(G) {
  const T = G.turn;
  const n = G.teams.length;
  let k = T.team;
  for (let s = 0; s < n; s++) {
    k = (k + 1) % n;
    if (k === 0) T.n++;
    if (!G.teams[k].away) break;
  }
  T.team = k;
  T.stage = G.teams[k].stuck ? 'retry' : 'roll'; // T.ch reste en place : le dernier défi est affiché pendant la révélation
}

// ---------------------------------------------------------------- défi « Le chemin » (petite grille)
export const PATH_LANES = 5, PATH_STEPS = 7, PATH_MIN = 13, PATH_SHOW_MS = 4000, PATH_ERRORS = 3;

/**
 * Chemin de la première à la dernière rangée : chaque case ne touche (par un côté) que la précédente,
 * au moins PATH_MIN cases et jamais plus de 3 cases alignées. Case = [rangée, colonne].
 */
export function randomPath(rnd = Math.random, lanes = PATH_LANES, steps = PATH_STEPS, min = PATH_MIN) {
  const DIRS = [[1, 0], [0, 1], [0, -1], [-1, 0]];
  const key = (s, l) => s * lanes + l;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const path = [[0, Math.floor(rnd() * lanes)]];
    const used = new Set([key(...path[0])]);
    let last = -1, run = 1;
    while (path[path.length - 1][0] < steps - 1) {
      const [s, l] = path[path.length - 1];
      const opts = [];
      DIRS.forEach((d, i) => {
        const ns = s + d[0], nl = l + d[1];
        if (ns < 1 || ns >= steps || nl < 0 || nl >= lanes || used.has(key(ns, nl))) return;
        let touching = 0;
        for (const e of DIRS) if (used.has(key(ns + e[0], nl + e[1]))) touching++;
        if (touching !== 1 || (i === last && run >= 3)) return;
        opts.push([i, ns, nl, d[0] === 0 ? 3 : 1.2]);
      });
      if (!opts.length) break;
      let r = rnd() * opts.reduce((a, o) => a + o[3], 0), pick = opts[opts.length - 1];
      for (const o of opts) { r -= o[3]; if (r <= 0) { pick = o; break; } }
      run = pick[0] === last ? run + 1 : 2;
      last = pick[0];
      path.push([pick[1], pick[2]]);
      used.add(key(pick[1], pick[2]));
    }
    if (path[path.length - 1][0] === steps - 1 && path.length >= min) return path;
  }
  return Array.from({ length: steps }, (_, s) => [s, 0]);
}
