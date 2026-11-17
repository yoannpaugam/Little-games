// Dans la rue : filtres, tirage des parties et règles de la frise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterEvents, drawGame, isRightZone, insertIndex, zoneLabel, GAME_CARDS, MIN_POOL, THEMES } from '../games/movements/frise.js';

const events = JSON.parse(await readFile(new URL('../games/movements/data/evenements.json', import.meta.url), 'utf8'));

test('filtres : terrain, année de départ et thèmes', () => {
  assert.equal(filterEvents(events).length, events.length);
  assert.ok(filterEvents(events, { scope: 'france' }).every((e) => e.scope === 'france'));
  assert.ok(filterEvents(events, { since: 1968 }).every((e) => e.year >= 1968));
  const eco = filterEvents(events, { themes: ['ecologie', 'paix'] });
  assert.ok(eco.length > 0 && eco.every((e) => e.theme === 'ecologie' || e.theme === 'paix'));
  assert.equal(filterEvents(events, { themes: [] }).length, events.length); // aucun thème coché : tous
});

test('chaque réglage par défaut de terrain et de période permet une partie complète', () => {
  for (const scope of ['all', 'france', 'monde']) {
    for (const since of [1789, 1900, 1945, 1968, 1990, 2000]) {
      const n = filterEvents(events, { scope, since }).length;
      assert.ok(n > GAME_CARDS, `${scope} depuis ${since} : ${n} événements`);
    }
  }
});

test('tirage : carte de départ et 10 cartes différentes, les inédites d’abord', () => {
  const g = drawGame(events, 3);
  assert.equal(g.cards.length, GAME_CARDS);
  assert.equal(new Set([g.start, ...g.cards]).size, GAME_CARDS + 1);
  assert.deepEqual(drawGame(events, 3), g);
  const seen = events.slice(0, events.length - 11).map((e) => e.id);
  const g2 = drawGame(events, 9, seen);
  assert.ok([g2.start, ...g2.cards].every((id) => !seen.includes(id)));
  assert.equal(drawGame(events.slice(0, MIN_POOL - 1), 1), null);
  assert.equal(drawGame(events.slice(0, 6), 1).cards.length, 5);
});

test('zones de la frise : avant, entre, après, et même année des deux côtés', () => {
  const years = [1936, 1968, 1968, 1995];
  assert.ok(isRightZone(years, 0, 1900));
  assert.ok(!isRightZone(years, 0, 1950));
  assert.ok(isRightZone(years, 1, 1950));
  assert.ok(isRightZone(years, 1, 1968) && isRightZone(years, 2, 1968) && isRightZone(years, 3, 1968));
  assert.ok(isRightZone(years, 4, 2018));
  assert.ok(isRightZone(years, 0, 1936) && isRightZone(years, 1, 1936));
  assert.equal(insertIndex(years, 1950, 1), 1);
  assert.equal(insertIndex(years, 1950, 3), 1); // mauvaise zone : à sa vraie place
  assert.equal(insertIndex(years, 1968, 4), 3);
  assert.equal(insertIndex(years, 2020), 4);
  assert.deepEqual(zoneLabel(years, 0), ['Avant', '1936']);
  assert.deepEqual(zoneLabel(years, 1), ['Entre', '1936 et 1968']);
  assert.deepEqual(zoneLabel(years, 2), ['En', '1968 aussi']);
  assert.deepEqual(zoneLabel(years, 4), ['Après', '1995']);
});

test('chaque thème a des événements', () => {
  for (const k of Object.keys(THEMES)) assert.ok(events.some((e) => e.theme === k), k);
});
