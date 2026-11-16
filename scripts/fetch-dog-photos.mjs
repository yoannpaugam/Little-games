#!/usr/bin/env node
// Remplit games/dogs/data/photos.json : photo, auteur et licence de chaque race de chiens
// (image principale de l'article Wikipédia en anglais, ou fichier Commons forcé par `file`).
//   node scripts/fetch-dog-photos.mjs          → cherche seulement les races sans photo
//   node scripts/fetch-dog-photos.mjs --all    → recherche tout
// Lancé par le workflow « Chiens : photos » (le sandbox de Claude n'a pas accès à Wikipédia).
import { readFile, writeFile } from 'node:fs/promises';
import { fetchPhotos } from '../games/dogs/wiki.js';

const root = new URL('../games/dogs/data/', import.meta.url);
const breeds = JSON.parse(await readFile(new URL('chiens.json', root), 'utf8'));
let photos = {};
try { photos = JSON.parse(await readFile(new URL('photos.json', root), 'utf8')); } catch { /* premier passage */ }

const all = process.argv.includes('--all');
const ids = new Set(breeds.map((b) => b.id));
// Une race dont le fichier forcé a changé est recherchée à nouveau
const stale = (b) => !photos[b.id] || (b.file && photos[b.id].file !== b.file.replace(/^File:/, '').replace(/_/g, ' '));
const todo = all ? breeds : breeds.filter(stale);
console.log(`${todo.length} race(s) à chercher sur ${breeds.length}.`);

const UA = 'LittleGames/1.0 (https://github.com/yoannpaugam/Little-games; jeu non commercial)';
const found = await fetchPhotos(todo, { fetch: (url) => fetch(url, { headers: { 'User-Agent': UA } }) });

const next = {};
for (const b of breeds) {
  const p = found[b.id] || (all ? null : photos[b.id]);
  if (p) next[b.id] = p;
}
for (const id of Object.keys(photos)) if (!ids.has(id)) console.log(`Retirée (plus au catalogue) : ${id}`);
const missing = breeds.filter((b) => !next[b.id]);
await writeFile(new URL('photos.json', root), `${JSON.stringify(next, null, 1)}\n`);
console.log(`Terminé : ${Object.keys(next).length} / ${breeds.length} races avec photo.`);
for (const b of missing) console.log(`Sans photo : ${b.id} (${b.wiki})`);
