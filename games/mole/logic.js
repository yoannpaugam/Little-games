// Murdoku : règles, textes des indices, solveur et score. Sans DOM (testé par tests/murdoku.test.js).
//
// Une enquête (data/enquetes.json) :
//   n : taille du plan (n × n) ; rooms : n lignes de lettres (une lettre = une pièce) ;
//   roomNames : { lettre: { name, in } } ; objects : [y, x, type] ; windows : [y, x, côté] ;
//   doors : [y, x, 'right' | 'down', 'door' | 'arch'] ; victim : { name, g, av, cell } ;
//   suspects : [{ id, name, g, av, cell, clues }] ; murderer : id.
// Indices (clues) : { t: 'next', o } (case voisine, même pièce, avec ce meuble) · { t: 'on', o } ·
//   { t: 'window' } · { t: 'room', r } · { t: 'north' | 'south' | 'east' | 'west', of: id d'un autre suspect }.

/** Meubles : occupables (occ) ou non, nom et article. */
export const OBJECTS = {
  fauteuil: { occ: true, label: 'fauteuil', un: 'un' },
  tapis: { occ: true, label: 'tapis', un: 'un' },
  lit: { occ: true, label: 'lit', un: 'un' },
  bureau: { occ: false, label: 'bureau', un: 'un' },
  ecran: { occ: false, label: 'écran', un: 'un' },
  plante: { occ: false, label: 'plante', un: 'une' },
  etagere: { occ: false, label: 'étagère', un: 'une' },
  canape: { occ: true, label: 'canapé', un: 'un' },
  chaise: { occ: true, label: 'chaise', un: 'une' },
  table: { occ: false, label: 'table', un: 'une' },
  piano: { occ: false, label: 'piano', un: 'un' },
  coffre: { occ: false, label: 'coffre-fort', un: 'un' },
};
export const OCCUPIABLE = Object.keys(OBJECTS).filter((t) => OBJECTS[t].occ);
export const BLOCKING = Object.keys(OBJECTS).filter((t) => !OBJECTS[t].occ);

export const MAX_POINTS = 100; // points d'une grille, avant pénalités
export const CHECK_PENALTY = 10;
export const ACCUSE_PENALTY = 30;
export const HINT_PENALTY = 15;
export const MAX_HINTS = 3;

/** Niveaux : taille du plan (n × n). */
export const LEVELS = [
  { n: 4, id: 'facile', label: 'Facile' },
  { n: 5, id: 'moyen', label: 'Moyen' },
  { n: 6, id: 'difficile', label: 'Difficile' },
  { n: 7, id: 'expert', label: 'Expert' },
];

export const VICTIM = 'victime';
export const RELATIVE = ['north', 'south', 'east', 'west']; // indices qui comparent deux suspects
export const key = (y, x) => `${y},${x}`;
export const roomAt = (cs, y, x) => cs.rooms[y][x];

/** Meuble de chaque case : { 'y,x': type }. */
export function objectMap(cs) {
  const m = {};
  for (const [y, x, t] of cs.objects) m[key(y, x)] = t;
  return m;
}
export function isBlocked(cs, y, x, objs = objectMap(cs)) {
  const t = objs[key(y, x)];
  return Boolean(t && !OBJECTS[t].occ);
}
export function hasWindow(cs, y, x) {
  return cs.windows.some(([wy, wx]) => wy === y && wx === x);
}

/** Les personnes de l'enquête : les suspects, puis la victime (id 'victime'). */
export function peopleOf(cs) {
  return [
    ...cs.suspects.map((s) => ({ ...s, dead: false })),
    { id: VICTIM, name: cs.victim.name, g: cs.victim.g, av: cs.victim.av, cell: cs.victim.cell, clues: [], dead: true },
  ];
}

// ---------------------------------------------------------------- textes
const elle = (g) => (g === 'f' ? 'Elle' : 'Il');
const d = (t) => `${OBJECTS[t].un === 'une' ? 'd’une' : 'd’un'} ${OBJECTS[t].label}`;

/** Texte d'un indice, à la 3e personne (« Il était à côté d’une étagère. »). */
export function clueText(clue, person, cs) {
  const p = elle(person.g);
  const other = (id) => (cs.suspects.find((s) => s.id === id) || {}).name || '?';
  switch (clue.t) {
    case 'next': return `${p} était à côté ${d(clue.o)}.`;
    case 'on': return `${p} était sur ${OBJECTS[clue.o].un} ${OBJECTS[clue.o].label}.`;
    case 'window': return `${p} était devant une fenêtre.`;
    case 'room': return `${p} était ${cs.roomNames[clue.r].in}.`;
    case 'north': return `${p} était plus au nord que ${other(clue.of)}.`;
    case 'south': return `${p} était plus au sud que ${other(clue.of)}.`;
    case 'east': return `${p} était plus à l’est que ${other(clue.of)}.`;
    case 'west': return `${p} était plus à l’ouest que ${other(clue.of)}.`;
    default: return '';
  }
}
export function victimText(cs) {
  return `${elle(cs.victim.g)} était dans la dernière case libre.`;
}

// ---------------------------------------------------------------- règles
/** Un indice est-il vrai pour la case [y, x] ? `cells` donne la case des autres personnes (pour nord / sud). */
export function clueHolds(clue, cs, [y, x], cells = {}, objs = objectMap(cs)) {
  switch (clue.t) {
    case 'on': return objs[key(y, x)] === clue.o;
    case 'window': return hasWindow(cs, y, x);
    case 'room': return roomAt(cs, y, x) === clue.r;
    case 'next': {
      const r = roomAt(cs, y, x);
      return [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dy, dx]) => {
        const yy = y + dy, xx = x + dx;
        return yy >= 0 && xx >= 0 && yy < cs.n && xx < cs.n && roomAt(cs, yy, xx) === r && objs[key(yy, xx)] === clue.o;
      });
    }
    case 'north': return cells[clue.of] ? y < cells[clue.of][0] : true;
    case 'south': return cells[clue.of] ? y > cells[clue.of][0] : true;
    case 'east': return cells[clue.of] ? x > cells[clue.of][1] : true;
    case 'west': return cells[clue.of] ? x < cells[clue.of][1] : true;
    default: return false;
  }
}

/** Les personnes que la taupe peut être : les suspects seuls avec la victime dans sa pièce. */
export function aloneWithVictim(cs, cells) {
  const v = cells[VICTIM];
  if (!v) return [];
  const r = roomAt(cs, v[0], v[1]);
  const inRoom = cs.suspects.filter((s) => cells[s.id] && roomAt(cs, cells[s.id][0], cells[s.id][1]) === r);
  return inRoom.length === 1 ? [inRoom[0].id] : [];
}

/**
 * Toutes les solutions (au plus `limit`) : chaque personne sur une ligne et une colonne différentes,
 * jamais sur un meuble interdit, chaque indice vrai ; la victime prend la dernière ligne et la dernière colonne.
 * Renvoie [{ id: [y, x] }].
 */
export function solve(cs, limit = 2) {
  const objs = objectMap(cs);
  const S = cs.suspects;
  const idx = new Map(S.map((s, i) => [s.id, i]));
  // Cases possibles de chaque suspect d'après ses indices sur lui seul (pièce, meuble, fenêtre…)
  const dom = S.map((s) => {
    const out = [];
    for (let y = 0; y < cs.n; y++) for (let x = 0; x < cs.n; x++) {
      if (isBlocked(cs, y, x, objs)) continue;
      if (s.clues.every((c) => RELATIVE.includes(c.t) || clueHolds(c, cs, [y, x], {}, objs))) out.push([y, x]);
    }
    return out;
  });
  // Indices relatifs, rangés par suspect concerné (le sien et ceux qui le visent)
  const rel = S.map(() => []);
  S.forEach((s, i) => s.clues.forEach((c) => {
    if (!RELATIVE.includes(c.t) || !idx.has(c.of)) return;
    const j = idx.get(c.of);
    rel[i].push([i, j, c]);
    rel[j].push([i, j, c]);
  }));
  const order = S.map((_, i) => i).sort((a, b) => dom[a].length - dom[b].length);
  const pos = Array(S.length).fill(null);
  const rows = new Set(), cols = new Set();
  const out = [];
  const relOk = ([y, x], [oy, ox], t) => (t === 'north' ? y < oy : t === 'south' ? y > oy : t === 'east' ? x > ox : x < ox);
  (function place(k) {
    if (out.length >= limit) return;
    if (k === S.length) {
      let y = 0; while (rows.has(y)) y++;
      let x = 0; while (cols.has(x)) x++;
      if (y >= cs.n || x >= cs.n || isBlocked(cs, y, x, objs)) return;
      const sol = { [VICTIM]: [y, x] };
      S.forEach((s, i) => { sol[s.id] = pos[i]; });
      out.push(sol);
      return;
    }
    const i = order[k];
    for (const c of dom[i]) {
      if (rows.has(c[0]) || cols.has(c[1])) continue;
      pos[i] = c;
      if (rel[i].every(([a, b, cl]) => !pos[a] || !pos[b] || relOk(pos[a], pos[b], cl.t))) {
        rows.add(c[0]); cols.add(c[1]);
        place(k + 1);
        rows.delete(c[0]); cols.delete(c[1]);
      }
      pos[i] = null;
    }
  })(0);
  return out;
}

/** Personnes mal placées (ou pas placées) par rapport à la solution. */
export function wrongPlaced(cs, placed) {
  return peopleOf(cs).filter((p) => {
    const c = placed[p.id];
    return !c || c[0] !== p.cell[0] || c[1] !== p.cell[1];
  }).map((p) => p.id);
}

/** Points d'une grille, d'après les pénalités. */
export function caseScore({ fails = 0, wrong = 0, hints = 0 } = {}) {
  return Math.max(0, MAX_POINTS - fails * CHECK_PENALTY - wrong * ACCUSE_PENALTY - hints * HINT_PENALTY);
}

/** Personne à révéler pour un indice : un suspect mal placé d'abord, la victime en dernier. */
export function hintTarget(cs, placed, locked = []) {
  const people = peopleOf(cs).filter((p) => !locked.includes(p.id) && wrongPlaced(cs, placed).includes(p.id));
  return people.find((p) => !p.dead) || people[0] || null;
}
