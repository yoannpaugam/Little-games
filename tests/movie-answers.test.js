import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAnswers, ownersOf, judge } from '../games/movie-posters/index.js';
import { pickWikipediaPage } from '../games/movie-posters/posters.js';

const films = JSON.parse(await readFile(new URL('../games/movie-posters/data/films.json', import.meta.url), 'utf8'));
const answers = buildAnswers(films);
const owners = ownersOf(answers);
const idOf = (title) => films.find((f) => f.title === title || f.original === title)?.id;
const ok = (guess, title) => judge(guess, idOf(title), answers, owners).ok;

test('les réponses habituelles sont acceptées', () => {
  assert.ok(ok('Titanik', 'Titanic'));
  assert.ok(ok('Kill Bill', 'Kill Bill : Volume 1'));
  assert.ok(ok('Kill Bill 1', 'Kill Bill : Volume 1'));
  assert.ok(ok('Les Deux Tours', 'Le Seigneur des anneaux : Les Deux Tours'));
  assert.ok(ok('Raw', 'Grave'));
  assert.ok(ok('Extrême limite', 'Point Break : Extrême limite'));
  assert.ok(ok('Point Break', 'Point Break : Extrême limite'));
});

test('le titre exact d’un autre film est refusé', () => {
  assert.ok(!ok('Titane', 'Titanic'));
  assert.ok(!ok('Belle', 'Elle'));
  assert.ok(!ok('Elle', 'Belle'));
  assert.ok(!ok('Ghost', 'The Host'));
  assert.ok(!ok('Before Sunset', 'Before Sunrise'));
  assert.ok(!ok('Intouchables', 'Les Incorruptibles'));
});

test('les mentions génériques après « : » ne suffisent pas', () => {
  assert.ok(!ok('Volume 1', 'Kill Bill : Volume 1'));
  assert.ok(!ok('Deuxième partie', 'Dune : Deuxième partie'));
});

test('nouveaux films : titres et titres originaux', () => {
  assert.ok(ok('Notting Hill', 'Coup de foudre à Notting Hill'));
  assert.ok(ok('Twilight', 'Twilight, chapitre 1 : Fascination'));
  assert.ok(ok('Frozen 2', 'La Reine des neiges 2'));
  assert.ok(!ok('La Reine des neiges', 'La Reine des neiges 2'));
  assert.ok(ok('Retour vers le futur 2', 'Retour vers le futur II'));
});

test('Wikipédia : choix de l’article', () => {
  const page = (title, extra = {}) => ({ title, index: 1, thumbnail: { source: `https://upload.wikimedia.org/${title}.jpg` }, ...extra });
  // titre identique, avec ou sans précision entre parenthèses ou après « : »
  assert.ok(pickWikipediaPage([page('Titanic (1997 film)')], ['Titanic'], 1997));
  assert.ok(pickWikipediaPage([page('Léon: The Professional')], ['Léon'], 1994));
  // article anglais au titre différent, mais décrit comme un film de la bonne année
  assert.ok(pickWikipediaPage([page('The Big Blue', { description: '1988 film by Luc Besson' })], ['Le Grand Bleu'], 1988));
  // mauvaise année ou pas un film : refusé (mieux vaut pas d'affiche qu'une mauvaise)
  assert.equal(pickWikipediaPage([page('The Big Blue', { description: '1988 film by Luc Besson' })], ['Le Grand Bleu'], 1995), null);
  assert.equal(pickWikipediaPage([page('Blue', { description: 'Colour' })], ['Le Grand Bleu'], 1988), null);
  assert.equal(pickWikipediaPage([], ['Titanic'], 1997), null);
});
