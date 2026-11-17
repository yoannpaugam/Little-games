// « Dans la rue » : règles du jeu, sans DOM (testées par tests/rue.test.js).
// On place des événements (mouvements sociaux, grèves, révoltes…) sur une frise chronologique.

export const THEMES = {
  travail: { label: 'Travail et grèves', hue: 28 },
  jeunesse: { label: 'Étudiants et jeunesse', hue: 195 },
  egalite: { label: 'Égalité et antiracisme', hue: 48 },
  paix: { label: 'Paix et anti-guerre', hue: 165 },
  ecologie: { label: 'Écologie', hue: 105 },
  femmes: { label: 'Droits des femmes', hue: 325 },
  lgbt: { label: 'Droits LGBT', hue: 285 },
  libertes: { label: 'Démocratie et libertés', hue: 230 },
  colere: { label: 'Révoltes populaires', hue: 5 },
  societe: { label: 'Débats de société', hue: 255 },
};

export const SCOPES = {
  all: 'France et monde',
  france: 'France',
  monde: 'Monde',
};

/** Années de départ proposées dans les réglages (« depuis… »). */
export const SINCE = [1789, 1900, 1945, 1968, 1990, 2000];

export const GAME_CARDS = 10; // cartes à placer par partie
export const MIN_POOL = 5; // en dessous, pas de partie possible

export const DEFAULT_SETTINGS = { scope: 'all', since: 1789, themes: null }; // themes : null = tous

/** Événements qui correspondent aux réglages. */
export function filterEvents(events, settings = DEFAULT_SETTINGS) {
  const { scope = 'all', since = 1789, themes = null } = settings;
  const keep = themes && themes.length ? new Set(themes) : null;
  return events.filter((e) =>
    (scope === 'all' || e.scope === scope) &&
    e.year >= since &&
    (!keep || keep.has(e.theme))
  );
}

/** Générateur pseudo-aléatoire reproductible. */
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

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire une partie dans `pool` : une carte de départ (déjà posée) et jusqu'à GAME_CARDS cartes à placer.
 * Les événements jamais vus (`seen`) passent d'abord, pour faire le tour du catalogue.
 * Renvoie { start: id, cards: [ids] } ou null si le pool est trop petit.
 */
export function drawGame(pool, seed, seen = []) {
  if (pool.length < MIN_POOL) return null;
  const rand = rng(seed);
  const old = new Set(seen);
  const fresh = shuffle(pool.filter((e) => !old.has(e.id)), rand);
  const again = shuffle(pool.filter((e) => old.has(e.id)), rand);
  const picked = [...fresh, ...again].slice(0, GAME_CARDS + 1).map((e) => e.id);
  return { start: picked[0], cards: picked.slice(1) };
}

/**
 * Bornes d'une zone de la frise. `years` : années des cartes posées, dans l'ordre de la frise.
 * La zone `zi` est avant la carte `zi` (zi = 0 : avant tout ; zi = years.length : après tout).
 */
export function zoneBounds(years, zi) {
  return [zi > 0 ? years[zi - 1] : -Infinity, zi < years.length ? years[zi] : Infinity];
}

/** Bonne zone ? Une même année vaut des deux côtés (deux événements de 1968 se placent dans n'importe quel ordre). */
export function isRightZone(years, zi, year) {
  const [lo, hi] = zoneBounds(years, zi);
  return lo <= year && year <= hi;
}

/** Où insérer une carte : dans la zone choisie si elle est juste, sinon à sa vraie place (après les cartes de même année). */
export function insertIndex(years, year, zi = null) {
  if (zi != null && isRightZone(years, zi, year)) return zi;
  const i = years.findIndex((y) => y > year);
  return i < 0 ? years.length : i;
}

/** Texte d'une zone : « Avant 1936 », « Entre 1936 et 1968 », « En 1968 aussi », « Après 1968 ». */
export function zoneLabel(years, zi) {
  const [lo, hi] = zoneBounds(years, zi);
  if (lo === -Infinity && hi === Infinity) return ['N’importe où', ''];
  if (lo === -Infinity) return ['Avant', String(hi)];
  if (hi === Infinity) return ['Après', String(lo)];
  if (lo === hi) return ['En', `${lo} aussi`];
  return ['Entre', `${lo} et ${hi}`];
}
