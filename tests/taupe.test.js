// La taupe : chaque enquête a une seule solution, et la taupe s'en déduit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  solve, aloneWithVictim, clueText, clueHolds, peopleOf, wrongPlaced, caseScore, hintTarget, isBlocked,
  BASE_POINTS, VICTIM,
} from '../games/mole/logic.js';

const cases = JSON.parse(await readFile(new URL('../games/mole/data/enquetes.json', import.meta.url), 'utf8'));
const cellsOf = (cs) => Object.fromEntries(peopleOf(cs).map((p) => [p.id, p.cell]));

test('chaque enquête n’a qu’une solution : celle du catalogue', () => {
  for (const cs of cases) {
    const sols = solve(cs, 2);
    assert.equal(sols.length, 1, `${cs.id} : ${sols.length} solutions`);
    assert.deepEqual(sols[0], cellsOf(cs), cs.id);
  }
});

test('la solution respecte les règles, et la taupe est seule avec la victime', () => {
  for (const cs of cases) {
    const cells = cellsOf(cs);
    const all = Object.values(cells);
    assert.equal(new Set(all.map((c) => c[0])).size, cs.n, `${cs.id} : lignes`);
    assert.equal(new Set(all.map((c) => c[1])).size, cs.n, `${cs.id} : colonnes`);
    all.forEach(([y, x]) => assert.ok(!isBlocked(cs, y, x), `${cs.id} : personne sur un meuble interdit`));
    cs.suspects.forEach((s) => s.clues.forEach((c) => assert.ok(clueHolds(c, cs, s.cell, cells), `${cs.id} ${s.id} : ${clueText(c, s, cs)}`)));
    assert.deepEqual(aloneWithVictim(cs, cells), [cs.murderer], cs.id);
  }
});

test('textes des indices', () => {
  const [cs] = cases;
  const lynx = cs.suspects.find((s) => s.id === 'lynx');
  const cobra = cs.suspects.find((s) => s.id === 'cobra');
  assert.equal(clueText({ t: 'next', o: 'etagere' }, lynx, cs), 'Il était à côté d’une étagère.');
  assert.equal(clueText({ t: 'on', o: 'tapis' }, { g: 'f' }, cs), 'Elle était sur un tapis.');
  assert.equal(clueText({ t: 'room', r: 'A' }, cobra, cs), 'Il était dans le sas d’entrée.');
  assert.equal(clueText({ t: 'south', of: 'lynx' }, cobra, cs), 'Il était plus au sud que Lynx.');
});

test('vérification, indices et score', () => {
  const cs = cases[0];
  assert.equal(wrongPlaced(cs, {}).length, cs.n);
  assert.deepEqual(wrongPlaced(cs, cellsOf(cs)), []);
  assert.equal(hintTarget(cs, {}).dead, false); // un suspect d'abord
  const allButVictim = cellsOf(cs); delete allButVictim[VICTIM];
  assert.equal(hintTarget(cs, allButVictim).id, VICTIM);
  assert.equal(caseScore(0), BASE_POINTS[0]);
  assert.equal(caseScore(0, { fails: 1, hints: 1 }), BASE_POINTS[0] - 8);
  assert.equal(caseScore(0, { wrong: 9 }), 0);
  assert.equal(BASE_POINTS.reduce((a, b) => a + b, 0), 100);
});
