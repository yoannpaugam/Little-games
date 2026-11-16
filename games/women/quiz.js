// Pionnières : règles du quiz, sans DOM (testées, et réutilisées par Compète de zinzin).
// Pour chaque femme, 4 réponses visibles : la bonne et 3 leurres, mélangés d'après l'identifiant et une graine
// (la bonne réponse reste à la même place quand on revient sur une femme).

/** Domaines du catalogue : libellé et teinte (portrait dessiné quand il n'y a pas de photo). */
export const DOMAINS = {
  sci: { label: 'Sciences', hue: 205 },
  nat: { label: 'Nature et Terre', hue: 140 },
  med: { label: 'Médecine', hue: 175 },
  tech: { label: 'Techniques et espace', hue: 230 },
  expl: { label: 'Exploration', hue: 30 },
  arts: { label: 'Arts', hue: 330 },
  mus: { label: 'Musique', hue: 280 },
  cine: { label: 'Cinéma et scène', hue: 355 },
  lett: { label: 'Lettres', hue: 45 },
  pol: { label: 'Droits et politique', hue: 0 },
  res: { label: 'Résistance', hue: 15 },
  sport: { label: 'Sport', hue: 95 },
  eco: { label: 'Entreprise et mode', hue: 310 },
};

/**
 * Adresse d'un portrait de photos.json : une URL complète (Wikimedia Commons)
 * ou un chemin relatif au dossier du jeu (« photos/<id>.jpg », photos fournies par Yoann).
 */
export function photoUrl(img) {
  if (!img) return '';
  return /^https?:/.test(img) ? img : new URL(img, import.meta.url).href.replace(/\?.*$/, '');
}

/** Nombre pseudo-aléatoire stable (FNV-1a), pour que les réponses restent à la même place. */
export function hash(str) {
  let x = 2166136261;
  for (const c of String(str)) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return x >>> 0;
}

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Les 4 réponses d'une femme, dans l'ordre d'affichage : [{ text, ok }]. */
export function optionsFor(woman, seed = 0) {
  const all = [{ text: woman.answer, ok: true }, ...woman.lures.map((text) => ({ text, ok: false }))];
  return shuffle(all, rng(hash(`${woman.id}:${seed}`)));
}

/** Position de la bonne réponse (0 à 3). */
export const correctIndex = (options) => options.findIndex((o) => o.ok);

/**
 * Ordre de jeu : les femmes célèbres (famous) sont réparties régulièrement parmi les oubliées,
 * pour qu'un visage connu revienne de temps en temps.
 */
export function playOrder(women, seed) {
  const rand = rng(seed);
  const famous = shuffle(women.filter((w) => w.famous), rand);
  const others = shuffle(women.filter((w) => !w.famous), rand);
  if (!famous.length || !others.length) return [...famous, ...others].map((w) => w.id);
  const out = [];
  const step = women.length / famous.length;
  let next = Math.floor(rand() * step); // première célèbre dans les premières places
  for (let i = 0; i < women.length; i++) {
    if (famous.length && (i >= next || !others.length)) { out.push(famous.shift()); next += step; }
    else out.push(others.shift());
  }
  return out.map((w) => w.id);
}

/** « 1867 – 1934 », « née en 1943 », « vers 370 – 415 ». */
export function lifespan(w) {
  const y = (n) => (n < 1000 ? `vers ${n}` : String(n));
  return w.died ? `${y(w.born)} – ${w.died}` : `née en ${w.born}`;
}

/** Initiales pour le portrait dessiné : « Marie-Anne Paulze-Lavoisier » → « ML ». */
export function initials(name) {
  const words = name.replace(/^(Madame|Madam|Sister|Mère) /, '').split(/\s+/).filter((w) => !/^(de|du|d’|d'|af|von|van|la|le)$/i.test(w));
  const first = words[0] || name;
  const last = words.length > 1 ? words[words.length - 1] : '';
  return (first[0] + (last ? last.replace(/^d'/i, '')[0] : '')).toUpperCase();
}
