// Jeu « Chiens » : tirage des parties et score, sans DOM (testé par tests/dogs.test.js).
// Chaque question montre 4 réponses : 3 visibles et une 4e cachée (face retournée).
// La bonne réponse est à une place tirée au hasard : 1 fois sur 4, c'est la carte cachée.

export const ROUND = 10; // chiens par partie
export const HIDDEN = 3; // index de la carte cachée
export const POINTS = { visible: 1, hidden: 2 };

export const GROUPS = {
  berger: 'Chien de berger',
  montagne: 'Chien de montagne',
  molosse: 'Molosse',
  terrier: 'Terrier',
  chasse: 'Chien de chasse',
  eau: 'Rapporteur ou chien d’eau',
  spitz: 'Spitz ou chien nordique',
  levrier: 'Lévrier',
  compagnie: 'Chien de compagnie',
};

// Titres des familles (grille de toutes les races)
export const FAMILIES = {
  berger: 'Chiens de berger',
  montagne: 'Chiens de montagne',
  molosse: 'Molosses',
  terrier: 'Terriers',
  chasse: 'Chiens de chasse',
  eau: 'Rapporteurs et chiens d’eau',
  spitz: 'Spitz et chiens nordiques',
  levrier: 'Lévriers',
  compagnie: 'Chiens de compagnie',
};

// Nombre de mauvaises réponses prises dans la même famille que la bonne
export const LEVELS = {
  facile: { label: 'Facile', same: 0, desc: 'Les mauvaises réponses sont des chiens très différents.' },
  normal: { label: 'Normal', same: 1, desc: 'Une des mauvaises réponses est de la même famille.' },
  difficile: { label: 'Difficile', same: 3, desc: 'Toutes les réponses sont de la même famille.' },
};

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed = Math.floor(Math.random() * 2 ** 31)) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Les 4 réponses d'une question : la bonne et 3 autres races, dans un ordre au hasard. */
export function makeOptions(answer, breeds, level = 'normal', rand = Math.random) {
  const same = LEVELS[level]?.same ?? 1;
  const others = breeds.filter((b) => b.id !== answer.id);
  const close = shuffle(others.filter((b) => b.group === answer.group), rand);
  const far = shuffle(others.filter((b) => b.group !== answer.group), rand);
  const wrong = [...close.slice(0, same), ...far].slice(0, 3);
  if (wrong.length < 3) wrong.push(...close.slice(same, same + 3 - wrong.length));
  return shuffle([answer.id, ...wrong.map((b) => b.id)], rand);
}

/**
 * Tire une partie de ROUND chiens parmi `playable` (races qui ont une photo),
 * en évitant ceux de `seen` (déjà sortis) tant qu'il en reste assez.
 * @returns {{ level, qs: { id, options }[], answers: [] }}
 */
export function newGame(playable, breeds, { level = 'normal', seen = [], rand = Math.random, round = ROUND } = {}) {
  const seenSet = new Set(seen);
  const fresh = shuffle(playable.filter((b) => !seenSet.has(b.id)), rand);
  const old = shuffle(playable.filter((b) => seenSet.has(b.id)), rand);
  const picked = [...fresh, ...old].slice(0, round);
  return {
    level,
    qs: picked.map((b) => ({ id: b.id, options: makeOptions(b, breeds, level, rand) })),
    answers: [],
  };
}

/** Points d'une réponse : 1 pour une carte visible, 2 pour la carte cachée, 0 si c'est faux. */
export function pointsFor(q, choice) {
  if (q.options[choice] !== q.id) return 0;
  return choice === HIDDEN ? POINTS.hidden : POINTS.visible;
}

/** Score maximal d'une partie : 2 points quand la bonne réponse est cachée, 1 sinon. */
export const maxScore = (qs) => qs.reduce((s, q) => s + (q.options[HIDDEN] === q.id ? POINTS.hidden : POINTS.visible), 0);

/** Liste des races déjà sorties, mise à jour : on la vide quand presque tout est sorti. */
export function updateSeen(seen, ids, total, round = ROUND) {
  const next = [...new Set([...seen, ...ids])];
  return total - next.length < round ? [...ids] : next;
}
