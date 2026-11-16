// Pionnières : 4 réponses visibles, ordre de jeu, dates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { optionsFor, correctIndex, playOrder, lifespan, initials } from '../games/women/quiz.js';

const women = JSON.parse(await readFile(new URL('../games/women/data/femmes.json', import.meta.url), 'utf8'));

test('4 réponses, une seule bonne, toujours à la même place pour une graine donnée', () => {
  for (const w of women) {
    const o = optionsFor(w, 42);
    assert.equal(o.length, 4);
    assert.equal(o.filter((x) => x.ok).length, 1);
    assert.equal(o[correctIndex(o)].text, w.answer);
    assert.deepEqual(optionsFor(w, 42), o);
  }
});

test('la bonne réponse est à chacune des 4 places environ une fois sur quatre', () => {
  const at = [0, 0, 0, 0];
  let n = 0;
  for (let seed = 0; seed < 20; seed++) for (const w of women) { n++; at[correctIndex(optionsFor(w, seed))]++; }
  for (const k of at) assert.ok(k / n > 0.2 && k / n < 0.3, `répartition ${at}`);
});

test('ordre de jeu : toutes les femmes, une seule fois, célèbres réparties', () => {
  const order = playOrder(women, 7);
  assert.equal(order.length, women.length);
  assert.equal(new Set(order).size, women.length);
  const famous = new Set(women.filter((w) => w.famous).map((w) => w.id));
  // Pas de longue série sans femme célèbre
  let gap = 0, worst = 0;
  for (const id of order) { gap = famous.has(id) ? 0 : gap + 1; worst = Math.max(worst, gap); }
  assert.ok(worst <= Math.ceil(women.length / famous.size) + 1, `série de ${worst}`);
  assert.deepEqual(playOrder(women, 7), order);
});

test('dates et initiales', () => {
  assert.equal(lifespan({ born: 1867, died: 1934 }), '1867 – 1934');
  assert.equal(lifespan({ born: 1943 }), 'née en 1943');
  assert.equal(lifespan({ born: 370, died: 415 }), 'vers 370 – 415');
  assert.equal(initials('Marie Curie'), 'MC');
  assert.equal(initials('Simone de Beauvoir'), 'SB');
  assert.equal(initials('Colette'), 'C');
  assert.equal(initials('Madam C. J. Walker'), 'CW');
});
