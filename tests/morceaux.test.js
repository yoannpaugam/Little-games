import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAnswers, buildOwners, checkAnswer } from '../games/face-parts/answers.js';

const people = JSON.parse(await readFile(new URL('../games/face-parts/data/people.json', import.meta.url), 'utf8'));
const answers = buildAnswers(people);
const owners = buildOwners(answers);
const check = (guess, id) => checkAnswer(guess, answers.get(id), owners);

test('catalogue Morceaux non vide, identifiants uniques', () => {
  assert.ok(people.length >= 10);
  assert.equal(new Set(people.map((p) => p.id)).size, people.length);
});

test('accepte le nom complet et les fautes', () => {
  const sample = people.find((p) => p.id === 'tom-hanks') || people[0];
  assert.ok(check(sample.name, sample.id).ok);
  const lower = sample.name.toLowerCase();
  assert.ok(check(lower, sample.id).ok);
});

test('accepte les alternatives quand présentes', () => {
  const withAlt = people.find((p) => p.alt?.length);
  if (!withAlt) return;
  assert.ok(check(withAlt.alt[0], withAlt.id).ok);
});

test('refuse le nom d’une autre personne du catalogue', () => {
  if (people.length < 2) return;
  const [a, b] = people;
  assert.ok(!check(b.name, a.id).ok);
});

test('chaque entrée a les six boîtes de découpe', () => {
  for (const p of people) {
    for (const k of ['yeux', 'nez', 'bouche', 'haut', 'bas', 'complet']) {
      assert.ok(Array.isArray(p.box[k]) && p.box[k].length === 4, `${p.id}.${k}`);
    }
  }
});

// ---- Cadrage et inclinaison (framing.js)
import { tiltOf, isUpright, portraitRect, MAX_TILT } from '../games/face-parts/framing.js';

test('morceaux : cadre 2:3 serré sur la boîte complet, sans sortir de la photo', () => {
  for (const [nw, nh] of [[1280, 1600], [1280, 853], [1280, 1920]]) {
    for (const p of people) {
      const r = portraitRect(p.box.complet, nw, nh);
      // l’image couvre tout le cadre
      assert.ok(r.left <= 1e-6 && r.top <= 1e-6, p.id);
      assert.ok(r.left + r.width >= 100 - 1e-6 && r.top + r.height >= 100 - 1e-6, p.id);
      // rapport 2:3 conservé (pas de déformation) : width/height du cadre = 2/3 en px
      const frameW = nw / (r.width / 100);
      const frameH = nh / (r.height / 100);
      assert.ok(Math.abs(frameW / frameH - 2 / 3) < 1e-6, p.id);
    }
  }
});

test('morceaux : les têtes trop penchées sont écartées, mais le jeu garde assez de monde', () => {
  const upright = people.filter((p) => isUpright(p));
  assert.ok(upright.length >= people.length * 0.85, `${upright.length} / ${people.length}`);
  for (const p of upright) assert.ok(Math.abs(tiltOf(p)) < MAX_TILT);
  const level = { box: { yeux: [0.3, 0.3, 0.4, 0.1], bouche: [0.4, 0.55, 0.2, 0.08], complet: [0.1, 0.05, 0.8, 0.8] } };
  assert.ok(Math.abs(tiltOf(level)) < 1);
});
