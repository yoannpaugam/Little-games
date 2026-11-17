// La taupe : règles, textes des indices, solveur et score. Sans DOM (testé par tests/taupe.test.js).
//
// Une enquête (data/enquetes.json) :
//   n : taille du plan (n × n) ; rooms : n lignes de lettres (une lettre = une pièce) ;
//   roomNames : { lettre: { name, in } } ; objects : [y, x, type] ; windows : [y, x, côté] ;
//   doors : [y, x, 'right' | 'down', 'door' | 'arch'] ; victim : { name, g, av, cell } ;
//   suspects : [{ id, name, g, av, cell, clues }] ; murderer : id.
// Indices (clues) : { t: 'next', o } (case voisine, même pièce, avec ce meuble) · { t: 'on', o } ·
//   { t: 'window' } · { t: 'room', r } · { t: 'north' | 'south', of: id d'un autre suspect }.

/** Meubles : occupables (occ) ou non, nom et article. */
export const OBJECTS = {
  fauteuil: { occ: true, label: 'fauteuil', un: 'un' },
  tapis: { occ: true, label: 'tapis', un: 'un' },
  lit: { occ: true, label: 'lit', un: 'un' },
  bureau: { occ: false, label: 'bureau', un: 'un' },
  ecran: { occ: false, label: 'écran', un: 'un' },
  plante: { occ: false, label: 'plante', un: 'une' },
  etagere: { occ: false, label: 'étagère', un: 'une' },
};
export const OCCUPIABLE = Object.keys(OBJECTS).filter((t) => OBJECTS[t].occ);
export const BLOCKING = Object.keys(OBJECTS).filter((t) => !OBJECTS[t].occ);

export const BASE_POINTS = [34, 33, 33]; // points maximum par enquête (total 100)
export const CHECK_PENALTY = 3;
export const ACCUSE_PENALTY = 10;
export const HINT_PENALTY = 5;
export const MAX_HINTS = 3;

export const VICTIM = 'victime';
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
  const out = [];
  const cells = {};
  const rows = new Set(), cols = new Set();
  // les indices nord / sud ne sont vérifiés qu'une fois les deux suspects placés
  const ready = (clue) => (clue.t === 'north' || clue.t === 'south') ? Boolean(cells[clue.of]) : true;
  function okAll() {
    return S.every((s) => !cells[s.id] || s.clues.every((c) => !ready(c) || clueHolds(c, cs, cells[s.id], cells, objs)));
  }
  (function place(i) {
    if (out.length >= limit) return;
    if (i === S.length) {
      const y = [...Array(cs.n).keys()].find((k) => !rows.has(k));
      const x = [...Array(cs.n).keys()].find((k) => !cols.has(k));
      if (y == null || x == null || isBlocked(cs, y, x, objs)) return;
      out.push({ ...cells, [VICTIM]: [y, x] });
      return;
    }
    const s = S[i];
    for (let y = 0; y < cs.n; y++) {
      if (rows.has(y)) continue;
      for (let x = 0; x < cs.n; x++) {
        if (cols.has(x) || isBlocked(cs, y, x, objs)) continue;
        cells[s.id] = [y, x]; rows.add(y); cols.add(x);
        if (okAll()) place(i + 1);
        delete cells[s.id]; rows.delete(y); cols.delete(x);
      }
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

/** Points d'une enquête, d'après les pénalités. */
export function caseScore(i, { fails = 0, wrong = 0, hints = 0 } = {}) {
  return Math.max(0, (BASE_POINTS[i] ?? 33) - fails * CHECK_PENALTY - wrong * ACCUSE_PENALTY - hints * HINT_PENALTY);
}

/** Personne à révéler pour un indice : un suspect mal placé d'abord, la victime en dernier. */
export function hintTarget(cs, placed, locked = []) {
  const people = peopleOf(cs).filter((p) => !locked.includes(p.id) && wrongPlaced(cs, placed).includes(p.id));
  return people.find((p) => !p.dead) || people[0] || null;
}
