// Portrait-robot : les pièces du visage et le dessin du portrait, en SVG.
// Module sans DOM (testé dans tests/robot.test.js) : renderFace() renvoie une chaîne SVG construite
// uniquement à partir des constantes de ce fichier (jamais de texte saisi par le joueur).
// Repère : viewBox 0 0 200 300 (format 2:3), axe du visage x = 100, ligne des yeux y = 138.

const EY = 138; // ligne des yeux
const EYE_X = 22; // écart des yeux à l'axe

/* ------------------------------------------------------------------ catégories et options */
// view : cadrage [x, y, largeur, hauteur] des vignettes de la catégorie.
// multi : plusieurs choix possibles (« aucun » efface tout) ; group : choix exclusifs entre eux.
export const CATEGORIES = [
  { id: 'tete', label: 'Tête', view: [10, 40, 180, 200], options: [
    ['ovale', 'Ovale'], ['rond', 'Ronde'], ['carre', 'Carrée'], ['long', 'Allongée'], ['poire', 'En poire'],
    ['coeur', 'En cœur'], ['diamant', 'En losange'], ['fin', 'Fine'], ['large', 'Large'], ['oeuf', 'En œuf'],
  ] },
  { id: 'teint', label: 'Teint', view: [10, 40, 180, 200], options: [
    ['porcelaine', 'Porcelaine'], ['clair', 'Clair'], ['rose', 'Rosé'], ['mat', 'Mat'], ['dore', 'Bronzé'],
    ['olive', 'Olive'], ['brun', 'Brun'], ['fonce', 'Foncé'], ['ebene', 'Ébène'], ['coupdesoleil', 'Coup de soleil'], ['vert', 'Vert nauséeux'],
  ] },
  { id: 'cheveux', label: 'Cheveux', view: [0, 0, 200, 210], options: [
    ['chauve', 'Chauve'], ['rase', 'Rasés'], ['degarni', 'Dégarni'], ['court', 'Courts'], ['raie', 'Raie sur le côté'],
    ['brosse', 'En brosse'], ['frange', 'Au bol'], ['afro', 'Afro'], ['milong', 'Mi-longs'], ['long', 'Longs'],
    ['chignon', 'Chignon'], ['crete', 'Crête'], ['mulet', 'Mulet'], ['banane', 'Banane'],
  ] },
  { id: 'couleur', label: 'Couleur des cheveux', short: 'Couleur', view: [0, 0, 200, 210], options: [
    ['noir', 'Noirs'], ['brun', 'Bruns'], ['chatain', 'Châtains'], ['roux', 'Roux'], ['blond', 'Blonds'],
    ['platine', 'Platine'], ['poivresel', 'Poivre et sel'], ['blanc', 'Blancs'], ['rose', 'Roses'], ['bleu', 'Bleus'],
  ] },
  { id: 'sourcils', label: 'Sourcils', view: [52, 92, 96, 64], options: [
    ['fins', 'Fins'], ['epais', 'Épais'], ['droits', 'Droits'], ['arques', 'Arqués'], ['fronces', 'Froncés'],
    ['etonnes', 'Étonnés'], ['mono', 'Monosourcil'], ['broussailleux', 'Broussailleux'], ['tristes', 'Tristes'], ['rases', 'Rasés'],
  ] },
  { id: 'yeux', label: 'Yeux', view: [52, 108, 96, 60], options: [
    ['amande', 'En amande'], ['ronds', 'Ronds'], ['petits', 'Petits'], ['endormis', 'Endormis'], ['rieurs', 'Rieurs'],
    ['tombants', 'Tombants'], ['chat', 'De chat'], ['ecarquilles', 'Écarquillés'], ['louches', 'Qui louchent'], ['mefiants', 'Plissés'],
  ] },
  { id: 'iris', label: 'Couleur des yeux', short: 'Iris', view: [60, 122, 36, 32], options: [
    ['marron', 'Marron'], ['noisette', 'Noisette'], ['vert', 'Verts'], ['bleu', 'Bleus'], ['gris', 'Gris'],
    ['noir', 'Noirs'], ['ambre', 'Ambre'], ['glacier', 'Bleu glacier'], ['violet', 'Violets'], ['vairons', 'Vairons'],
  ] },
  { id: 'nez', label: 'Nez', view: [62, 128, 76, 66], options: [
    ['petit', 'Petit'], ['droit', 'Droit'], ['long', 'Long'], ['aquilin', 'Aquilin'], ['retrousse', 'Retroussé'],
    ['large', 'Large'], ['pointu', 'Pointu'], ['patate', 'En patate'], ['boxeur', 'De boxeur'], ['clown', 'Nez rouge'],
  ] },
  { id: 'bouche', label: 'Bouche', view: [66, 170, 68, 50], options: [
    ['neutre', 'Neutre'], ['sourire', 'Souriante'], ['dents', 'Grand sourire'], ['moue', 'Moue'], ['pulpeuse', 'Pulpeuse'],
    ['fine', 'Fine'], ['coin', 'Sourire en coin'], ['ouverte', 'Bouche bée'], ['bonheur', 'Dents du bonheur'], ['grimace', 'Grimace'], ['triste', 'Triste'],
  ] },
  { id: 'oreilles', label: 'Oreilles', view: [0, 90, 200, 120], options: [
    ['normales', 'Normales'], ['petites', 'Petites'], ['grandes', 'Grandes'], ['decollees', 'Décollées'], ['dumbo', 'Très décollées'],
    ['elfe', 'Pointues'], ['lobes', 'Grands lobes'], ['choufleur', 'En chou-fleur'], ['rondes', 'Rondes'], ['asym', 'Une seule décollée'],
  ] },
  { id: 'barbe', label: 'Barbe et moustache', short: 'Barbe', view: [25, 135, 150, 150], options: [
    ['aucune', 'Rasé de près'], ['troisjours', 'Trois jours'], ['moustache', 'Moustache'], ['guidon', 'Moustache en guidon'], ['bouc', 'Bouc'],
    ['courte', 'Barbe courte'], ['longue', 'Grande barbe'], ['favoris', 'Rouflaquettes'], ['mousquetaire', 'Mousquetaire'], ['collier', 'Collier'],
  ] },
  { id: 'signes', label: 'Signes particuliers', short: 'Signes', multi: true, view: [25, 80, 150, 170], options: [
    ['aucun', 'Aucun'], ['rousseur', 'Taches de rousseur'], ['rides', 'Rides du front'], ['pattesdoie', 'Pattes d’oie'], ['joues', 'Joues roses'],
    ['grain', 'Grain de beauté'], ['cicatrice', 'Cicatrice'], ['fossette', 'Fossette au menton'], ['cernes', 'Cernes'],
    ['doublementon', 'Double menton'], ['pommettes', 'Pommettes saillantes'], ['bouton', 'Bouton'],
  ] },
  { id: 'lunettes', label: 'Lunettes', view: [40, 100, 120, 80], options: [
    ['aucune', 'Aucune'], ['rondes', 'Rondes'], ['rectangle', 'Rectangulaires'], ['epaisses', 'Monture épaisse'], ['solaires', 'De soleil'],
    ['aviateur', 'D’aviateur'], ['lecture', 'Demi-lune'], ['monocle', 'Monocle'], ['cacheoeil', 'Cache-œil'], ['coeur', 'En cœur'],
  ] },
  { id: 'chapeau', label: 'Chapeau', view: [0, -10, 200, 180], options: [
    ['aucun', 'Aucun'], ['casquette', 'Casquette'], ['beret', 'Béret'], ['bonnet', 'Bonnet'], ['melon', 'Chapeau melon'],
    ['hautdeforme', 'Haut-de-forme'], ['cowboy', 'Chapeau de cow-boy'], ['bob', 'Bob'], ['couronne', 'Couronne'], ['bandeau', 'Bandeau'],
  ] },
  { id: 'bijoux', label: 'Bijoux et maquillage', short: 'Bijoux', multi: true, view: [10, 95, 180, 190], options: [
    ['aucun', 'Rien'], ['anneaux', 'Anneaux'], ['clous', 'Petits clous'], ['pendants', 'Perles pendantes'], ['rouge', 'Rouge à lèvres'],
    ['fard', 'Fard à paupières'], ['mascara', 'Mascara'], ['piercing', 'Piercing au nez'], ['collier', 'Collier de perles'], ['chaine', 'Chaîne en or'],
  ] },
  { id: 'tenue', label: 'Tenue', view: [0, 175, 200, 125], options: [
    ['tshirt', 'T-shirt'], ['chemise', 'Chemise et cravate'], ['costume', 'Costume'], ['colroule', 'Col roulé'], ['mariniere', 'Marinière'],
    ['polo', 'Polo'], ['pullepaules', 'Pull sur les épaules'], ['sweat', 'Sweat à capuche'], ['hawaienne', 'Chemise à fleurs'], ['perfecto', 'Blouson en cuir'],
  ] },
];

/** Choix exclusifs à l'intérieur d'une catégorie à choix multiples. */
export const GROUPS = { anneaux: 'oreille', clous: 'oreille', pendants: 'oreille', collier: 'cou', chaine: 'cou' };

export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const DEFAULT_FACE = Object.freeze({
  tete: 'ovale', teint: 'clair', cheveux: 'court', couleur: 'chatain', sourcils: 'droits', yeux: 'amande', iris: 'marron',
  nez: 'droit', bouche: 'neutre', oreilles: 'normales', barbe: 'aucune', signes: [], lunettes: 'aucune', chapeau: 'aucun',
  bijoux: [], tenue: 'tshirt',
});

/** Libellé d'une option (« Béret »). */
export function optionLabel(cat, id) {
  const o = CAT[cat]?.options.find(([k]) => k === id);
  return o ? o[1] : id;
}

/** Visage complet et valide, à partir d'un visage enregistré (valeurs inconnues → valeur par défaut). */
export function cleanFace(face) {
  const out = {};
  for (const c of CATEGORIES) {
    const ids = new Set(c.options.map(([k]) => k));
    const v = face?.[c.id];
    if (c.multi) out[c.id] = Array.isArray(v) ? [...new Set(v.filter((k) => ids.has(k) && k !== 'aucun'))] : [];
    else out[c.id] = ids.has(v) ? v : DEFAULT_FACE[c.id];
  }
  return out;
}

/** Applique un choix : remplace la valeur, ou l'ajoute / la retire pour une catégorie à choix multiples. */
export function choose(face, cat, id) {
  const c = CAT[cat];
  const next = { ...face, signes: [...face.signes], bijoux: [...face.bijoux] };
  if (!c) return next;
  if (!c.multi) { next[cat] = id; return next; }
  if (id === 'aucun') { next[cat] = []; return next; }
  const list = next[cat];
  if (list.includes(id)) next[cat] = list.filter((k) => k !== id);
  else next[cat] = [...list.filter((k) => !GROUPS[id] || GROUPS[k] !== GROUPS[id]), id];
  return next;
}

/** Une option est-elle choisie ? (« aucun » l'est quand la liste est vide) */
export function isChosen(face, cat, id) {
  const c = CAT[cat];
  if (!c?.multi) return face[cat] === id;
  return id === 'aucun' ? face[cat].length === 0 : face[cat].includes(id);
}

/** Visage tiré au hasard (souvent farfelu). rand() : nombre dans [0, 1[. */
export function randomFace(rand = Math.random) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  let face = cleanFace({});
  for (const c of CATEGORIES) {
    const ids = c.options.map(([k]) => k);
    if (!c.multi) { face[c.id] = pick(ids); continue; }
    const n = Math.floor(rand() * 3); // 0, 1 ou 2 éléments
    for (let i = 0; i < n; i++) face = choose(face, c.id, pick(ids.filter((k) => k !== 'aucun')));
  }
  return face;
}

/* ------------------------------------------------------------------ ressemblance */
/**
 * want : [[catégorie, [valeurs acceptées]], …] (voir data/temoins.json).
 * Renvoie { checks: [{ cat, values, ok }], pct } : chaque critère est rempli si la valeur choisie
 * (ou l'une des valeurs choisies, pour signes et bijoux) fait partie des valeurs acceptées.
 */
export function scoreFace(face, want) {
  const checks = (want || []).map(([cat, values]) => {
    const v = face[cat];
    const ok = Array.isArray(v) ? v.some((k) => values.includes(k)) : values.includes(v);
    return { cat, values, ok };
  });
  const pct = checks.length ? Math.round((100 * checks.filter((c) => c.ok).length) / checks.length) : null;
  return { checks, pct };
}

/** Texte d'un critère : « Chapeau : béret ou bonnet ». */
export function checkText({ cat, values }) {
  const c = CAT[cat];
  const labels = values.map((v) => optionLabel(cat, v).toLowerCase());
  return `${c?.short || c?.label || cat} : ${labels.join(' ou ')}`;
}

/** Réaction du témoin selon la ressemblance (pct entre 0 et 100). */
export function reaction(pct) {
  if (pct >= 100) return 'C’est lui ! C’est exactement ça !';
  if (pct >= 75) return 'Oui… oui, ça ressemble beaucoup.';
  if (pct >= 50) return 'Il y a quelque chose… mais pas tout.';
  if (pct >= 25) return 'Euh… vous m’avez bien écouté ?';
  return 'Mais c’est qui, ça ?!';
}

/** Petites remarques du témoin sur les choix farfelus qu'il n'a pas demandés. */
export function quips(face, want) {
  const asked = (cat, id) => (want || []).some(([c, v]) => c === cat && v.includes(id));
  const out = [];
  if (face.teint === 'vert' && !asked('teint', 'vert')) out.push('Et il n’était pas vert.');
  if (face.nez === 'clown' && !asked('nez', 'clown')) out.push('Pourquoi un nez rouge ?');
  if (face.chapeau === 'couronne' && !asked('chapeau', 'couronne')) out.push('Une couronne, sérieusement ?');
  if (face.oreilles === 'dumbo' && !asked('oreilles', 'dumbo')) out.push('Les oreilles, quand même…');
  if (face.lunettes === 'coeur' && !asked('lunettes', 'coeur')) out.push('Je n’ai pas vu de lunettes en cœur.');
  return out;
}

/* ------------------------------------------------------------------ couleurs */
const SKIN = {
  porcelaine: ['#f6e3d6', '#d9b6a3', '#d48a8a'], clair: ['#f1cba6', '#d4a27c', '#c97c6e'], rose: ['#f2bfae', '#d4927f', '#c46a6a'],
  mat: ['#e0b088', '#bf8a62', '#b06a58'], dore: ['#d9a066', '#b67f47', '#a35b45'], olive: ['#c49a6c', '#9e764b', '#94604a'],
  brun: ['#a8714a', '#855334', '#7d4232'], fonce: ['#7d4f30', '#5e3820', '#5c2e22'], ebene: ['#4e3020', '#362015', '#3f2018'],
  coupdesoleil: ['#f08a6e', '#c9614a', '#b84a3e'], vert: ['#b5d48a', '#8aab60', '#7a9a55'],
};
const HAIR = {
  noir: '#1d1a19', brun: '#3b2619', chatain: '#6b4423', roux: '#b5522a', blond: '#d9b55a',
  platine: '#efe6c9', poivresel: '#8a8986', blanc: '#eeeeea', rose: '#f27fb5', bleu: '#4a8fe0',
};
const IRIS = {
  marron: '#5a3418', noisette: '#8a6a2a', vert: '#4f8a4a', bleu: '#3f7fc4', gris: '#7d8a92',
  noir: '#1d1512', ambre: '#c78a20', glacier: '#9fd3ef', violet: '#7c4fc4',
};
const INK = '#2b1d17';

/* ------------------------------------------------------------------ géométrie de la tête */
// Côté droit du visage, du haut du crâne au menton : [écart à l'axe, y].
const HEADS = {
  ovale: [[0, 62], [30, 68], [48, 95], [54, 135], [50, 175], [38, 208], [18, 226], [0, 230]],
  rond: [[0, 68], [36, 74], [54, 100], [60, 138], [56, 178], [40, 210], [18, 226], [0, 228]],
  carre: [[0, 64], [40, 68], [54, 90], [56, 140], [56, 190], [50, 214], [28, 226], [0, 228]],
  long: [[0, 52], [28, 58], [44, 90], [48, 140], [46, 190], [34, 224], [16, 240], [0, 243]],
  poire: [[0, 68], [24, 74], [42, 100], [52, 140], [58, 185], [48, 215], [24, 228], [0, 230]],
  coeur: [[0, 64], [40, 70], [56, 96], [56, 135], [44, 180], [26, 212], [10, 228], [0, 231]],
  diamant: [[0, 62], [22, 70], [44, 100], [58, 138], [44, 185], [26, 215], [10, 230], [0, 232]],
  fin: [[0, 66], [26, 72], [40, 98], [44, 138], [42, 178], [30, 212], [14, 228], [0, 231]],
  large: [[0, 58], [44, 64], [62, 94], [66, 140], [62, 185], [46, 216], [22, 230], [0, 232]],
  oeuf: [[0, 50], [20, 58], [42, 92], [54, 140], [52, 182], [38, 214], [18, 228], [0, 231]],
};

const f = (n) => (Math.round(n * 10) / 10).toString();
const pt = ([x, y]) => `${f(x)},${f(y)}`;

/** Courbe lisse (Catmull-Rom) passant par les points. closed : courbe fermée. */
function spline(pts, closed) {
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pt(pts[0])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? `${d}Z` : d;
}

function headGeo(id) {
  const r = HEADS[id] || HEADS.ovale;
  const right = r.map(([dx, y]) => [100 + dx, y]);
  const left = r.slice(1, -1).reverse().map(([dx, y]) => [100 - dx, y]);
  const w = (y) => {
    for (let i = 0; i < r.length - 1; i++) {
      const [a, ya] = r[i], [b, yb] = r[i + 1];
      if (y >= ya && y <= yb) return a + ((b - a) * (y - ya)) / (yb - ya || 1);
    }
    return 0;
  };
  return { r, top: r[0][1], chin: r[r.length - 1][1], path: spline([...right, ...left], true), w };
}

/** Calotte de cheveux : contour du crâne gonflé (puff), du côté gauche (y = side) au côté droit. */
function capOutline(g, { puff = 1.07, lift = 4, side = EY - 14 } = {}) {
  const R = g.r.filter(([, y]) => y < side).map(([dx, y]) => [100 + dx * puff, y - lift * (1 - (y - g.top) / (side - g.top))]);
  R.push([100 + g.w(side) * puff, side]);
  const L = R.map(([x, y]) => [200 - x, y]).reverse();
  return { d: spline([...L, ...R.slice(1)], false), xl: L[0][0], xr: R[R.length - 1][0], side };
}

/* ------------------------------------------------------------------ pièces */
function hairParts(face, g, hc) {
  const top = g.top;
  const wE = g.w(EY);
  const back = [];
  const front = [];
  const shine = `<ellipse cx="88" cy="${f(top + 14)}" rx="14" ry="6" fill="#fff" opacity=".22" transform="rotate(-18 88 ${f(top + 14)})"/>`;
  const capWith = (opts, hairline) => {
    const c = capOutline(g, opts);
    return `<path d="${c.d}${hairline(c)}Z" fill="${hc}"/>`;
  };
  const plainLine = (hl) => (c) => `Q${f(c.xr - 4)},${f(hl)} 100,${f(hl)}Q${f(c.xl + 4)},${f(hl)} ${f(c.xl)},${f(c.side)}`;
  switch (face.cheveux) {
    case 'chauve':
      front.push(shine);
      break;
    case 'rase':
      front.push(`<g opacity=".38">${capWith({ puff: 1.02, lift: 1 }, plainLine(top + 26))}</g>`, shine);
      break;
    case 'degarni': {
      const side = (s) => {
        const x = 100 + s * g.w(EY - 24);
        return `<path d="M${f(x - s * 6)},${f(EY - 32)}Q${f(x + s * 8)},${f(EY - 34)} ${f(100 + s * (wE + 4))},${f(EY + 2)}L${f(100 + s * (wE - 6))},${f(EY + 4)}Q${f(x - s * 2)},${f(EY - 14)} ${f(x - s * 6)},${f(EY - 32)}Z" fill="${hc}"/>`;
      };
      front.push(side(1), side(-1), shine);
      break;
    }
    case 'court':
      front.push(capWith({}, plainLine(top + 26)));
      break;
    case 'raie':
      front.push(capWith({ puff: 1.08, lift: 6, side: EY - 12 }, (c) => `Q${f(c.xr - 2)},${f(top + 30)} 120,${f(top + 22)}Q90,${f(top + 30)} ${f(c.xl + 10)},${f(top + 46)}Q${f(c.xl + 2)},${f(top + 56)} ${f(c.xl)},${f(c.side)}`));
      front.push(`<path d="M120,${f(top + 20)}Q108,${f(top + 4)} 96,${f(top + 2)}" stroke="#fff" stroke-opacity=".25" stroke-width="1.6" fill="none"/>`);
      break;
    case 'brosse': {
      front.push(capWith({ puff: 1.08, lift: 6 }, plainLine(top + 24)));
      const W = g.w(top + 26) * 1.08;
      let spikes = '';
      for (let k = -4; k <= 4; k++) {
        const x = 100 + (k * W) / 4.6;
        const y = top - 4 + ((x - 100) / W) ** 2 * 26;
        spikes += `M${f(x - 7)},${f(y + 8)}L${f(x)},${f(y - 9)}L${f(x + 7)},${f(y + 8)}Z`;
      }
      front.push(`<path d="${spikes}" fill="${hc}"/>`);
      break;
    }
    case 'frange':
      front.push(capWith({ puff: 1.1, lift: 6, side: EY - 4 }, (c) => `L${f(c.xr - 3)},${f(EY - 26)}Q100,${f(EY - 22)} ${f(c.xl + 3)},${f(EY - 26)}`));
      break;
    case 'afro': {
      const cy = top + 48, rx = wE * 1.5, ry = 76;
      let puffs = '';
      for (let a = -200; a <= 20; a += 20) {
        const t = (a * Math.PI) / 180;
        puffs += `<circle cx="${f(100 + rx * Math.cos(t))}" cy="${f(cy + ry * Math.sin(t))}" r="14"/>`;
      }
      back.push(`<g fill="${hc}"><ellipse cx="100" cy="${f(cy)}" rx="${f(rx)}" ry="${ry}"/>${puffs}</g>`);
      front.push(capWith({ puff: 1.02, lift: 2, side: EY - 10 }, plainLine(top + 24)));
      break;
    }
    case 'milong':
    case 'long': {
      const bottom = face.cheveux === 'long' ? 276 : EY + 66;
      const ww = wE + (face.cheveux === 'long' ? 14 : 10);
      back.push(`<path d="M${f(100 - ww)},${f(bottom)}L${f(100 - ww)},${f(top + 40)}Q${f(100 - ww)},${f(top - 8)} 100,${f(top - 8)}Q${f(100 + ww)},${f(top - 8)} ${f(100 + ww)},${f(top + 40)}L${f(100 + ww)},${f(bottom)}Q100,${f(bottom + 10)} ${f(100 - ww)},${f(bottom)}Z" fill="${hc}"/>`);
      front.push(capWith({ puff: 1.1, lift: 6, side: EY + 6 }, (c) => `Q${f(c.xr - 14)},${f(EY - 30)} ${f(c.xr - 22)},${f(top + 34)}Q108,${f(top + 22)} 100,${f(top + 26)}Q92,${f(top + 22)} ${f(c.xl + 22)},${f(top + 34)}Q${f(c.xl + 14)},${f(EY - 30)} ${f(c.xl)},${f(c.side)}`));
      break;
    }
    case 'chignon':
      back.push(`<circle cx="100" cy="${f(top - 6)}" r="17" fill="${hc}"/><path d="M86,${f(top - 2)}Q100,${f(top - 18)} 114,${f(top - 2)}" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/>`);
      front.push(capWith({ puff: 1.04, lift: 2 }, (c) => `Q${f(c.xr - 6)},${f(top + 28)} 100,${f(top + 24)}Q${f(c.xl + 6)},${f(top + 28)} ${f(c.xl)},${f(c.side)}`));
      break;
    case 'crete': {
      front.push(`<g opacity=".3">${capWith({ puff: 1.02, lift: 1 }, plainLine(top + 26))}</g>`);
      const d = `M90,${f(top + 30)}L84,${f(top + 4)}L94,${f(top + 2)}L88,${f(top - 22)}L100,${f(top - 6)}L102,${f(top - 34)}L110,${f(top - 6)}L118,${f(top - 24)}L114,${f(top + 4)}L120,${f(top + 8)}L110,${f(top + 30)}Z`;
      front.push(`<path d="${d}" fill="${hc}"/>`);
      break;
    }
    case 'mulet':
      back.push(`<path d="M${f(100 - wE - 2)},${f(EY - 12)}L${f(100 - wE + 2)},${f(EY + 76)}Q100,${f(EY + 90)} ${f(100 + wE - 2)},${f(EY + 76)}L${f(100 + wE + 2)},${f(EY - 12)}Z" fill="${hc}"/>`);
      front.push(capWith({ puff: 1.08, lift: 5, side: EY - 6 }, plainLine(top + 24)));
      break;
    case 'banane':
      front.push(capWith({ puff: 1.06, lift: 4 }, plainLine(top + 24)));
      front.push(`<path d="M${f(100 - g.w(top + 20) - 2)},${f(top + 22)}C${f(70)},${f(top - 26)} 150,${f(top - 40)} 146,${f(top + 4)}C140,${f(top - 10)} 112,${f(top - 6)} 104,${f(top + 26)}C96,${f(top + 10)} 84,${f(top + 14)} ${f(100 - g.w(top + 20) - 2)},${f(top + 22)}Z" fill="${hc}"/>`,
        `<path d="M86,${f(top - 6)}C100,${f(top - 24)} 126,${f(top - 28)} 138,${f(top - 12)}" stroke="#fff" stroke-opacity=".28" stroke-width="2" fill="none"/>`);
      break;
    default:
      break;
  }
  return { back: back.join(''), front: front.join('') };
}

function earParts(face, g, skin) {
  const [s, d] = skin;
  const wE = g.w(EY + 6);
  const ex = 100 + wE - 4, ey = EY + 8;
  const shapes = {
    base: 'M0,-14C12,-20 16,4 6,16C2,19 -1,15 0,10Z',
    elfe: 'M0,-10C6,-16 14,-30 20,-36C17,-18 15,2 6,16C2,19 -1,15 0,10Z',
    lobes: 'M0,-14C12,-20 16,4 8,16C8,28 1,30 -1,22C-1,18 -1,14 0,10Z',
    choufleur: 'M0,-14C6,-20 12,-16 13,-10C18,-8 17,-2 14,0C18,4 15,10 11,10C11,16 6,19 3,17C0,18 -1,14 0,10Z',
    rondes: 'M0,-13C16,-16 18,14 2,15C-1,15 -1,12 0,9Z',
  };
  const kinds = {
    normales: { s: 1 }, petites: { s: 0.72 }, grandes: { s: 1.35 }, decollees: { s: 1.15, rot: 22, dx: 2 },
    dumbo: { s: 1.7, rot: 36, dx: 4 }, elfe: { s: 1, p: 'elfe' }, lobes: { s: 1.05, p: 'lobes', lobe: [4, 27] },
    choufleur: { s: 1.15, p: 'choufleur' }, rondes: { s: 1.05, p: 'rondes', lobe: [4, 15] },
  };
  const lobes = [];
  const one = (side, kind) => {
    const k = kinds[kind] || kinds.normales;
    const x = side > 0 ? ex + (k.dx || 0) : 200 - ex - (k.dx || 0);
    const t = `translate(${f(x)} ${f(ey)}) scale(${side} 1) rotate(${k.rot || 0}) scale(${k.s})`;
    // position du lobe (pour les boucles d'oreilles)
    const [lx0, ly0] = k.lobe || [4, 17];
    const a = ((k.rot || 0) * Math.PI) / 180;
    const lx = (lx0 * Math.cos(a) - ly0 * Math.sin(a)) * k.s, ly = (lx0 * Math.sin(a) + ly0 * Math.cos(a)) * k.s;
    lobes.push([x + side * lx, ey + ly]);
    return `<g transform="${t}"><path d="${shapes[k.p || 'base']}" fill="${s}" stroke="${d}" stroke-width="${f(1.6 / k.s)}"/><path d="M3,-8C9,-10 10,2 5,8" stroke="${d}" stroke-width="${f(1.5 / k.s)}" fill="none" stroke-linecap="round"/></g>`;
  };
  const kind = face.oreilles;
  const svg = one(1, kind === 'asym' ? 'normales' : kind) + one(-1, kind === 'asym' ? 'dumbo' : kind);
  return { svg, lobes };
}

function eyeParts(face, uid) {
  const kind = face.yeux;
  const fard = face.bijoux.includes('fard');
  const mascara = face.bijoux.includes('mascara');
  const out = [];
  [-1, 1].forEach((side) => {
    const cx = 100 + side * EYE_X, cy = EY;
    const col = face.iris === 'vairons' ? (side < 0 ? IRIS.bleu : IRIS.marron) : IRIS[face.iris] || IRIS.marron;
    const id = `${uid}e${side > 0 ? 'r' : 'l'}`;
    const almond = (w, up, down) => `M${f(cx - w)},${cy}Q${cx},${f(cy - up * 2)} ${f(cx + w)},${cy}Q${cx},${f(cy + down * 2)} ${f(cx - w)},${cy}Z`;
    const iris = (r, dx = 0) => `<circle cx="${f(cx + dx)}" cy="${cy}" r="${r}" fill="${col}"/><circle cx="${f(cx + dx)}" cy="${cy}" r="${f(r * 0.45)}" fill="#111"/><circle cx="${f(cx + dx + r * 0.35)}" cy="${f(cy - r * 0.4)}" r="${f(r * 0.22)}" fill="#fff"/>`;
    const eye = (shape, r, dx = 0, extra = '') => `<clipPath id="${id}"><path d="${shape}"/></clipPath><path d="${shape}" fill="#fff"/><g clip-path="url(#${id})">${iris(r, dx)}${extra}</g><path d="${shape}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    const rot = (deg, inner) => `<g transform="rotate(${side * deg} ${cx} ${cy})">${inner}</g>`;
    if (fard) out.push(`<path d="M${cx - 14},${cy}Q${cx},${cy - 19} ${cx + 14},${cy}Q${cx},${cy - 8} ${cx - 14},${cy}Z" fill="#5aa0e6" opacity=".7"/>`);
    let lid = 9; // hauteur de la paupière, pour le mascara
    switch (kind) {
      case 'ronds': out.push(eye(`M${cx - 10},${cy}a10,10 0 1,0 20,0a10,10 0 1,0 -20,0Z`, 5.5)); lid = 10; break;
      case 'petits': out.push(`<ellipse cx="${cx}" cy="${cy}" rx="3.2" ry="3.8" fill="${INK}"/><circle cx="${cx + 1}" cy="${cy - 1.4}" r="1" fill="#fff"/>`); lid = 5; break;
      case 'endormis': {
        const sh = almond(12, 4.5, 3.5);
        out.push(eye(sh, 5));
        out.push(`<path d="M${cx - 12.5},${cy}Q${cx},${cy - 9} ${cx + 12.5},${cy}L${cx + 12},${cy + 0.5}Q${cx},${cy - 1.5} ${cx - 12},${cy + 0.5}Z" fill="${INK}" opacity=".85"/>`);
        lid = 2;
        break;
      }
      case 'rieurs': out.push(`<path d="M${cx - 11},${cy + 2}Q${cx},${cy - 8} ${cx + 11},${cy + 2}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`); lid = 4; break;
      case 'tombants': out.push(rot(12, eye(almond(12, 4.5, 3.5), 5))); break;
      case 'chat': out.push(rot(-14, eye(almond(12.5, 4, 3), 5) + `<path d="M${cx + side * 12},${cy}l${side * 6},-4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`)); break;
      case 'ecarquilles': out.push(eye(`M${cx - 11},${cy}a11,11 0 1,0 22,0a11,11 0 1,0 -22,0Z`, 3.5)); lid = 11; break;
      case 'louches': out.push(eye(almond(12, 4.5, 3.5), 5, -side * 5)); break;
      case 'mefiants': out.push(eye(almond(12, 2, 1.6), 4.5)); lid = 4; break;
      default: out.push(eye(almond(12, 4.5, 3.5), 5)); break;
    }
    if (mascara) {
      out.push(`<path d="M${cx - side * 9},${cy - lid * 0.6}l${-side * 3},-4M${cx - side * 3},${cy - lid * 0.85}l${-side * 1},-5M${cx + side * 3},${cy - lid * 0.85}l${side * 1.5},-5M${cx + side * 9},${cy - lid * 0.6}l${side * 3.5},-4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`);
    }
  });
  return out.join('');
}

function browParts(face, hc) {
  const k = face.sourcils;
  if (k === 'rases') return '';
  if (k === 'mono') return `<path d="M62,123Q80,114 100,120Q120,114 138,123" stroke="${hc}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  const R = {
    fins: ['M110,123Q123,117 136,122', 2],
    epais: ['M110,123Q123,116 136,122', 5.5],
    droits: ['M110,122L136,122', 4],
    arques: ['M110,124Q119,109 136,121', 3.2],
    fronces: ['M110,126L136,116', 4.5],
    etonnes: ['M110,115Q123,104 136,113', 3],
    broussailleux: ['M110,123Q123,115 136,122', 7],
    tristes: ['M110,115L136,124', 3.5],
  }[k] || ['M110,122L136,122', 4];
  let hairs = '';
  if (k === 'broussailleux') hairs = `<path d="M112,118l-3,-5M118,116l-1,-6M125,115l1,-6M131,116l3,-5M135,119l5,-3M114,126l-2,4M128,125l2,4" stroke="${hc}" stroke-width="2" stroke-linecap="round"/>`;
  const one = `<path d="${R[0]}" stroke="${hc}" stroke-width="${R[1]}" fill="none" stroke-linecap="round"/>${hairs}`;
  return `${one}<g transform="translate(200 0) scale(-1 1)">${one}</g>`;
}

function noseParts(face, skin) {
  const d = skin[1];
  const line = (p, w = 2.2) => `<path d="${p}" stroke="${d}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const nostrils = (y, dx = 6) => `<ellipse cx="${100 - dx}" cy="${y}" rx="2.2" ry="1.4" fill="${d}"/><ellipse cx="${100 + dx}" cy="${y}" rx="2.2" ry="1.4" fill="${d}"/>`;
  switch (face.nez) {
    case 'petit': return line('M101,150Q103,160 106,163Q101,168 95,165');
    case 'long': return line('M101,140L106,178Q100,183 92,178') + nostrils(178);
    case 'aquilin': return line('M99,140Q112,152 106,172Q100,176 93,172') + nostrils(172);
    case 'retrousse': return line('M100,142Q101,160 109,162Q105,168 96,167') + `<ellipse cx="96" cy="164" rx="2.4" ry="2" fill="${d}"/><ellipse cx="104" cy="164" rx="2.4" ry="2" fill="${d}"/>`;
    case 'large': return line('M97,142L98,158M84,166Q90,157 96,167Q100,171 104,167Q110,157 116,166Q112,174 100,173Q88,174 84,166');
    case 'pointu': return line('M101,140L111,171L97,171');
    case 'patate': return `<circle cx="100" cy="166" r="10" fill="${skin[0]}" stroke="${d}" stroke-width="2"/>${line('M98,142L98,155')}<circle cx="96" cy="162" r="2.5" fill="#fff" opacity=".35"/>`;
    case 'boxeur': return line('M100,140Q93,149 102,155Q95,162 103,167M86,168Q92,162 98,169Q100,171 102,169Q108,162 114,168Q108,175 100,174Q92,175 86,168');
    case 'clown': return `<circle cx="100" cy="164" r="10" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><circle cx="96" cy="160" r="3" fill="#fff" opacity=".6"/>`;
    default: return line('M101,140L104,166Q100,171 94,167') + nostrils(167, 5);
  }
}

function mouthParts(face, skin) {
  const lip = face.bijoux.includes('rouge') ? '#c4123a' : skin[2];
  const s = (p, w = 2.4) => `<path d="${p}" stroke="${lip}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const open = (p) => `<path d="${p}" fill="#6b1f26" stroke="${lip}" stroke-width="2" stroke-linejoin="round"/>`;
  switch (face.bouche) {
    case 'sourire': return s('M86,193Q100,206 114,193', 2.8);
    case 'dents': return `${open('M84,191Q100,195 116,191Q100,214 84,191Z')}<path d="M87,193Q100,196.5 113,193L112,197.5Q100,200.5 88,197.5Z" fill="#fff"/>`;
    case 'moue': return `<ellipse cx="100" cy="197" rx="7" ry="5.5" fill="${lip}"/><path d="M95,197L105,197" stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>`;
    case 'pulpeuse': return `<path d="M85,195Q93,186 100,191Q107,186 115,195Q100,198 85,195Z" fill="${lip}"/><path d="M85,195Q100,198 115,195Q100,210 85,195Z" fill="${lip}"/><path d="M85,195Q100,198 115,195" stroke="#000" stroke-opacity=".3" stroke-width="1.2" fill="none"/><ellipse cx="104" cy="200" rx="4" ry="1.4" fill="#fff" opacity=".35"/>`;
    case 'fine': return s('M84,196Q100,197 116,196', 1.5);
    case 'coin': return s('M88,197Q102,199 113,190', 2.6);
    case 'ouverte': return `<ellipse cx="100" cy="198" rx="7.5" ry="10" fill="#6b1f26" stroke="${lip}" stroke-width="2.4"/>`;
    case 'bonheur': return `${open('M84,191Q100,195 116,191Q100,214 84,191Z')}<path d="M87,193Q100,196.5 113,193L112,198.5Q100,201.5 88,198.5Z" fill="#fff"/><rect x="98.6" y="194" width="2.8" height="7" fill="#6b1f26"/>`;
    case 'grimace': return `<rect x="84" y="189" width="32" height="13" rx="4" fill="#fff" stroke="${lip}" stroke-width="2.2"/><path d="M84,195.5L116,195.5M92,189v13M100,189v13M108,189v13" stroke="#999" stroke-width="1"/>`;
    case 'triste': return s('M87,201Q100,189 113,201', 2.6);
    default: return s('M87,196Q100,199 113,196');
  }
}

function beardParts(face, g, hc, uid) {
  const k = face.barbe;
  if (k === 'aucune') return { under: '', over: '' };
  const clip = `url(#${uid}h)`;
  const wC = g.w(EY + 8) + 3;
  const cheeks = `M${f(100 - wC)},${EY + 8}Q${f(100 - wC + 14)},${EY + 42} 86,184Q100,179 114,184Q${f(100 + wC - 14)},${EY + 42} ${f(100 + wC)},${EY + 8}L180,300L20,300Z`;
  const chinExt = `<ellipse cx="100" cy="${f(g.chin - 2)}" rx="${f(Math.max(16, g.w(g.chin - 12) + 2))}" ry="9" fill="${hc}"/>`;
  const mous = `<path d="M85,187Q92,178 100,183Q108,178 115,187Q108,191 100,188Q92,191 85,187Z" fill="${hc}"/>`;
  switch (k) {
    case 'troisjours': return { under: `<g clip-path="${clip}"><path d="${cheeks}" fill="${hc}" opacity=".26"/><path d="M84,186Q100,178 116,186L116,190L84,190Z" fill="${hc}" opacity=".26"/></g>`, over: '' };
    case 'moustache': return { under: '', over: mous };
    case 'guidon': return { under: '', over: `<path d="M100,184Q90,177 80,186Q72,191 69,180Q70,194 82,193Q92,191 100,188Q108,191 118,193Q130,194 131,180Q128,191 120,186Q110,177 100,184Z" fill="${hc}"/>` };
    case 'bouc': return { under: `<path d="M91,206Q100,202 109,206L106,${f(g.chin + 3)}Q100,${f(g.chin + 8)} 94,${f(g.chin + 3)}Z" fill="${hc}"/>`, over: '' };
    case 'courte': return { under: `<g clip-path="${clip}"><path d="${cheeks}" fill="${hc}"/></g>${chinExt}`, over: mous };
    case 'longue': {
      const y0 = g.chin - 34, w0 = g.w(y0);
      return { under: `<g clip-path="${clip}"><path d="${cheeks}" fill="${hc}"/></g><path d="M${f(100 - w0)},${f(y0)}Q${f(100 - w0 + 2)},${f(g.chin + 40)} 100,${f(g.chin + 60)}Q${f(100 + w0 - 2)},${f(g.chin + 40)} ${f(100 + w0)},${f(y0)}Z" fill="${hc}"/><path d="M92,${f(g.chin + 10)}Q96,${f(g.chin + 30)} 100,${f(g.chin + 44)}M108,${f(g.chin + 10)}Q104,${f(g.chin + 30)} 101,${f(g.chin + 40)}" stroke="#000" stroke-opacity=".18" stroke-width="1.5" fill="none"/>`, over: mous };
    }
    case 'favoris': {
      const wE = g.w(EY);
      return { under: `<g clip-path="${clip}" fill="${hc}"><rect x="${f(100 + wE - 13)}" y="${EY - 18}" width="18" height="${f(54)}" rx="4"/><rect x="${f(100 - wE - 5)}" y="${EY - 18}" width="18" height="54" rx="4"/></g>`, over: '' };
    }
    case 'mousquetaire': return { under: `<path d="M96,206L104,206L100,${f(g.chin + 12)}Z" fill="${hc}"/>`, over: `<path d="M83,181Q90,189 100,184Q110,189 117,181" stroke="${hc}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` };
    case 'collier': return { under: `<clipPath id="${uid}c"><rect x="0" y="${EY + 34}" width="200" height="200"/></clipPath><g clip-path="url(#${uid}c)"><g clip-path="${clip}"><path d="${g.path}" stroke="${hc}" stroke-width="22" fill="none"/></g></g>${chinExt}`, over: '' };
    default: return { under: '', over: '' };
  }
}

function markParts(face, g, skin) {
  const d = skin[1];
  const m = new Set(face.signes);
  const out = [];
  if (m.has('joues')) out.push('<ellipse cx="74" cy="168" rx="11" ry="6.5" fill="#ff5f73" opacity=".35"/><ellipse cx="126" cy="168" rx="11" ry="6.5" fill="#ff5f73" opacity=".35"/>');
  if (m.has('rousseur')) {
    const dots = [[-24, 156], [-18, 160], [-28, 162], [-14, 155], [-22, 166], [-11, 162], [-30, 156]];
    out.push(`<g fill="#a0522d" opacity=".55">${dots.map(([dx, y]) => `<circle cx="${100 + dx}" cy="${y}" r="1.5"/><circle cx="${100 - dx}" cy="${y}" r="1.5"/>`).join('')}</g>`);
  }
  if (m.has('pommettes')) out.push(`<path d="M62,160Q72,150 88,152M138,160Q128,150 112,152" stroke="${d}" stroke-width="2.2" fill="none" opacity=".75" stroke-linecap="round"/>`);
  if (m.has('rides')) out.push(`<path d="M84,${g.top + 36}Q100,${g.top + 32} 116,${g.top + 36}M80,${g.top + 44}Q100,${g.top + 40} 120,${g.top + 44}M86,${g.top + 52}Q100,${g.top + 49} 114,${g.top + 52}" stroke="${d}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`);
  if (m.has('pattesdoie')) out.push(`<path d="M61,134l-6,-3M60,138l-7,0M61,142l-6,3M139,134l6,-3M140,138l7,0M139,142l6,3" stroke="${d}" stroke-width="1.4" stroke-linecap="round"/>`);
  if (m.has('cernes')) out.push(`<path d="M68,148Q78,154 88,148M112,148Q122,154 132,148" stroke="#6b4a6b" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`);
  if (m.has('grain')) out.push('<circle cx="121" cy="183" r="2.3" fill="#3a2416"/>');
  if (m.has('bouton')) out.push('<circle cx="108" cy="160" r="3.2" fill="#e0525a"/><circle cx="107" cy="159" r="1" fill="#fff" opacity=".7"/>');
  if (m.has('fossette')) out.push(`<path d="M96,${f(g.chin - 9)}Q100,${f(g.chin - 5)} 104,${f(g.chin - 9)}" stroke="${d}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);
  if (m.has('cicatrice')) out.push('<path d="M118,110L131,154" stroke="#a0524a" stroke-width="2.4" stroke-linecap="round"/><path d="M119,118l5,-2M121,126l5,-2M124,134l5,-2M126,142l5,-2" stroke="#a0524a" stroke-width="1.4" stroke-linecap="round"/>');
  return out.join('');
}

function doubleChin(face, g, skin) {
  if (!face.signes.includes('doublementon')) return '';
  const w = Math.max(18, g.w(g.chin - 14));
  return `<path d="M${f(100 - w)},${f(g.chin - 10)}Q100,${f(g.chin + 22)} ${f(100 + w)},${f(g.chin - 10)}Z" fill="${skin[0]}" stroke="${skin[1]}" stroke-width="2"/>`;
}

function outfitParts(face, g, skin, nw, uid) {
  const S = 'M0,300L0,284C6,264 36,252 68,250L132,250C164,252 194,264 200,284L200,300Z';
  const L = 100 - nw, R = 100 + nw;
  const neckOpen = (depth, color = skin[0]) => `<path d="M${f(L - 2)},250Q100,${f(250 + depth)} ${f(R + 2)},250Z" fill="${color}"/>`;
  const vOpen = (y, color = skin[0]) => `<path d="M${f(L)},250L100,${y}L${f(R)},250Z" fill="${color}"/>`;
  const tie = (c) => `<path d="M96,257L104,257L106,263L102,300L98,300L94,263Z" fill="${c}"/><path d="M95.5,252L104.5,252L103,258L97,258Z" fill="${c}" stroke="#000" stroke-opacity=".25"/>`;
  switch (face.tenue) {
    case 'chemise': return `<path d="${S}" fill="#f4f4f0"/>${vOpen(266)}${tie('#b0303a')}<path d="M${f(L - 2)},246L97,267L${f(L - 14)},264ZM${f(R + 2)},246L103,267L${f(R + 14)},264Z" fill="#fff" stroke="#bbb" stroke-width="1.2"/>`;
    case 'costume': return `<path d="${S}" fill="#2c3440"/>${vOpen(300, '#f4f4f0')}${tie('#7a1f2b')}<path d="M${f(L - 2)},250L94,296L${f(L - 18)},266ZM${f(R + 2)},250L106,296L${f(R + 18)},266Z" fill="#232a33" stroke="#151a20" stroke-width="1.2"/>`;
    case 'colroule': return `<path d="${S}" fill="#26262a"/><path d="M${f(L - 3)},${f(g.chin - 2)}L${f(L - 4)},256Q100,264 ${f(R + 4)},256L${f(R + 3)},${f(g.chin - 2)}Z" fill="#26262a"/><path d="M${f(L - 3)},${f(g.chin + 8)}Q100,${f(g.chin + 14)} ${f(R + 3)},${f(g.chin + 8)}M${f(L - 4)},${f(g.chin + 18)}Q100,${f(g.chin + 24)} ${f(R + 4)},${f(g.chin + 18)}" stroke="#000" stroke-opacity=".4" stroke-width="1.5" fill="none"/>`;
    case 'mariniere': return `<clipPath id="${uid}o"><path d="${S}"/></clipPath><path d="${S}" fill="#f5f3ee"/><g clip-path="url(#${uid}o)" stroke="#1f3c88" stroke-width="5"><path d="M0,262H200M0,273H200M0,284H200M0,295H200"/></g>${neckOpen(10)}`;
    case 'polo': return `<path d="${S}" fill="#e86a9a"/>${vOpen(264)}<path d="M${f(L - 2)},247L98,262L${f(L - 16)},258ZM${f(R + 2)},247L102,262L${f(R + 16)},258Z" fill="#f08bb1" stroke="#b84a76" stroke-width="1.2"/><circle cx="100" cy="270" r="1.6" fill="#fff"/><circle cx="100" cy="278" r="1.6" fill="#fff"/>`;
    case 'pullepaules': return `<path d="${S}" fill="#a9c7e8"/>${vOpen(266)}<path d="M${f(L - 2)},247L98,264L${f(L - 14)},260ZM${f(R + 2)},247L102,264L${f(R + 14)},260Z" fill="#c4daf0" stroke="#7b9cc0" stroke-width="1.2"/><path d="M4,286C14,262 40,256 66,256Q100,262 134,256C160,256 186,262 196,286L190,290C178,272 160,266 134,268Q100,276 66,268C40,266 22,272 10,290Z" fill="#c0392b"/><path d="M84,268Q92,280 88,300L98,300Q100,284 100,274Q100,284 102,300L112,300Q108,280 116,268Q100,278 84,268Z" fill="#a93226"/><circle cx="100" cy="273" r="7" fill="#c0392b" stroke="#922b21" stroke-width="1.2"/>`;
    case 'sweat': return `<path d="${S}" fill="#7b8a99"/><path d="M${f(L - 18)},254Q100,236 ${f(R + 18)},254Q100,274 ${f(L - 18)},254Z" fill="#66747f"/>${neckOpen(12)}<path d="M94,262L92,290M106,262L108,290" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>`;
    case 'hawaienne': {
      const fl = [[30, 272, '#fff'], [62, 290, '#ffd23f'], [150, 270, '#fff'], [176, 290, '#ff5f9e'], [126, 292, '#fff'], [14, 294, '#ff5f9e'], [80, 262, '#ffd23f']];
      return `<clipPath id="${uid}o"><path d="${S}"/></clipPath><path d="${S}" fill="#1aa39a"/><g clip-path="url(#${uid}o)">${fl.map(([x, y, c]) => `<g fill="${c}"><circle cx="${x - 4}" cy="${y}" r="3.6"/><circle cx="${x + 4}" cy="${y}" r="3.6"/><circle cx="${x}" cy="${y - 4}" r="3.6"/><circle cx="${x}" cy="${y + 4}" r="3.6"/></g><circle cx="${x}" cy="${y}" r="2" fill="#e67e22"/>`).join('')}</g>${vOpen(270)}<path d="M${f(L - 2)},247L98,268L${f(L - 16)},262ZM${f(R + 2)},247L102,268L${f(R + 16)},262Z" fill="#20b8ad" stroke="#11776f" stroke-width="1.2"/>`;
    }
    case 'perfecto': return `<path d="${S}" fill="#1c1c1e"/>${vOpen(280, '#f0f0f0')}<path d="M${f(L - 2)},250L92,286L${f(L - 22)},268ZM${f(R + 2)},250L114,278L${f(R + 24)},264Z" fill="#2a2a2e" stroke="#000" stroke-width="1.2"/><path d="M112,276L94,300" stroke="#c9c9c9" stroke-width="2" stroke-dasharray="2 2"/>`;
    default: return `<path d="${S}" fill="#4a7bd0"/>${neckOpen(16)}<path d="M${f(L - 2)},250Q100,266 ${f(R + 2)},250" stroke="#3a64ad" stroke-width="3" fill="none"/>`;
  }
}

function glassesParts(face, g) {
  const wE = g.w(EY - 4);
  const temples = (y = 136) => `<path d="M${f(100 - wE)},${y - 2}L64,${y}M${f(100 + wE)},${y - 2}L136,${y}" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/>`;
  const both = (shape) => `${shape}<g transform="translate(200 0) scale(-1 1)">${shape}</g>`;
  switch (face.lunettes) {
    case 'rondes': return temples() + both('<circle cx="78" cy="138" r="12.5" fill="#fff" fill-opacity=".12" stroke="#2b2b2b" stroke-width="2.4"/>') + '<path d="M90,136Q100,130 110,136" stroke="#2b2b2b" stroke-width="2.2" fill="none"/>';
    case 'rectangle': return temples() + both('<rect x="63" y="129" width="30" height="18" rx="4" fill="#fff" fill-opacity=".12" stroke="#2b2b2b" stroke-width="2.2"/>') + '<path d="M93,135Q100,132 107,135" stroke="#2b2b2b" stroke-width="2.2" fill="none"/>';
    case 'epaisses': return temples() + both('<rect x="62" y="127" width="31" height="21" rx="6" fill="#fff" fill-opacity=".1" stroke="#5a3418" stroke-width="5"/>') + '<path d="M93,135Q100,131 107,135" stroke="#5a3418" stroke-width="4" fill="none"/>';
    case 'solaires': return temples(133) + both('<path d="M61,128L95,128L92,145Q78,151 66,146Z" fill="#111" stroke="#000" stroke-width="2"/><path d="M68,132L76,132" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>') + '<path d="M95,131Q100,128 105,131" stroke="#000" stroke-width="2.5" fill="none"/>';
    case 'aviateur': return temples(132) + both('<path d="M63,129L93,129Q95,147 82,151Q65,151 63,138Z" fill="#4e6b5a" fill-opacity=".6" stroke="#c9a24a" stroke-width="1.8"/>') + '<path d="M93,131L107,131M95,128Q100,126 105,128" stroke="#c9a24a" stroke-width="1.6" fill="none"/>';
    case 'lecture': return temples(143) + both('<path d="M65,144L92,144Q90,156 78.5,156Q67,156 65,144Z" fill="#fff" fill-opacity=".12" stroke="#333" stroke-width="2"/>') + '<path d="M92,146Q100,143 108,146" stroke="#333" stroke-width="2" fill="none"/>';
    case 'monocle': return '<circle cx="122" cy="138" r="12.5" fill="#fff" fill-opacity=".12" stroke="#c9a24a" stroke-width="2.4"/><path d="M133,145Q150,190 140,250" stroke="#c9a24a" stroke-width="1.2" fill="none" stroke-dasharray="2 1.5"/>';
    case 'cacheoeil': return `<path d="M${f(100 - wE)},118L${f(100 + wE)},106" stroke="#111" stroke-width="2"/><ellipse cx="78" cy="139" rx="13" ry="11.5" fill="#111"/>`;
    case 'coeur': {
      const heart = (cx) => `<path d="M${cx},150C${cx - 18},140 ${cx - 16},124 ${cx - 7},126C${cx - 3},126 ${cx},130 ${cx},132C${cx},130 ${cx + 3},126 ${cx + 7},126C${cx + 16},124 ${cx + 18},140 ${cx},150Z" fill="#ff4f9a" fill-opacity=".72" stroke="#c2185b" stroke-width="2"/>`;
      return temples(134) + heart(78) + heart(122) + '<path d="M93,133Q100,129 107,133" stroke="#c2185b" stroke-width="2" fill="none"/>';
    }
    default: return '';
  }
}

function hatParts(face, g) {
  const t = g.top;
  const W = g.w(t + 22) + 7;
  const a = 100 - W, b = 100 + W;
  switch (face.chapeau) {
    case 'casquette': return `<path d="M${f(a)},${f(t + 24)}C${f(a)},${f(t - 16)} ${f(b)},${f(t - 16)} ${f(b)},${f(t + 24)}Z" fill="#d63a3a"/><path d="M${f(a + 2)},${f(t + 22)}Q100,${f(t + 42)} ${f(b - 2)},${f(t + 22)}Q100,${f(t + 30)} ${f(a + 2)},${f(t + 22)}Z" fill="#a52727"/><circle cx="100" cy="${f(t - 6)}" r="3" fill="#a52727"/><path d="M100,${f(t - 4)}L100,${f(t + 22)}" stroke="#a52727" stroke-width="1.2"/>`;
    case 'beret': return `<ellipse cx="106" cy="${f(t + 6)}" rx="${f(W + 12)}" ry="15" fill="#1f2a44" transform="rotate(-9 106 ${f(t + 6)})"/><rect x="104" y="${f(t - 14)}" width="3" height="7" rx="1.5" fill="#1f2a44"/>`;
    case 'bonnet': return `<path d="M${f(a - 1)},${f(t + 24)}C${f(a)},${f(t - 28)} ${f(b)},${f(t - 28)} ${f(b + 1)},${f(t + 24)}Z" fill="#2e8b57"/><rect x="${f(a - 3)}" y="${f(t + 10)}" width="${f(2 * W + 6)}" height="17" rx="6" fill="#23704a"/><circle cx="100" cy="${f(t - 16)}" r="10" fill="#f2f2f2"/>`;
    case 'melon': return `<path d="M${f(a + 4)},${f(t + 18)}C${f(a + 2)},${f(t - 28)} ${f(b - 2)},${f(t - 28)} ${f(b - 4)},${f(t + 18)}Z" fill="#1b1b1b"/><rect x="${f(a + 3)}" y="${f(t + 8)}" width="${f(2 * W - 6)}" height="7" fill="#444"/><ellipse cx="100" cy="${f(t + 18)}" rx="${f(W + 13)}" ry="6" fill="#111"/>`;
    case 'hautdeforme': return `<rect x="${f(a + 6)}" y="${f(t - 58)}" width="${f(2 * W - 12)}" height="78" rx="3" fill="#151515"/><rect x="${f(a + 6)}" y="${f(t + 2)}" width="${f(2 * W - 12)}" height="11" fill="#7a1f2b"/><ellipse cx="100" cy="${f(t + 19)}" rx="${f(W + 15)}" ry="7" fill="#0d0d0d"/>`;
    case 'cowboy': return `<path d="M${f(a + 6)},${f(t + 16)}C${f(a + 4)},${f(t - 32)} 92,${f(t - 26)} 100,${f(t - 16)}C108,${f(t - 26)} ${f(b - 4)},${f(t - 32)} ${f(b - 6)},${f(t + 16)}Z" fill="#a0703c"/><rect x="${f(a + 6)}" y="${f(t + 4)}" width="${f(2 * W - 12)}" height="7" fill="#5a3a1c"/><path d="M${f(a - 28)},${f(t + 4)}Q100,${f(t + 36)} ${f(b + 28)},${f(t + 4)}Q${f(b + 10)},${f(t + 26)} 100,${f(t + 27)}Q${f(a - 10)},${f(t + 26)} ${f(a - 28)},${f(t + 4)}Z" fill="#84592c"/>`;
    case 'bob': return `<path d="M${f(a + 4)},${f(t + 16)}L${f(a + 10)},${f(t - 14)}Q100,${f(t - 22)} ${f(b - 10)},${f(t - 14)}L${f(b - 4)},${f(t + 16)}Z" fill="#c9b27c"/><path d="M${f(a - 13)},${f(t + 31)}L${f(a + 2)},${f(t + 12)}L${f(b - 2)},${f(t + 12)}L${f(b + 13)},${f(t + 31)}Q100,${f(t + 38)} ${f(a - 13)},${f(t + 31)}Z" fill="#b39a62"/><path d="M${f(a + 6)},${f(t + 6)}L${f(b - 6)},${f(t + 6)}" stroke="#8c7746" stroke-width="2" stroke-dasharray="3 2"/>`;
    case 'couronne': return `<path d="M${f(a + 6)},${f(t + 16)}L${f(a + 3)},${f(t - 20)}L${f(100 - W / 2)},${f(t - 2)}L100,${f(t - 26)}L${f(100 + W / 2)},${f(t - 2)}L${f(b - 3)},${f(t - 20)}L${f(b - 6)},${f(t + 16)}Z" fill="#f2c230" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="${f(t + 6)}" r="4" fill="#d32f2f"/><circle cx="${f(100 - W / 2)}" cy="${f(t + 8)}" r="3" fill="#1e88e5"/><circle cx="${f(100 + W / 2)}" cy="${f(t + 8)}" r="3" fill="#1e88e5"/>`;
    case 'bandeau': {
      const wF = g.w(g.top + 28) + 2;
      return `<path d="M${f(100 - wF)},${f(t + 22)}Q100,${f(t + 10)} ${f(100 + wF)},${f(t + 22)}L${f(100 + wF)},${f(t + 36)}Q100,${f(t + 24)} ${f(100 - wF)},${f(t + 36)}Z" fill="#e84a5f"/><path d="M${f(100 - wF)},${f(t + 29)}Q100,${f(t + 17)} ${f(100 + wF)},${f(t + 29)}" stroke="#fff" stroke-width="2" fill="none"/>`;
    }
    default: return '';
  }
}

function jewelParts(face, lobes) {
  const j = new Set(face.bijoux);
  const out = [];
  lobes.forEach(([x, y]) => {
    if (j.has('anneaux')) out.push(`<circle cx="${f(x)}" cy="${f(y + 6)}" r="6" fill="none" stroke="#e0b030" stroke-width="2"/>`);
    if (j.has('clous')) out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="2.4" fill="#e8e8f0" stroke="#999" stroke-width=".8"/>`);
    if (j.has('pendants')) out.push(`<path d="M${f(x)},${f(y)}L${f(x)},${f(y + 8)}" stroke="#e0b030" stroke-width="1.4"/><circle cx="${f(x)}" cy="${f(y + 11)}" r="3.6" fill="#fbf7ee" stroke="#c9b48a" stroke-width=".8"/>`);
  });
  if (j.has('piercing')) out.push('<circle cx="107" cy="168" r="3.4" fill="none" stroke="#c0c0c8" stroke-width="1.6"/>');
  return out.join('');
}

function neckJewels(face, nw) {
  const j = new Set(face.bijoux);
  if (j.has('collier')) {
    let pearls = '';
    for (let i = 0; i <= 12; i++) {
      const x = 100 - nw - 2 + ((2 * nw + 4) * i) / 12;
      const y = 248 + Math.sin((Math.PI * i) / 12) * 12;
      pearls += `<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#fbf7ee" stroke="#c9b48a" stroke-width=".7"/>`;
    }
    return pearls;
  }
  if (j.has('chaine')) return `<path d="M${f(100 - nw)},246Q100,276 ${f(100 + nw)},246" stroke="#e0b030" stroke-width="2.6" fill="none" stroke-dasharray="3 1.5"/><circle cx="100" cy="262" r="3.5" fill="#e0b030"/>`;
  return '';
}

/* ------------------------------------------------------------------ portrait complet */
/**
 * Portrait SVG (chaîne). uid : préfixe unique des identifiants (plusieurs portraits sur la page).
 * view : cadrage [x, y, l, h] (vignettes) ; par défaut le portrait entier 200 × 300.
 * size : [largeur, hauteur] en pixels, pour l'export en image.
 */
export function renderFace(rawFace, { uid = 'pr', view, size, paper = true, fit = 'slice' } = {}) {
  const face = cleanFace(rawFace);
  const g = headGeo(face.tete);
  const skin = SKIN[face.teint] || SKIN.clair;
  const hc = HAIR[face.couleur] || HAIR.chatain;
  const nw = Math.max(18, Math.min(30, g.w(g.chin - 25) * 0.55));
  const hair = hairParts(face, g, hc);
  const ears = earParts(face, g, skin);
  const beard = beardParts(face, g, hc, uid);
  const vb = view || [0, 0, 200, 300];
  let bg = '';
  if (paper) {
    let lines = '';
    for (let y = 40; y < 300; y += 40) lines += `<path d="M0,${y}H200" stroke="#bfb6a3" stroke-width=".8"/>`;
    bg = `<rect x="-20" y="-60" width="240" height="380" fill="#ece6d8"/>${lines}`;
  }
  const dims = size ? ` width="${size[0]}" height="${size[1]}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}"${dims} preserveAspectRatio="xMidYMid ${fit}">`
    + `<defs><clipPath id="${uid}h"><path d="${g.path}"/></clipPath></defs>`
    + bg
    + hair.back
    + `<rect x="${f(100 - nw)}" y="${f(g.chin - 40)}" width="${f(2 * nw)}" height="${f(262 - g.chin + 40)}" fill="${skin[0]}"/>`
    + `<path d="M${f(100 - nw)},${f(g.chin - 8)}Q100,${f(g.chin + 16)} ${f(100 + nw)},${f(g.chin - 8)}Z" fill="${skin[1]}" opacity=".55"/>`
    + outfitParts(face, g, skin, nw, uid)
    + neckJewels(face, nw)
    + ears.svg
    + `<path d="${g.path}" fill="${skin[0]}" stroke="${skin[1]}" stroke-width="2"/>`
    + markParts(face, g, skin)
    + doubleChin(face, g, skin)
    + beard.under
    + eyeParts(face, uid)
    + browParts(face, hc)
    + noseParts(face, skin)
    + mouthParts(face, skin)
    + beard.over
    + hair.front
    + glassesParts(face, g)
    + hatParts(face, g)
    + jewelParts(face, ears.lobes)
    + '</svg>';
}
