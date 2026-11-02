import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMatch, normalize } from '../js/core/fuzzy.js';

test('normalise accents, ponctuation et articles', () => {
  assert.equal(normalize('Le Fabuleux Destin d’Amélie Poulain'), 'fabuleux destin d amelie poulain');
  assert.equal(normalize('Mission: Impossible'), 'mission impossible');
});

test('accepte les fautes d’orthographe', () => {
  assert.ok(isMatch('le fabuleu destin damelie poulin', ['Le Fabuleux Destin d’Amélie Poulain']));
  assert.ok(isMatch('titanik', ['Titanic']));
  assert.ok(isMatch('ttianic', ['Titanic']));
  assert.ok(isMatch('interstelar', ['Interstellar']));
  assert.ok(isMatch('les evades', ['Les Évadés']));
  assert.ok(isMatch('shawshank redemtion', ['The Shawshank Redemption']));
  assert.ok(isMatch('Seigneur des anneaux les deux tours', ['Le Seigneur des anneaux : Les Deux Tours']));
});

test('refuse les mauvaises réponses', () => {
  assert.ok(!isMatch('Toy Story', ['Toy Story 2']));
  assert.ok(!isMatch('Toy Story 3', ['Toy Story 2']));
  assert.ok(!isMatch('Alien', ['Avatar']));
  assert.ok(!isMatch('Up', ['Her']));
  assert.ok(!isMatch('', ['Titanic']));
});

test('chiffres romains', () => {
  assert.ok(isMatch('Star Wars épisode 3 la revanche des sith', ['Star Wars, épisode III : La Revanche des Sith']));
});
