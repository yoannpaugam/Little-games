import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage minimal pour Node (dans le navigateur, c'est le vrai qui est utilisé)
function fakeStorage() {
  const data = new Map();
  const api = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
  // Object.keys(localStorage) liste les clés enregistrées, comme dans un navigateur
  return new Proxy(api, {
    ownKeys: () => [...data.keys()],
    getOwnPropertyDescriptor: (t, k) => (data.has(k) ? { enumerable: true, configurable: true, value: data.get(k) } : undefined),
  });
}
beforeEach(() => { globalThis.localStorage = fakeStorage(); });

const { createStore } = await import('../js/core/storage.js');

test('stockage simple : lecture, écriture, valeur par défaut, espace de noms', () => {
  const a = createStore('a');
  const b = createStore('b');
  a.set('x', { n: 1 });
  assert.deepEqual(a.get('x'), { n: 1 });
  assert.equal(b.get('x', 'défaut'), 'défaut');
  assert.deepEqual(a.keys(), ['x']);
  a.remove('x');
  assert.equal(a.get('x', null), null);
});

test('ne plante pas si localStorage est indisponible', () => {
  globalThis.localStorage = { getItem() { throw new Error('privé'); }, setItem() { throw new Error('plein'); }, removeItem() { throw new Error(); } };
  const s = createStore('jeu', { version: 2, migrate() { throw new Error('ne doit pas être appelé'); } });
  s.set('k', 1);
  assert.equal(s.get('k', 'défaut'), 'défaut');
  assert.deepEqual(s.keys(), []);
});

test('nouveau joueur : pas de migration, version enregistrée', () => {
  let called = false;
  const s = createStore('jeu', { version: 3, migrate: () => { called = true; } });
  assert.equal(called, false);
  assert.equal(s.get('__version'), 3);
});

test('joueur existant sans version : migration depuis 0, une seule fois', () => {
  createStore('jeu').set('found', ['ancien-format']);
  const calls = [];
  const migrate = (from, s) => { calls.push(from); s.set('found', { 'ancien-format': 1 }); };
  createStore('jeu', { version: 1, migrate });
  const s = createStore('jeu', { version: 1, migrate });
  assert.deepEqual(calls, [0]);
  assert.deepEqual(s.get('found'), { 'ancien-format': 1 });
});

test('passage de la version 1 à 2', () => {
  createStore('jeu', { version: 1 }).set('score', 5);
  const calls = [];
  const s = createStore('jeu', { version: 2, migrate: (from, st) => { calls.push(from); st.set('score', st.get('score') * 10); } });
  assert.deepEqual(calls, [1]);
  assert.equal(s.get('score'), 50);
  assert.equal(s.get('__version'), 2);
});
