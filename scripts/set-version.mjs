#!/usr/bin/env node
// Change le numéro de version partout : `node scripts/set-version.mjs 1.5.0`
// Le numéro est ajouté (?v=…) à chaque import et fichier chargé, pour que les
// navigateurs téléchargent la nouvelle version au lieu de garder l'ancienne en cache.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Usage : node scripts/set-version.mjs 1.5.0');
  process.exit(1);
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'scripts', 'tests'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(js|html)$/.test(e.name)) yield p;
  }
}

let n = 0;
for await (const file of walk(ROOT)) {
  const src = await readFile(file, 'utf8');
  const out = src
    .replace(/\?v=\d+\.\d+\.\d+/g, `?v=${version}`)
    .replace(/APP_VERSION = '[^']*'/, `APP_VERSION = '${version}'`);
  if (out !== src) { await writeFile(file, out); n++; }
}
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
pkg.version = version;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✅ Version ${version} appliquée (${n} fichier(s) + package.json).`);
