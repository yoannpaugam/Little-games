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
export const REVEAL_MS = 2400;   // la réponse reste affichée sur tous les écrans avant le tour suivant
export const GRACE_MS = 4000;    // l'arbitre déclare le défi raté s'il n'a pas reçu de résultat après le délai + cette marge

// Durée de chaque défi (secondes)
export const DURATION = { affiches: 45, visages: 45, livres: 40, geoquizz: 25, chemin: 40, nonogramme: 90 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Position (colonne, ligne) de la case i sur l'anneau, dans le sens des aiguilles d'une montre depuis le coin en haut à gauche. */
export function cellPos(i, cols = BOARD_COLS, rows = BOARD_ROWS) {
  const top = cols, right = rows - 2, bottom = cols;
  if (i < top) return [i, 0];
  if (i < top + right) return [cols - 1, i - top + 1];
  if (i < top + right + bottom) return [cols - 1 - (i - top - right), rows - 1];
  return [0, rows - 2 - (i - top - right - bottom)];
}

/** Plateau : la case 0 est le départ, les autres alternent les jeux, jamais deux fois le même d'affilée. */
export function makeBoard(games, rnd = Math.random, size = BOARD_SIZE) {
  const board = ['depart'];
  if (!games.length) return board;
  const count = Object.fromEntries(games.map((g) => [g, 0]));
  for (let i = 1; i < size; i++) {
    let opts = games.filter((g) => g !== board[i - 1]);
    if (!opts.length) opts = games;
    const min = Math.min(...opts.map((g) => count[g]));
    opts = opts.filter((g) => count[g] === min); // répartition équilibrée
    const g = opts[Math.floor(rnd() * opts.length)];
    count[g]++;
    board.push(g);
  }
  return board;
}

/** Nouvel état de partie. teams : [{ cid, name }] */
export function newGame({ mode = 'solo', laps = 1, maxTeams = 4, games = [], teams = [] }, env = {}) {
  const rnd = env.rnd || Math.random;
  return {
    v: 1,
    mode,
    phase: mode === 'multi' ? 'lobby' : 'play',
    laps: clamp(laps | 0, MIN_LAPS, MAX_LAPS),
    maxTeams: clamp(maxTeams | 0, MIN_TEAMS, MAX_TEAMS),
    games,
    board: makeBoard(games, rnd),
    teams: teams.map((t, i) => team(t, i)),
    turn: { team: 0, n: 1, stage: 'roll', roll: null, ch: null, live: null, last: null },
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
      G.turn = { team: 0, n: 1, stage: 'roll', roll: null, ch: null, live: null, last: G.turn.last };
      return bump(G);
    }
    case 'roll': {
      if (G.phase !== 'play' || T.stage !== 'roll' || !isActive(G, a)) return false;
      const t = G.teams[T.team];
      const value = 1 + Math.floor(rnd() * 6); // c'est l'arbitre qui lance le dé
      const from = t.steps;
      t.steps = Math.min(goalOf(G), from + value);
      T.roll = { id: (T.roll?.id || 0) + 1, value, from, to: t.steps, at: now, team: T.team };
      if (t.steps >= goalOf(G)) { // tour du plateau terminé : victoire
        G.winner = T.team;
        G.phase = 'end';
        G.endAt = challengeStart(now, value) - PAUSE_MS;
        T.stage = 'done';
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
      t.stuck = !ok; // raté : l'équipe reste sur la case et retente au prochain tour
      T.last = { team: T.team, ok, game: T.ch.game, ch: T.ch.id, at: now };
      nextTeam(G);
      return bump(G);
    }
    case 'restart': {
      if (!isHost(G, a) || G.phase !== 'end') return false;
      G.board = makeBoard(G.games, rnd);
      G.teams.forEach((t) => { t.steps = 0; t.stuck = false; });
      G.winner = null;
      G.phase = 'play';
      G.used = {};
      G.turn = { team: 0, n: 1, stage: 'roll', roll: null, ch: null, live: null, last: null };
      return bump(G);
    }
    default:
      return false;
  }
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
  if (payload.id != null) { used.push(payload.id); if (used.length > 200) used.shift(); }
  const T = G.turn;
  T.ch = { id: (T.ch?.id || 0) + 1, game: g, cell: game, p: payload, startAt, deadline: startAt + (DURATION[g] || 45) * 1000 };
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
