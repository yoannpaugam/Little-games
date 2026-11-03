import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAnswers, checkAnswer, matchFileName, findByName } from '../games/faces/answers.js';

const celebs = JSON.parse(await readFile(new URL('../games/faces/data/celebs.json', import.meta.url), 'utf8'));
const answers = buildAnswers(celebs);
const check = (guess, id) => checkAnswer(guess, answers.get(id));

test('catalogue : 300 célébrités, autant de femmes que d’hommes, identifiants uniques', () => {
  assert.equal(celebs.length, 300);
  assert.equal(celebs.filter((c) => c.g === 'f').length, 150);
  assert.equal(new Set(celebs.map((c) => c.id)).size, 300);
});

test('accepte le nom complet, les fautes et les alternatives', () => {
  assert.ok(check('Meryl Streep', 'meryl-streep').ok);
  assert.ok(check('meril strep', 'meryl-streep').ok);
  assert.ok(check('celine dion', 'celine-dion').ok);
  assert.ok(check('Cloclo', 'claude-francois').ok);
  assert.ok(check('The Rock', 'dwayne-johnson').ok);
  assert.ok(check('Beyonce', 'beyonce').ok);
});

test('nom de famille seul : seulement s’il est unique', () => {
  assert.ok(check('DiCaprio', 'leonardo-dicaprio').ok);
  assert.ok(!check('Gainsbourg', 'serge-gainsbourg').ok);
  assert.equal(check('Gainsbourg', 'serge-gainsbourg').hint, 'Précise le prénom.');
  assert.equal(check('Omar', 'omar-sy').hint, 'Il manque le nom de famille.');
});

test('refuse les mauvaises réponses', () => {
  assert.ok(!check('Julia Roberts', 'meryl-streep').ok);
  assert.ok(!check('Eddie Murphy', 'cillian-murphy').ok);
  assert.equal(check('', 'omar-sy'), null);
});

test('reconnaît les noms de fichiers', () => {
  assert.deepEqual(matchFileName('omar-sy.jpg', celebs, answers), { id: 'omar-sy', kid: false });
  assert.deepEqual(matchFileName('Omar Sy enfant 2.JPG', celebs, answers), { id: 'omar-sy', kid: true });
  assert.equal(matchFileName('celine_dion_portrait.png', celebs, answers).id, 'celine-dion');
  assert.equal(matchFileName('IMG_2034.jpg', celebs, answers).id, null);
  assert.equal(findByName('leonardo di caprio', celebs, answers)?.id, 'leonardo-dicaprio');
});
