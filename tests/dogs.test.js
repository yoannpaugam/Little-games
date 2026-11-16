import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeOptions, newGame, pointsFor, maxScore, updateSeen, rng, ROUND } from '../games/dogs/quiz.js';
import { fetchPhotos, plainText, thumbOf } from '../games/dogs/wiki.js';

const breeds = JSON.parse(await readFile(new URL('../games/dogs/data/chiens.json', import.meta.url), 'utf8'));
const byId = new Map(breeds.map((b) => [b.id, b]));

test('chiens : 4 réponses différentes, dont la bonne', () => {
  const rand = rng(1);
  for (const b of breeds) {
    for (const level of ['facile', 'normal', 'difficile']) {
      const o = makeOptions(b, breeds, level, rand);
      assert.equal(o.length, 4);
      assert.equal(new Set(o).size, 4);
      assert.ok(o.includes(b.id));
      const same = o.filter((id) => id !== b.id && byId.get(id).group === b.group).length;
      if (level === 'facile') assert.equal(same, 0);
      if (level === 'normal') assert.equal(same, 1);
      if (level === 'difficile') assert.equal(same, 3, `${b.id} : famille trop petite`);
    }
  }
});

test('chiens : la bonne réponse est à chacune des 4 places', () => {
  const rand = rng(7);
  const at = [0, 0, 0, 0];
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const b = breeds[i % breeds.length];
    at[makeOptions(b, breeds, 'normal', rand).indexOf(b.id)]++;
  }
  at.forEach((n) => assert.ok(Math.abs(n / N - 0.25) < 0.03, `${at}`));
});

test('chiens : une partie évite les races déjà sorties', () => {
  const rand = rng(3);
  let seen = [];
  const counts = new Map();
  for (let g = 0; g < 11; g++) {
    const game = newGame(breeds, breeds, { rand, seen });
    assert.equal(game.qs.length, ROUND);
    const ids = game.qs.map((q) => q.id);
    assert.equal(new Set(ids).size, ROUND);
    ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    seen = updateSeen(seen, ids, breeds.length);
  }
  // 11 parties × 10 = 110 : chaque race est sortie exactement une fois
  assert.equal(counts.size, breeds.length);
  assert.ok([...counts.values()].every((n) => n === 1));
  // La liste repart à zéro quand il ne reste plus assez de races
  assert.ok(seen.length <= ROUND);
});

test('chiens : points (1 si c’est la bonne race, 0 sinon)', () => {
  const q = { id: 'beagle', options: ['caniche', 'beagle', 'carlin', 'barzoi'] };
  assert.equal(pointsFor(q, 1), 1);
  assert.equal(pointsFor(q, 0), 0);
  assert.equal(pointsFor(q, 3), 0);
  assert.equal(maxScore([q, q, q]), 3);
});

test('chiens : photos Wikipédia (réponses simulées)', async () => {
  const calls = [];
  const fake = async (url) => {
    const p = Object.fromEntries(new URL(url).searchParams);
    calls.push(p);
    let body;
    if (p.prop === 'pageimages') {
      body = { query: {
        normalized: [{ from: 'beagle', to: 'Beagle' }],
        redirects: [{ from: 'Belgian Malinois', to: 'Malinois dog' }],
        pages: [{ title: 'Beagle', pageimage: 'Beagle_600.jpg' }, { title: 'Malinois dog', pageimage: 'Malinois.jpg' }, { title: 'Nothing', missing: true }],
      } };
    } else {
      body = { query: {
        normalized: [{ from: 'File:Beagle_600.jpg', to: 'File:Beagle 600.jpg' }],
        pages: [
          { title: 'File:Beagle 600.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Beagle_600.jpg', thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Beagle_600.jpg/800px-Beagle_600.jpg', extmetadata: { Artist: { value: '<a href="//x">Jean&nbsp;Dupont</a>' }, LicenseShortName: { value: 'CC BY-SA 3.0' } } }] },
          { title: 'File:Malinois.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Malinois.jpg' }] },
        ],
      } };
    }
    return { ok: true, json: async () => body };
  };
  const out = await fetchPhotos([
    { id: 'beagle', wiki: 'beagle' },
    { id: 'malinois', wiki: 'Belgian Malinois' },
    { id: 'rien', wiki: 'Nothing' },
  ], { fetch: fake });
  assert.equal(calls.length, 2);
  assert.deepEqual(Object.keys(out).sort(), ['beagle', 'malinois']);
  assert.equal(out.beagle.by, 'Jean Dupont');
  assert.equal(out.beagle.lic, 'CC BY-SA 3.0');
  assert.equal(out.beagle.thumb, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Beagle_600.jpg/330px-Beagle_600.jpg');
  assert.equal(out.malinois.by, 'Auteur inconnu');
  assert.equal(plainText('<b>a</b>   b'), 'a b');
  assert.equal(thumbOf('https://x/thumb/a/b/F.jpg/800px-F.jpg', 120), 'https://x/thumb/a/b/F.jpg/120px-F.jpg');
});
