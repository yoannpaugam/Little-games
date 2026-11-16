// Photos des races de chiens : image principale de l'article Wikipédia (anglais) de chaque race,
// avec son auteur et sa licence (Wikimedia Commons). Module sans DOM : il sert au jeu (photos
// manquantes, cherchées en direct) et au script scripts/fetch-dog-photos.mjs (photos.json).

export const API = 'https://en.wikipedia.org/w/api.php';
export const WIDTH = 960; // largeur de la photo de jeu (tailles standard de Wikimedia : 330, 500, 960, 1280…)
export const THUMB = 330; // largeur des vignettes de la grille

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function query(params, fetchFn) {
  const url = `${API}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params })}`;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Wikipédia : ${res.status}`);
  return res.json();
}

/** Suit les titres normalisés puis les redirections : titre demandé → titre final. */
function resolver(q) {
  const norm = new Map((q.normalized || []).map((x) => [x.from, x.to]));
  const redir = new Map((q.redirects || []).map((x) => [x.from, x.to]));
  return (t) => {
    let x = norm.get(t) ?? t;
    x = redir.get(x) ?? x;
    return x;
  };
}

/** Texte sans balises HTML (le champ Artist de Commons en contient souvent), raccourci. */
export function plainText(html, max = 80) {
  const t = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Vignette à une autre largeur, à partir de l'URL …/thumb/…/800px-Fichier.jpg */
export const thumbOf = (url, width = THUMB) => url.replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`);

/**
 * Cherche les photos des races.
 * @param {{ id, wiki, file? }[]} breeds  `file` (fichier Commons, sans « File: ») remplace l'image de l'article.
 * @returns {Promise<Record<string, { img, thumb, file, by, lic }>>} les races introuvables sont absentes.
 */
export async function fetchPhotos(breeds, { fetch: fetchFn = globalThis.fetch } = {}) {
  // 1. Fichier de chaque race : forcé (`file`) ou image principale de l'article
  const fileOf = new Map();
  for (const b of breeds) if (b.file) fileOf.set(b.id, b.file.replace(/^File:/, ''));
  const todo = breeds.filter((b) => !b.file);
  for (const part of chunks(todo, 40)) {
    const q = (await query({ redirects: '1', prop: 'pageimages', piprop: 'name', titles: part.map((b) => b.wiki).join('|') }, fetchFn)).query || {};
    const final = resolver(q);
    const pages = new Map((q.pages || []).map((p) => [p.title, p.pageimage]));
    for (const b of part) {
      const name = pages.get(final(b.wiki));
      if (name) fileOf.set(b.id, name);
    }
  }
  // 2. URL, auteur et licence de chaque fichier
  const files = [...new Set(fileOf.values())];
  const info = new Map();
  for (const part of chunks(files, 25)) {
    const titles = part.map((f) => `File:${f}`);
    const q = (await query({
      prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(WIDTH),
      iiextmetadatafilter: 'Artist|LicenseShortName', titles: titles.join('|'),
    }, fetchFn)).query || {};
    const final = resolver(q);
    const pages = new Map((q.pages || []).map((p) => [p.title, p.imageinfo?.[0]]));
    part.forEach((f, i) => {
      const ii = pages.get(final(titles[i]));
      if (!ii || !(ii.thumburl || ii.url)) return;
      const meta = ii.extmetadata || {};
      const img = ii.thumburl || ii.url;
      info.set(f, {
        img,
        thumb: ii.thumburl ? thumbOf(ii.thumburl) : img,
        file: f.replace(/_/g, ' '),
        by: plainText(meta.Artist?.value) || 'Auteur inconnu',
        lic: plainText(meta.LicenseShortName?.value, 40) || 'Licence inconnue',
      });
    });
  }
  const out = {};
  for (const [id, f] of fileOf) if (info.has(f)) out[id] = info.get(f);
  return out;
}
