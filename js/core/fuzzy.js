// Comparaison de réponses tolérante aux fautes d'orthographe.
// Module autonome, sans dépendance : réutilisable par tous les jeux.

const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'the', 'a', 'an', 'el', 'il', 'lo', 'der', 'die', 'das']);
const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
const NUMBERS = {
  un: '1', deux: '2', trois: '3', quatre: '4', cinq: '5', six: '6', sept: '7', huit: '8', neuf: '9', dix: '10',
  one: '1', two: '2', three: '3', four: '4', five: '5', seven: '7', eight: '8', nine: '9', ten: '10', twelve: '12', douze: '12',
};

/** Minuscules, sans accents ni ponctuation, articles initiaux retirés, chiffres unifiés. */
export function normalize(str) {
  let s = String(str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/&/g, ' et ')
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  let words = s.split(' ').filter(Boolean)
    .map((w, i) => (ROMAN[w] && i > 0 ? ROMAN[w] : NUMBERS[w] && i > 0 ? NUMBERS[w] : w))
    .map((w) => (w === 'and' ? 'et' : w));
  if (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join(' ');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Distance de Damerau-Levenshtein (une inversion de deux lettres = 1 faute)
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Nombre de fautes tolérées selon la longueur de la réponse attendue. */
export function tolerance(len) {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  if (len <= 12) return 2;
  if (len <= 20) return 3;
  return Math.floor(len * 0.18);
}

/** Vrai si `guess` correspond à l'une des réponses `answers` (déjà normalisées ou non). */
export function isMatch(guess, answers) {
  const g = normalize(guess);
  if (!g) return false;
  const gCompact = g.replace(/ /g, '');
  const gDigits = digits(g);
  return answers.some((raw) => {
    const a = normalize(raw);
    if (!a) return false;
    if (a === g) return true;
    const aCompact = a.replace(/ /g, '');
    if (aCompact === gCompact) return true;
    // Les numéros doivent être exacts : "Toy Story" ≠ "Toy Story 2"
    if (digits(a) !== gDigits) return false;
    return levenshtein(gCompact, aCompact) <= tolerance(aCompact.length);
  });
}

/** Distance minimale entre la réponse et les réponses attendues (pour les indices "tu chauffes"). */
export function closeness(guess, answers) {
  const g = normalize(guess).replace(/ /g, '');
  let best = Infinity;
  for (const raw of answers) {
    const a = normalize(raw).replace(/ /g, '');
    if (!a) continue;
    const dist = levenshtein(g, a) - tolerance(a.length);
    best = Math.min(best, dist / Math.max(a.length, 1));
  }
  return best; // ≤ 0 : correct, petit positif : proche
}

function digits(s) {
  return (s.match(/\d+/g) || []).join(',');
}
