// Portrait-robot : pièces du visage, choix, ressemblance et dessin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, CAT, DEFAULT_FACE, cleanFace, choose, isChosen, randomFace, renderFace, scoreFace, checkText, reaction,
} from '../games/sketch/parts.js';

test('chaque catégorie a au moins 8 options, aux identifiants uniques', () => {
  for (const c of CATEGORIES) {
    const ids = c.options.map(([k]) => k);
    assert.ok(ids.length >= 8, c.id);
    assert.equal(new Set(ids).size, ids.length, c.id);
    if (!c.multi) assert.ok(ids.includes(DEFAULT_FACE[c.id]), `${c.id} : valeur par défaut`);
    else assert.equal(ids[0], 'aucun', c.id);
  }
});

test('chaque option se dessine sans valeur manquante', () => {
  let n = 0;
  for (const c of CATEGORIES) {
    for (const [id] of c.options) {
      const svg = renderFace(choose(cleanFace({}), c.id, id), { uid: `t${n++}`, view: c.view });
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${c.id}/${id}`);
      assert.doesNotMatch(svg, /NaN|undefined|null|Infinity/, `${c.id}/${id}`);
    }
  }
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 300; i++) assert.doesNotMatch(renderFace(randomFace(rand)), /NaN|undefined|Infinity/);
});

test('choix multiples : « aucun » vide la liste, les boucles d’oreilles s’excluent', () => {
  let f = cleanFace({});
  assert.ok(isChosen(f, 'bijoux', 'aucun'));
  f = choose(f, 'bijoux', 'anneaux');
  f = choose(f, 'bijoux', 'rouge');
  f = choose(f, 'bijoux', 'clous');
  assert.deepEqual(f.bijoux.sort(), ['clous', 'rouge']);
  f = choose(f, 'bijoux', 'rouge');
  assert.deepEqual(f.bijoux, ['clous']);
  f = choose(f, 'bijoux', 'aucun');
  assert.deepEqual(f.bijoux, []);
});

test('un visage enregistré abîmé est réparé', () => {
  const f = cleanFace({ tete: 'triangle', bijoux: ['rouge', 'inconnu', 'rouge'], signes: 'x' });
  assert.equal(f.tete, DEFAULT_FACE.tete);
  assert.deepEqual(f.bijoux, ['rouge']);
  assert.deepEqual(f.signes, []);
});

test('ressemblance : pourcentage des critères remplis', () => {
  const want = [['chapeau', ['beret']], ['tenue', ['pullepaules']], ['signes', ['rides', 'pattesdoie']], ['couleur', ['blanc']]];
  let f = cleanFace({});
  assert.equal(scoreFace(f, want).pct, 0);
  f = choose(choose(f, 'chapeau', 'beret'), 'signes', 'pattesdoie');
  assert.equal(scoreFace(f, want).pct, 50);
  f = choose(choose(f, 'tenue', 'pullepaules'), 'couleur', 'blanc');
  assert.equal(scoreFace(f, want).pct, 100);
  assert.equal(scoreFace(f, null).pct, null);
  assert.equal(checkText({ cat: 'chapeau', values: ['beret', 'bonnet'] }), 'Chapeau : béret ou bonnet');
  assert.match(reaction(100), /exactement/);
  assert.ok(CAT.signes.multi);
});
