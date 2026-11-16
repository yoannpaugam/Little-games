#!/usr/bin/env node
// Pionnières : cherche le portrait de chaque femme du catalogue sur Wikidata (propriété P18, image principale)
// et note son auteur et sa licence sur Wikimedia Commons. Résultat : games/women/data/photos.json
//   { "<id>": { "qid": "Q7186", "file": "Nom du fichier.jpg", "img": "https://upload.wikimedia.org/…/600px-….jpg", "by": "Auteur", "lic": "CC BY-SA 4.0" } }
// Aucune image n'est copiée dans le dépôt : le jeu charge la vignette depuis upload.wikimedia.org.
//
//   node scripts/fetch-pionnieres-photos.mjs           # seulement les femmes sans photo
//   node scripts/fetch-pionnieres-photos.mjs --force   # tout refaire
//
// Une femme mal trouvée (homonyme) : ajouter dans games/women/data/femmes.json son identifiant Wikidata
// (« qid ») ou le nom à chercher (« search »), puis relancer. Le workflow GitHub « Portraits (Pionnières) »
// lance ce script et pousse le résultat sur la branche donnees/pionnieres-photos.

import { readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const CATALOG = new URL('games/women/data/femmes.json', ROOT);
const OUT = new URL('games/women/data/photos.json', ROOT);
const UA = 'LittleGames-pionnieres/1.0 (https://github.com/yoannpaugam/little-games)';
const WIDTH = 600;
const FEMALE = new Set(['Q6581072', 'Q1052281']);
const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`échec ${url}`);
}
const wikidata = (p) => api('https://www.wikidata.org/w/api.php', p);
const commons = (p) => api('https://commons.wikimedia.org/w/api.php', p);

const ids = (claims, p) => (claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const image = (claims) => claims?.P18?.[0]?.mainsnak?.datavalue?.value || null;

/** Première personne (de préférence une femme) avec une image, parmi les résultats de recherche. */
async function resolve(w) {
  if (w.qid) {
    const { entities } = await wikidata({ action: 'wbgetentities', ids: w.qid, props: 'claims' });
    return { qid: w.qid, file: image(entities[w.qid]?.claims) };
  }
  const found = [];
  for (const language of ['fr', 'en']) {
    const { search = [] } = await wikidata({ action: 'wbsearchentities', search: w.search || w.name, language, uselang: language, type: 'item', limit: 7 });
    for (const s of search) if (!found.includes(s.id)) found.push(s.id);
    if (found.length) break;
  }
  if (!found.length) return null;
  const { entities } = await wikidata({ action: 'wbgetentities', ids: found.join('|'), props: 'claims' });
  const people = found.map((q) => ({ qid: q, claims: entities[q]?.claims })).filter((e) => ids(e.claims, 'P31').includes('Q5'));
  const best = people.find((e) => ids(e.claims, 'P21').some((g) => FEMALE.has(g))) || people[0];
  return best ? { qid: best.qid, file: image(best.claims) } : null;
}

const strip = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

async function credit(file) {
  const data = await commons({ action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: WIDTH });
  const page = Object.values(data.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata || {};
  return {
    img: info.thumburl || info.url,
    by: strip(m.Artist?.value).slice(0, 120) || 'Auteur inconnu',
    lic: strip(m.LicenseShortName?.value) || 'Licence inconnue',
  };
}

const women = JSON.parse(await readFile(CATALOG, 'utf8'));
let photos = {};
try { photos = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* premier passage */ }
const misses = [];
let added = 0;

for (const [i, w] of women.entries()) {
  if (photos[w.id]?.img && (!force || !/^https?:/.test(photos[w.id].img))) continue; // photo du dépôt : jamais remplacée
  process.stdout.write(`[${i + 1}/${women.length}] ${w.name}… `);
  try {
    const r = await resolve(w);
    if (!r?.file) { console.log('pas d’image'); misses.push(w.name); continue; }
    const c = await credit(r.file);
    if (!c) { console.log('fichier Commons introuvable'); misses.push(w.name); continue; }
    photos[w.id] = { qid: r.qid, file: r.file, ...c };
    added++;
    console.log(`${r.qid} · ${c.lic}`);
  } catch (e) {
    console.log(`erreur : ${e.message}`);
    misses.push(w.name);
  }
  await sleep(250);
}

// Ordre du catalogue, et seulement des femmes du catalogue
const known = new Set(women.map((w) => w.id));
const sorted = Object.fromEntries(women.filter((w) => photos[w.id]).map((w) => [w.id, photos[w.id]]));
for (const id of Object.keys(photos)) if (!known.has(id)) console.log(`(retirée : ${id})`);
await writeFile(OUT, JSON.stringify(sorted, null, 1) + '\n');
console.log(`\n${added} portrait(s) ajouté(s), ${Object.keys(sorted).length} / ${women.length} au total.`);
if (misses.length) console.log(`Sans portrait (${misses.length}) : ${misses.join(', ')}`);
