// Murdoku : générateur d'enquêtes. Sans DOM (testé par tests/murdoku.test.js).
// generateCase(seed, n) tire un lieu, un plan (pièces, portes, fenêtres, meubles), des personnages,
// une solution et des indices, puis vérifie avec le solveur qu'il n'y a qu'une seule solution.
// Le résultat a le même format que data/enquetes.json (les portraits sont des apparences `look`).

import { OBJECTS, RELATIVE, VICTIM, key, solve, aloneWithVictim, objectMap, isBlocked } from './logic.js?v=1.57.0';
import { makeLook } from './art.js?v=1.57.0';

export const GENERATOR_VERSION = 1;
export const DOSSIER_SIZES = [4, 5, 6]; // les 3 enquêtes d'un dossier

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- lieux
// rooms : [nom, « dans … »] ; occ / blk : meubles du lieu ; victims : [nom, genre] ;
// secrets : ce que la victime transportait ; titles : titres possibles (« {lieu} » = nom du lieu).
export const PLACES = [
  {
    id: 'agence', name: 'l’agence', at: 'au siège de l’agence',
    rooms: [['Hall', 'dans le hall'], ['Salle des codes', 'dans la salle des codes'], ['Archives', 'dans les archives'], ['Salle de crise', 'dans la salle de crise'],
      ['Salle des serveurs', 'dans la salle des serveurs'], ['Atelier de Q', 'dans l’atelier de Q'], ['Couloir', 'dans le couloir'], ['Cafétéria', 'dans la cafétéria'],
      ['Laboratoire', 'dans le laboratoire'], ['Sas d’entrée', 'dans le sas d’entrée'], ['Bureau du directeur', 'dans le bureau du directeur']],
    occ: ['fauteuil', 'tapis', 'chaise', 'canape'], blk: ['bureau', 'ecran', 'plante', 'etagere', 'coffre'],
    victims: [['Le Courrier', 'm'], ['L’Archiviste', 'f'], ['Le Cryptologue', 'm'], ['La Cryptologue', 'f'], ['L’Informatrice', 'f'], ['Le Chef de station', 'm'], ['La Technicienne', 'f']],
    secrets: ['une clé de chiffrement', 'la liste des agents doubles', 'un microfilm', 'le code de lancement', 'un carnet chiffré'],
    titles: ['Double jeu', 'Opération Minuit', 'Taupe en sous-sol', 'Signal perdu', 'Code rouge', 'Fuite au sommet', 'Accès refusé'],
  },
  {
    id: 'ambassade', name: 'l’ambassade', at: 'à l’ambassade',
    rooms: [['Grand salon', 'dans le grand salon'], ['Salle de bal', 'dans la salle de bal'], ['Bibliothèque', 'dans la bibliothèque'], ['Bureau de l’ambassadeur', 'dans le bureau de l’ambassadeur'],
      ['Vestiaire', 'dans le vestiaire'], ['Jardin d’hiver', 'dans le jardin d’hiver'], ['Salle à manger', 'dans la salle à manger'], ['Fumoir', 'dans le fumoir'], ['Galerie', 'dans la galerie'], ['Antichambre', 'dans l’antichambre']],
    occ: ['fauteuil', 'tapis', 'canape', 'chaise'], blk: ['piano', 'table', 'plante', 'etagere', 'bureau'],
    victims: [['L’Attaché culturel', 'm'], ['La Diplomate', 'f'], ['Le Consul', 'm'], ['L’Interprète', 'f'], ['Le Secrétaire', 'm'], ['La Conseillère', 'f']],
    secrets: ['un traité secret', 'la valise diplomatique', 'une lettre codée', 'les plans du sommet', 'un passeport vierge'],
    titles: ['Bal masqué', 'Immunité diplomatique', 'Le dernier toast', 'Valse à trois temps', 'Incident diplomatique', 'Soirée de gala'],
  },
  {
    id: 'train', name: 'le train de nuit', at: 'à bord du train de nuit',
    rooms: [['Voiture-bar', 'dans la voiture-bar'], ['Wagon-restaurant', 'dans le wagon-restaurant'], ['Compartiment 1', 'dans le compartiment 1'], ['Compartiment 2', 'dans le compartiment 2'],
      ['Compartiment 3', 'dans le compartiment 3'], ['Fourgon à bagages', 'dans le fourgon à bagages'], ['Salon panoramique', 'dans le salon panoramique'], ['Cabine du chef de train', 'dans la cabine du chef de train'], ['Couloir', 'dans le couloir']],
    occ: ['lit', 'fauteuil', 'chaise', 'tapis'], blk: ['table', 'coffre', 'plante', 'etagere'],
    victims: [['Le Contrôleur', 'm'], ['La Comtesse', 'f'], ['Le Banquier', 'm'], ['La Journaliste', 'f'], ['Le Joaillier', 'm'], ['La Chanteuse', 'f']],
    secrets: ['un diamant célèbre', 'des documents compromettants', 'une mallette de billets', 'un rouleau de pellicule', 'un testament'],
    titles: ['Terminus', 'Express de minuit', 'Le dernier arrêt', 'Voie sans issue', 'Nuit blanche sur les rails', 'Correspondance manquée'],
  },
  {
    id: 'casino', name: 'le casino', at: 'au casino',
    rooms: [['Salle de jeu', 'dans la salle de jeu'], ['Bar', 'au bar'], ['Salle des coffres', 'dans la salle des coffres'], ['Suite royale', 'dans la suite royale'],
      ['Cuisines', 'dans les cuisines'], ['Hall', 'dans le hall'], ['Salon privé', 'dans le salon privé'], ['Terrasse', 'sur la terrasse'], ['Salle de surveillance', 'dans la salle de surveillance'], ['Vestiaire', 'dans le vestiaire']],
    occ: ['fauteuil', 'tapis', 'chaise', 'canape'], blk: ['table', 'piano', 'plante', 'coffre', 'ecran'],
    victims: [['Le Croupier', 'm'], ['La Croupière', 'f'], ['Le Directeur', 'm'], ['La Joueuse', 'f'], ['Le Barman', 'm'], ['La Pianiste', 'f']],
    secrets: ['la clé de la salle des coffres', 'un jeu de cartes marquées', 'une puce électronique', 'les comptes du casino', 'un jeton en or'],
    titles: ['Faites vos jeux', 'Rien ne va plus', 'Quitte ou double', 'Carré d’as', 'Mise à mort', 'Banco'],
  },
  {
    id: 'manoir', name: 'le manoir', at: 'au manoir',
    rooms: [['Bibliothèque', 'dans la bibliothèque'], ['Cuisine', 'dans la cuisine'], ['Chapelle', 'dans la chapelle'], ['Chambre bleue', 'dans la chambre bleue'],
      ['Salle d’armes', 'dans la salle d’armes'], ['Grand salon', 'dans le grand salon'], ['Véranda', 'dans la véranda'], ['Cave', 'dans la cave'], ['Salle de billard', 'dans la salle de billard'], ['Grenier', 'au grenier']],
    occ: ['lit', 'fauteuil', 'tapis', 'canape'], blk: ['piano', 'table', 'etagere', 'plante', 'coffre'],
    victims: [['Le Majordome', 'm'], ['La Gouvernante', 'f'], ['Le Notaire', 'm'], ['L’Héritière', 'f'], ['Le Colonel', 'm'], ['La Duchesse', 'f']],
    secrets: ['le testament du lord', 'la clé du coffre', 'une carte au trésor', 'un poison rare', 'un collier de famille'],
    titles: ['Le testament', 'Nuit d’orage', 'L’héritage', 'Mort au manoir', 'Le dernier dîner', 'Brouillard sur la lande'],
  },
  {
    id: 'base', name: 'la base polaire', at: 'à la base polaire',
    rooms: [['Laboratoire', 'dans le laboratoire'], ['Dortoir', 'dans le dortoir'], ['Salle radio', 'dans la salle radio'], ['Infirmerie', 'à l’infirmerie'],
      ['Réfectoire', 'dans le réfectoire'], ['Serre', 'dans la serre'], ['Hangar', 'dans le hangar'], ['Salle des machines', 'dans la salle des machines'], ['Sas', 'dans le sas']],
    occ: ['lit', 'chaise', 'tapis', 'fauteuil'], blk: ['ecran', 'bureau', 'coffre', 'plante', 'etagere'],
    victims: [['La Glaciologue', 'f'], ['Le Radio', 'm'], ['La Médecin', 'f'], ['Le Chef de base', 'm'], ['La Biologiste', 'f'], ['Le Mécanicien', 'm']],
    secrets: ['une carotte de glace', 'les relevés secrets', 'un échantillon inconnu', 'le dernier message radio', 'la carte du gisement'],
    titles: ['Grand froid', 'Silence radio', 'Nuit polaire', 'Blizzard', 'Zéro absolu', 'Le dernier ravitaillement'],
  },
];

const CODE_NAMES = {
  m: ['Lynx', 'Cobra', 'Faucon', 'Spectre', 'Corbeau', 'Loup', 'Jaguar', 'Requin', 'Scorpion', 'Python', 'Condor', 'Renard', 'Tigre', 'Vautour', 'Mamba', 'Orion', 'Titan', 'Zéro', 'Phénix', 'Fantôme', 'Mirage', 'Hibou', 'Grizzly', 'Silex'],
  f: ['Vesper', 'Panthère', 'Vipère', 'Hermine', 'Mante', 'Libellule', 'Belladone', 'Murène', 'Gazelle', 'Orchidée', 'Sirène', 'Comète', 'Ombre', 'Lionne', 'Louve', 'Chouette', 'Colombe', 'Aurore', 'Mésange', 'Tempête', 'Luciole', 'Perle', 'Cigale', 'Nova'],
};
const IDS = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const COUNT = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept'];

// ---------------------------------------------------------------- outils
function tools(rnd) {
  const int = (n) => Math.floor(rnd() * n);
  const pick = (list) => list[int(list.length)];
  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = int(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  return { int, pick, shuffle };
}
const NEI = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/** Découpe le plan n × n en k pièces d'au moins 2 cases, d'un seul tenant. */
function makeRooms(n, k, T) {
  for (let tries = 0; tries < 200; tries++) {
    const grid = Array.from({ length: n }, () => Array(n).fill(-1));
    const cells = T.shuffle([...Array(n * n).keys()]).slice(0, k);
    const front = [];
    cells.forEach((c, r) => { grid[Math.floor(c / n)][c % n] = r; front.push([Math.floor(c / n), c % n]); });
    let left = n * n - k;
    while (left > 0) {
      const [y, x] = front[T.int(front.length)];
      const free = NEI.map(([dy, dx]) => [y + dy, x + dx]).filter(([yy, xx]) => yy >= 0 && xx >= 0 && yy < n && xx < n && grid[yy][xx] < 0);
      if (!free.length) { front.splice(front.findIndex((f) => f[0] === y && f[1] === x), 1); continue; }
      const [yy, xx] = T.pick(free);
      grid[yy][xx] = grid[y][x];
      front.push([yy, xx]);
      left--;
    }
    const sizes = Array(k).fill(0);
    grid.flat().forEach((r) => sizes[r]++);
    if (sizes.every((s) => s >= 2 && s <= Math.ceil((n * n) / k) * 2)) {
      return grid.map((row) => row.map((r) => String.fromCharCode(65 + r)).join(''));
    }
  }
  return null;
}

/** Portes : un arbre couvrant entre les pièces (toutes reliées), plus quelques portes en plus. */
function makeDoors(rooms, n, T) {
  const walls = {}; // 'A|B' → murs possibles
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = rooms[y][x];
    if (x + 1 < n && rooms[y][x + 1] !== r) (walls[[r, rooms[y][x + 1]].sort().join('|')] ||= []).push([y, x, 'right']);
    if (y + 1 < n && rooms[y + 1][x] !== r) (walls[[r, rooms[y + 1][x]].sort().join('|')] ||= []).push([y, x, 'down']);
  }
  const parent = {};
  const find = (a) => (parent[a] === undefined || parent[a] === a ? a : (parent[a] = find(parent[a])));
  const doors = [];
  for (const pair of T.shuffle(Object.keys(walls))) {
    const [a, b] = pair.split('|');
    const joined = find(a) !== find(b);
    if (joined) parent[find(a)] = find(b);
    if (joined || T.int(4) === 0) {
      const [y, x, dir] = T.pick(walls[pair]);
      doors.push([y, x, dir, T.int(3) === 0 ? 'arch' : 'door']);
    }
  }
  return doors;
}

/** Fenêtres sur le pourtour. */
function makeWindows(n, T) {
  const spots = [];
  for (let i = 0; i < n; i++) spots.push([0, i, 'top'], [n - 1, i, 'bottom'], [i, 0, 'left'], [i, n - 1, 'right']);
  const out = [];
  const used = new Set();
  for (const w of T.shuffle(spots)) {
    if (out.length >= 3 + T.int(n - 2)) break;
    if (used.has(key(w[0], w[1]))) continue;
    used.add(key(w[0], w[1]));
    out.push(w);
  }
  return out;
}

/** Tous les indices vrais pour un suspect, d'après la solution. */
function trueClues(cs, s, cells, objs) {
  const [y, x] = cells[s.id];
  const out = [{ t: 'room', r: cs.rooms[y][x] }];
  const here = objs[key(y, x)];
  if (here) out.push({ t: 'on', o: here });
  if (cs.windows.some(([wy, wx]) => wy === y && wx === x)) out.push({ t: 'window' });
  const near = new Set();
  for (const [dy, dx] of NEI) {
    const yy = y + dy, xx = x + dx;
    if (yy >= 0 && xx >= 0 && yy < cs.n && xx < cs.n && cs.rooms[yy][xx] === cs.rooms[y][x] && objs[key(yy, xx)]) near.add(objs[key(yy, xx)]);
  }
  near.forEach((o) => out.push({ t: 'next', o }));
  for (const o of cs.suspects) {
    if (o.id === s.id) continue;
    const [oy, ox] = cells[o.id];
    if (y < oy) out.push({ t: 'north', of: o.id }); else if (y > oy) out.push({ t: 'south', of: o.id });
    if (x > ox) out.push({ t: 'east', of: o.id }); else if (x < ox) out.push({ t: 'west', of: o.id });
  }
  return out;
}
const same = (a, b) => a.t === b.t && a.o === b.o && a.r === b.r && a.of === b.of;

/**
 * Une enquête n × n tirée à partir de `seed`. Renvoie null si le tirage échoue (rare : on essaie
 * plusieurs plans avant d'abandonner).
 */
export function generateCase(seed, n = 5) {
  const rnd = rng(seed);
  const T = tools(rnd);
  for (let attempt = 0; attempt < 40; attempt++) {
    const cs = attemptCase(n, rnd, T);
    if (cs) return { ...cs, id: `gen-${n}-${seed >>> 0}`, seed: seed >>> 0, gv: GENERATOR_VERSION };
  }
  return null;
}

function attemptCase(n, rnd, T) {
  const place = T.pick(PLACES);
  const k = Math.min(place.rooms.length, n === 4 ? 3 : n === 5 ? 3 + T.int(2) : n === 6 ? 4 + T.int(3) : 5 + T.int(3));
  const rooms = makeRooms(n, k, T);
  if (!rooms) return null;
  const roomList = T.shuffle(place.rooms).slice(0, k);
  const roomNames = {};
  roomList.forEach(([name, inn], i) => { roomNames[String.fromCharCode(65 + i)] = { name, in: inn }; });

  // Solution : une personne par ligne et par colonne. La victime partage sa pièce avec exactement un suspect.
  const perm = T.shuffle([...Array(n).keys()]);
  const spots = perm.map((x, y) => [y, x]);
  const roomOf = ([y, x]) => rooms[y][x];
  const pairs = [];
  spots.forEach((a, i) => spots.forEach((b, j) => {
    if (i !== j && roomOf(a) === roomOf(b) && spots.filter((c) => roomOf(c) === roomOf(a)).length === 2) pairs.push([i, j]);
  }));
  if (!pairs.length) return null;
  const [vi, mi] = T.pick(pairs);

  // Personnages
  const used = new Set();
  const suspects = [];
  spots.forEach((cell, i) => {
    if (i === vi) return;
    const g = T.int(2) ? 'f' : 'm';
    let name;
    do name = T.pick(CODE_NAMES[g]); while (used.has(name));
    used.add(name);
    suspects.push({ id: IDS(name), name, g, look: makeLook(rnd, g), cell, clues: [], _i: i });
  });
  const [vName, vg] = T.pick(place.victims);
  const victim = { name: vName, g: vg, look: makeLook(rnd, vg, { victim: true }), cell: spots[vi] };
  const murderer = suspects.find((s) => s._i === mi).id;
  suspects.forEach((s) => delete s._i);

  // Meubles : jamais de meuble interdit sous une personne
  const occupied = new Set(spots.map(([y, x]) => key(y, x)));
  const objects = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = rnd();
    if (occupied.has(key(y, x))) { if (r < 0.4) objects.push([y, x, T.pick(place.occ)]); }
    else if (r < 0.42) objects.push([y, x, T.pick(place.blk)]);
    else if (r < 0.6) objects.push([y, x, T.pick(place.occ)]);
  }
  const windows = makeWindows(n, T);
  const doors = makeDoors(rooms, n, T);

  const cs = { n, rooms, roomNames, objects, windows, doors, victim, suspects, murderer };
  const objs = objectMap(cs);
  if (spots.some(([y, x]) => isBlocked(cs, y, x, objs))) return null;
  const cells = Object.fromEntries([...suspects.map((s) => [s.id, s.cell]), [VICTIM, victim.cell]]);

  // Indices : on en ajoute, en prenant à chaque fois celui qui élimine le plus de plans possibles,
  // jusqu'à n'avoir qu'une solution ; puis on retire ceux qui ne servent à rien.
  const LIMIT = 150;
  const pool = new Map(suspects.map((s) => [s.id, T.shuffle(trueClues(cs, s, cells, objs))]));
  const count = () => solve(cs, LIMIT).length;
  let sols = count();
  let guard = 0;
  while (sols > 1 && guard++ < 30) {
    let best = null;
    // on essaie au plus 14 indices au hasard à chaque tour
    const cands = [];
    for (const s of suspects) {
      if (s.clues.length >= 3) continue;
      for (const c of pool.get(s.id)) if (!s.clues.some((d) => same(c, d))) cands.push([s, c]);
    }
    for (const [s, c] of T.shuffle(cands).slice(0, 14)) {
      {
        s.clues.push(c);
        const v = count() + (RELATIVE.includes(c.t) ? 0.3 : 0) + s.clues.length * 0.2 + rnd() * 0.5;
        s.clues.pop();
        if (!best || v < best.v) best = { v, s, c };
      }
    }
    if (!best) return null;
    best.s.clues.push(best.c);
    sols = count();
  }
  if (sols !== 1) return null;
  for (const s of T.shuffle(suspects)) {
    for (const c of T.shuffle(s.clues)) {
      if (s.clues.length <= 1) break;
      s.clues = s.clues.filter((d) => d !== c);
      if (count() !== 1) s.clues.push(c);
    }
  }
  // Un suspect sans indice reçoit un indice vrai (il ne change pas la solution)
  suspects.forEach((s) => { if (!s.clues.length) s.clues.push(pool.get(s.id).find((c) => !RELATIVE.includes(c.t)) || pool.get(s.id)[0]); });
  // les indices relatifs en dernier, comme dans le catalogue
  suspects.forEach((s) => s.clues.sort((a, b) => Number(RELATIVE.includes(a.t)) - Number(RELATIVE.includes(b.t))));
  const sol = solve(cs, 2);
  if (sol.length !== 1 || aloneWithVictim(cs, sol[0])[0] !== murderer) return null;

  // Scénario
  const e = vg === 'f' ? 'e' : '';
  cs.title = T.pick(place.titles);
  cs.teaser = `${vName} a été retrouvé${e} sans vie ${place.at}. ${vg === 'f' ? 'Elle' : 'Il'} transportait ${T.pick(place.secrets)}. ${COUNT[suspects.length]} suspects, une seule taupe.`;
  cs.place = place.id;
  return cs;
}

/** Un dossier de 3 enquêtes générées (tailles 4, 5 et 6), à partir d'une graine. */
export function generateDossier(seed) {
  const r = rng(seed);
  return DOSSIER_SIZES.map((n) => {
    for (;;) {
      const cs = generateCase(Math.floor(r() * 2 ** 32), n);
      if (cs) return cs;
    }
  });
}
