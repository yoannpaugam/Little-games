// Compète de zinzin : plateau, tours, défis ratés, victoire, multijoueur (droits des actions).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE, BOARD_COLS, BOARD_ROWS, cellPos, makeBoard, newGame, applyAction, goalOf, ranking,
  randomPath, PATH_LANES, PATH_STEPS, PATH_MIN, challengeStart, GRACE_MS,
} from '../games/zinzin/logic.js';

const GAMES = ['affiches', 'visages', 'livres', 'geoquizz', 'chemin', 'nonogramme'];
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const env = (over = {}) => ({ now: 1000, rnd: Math.random, pick: (g) => ({ id: g + '-1' }), ...over });
const solo = (n = 2, laps = 1) => newGame({ mode: 'solo', laps, games: GAMES, teams: Array.from({ length: n }, () => ({})) }, env());

test('anneau : 28 cases toutes différentes, sur le bord du plateau', () => {
  assert.equal(BOARD_SIZE, 28);
  const seen = new Set();
  for (let i = 0; i < BOARD_SIZE; i++) {
    const [c, r] = cellPos(i);
    assert.ok(c === 0 || r === 0 || c === BOARD_COLS - 1 || r === BOARD_ROWS - 1);
    seen.add(`${c},${r}`);
    if (i) { const [pc, pr] = cellPos(i - 1); assert.equal(Math.abs(pc - c) + Math.abs(pr - r), 1, 'cases voisines'); }
  }
  assert.equal(seen.size, BOARD_SIZE);
  const [c0, r0] = cellPos(0), [cl, rl] = cellPos(BOARD_SIZE - 1);
  assert.equal(Math.abs(c0 - cl) + Math.abs(r0 - rl), 1, 'l’anneau se referme');
});

test('plateau : départ, jeux équilibrés, jamais deux fois le même d’affilée', () => {
  for (let k = 0; k < 50; k++) {
    const b = makeBoard(GAMES);
    assert.equal(b[0], 'depart');
    assert.equal(b.length, BOARD_SIZE);
    for (let i = 2; i < b.length; i++) assert.notEqual(b[i], b[i - 1]);
    const counts = GAMES.map((g) => b.filter((x) => x === g).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, counts.join(','));
  }
});

test('lancer : le pion avance, le défi de la case s’ouvre après l’animation', () => {
  const G = solo();
  assert.ok(applyAction(G, { t: 'roll' }, env({ rnd: seq(0.5) })));
  assert.equal(G.turn.roll.value, 4);
  assert.equal(G.teams[0].steps, 4);
  assert.equal(G.turn.stage, 'challenge');
  assert.equal(G.turn.ch.cell, G.board[4]);
  assert.equal(G.turn.ch.startAt, challengeStart(1000, 4));
  assert.ok(G.turn.ch.deadline > G.turn.ch.startAt);
  // on ne relance pas pendant un défi
  assert.equal(applyAction(G, { t: 'roll' }, env()), false);
});

test('défi raté : on reste sur la case et on retente au tour suivant', () => {
  const G = solo();
  applyAction(G, { t: 'roll' }, env({ rnd: seq(0.2) }));
  const ch = G.turn.ch.id, pos = G.teams[0].steps;
  applyAction(G, { t: 'result', ch, ok: false }, env());
  assert.equal(G.teams[0].stuck, true);
  assert.equal(G.turn.team, 1);
  assert.equal(G.turn.last.ok, false);
  applyAction(G, { t: 'roll' }, env({ rnd: seq(0.1) }));
  applyAction(G, { t: 'result', ch: G.turn.ch.id, ok: true }, env());
  assert.equal(G.turn.team, 0);
  assert.equal(G.turn.stage, 'retry');
  assert.equal(applyAction(G, { t: 'roll' }, env()), false, 'pas de dé tant que la case n’est pas résolue');
  applyAction(G, { t: 'retry' }, env());
  assert.equal(G.turn.stage, 'challenge');
  assert.equal(G.teams[0].steps, pos);
  applyAction(G, { t: 'result', ch: G.turn.ch.id, ok: true }, env());
  assert.equal(G.teams[0].stuck, false);
  assert.equal(G.turn.n, 2);
});

test('un résultat périmé (autre défi) est ignoré', () => {
  const G = solo();
  applyAction(G, { t: 'roll' }, env());
  assert.equal(applyAction(G, { t: 'result', ch: 99, ok: true }, env()), false);
});

test('délai dépassé : l’arbitre déclare le défi raté, pas avant la marge', () => {
  const G = solo();
  applyAction(G, { t: 'roll' }, env());
  const { id, deadline } = G.turn.ch;
  assert.equal(applyAction(G, { t: 'timeout', ch: id }, env({ now: deadline + 10 })), false);
  assert.ok(applyAction(G, { t: 'timeout', ch: id }, env({ now: deadline + GRACE_MS + 1 })));
  assert.equal(G.teams[0].stuck, true);
});

test('victoire : la première équipe qui finit ses tours de plateau gagne', () => {
  const G = solo(3, 2);
  assert.equal(goalOf(G), 56);
  G.teams[1].steps = 54;
  G.turn.team = 1;
  applyAction(G, { t: 'roll' }, env({ rnd: seq(0.99) }));
  assert.equal(G.phase, 'end');
  assert.equal(G.winner, 1);
  assert.equal(G.teams[1].steps, 56);
  assert.equal(ranking(G)[0].i, 1);
  // Rejouer : même équipes, nouveau plateau, tout le monde au départ
  applyAction(G, { t: 'restart' }, env());
  assert.equal(G.phase, 'play');
  assert.ok(G.teams.every((t) => t.steps === 0 && !t.stuck));
});

test('case départ (après un tour) : pas de défi, équipe suivante', () => {
  const G = solo(2, 2);
  G.teams[0].steps = 25;
  applyAction(G, { t: 'roll' }, env({ rnd: seq(0.4) })); // 3 → case 28 = départ
  assert.equal(G.teams[0].steps, 28);
  assert.equal(G.turn.team, 1);
  assert.equal(G.turn.stage, 'roll');
});

test('multi : salle d’attente, noms, droits de l’arbitre et de l’équipe active', () => {
  const G = newGame({ mode: 'multi', laps: 1, maxTeams: 3, games: GAMES, teams: [{ cid: 'H', name: 'Hôtes' }] }, env());
  assert.equal(G.phase, 'lobby');
  assert.ok(applyAction(G, { t: 'join', cid: 'A', name: '' }));
  assert.equal(G.teams[1].name, 'Équipe 2');
  assert.equal(applyAction(G, { t: 'join', cid: 'A' }), false, 'pas de doublon');
  assert.ok(applyAction(G, { t: 'name', cid: 'A', name: '  Les   Zinzins  ' }));
  assert.equal(G.teams[1].name, 'Les Zinzins');
  applyAction(G, { t: 'join', cid: 'B' });
  assert.equal(applyAction(G, { t: 'join', cid: 'C' }), false, 'partie complète');
  assert.equal(applyAction(G, { t: 'start', cid: 'A' }), false, 'seul l’arbitre lance');
  assert.ok(applyAction(G, { t: 'start', cid: 'H' }));
  assert.equal(applyAction(G, { t: 'join', cid: 'Z' }), false, 'partie commencée');
  assert.equal(applyAction(G, { t: 'roll', cid: 'A' }, env()), false, 'ce n’est pas son tour');
  assert.ok(applyAction(G, { t: 'roll', cid: 'H' }, env()));
  const ch = G.turn.ch.id;
  assert.equal(applyAction(G, { t: 'live', cid: 'A', ch, L: { x: 1 } }), false);
  assert.ok(applyAction(G, { t: 'live', cid: 'H', ch, L: { x: 1 } }));
  assert.deepEqual(G.turn.live, { x: 1 });
  applyAction(G, { t: 'result', cid: 'H', ch, ok: true });
  assert.equal(G.turn.team, 1);
});

test('multi : une équipe qui quitte est retirée en attente, marquée absente et sautée en jeu', () => {
  const G = newGame({ mode: 'multi', games: GAMES, teams: [{ cid: 'H' }] }, env());
  ['A', 'B', 'C'].forEach((cid) => applyAction(G, { t: 'join', cid }));
  applyAction(G, { t: 'leave', cid: 'C' });
  assert.equal(G.teams.length, 3);
  applyAction(G, { t: 'start', cid: 'H' });
  applyAction(G, { t: 'leave', cid: 'A' });
  assert.equal(G.teams[1].away, true);
  applyAction(G, { t: 'roll', cid: 'H' }, env());
  applyAction(G, { t: 'result', cid: 'H', ch: G.turn.ch.id, ok: true });
  assert.equal(G.turn.team, 2, 'l’équipe absente est sautée');
  assert.ok(applyAction(G, { t: 'join', cid: 'A' }), 'retour de l’équipe');
  assert.equal(G.teams[1].away, false);
});

test('état sérialisable en JSON', () => {
  const G = solo();
  applyAction(G, { t: 'roll' }, env());
  assert.deepEqual(JSON.parse(JSON.stringify(G)), G);
});

test('chemin du défi : sans raccourci, de la première à la dernière rangée', () => {
  for (let k = 0; k < 200; k++) {
    const p = randomPath();
    assert.ok(p.length >= PATH_MIN);
    assert.equal(p[0][0], 0);
    assert.equal(p[p.length - 1][0], PATH_STEPS - 1);
    const key = new Set(p.map(([s, l]) => s * PATH_LANES + l));
    assert.equal(key.size, p.length);
    p.forEach(([s, l], i) => {
      assert.ok(l >= 0 && l < PATH_LANES);
      if (i) assert.equal(Math.abs(s - p[i - 1][0]) + Math.abs(l - p[i - 1][1]), 1);
      for (let j = 0; j < i - 1; j++) assert.notEqual(Math.abs(s - p[j][0]) + Math.abs(l - p[j][1]), 1, 'pas de raccourci');
    });
  }
});
