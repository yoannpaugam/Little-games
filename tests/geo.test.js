import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { distanceToCountry, haversineKm, pickQuiz, pointsFromKm, rngFrom, REGION_OF, QUESTIONS } from '../games/geo/geo.js';

const world = JSON.parse(await readFile(new URL('../games/geo/data/world.json', import.meta.url), 'utf8'));
const country = (c) => world.countries.find((x) => x.c === c);
const PARIS = { lat: 48.86, lon: 2.35 };

test('un point dans le pays compte 0 km', () => {
  assert.deepEqual(distanceToCountry(country('FR'), PARIS.lat, PARIS.lon).km, 0);
  assert.ok(distanceToCountry(country('JP'), 35.68, 139.69).inside); // Tokyo
  assert.ok(distanceToCountry(country('BR'), -15.8, -47.9).inside); // Brasília
});

test('hors du pays, l’écart est la distance à la frontière la plus proche', () => {
  const es = distanceToCountry(country('ES'), PARIS.lat, PARIS.lon);
  assert.ok(!es.inside);
  assert.ok(es.km > 500 && es.km < 800, `Paris → Espagne : ${es.km} km`);
  const au = distanceToCountry(country('AU'), PARIS.lat, PARIS.lon);
  assert.ok(au.km > 12000 && au.km < 16000, `Paris → Australie : ${au.km} km`);
  // le point le plus proche est bien sur la frontière : sa distance au point posé vaut l'écart
  assert.ok(Math.abs(haversineKm(PARIS, es.near) - es.km) < 2);
});

test('distance sur la sphère', () => {
  const ny = { lat: 40.71, lon: -74.01 };
  const d = haversineKm(PARIS, ny);
  assert.ok(d > 5800 && d < 5900, `Paris → New York : ${d}`);
});

test('score sur 100', () => {
  assert.equal(pointsFromKm(0), 100);
  assert.equal(pointsFromKm(12500), 50);
  assert.equal(pointsFromKm(40000), 0);
});

test('tirage : 10 pays différents, jamais deux du même continent d’affilée', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const quiz = pickQuiz(world.countries, QUESTIONS, rngFrom(seed));
    assert.equal(quiz.length, QUESTIONS);
    assert.equal(new Set(quiz.map((x) => x.c)).size, QUESTIONS);
    const regions = quiz.map((x) => REGION_OF[x.c]);
    for (let i = 1; i < regions.length; i++) assert.notEqual(regions[i], regions[i - 1], `graine ${seed} : ${regions.join(',')}`);
    const per = {};
    regions.forEach((r) => { per[r] = (per[r] || 0) + 1; });
    assert.ok(Object.values(per).every((n) => n <= 3), `graine ${seed} : ${JSON.stringify(per)}`);
  }
});

test('le tirage est reproductible avec une graine', () => {
  const a = pickQuiz(world.countries, QUESTIONS, rngFrom(42)).map((x) => x.c);
  const b = pickQuiz(world.countries, QUESTIONS, rngFrom(42)).map((x) => x.c);
  assert.deepEqual(a, b);
});
