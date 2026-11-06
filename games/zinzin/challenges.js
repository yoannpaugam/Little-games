// Compète de zinzin : les défis des cases du plateau, un par jeu de l'application.
// Chaque défi est une version courte du jeu d'origine. Il réutilise son catalogue et ses règles de réponse
// (modules sans DOM des autres jeux), mais a sa propre interface.
//
// Sur le téléphone de l'équipe qui joue (active), le défi garde son propre état et l'envoie au fil de l'eau
// (send(L)), puis donne le résultat (finish(ok, L)). Sur les autres téléphones, il affiche en direct l'état reçu
// (update(L)), sans rien pouvoir toucher.

import { h, icon } from '../../js/core/dom.js?v=1.41.0';
import { buildAnswers as filmAnswers, ownersOf as filmOwners, judge as judgeFilm } from '../movie-posters/index.js?v=1.41.0';
import { buildAnswers as faceAnswers, buildOwners as faceOwners, checkAnswer as checkFace } from '../faces/morceaux/answers.js?v=1.41.0';
import { isUpright, portraitRect } from '../faces/morceaux/framing.js?v=1.41.0';
import { buildAuthors, checkAuthor, initialsOf } from '../books/answers.js?v=1.41.0';
import { EASY, distanceToCountry, geometry } from '../geo/geo.js?v=1.41.0';
import { generate as makeNonogram, cluesOf, isSolved } from '../nonogram/nonogram.js?v=1.41.0';
import { randomPath, PATH_LANES, PATH_STEPS, PATH_SHOW_MS, PATH_ERRORS } from './logic.js?v=1.41.0';

export const CHALLENGE_GAMES = ['affiches', 'visages', 'livres', 'geoquizz', 'chemin', 'nonogramme'];
const TRIES = 3;          // essais des défis à réponse écrite
const GEO_COUNT = 3;      // Géoquizz : 3 pays à placer…
const GEO_TOTAL_KM = 3000; // … réussi si l'écart total reste inférieur ou égal à 3 000 km
const POSTER = 'https://image.tmdb.org/t/p/w342';

// ---------------------------------------------------------------- catalogues
const V = new URL(import.meta.url).search;
const D = {};
let loading = null;

async function json(path) {
  const res = await fetch(new URL(path + V, import.meta.url));
  if (!res.ok) throw new Error(`${path} : ${res.status}`);
  return res.json();
}

const LOADERS = {
  async affiches() {
    const [films, posters] = await Promise.all([json('../movie-posters/data/films.json'), json('../movie-posters/data/posters.json')]);
    const answers = filmAnswers(films);
    return { films: new Map(films.map((f) => [f.id, f])), posters, ids: films.filter((f) => posters[f.id]?.tmdb).map((f) => f.id), answers, owners: filmOwners(answers) };
  },
  async visages() {
    const people = (await json('../faces/morceaux/data/people.json')).filter((p) => p.box?.complet && p.box.yeux && p.box.nez && p.box.bouche && isUpright(p));
    const answers = faceAnswers(people);
    return { people: new Map(people.map((p) => [p.id, p])), ids: people.map((p) => p.id), answers, owners: faceOwners(answers) };
  },
  async livres() {
    const { authors, books } = await json('../books/data/livres.json');
    return { authors: new Map(authors.map((a) => [a.id, a])), books: new Map(books.map((b) => [b.id, b])), ids: books.map((b) => b.id), index: buildAuthors(authors) };
  },
  async geoquizz() {
    const world = await json('../geo/data/world.json');
    return { world, countries: new Map(world.countries.map((c) => [c.c, c])), ids: world.countries.filter((c) => EASY.has(c.c)).map((c) => c.c) };
  },
};

/** Charge tous les catalogues (une seule fois). Un catalogue indisponible est simplement ignoré. */
export function loadCatalogs() {
  loading ||= Promise.all(Object.entries(LOADERS).map(async ([k, f]) => {
    try { D[k] = await f(); } catch (e) { console.warn('Catalogue indisponible :', k, e); }
  }));
  return loading;
}

const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Tire un défi pour la case d'un jeu (chez l'arbitre). null si son catalogue n'est pas chargé. */
export function pick(game, used = [], rnd = Math.random) {
  if (game === 'chemin') return { path: randomPath(rnd) };
  if (game === 'nonogramme') return { sol: makeNonogram(5, rnd).grid.join('') };
  const d = D[game];
  if (!d?.ids?.length) return null;
  const fresh = d.ids.filter((id) => !used.includes(id));
  const pool = fresh.length ? fresh : d.ids;
  const id = pool[Math.floor(rnd() * pool.length)];
  if (game === 'visages') return { id, bands: shuffle(['yeux', 'nez', 'bouche'], rnd) };
  if (game === 'geoquizz') { // plusieurs pays différents
    const ids = shuffle(pool.length >= GEO_COUNT ? pool : d.ids, rnd).slice(0, GEO_COUNT);
    return { id: ids[0], ids };
  }
  return { id };
}

/** Réponse à afficher à la fin d'un défi. */
export function answerOf(ch) {
  const id = ch?.p?.id;
  if (ch?.game === 'affiches') return D.affiches?.films.get(id)?.title;
  if (ch?.game === 'visages') return D.visages?.people.get(id)?.name;
  if (ch?.game === 'livres') { const b = D.livres?.books.get(id); return b && D.livres.authors.get(b.author)?.name; }
  if (ch?.game === 'geoquizz') return null; // le bandeau donne l'écart total (voir summary du défi)
  return null;
}

// ---------------------------------------------------------------- montage d'un défi
/**
 * el    : conteneur
 * ch    : défi ({ id, game, p, startAt, deadline })
 * ctx   : { active, L, now() (heure de l'arbitre), send(L), finish(ok, L), meta: { title, icon, accent }, team: { name, color } }
 * → { update(L), reveal(ok), tick(), destroy() }
 */
export async function mountChallenge(el, ch, ctx) {
  await loadCatalogs();
  const meta = ctx.meta || {};
  const bar = h('span.zz-ch-time-bar');
  const head = h('header.zz-ch-head', { style: `--game: ${meta.accent || '#e8b04a'}` },
    h('span.zz-ch-icon', icon(meta.icon || 'dice')),
    h('span.zz-ch-title', h('strong', meta.title || ''), h('small', h('i.zz-dot', { style: `background: ${ctx.team?.color}` }), ctx.team?.name || '',
      ch.final ? h('b.zz-final', ` · Arrivée ${ch.final.k + 1}/${ch.final.n}`) : null)),
    ctx.active ? h('button.zz-skip', { type: 'button', onclick: () => giveUp() }, 'Passer') : h('span.zz-live', 'En direct'),
    h('span.zz-ch-time', bar)
  );
  const body = h('div.zz-ch-body');
  const foot = h('div.zz-ch-foot');
  const banner = h('div.zz-ch-banner', { hidden: true });
  const root = h('section.zz-ch', { class: `zz-ch zz-ch--${ch.game}`, style: `--game: ${meta.accent || '#e8b04a'}` }, head, body, foot, banner);
  el.replaceChildren(root);

  let done = false;
  const api = {
    active: ctx.active,
    now: ctx.now,
    ch,
    send: (L) => { if (!done && ctx.active) ctx.send(L); },
    finish: (ok, L) => { if (done || !ctx.active) return; done = true; ctx.finish(ok, L); },
    get done() { return done; },
  };
  const make = KINDS[ch.game] || KINDS.chemin;
  const ctl = make(body, foot, ch, api, ctx.L || null);
  // « Passer » : on ne sait pas, le défi compte comme raté (l'équipe reste sur la case)
  function giveUp() { if (api.done) return; if (ctl.timeout) ctl.timeout(); else api.finish(false, null); }

  let revealed = false;
  return {
    update(L) { if (!ctx.active && L && !revealed) ctl.update(L); },
    reveal(ok, L) {
      if (revealed) return;
      revealed = true; done = true;
      if (L && !ctx.active) ctl.update(L);
      ctl.reveal?.(ok);
      const ans = answerOf(ch);
      const sum = ctl.summary?.();
      banner.replaceChildren(...[h('strong', ok ? 'Réussi !' : 'Raté !'), sum ? h('span', sum) : ans ? h('span', ok ? ans : `C’était ${ans}`) : null].filter(Boolean));
      banner.className = 'zz-ch-banner ' + (ok ? 'is-ok' : 'is-ko');
      banner.hidden = false;
      root.classList.add('is-over');
    },
    tick() {
      const left = Math.max(0, ch.deadline - ctx.now());
      bar.style.transform = `scaleX(${Math.min(1, left / Math.max(1, ch.deadline - ch.startAt))})`;
      bar.classList.toggle('is-low', left < 8000);
      ctl.tick?.();
      if (!left && !revealed) ctl.timeout?.();
    },
    destroy() { ctl.destroy?.(); },
  };
}

// ---------------------------------------------------------------- éléments communs
/** Tranches yeux / nez / bouche d'un visage, en hauteur normalisée de la photo : { yeux: [haut, bas], nez, bouche }. */
export function faceZones(box) {
  const mid = (b) => b[1] + b[3] / 2;
  const c = box.complet, top = c[1], bottom = c[1] + c[3];
  const ye = mid(box.yeux), yn = mid(box.nez), ym = mid(box.bouche);
  const b1 = (ye + yn) / 2, b2 = (yn + ym) / 2;
  return {
    yeux: [Math.max(top, ye - (b1 - ye) * 1.3), b1],
    nez: [b1, b2],
    bouche: [b2, Math.min(bottom, ym + (ym - b2) * 1.3)],
  };
}

function dots(n, max = TRIES) {
  return h('span.zz-dots', Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'is-on' : '' })));
}

/**
 * Défi à réponse écrite (affiches, visages, livres). spec : { placeholder, media(body) → { setTries(n), reveal() }, check(text) }
 * L = { tries: [propositions fausses], typing }
 */
function textChallenge(spec) {
  return (body, foot, ch, api, L0) => {
    const st = { tries: [], typing: '', ...(L0 || {}) };
    const media = spec.media(body, ch);
    const msg = h('p.zz-msg');
    const dotsEl = h('span');
    const input = h('input.zz-input', {
      type: 'text', placeholder: spec.placeholder, autocomplete: 'off', autocapitalize: 'words', spellcheck: false,
      enterKeyHint: 'done', disabled: !api.active, 'aria-label': spec.placeholder,
      oninput: () => { st.typing = input.value; api.send({ ...st }); },
    });
    const form = h('form.zz-form', {
      onsubmit: (e) => {
        e.preventDefault();
        if (api.done) return;
        const v = input.value.trim();
        const res = spec.check.call({ id: ch.p.id }, v);
        if (!res) return;
        if (res.ok) { st.typing = v; api.finish(true, { ...st }); return; }
        if (res.near) { say(res.hint || 'Tu chauffes !', 'near'); return; } // presque juste : l'essai ne compte pas
        st.tries.push(v.slice(0, 40));
        st.typing = '';
        input.value = '';
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        refresh();
        if (st.tries.length >= TRIES) api.finish(false, { ...st });
        else api.send({ ...st });
      },
    }, input, api.active ? h('button.zz-btn.zz-btn--go', { type: 'submit' }, 'Valider') : null);
    foot.append(h('div.zz-foot-row', dotsEl, msg), form);
    function say(text, kind = 'err') { msg.textContent = text; msg.className = 'zz-msg is-' + kind; }
    function refresh() {
      dotsEl.replaceChildren(dots(st.tries.length));
      media.setTries(st.tries.length);
      const last = st.tries[st.tries.length - 1];
      if (last) say(`✗ ${last}`);
      if (!api.active) input.value = st.typing || '';
    }
    refresh();
    if (api.active) setTimeout(() => input.focus({ preventScroll: true }), 50);
    return {
      update(L) { Object.assign(st, { tries: [], typing: '' }, L); refresh(); },
      reveal(ok) { input.disabled = true; input.blur(); media.reveal(ok); },
      timeout() { api.finish(false, { ...st }); },
    };
  };
}

// ---------------------------------------------------------------- les défis
const KINDS = {
  affiches: textChallenge({
    placeholder: 'Titre du film',
    media(body, ch) {
      const d = D.affiches, f = d.films.get(ch.p.id);
      const img = h('img.zz-poster', { alt: '', draggable: false, src: POSTER + d.posters[f.id]?.tmdb });
      const frame = h('div.zz-frame', img);
      img.addEventListener('error', () => frame.append(h('p.zz-frame-alt', `${f.year} · ${f.director}`)));
      body.append(frame);
      const BLUR = [16, 10, 5];
      return {
        setTries(n) { img.style.filter = `blur(${BLUR[Math.min(n, BLUR.length - 1)]}px)`; },
        reveal() { img.style.filter = 'none'; },
      };
    },
    check(v) {
      if (!v) return null;
      return judgeFilm(v, this.id, D.affiches.answers, D.affiches.owners);
    },
  }),

  visages: textChallenge({
    placeholder: 'Qui est-ce ?',
    media(body, ch) {
      const p = D.visages.people.get(ch.p.id);
      const c = p.box.complet;
      const mk = (cls) => h('img', { class: cls, alt: '', draggable: false, src: p.img, referrerPolicy: 'no-referrer' });
      const blur = mk('zz-face zz-face--blur');
      const bands = ch.p.bands.map(() => mk('zz-face zz-face--band'));
      // Zones du visage, en tranches horizontales qui se touchent sans se chevaucher (sur toute la largeur du visage) :
      // la limite yeux / nez est à mi-chemin entre le centre des yeux et celui du nez, la limite nez / bouche
      // à mi-chemin entre le nez et la bouche. Les yeux montent d'autant au-dessus de leur centre (sourcils compris),
      // la bouche descend d'autant sous le sien (menton compris), sans sortir du cadre du visage.
      const ORDER = ['yeux', 'nez', 'bouche'];
      const zones = faceZones(p.box);
      const range = (name) => zones[name];
      // Bandes visibles : deux parties voisines sur le visage (yeux et nez, nez et bouche) sont reliées en une seule bande
      const showBands = (n) => {
        const open = ORDER.filter((name) => ch.p.bands.slice(0, n + 1).includes(name));
        const parts = [];
        open.forEach((name) => {
          const [top, bottom] = range(name);
          const last = parts[parts.length - 1];
          if (last && ORDER.indexOf(name) === last.end + 1) { last.bottom = Math.max(last.bottom, bottom); last.top = Math.min(last.top, top); last.end++; }
          else parts.push({ top, bottom, end: ORDER.indexOf(name) });
        });
        bands.forEach((img, k) => {
          const part = parts[k];
          img.hidden = !part;
          if (part) img.style.clipPath = `inset(${part.top * 100}% ${(1 - c[0] - c[2]) * 100}% ${(1 - part.bottom) * 100}% ${c[0] * 100}%)`;
        });
      };
      const credit = h('p.zz-credit', [p.by, p.lic].filter(Boolean).join(' · '));
      const frame = h('div.zz-frame', blur, bands);
      body.append(frame);
      blur.addEventListener('load', () => {
        const r = portraitRect(c, blur.naturalWidth, blur.naturalHeight);
        for (const img of [blur, ...bands]) Object.assign(img.style, { left: r.left + '%', top: r.top + '%', width: r.width + '%', height: r.height + '%' });
        frame.classList.add('is-ready');
      });
      return {
        setTries(n) { showBands(n); },
        reveal() { frame.classList.add('is-revealed'); frame.append(credit); },
      };
    },
    check(v) {
      if (!v) return null;
      return checkFace(v, D.visages.answers.get(this.id), D.visages.owners);
    },
  }),

  livres: textChallenge({
    placeholder: 'Nom de l’auteur',
    media(body, ch) {
      const d = D.livres, b = d.books.get(ch.p.id), a = d.authors.get(b.author);
      let hash = 0;
      for (const ch2 of b.id) hash = (hash * 31 + ch2.charCodeAt(0)) >>> 0;
      const who = h('p.zz-cover-author', 'Auteur ?');
      const hint = h('p.zz-cover-hint');
      const title = h('p.zz-cover-title', b.title);
      // Taille du titre en % de la largeur de la couverture : le mot le plus long tient sur une ligne,
      // et le titre entier tient dans la place disponible (lettres de Bebas Neue ≈ 0,42 de la taille)
      const longest = Math.max(...b.title.split(/\s+/).map((w) => w.length));
      title.style.fontSize = `${Math.min(16, 155 / longest, Math.sqrt(8500 / b.title.length)).toFixed(1)}cqw`;
      const cover = h('div.zz-frame.zz-cover', { style: `--hue: ${hash % 360}` }, h('div.zz-cover-in', who, title, h('p.zz-cover-year', String(b.year)), hint));
      body.append(cover);
      return {
        setTries(n) {
          hint.textContent = n >= 2 ? `Littérature ${a.from} · ${initialsOf(a.name)}` : n >= 1 ? `Littérature ${a.from}` : '';
        },
        reveal() { who.textContent = a.name; },
      };
    },
    check(v) {
      if (!v) return null;
      return checkAuthor(v, D.livres.books.get(this.id).author, D.livres.index);
    },
  }),

  geoquizz: geoChallenge,
  chemin: pathChallenge,
  nonogramme: nonogramChallenge,
};
// ---------------------------------------------------------------- Géoquizz : placer un pays
// Même carte que le jeu Géoquizz : projection de Mercator, terres et frontières, répétée à gauche et à droite.
function geoWorld() {
  const d = D.geoquizz;
  if (d.proj) return d.proj;
  const w = d.world, U = w.units, W = w.width, RAD = Math.PI / 180, S = U * 180 / Math.PI;
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + Math.max(-89, Math.min(89, lat)) * RAD / 2));
  const unmerc = (m) => (2 * Math.atan(Math.exp(m)) - Math.PI / 2) / RAD;
  const M0 = merc(w.latMax), H = (M0 - merc(w.latMin)) * S;
  const X = (lon) => (lon - w.lonMin) * U, Y = (lat) => (M0 - merc(lat)) * S;
  const latOfY = (y) => unmerc(M0 - y / S);
  const reproject = (path) => { // tracé M/l/z en équirectangulaire → Mercator
    let out = '', x = 0, y = 0, m;
    const re = /([Mlz])([^Mlz]*)/g;
    while ((m = re.exec(path))) {
      if (m[1] === 'z') { out += 'z'; continue; }
      const n = (m[2].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (m[1] === 'M' && i === 0) { x = n[0]; y = n[1]; out += 'M'; } else { x += n[i]; y += n[i + 1]; out += 'L'; }
        out += x + ' ' + Y(w.latMax - y / U).toFixed(1) + ' ';
      }
    }
    return out;
  };
  const pathOf = (c, dx = 0) => geometry(c).polys.map((poly) => poly.map((r) => 'M' + r.pts.map(([lo, la]) => (X(lo) + dx).toFixed(1) + ' ' + Y(la).toFixed(1)).join('L') + 'Z').join('')).join('');
  const grid = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((l) => `M${X(l)} 0V${H.toFixed(0)}`).join('')
    + [60, 30, 0, -30].map((l) => `M0 ${Y(l).toFixed(0)}H${W}`).join('');
  d.proj = { U, W, H, X, Y, latOfY, pathOf, grid, land: reproject(w.land), borders: w.countries.map((c) => pathOf(c)).join('') };
  return d.proj;
}

// Pays sous un point (lancer de rayon dans le plan longitude, latitude)
function countryAt(lon, lat) {
  const inRing = (pts) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  for (const c of D.geoquizz.world.countries) {
    const g = geometry(c), b = g.bbox;
    if (lon < b.minX || lon > b.maxX || lat < b.minY || lat > b.maxY) continue;
    if (g.polys.some((poly) => inRing(poly[0].pts) && !poly.slice(1).some((r) => inRing(r.pts)))) return c;
  }
  return null;
}

function geoChallenge(body, foot, ch, api, L0) {
  const P = geoWorld(), { U, W, H, X, Y } = P;
  const ids = ch.p.ids || [ch.p.id];
  const countryOf = (k) => D.geoquizz.countries.get(ids[Math.min(k, ids.length - 1)]);
  // L = { k : pays en cours, res : [{ g: point posé, n: point du pays le plus proche, km }] }
  let L = { k: 0, res: [], ...(L0 || {}) };
  const total = () => L.res.reduce((a, r) => a + r.km, 0);
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.append(...kids); return e; };
  const svg = mk('svg', { class: 'zz-map', 'shape-rendering': 'geometricPrecision' });
  const worldId = 'zz-world-' + ch.id;
  svg.append(mk('defs', {}, mk('g', { id: worldId },
    mk('path', { class: 'zz-grid', d: P.grid }),
    mk('path', { class: 'zz-land', d: P.land }),
    mk('path', { class: 'zz-borders', d: P.borders }))));
  for (const dx of [-W, 0, W]) svg.append(mk('use', { href: '#' + worldId, x: dx, y: 0 }));
  const hover = mk('path', { class: 'zz-hover', d: '' }); // pays survolé ou touché
  const marks = mk('g', {});
  svg.append(hover, marks);
  const askK = h('small'), askName = h('strong');
  const ask = h('p.zz-geo-ask', askK, askName);
  const drawAsk = () => {
    askK.textContent = ids.length > 1 ? `Place · pays ${Math.min(L.k, ids.length - 1) + 1}/${ids.length}` : 'Place';
    askName.textContent = countryOf(L.k).n;
  };
  drawAsk();
  const zoom = h('div.zz-zoom',
    h('button.zz-round', { type: 'button', 'aria-label': 'Zoomer', onclick: () => zoomBy(1.6) }, icon('plus')),
    h('button.zz-round', { type: 'button', 'aria-label': 'Dézoomer', onclick: () => zoomBy(1 / 1.6) }, icon('minus')));
  const wrap = h('div.zz-geo', svg, ask, zoom);
  body.append(wrap);
  const msg = h('p.zz-msg');
  foot.append(h('div.zz-foot-row', msg));

  // vue : centre (cx, cy) et largeur w, en unités de la carte (Mercator)
  const view = { cx: X(15), cy: Y(25), w: W };
  let startW = W;
  let size = { w: 1, h: 1 };
  function layout() {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = size.w === 1;
    size = { w: r.width, h: r.height };
    if (first) view.w = startW = Math.min(W, H * 0.8 * size.w / size.h); // vue de départ : presque toute la hauteur du monde
    apply();
  }
  const toMap = (clientX, clientY) => {
    const r = svg.getBoundingClientRect(), k = view.w / size.w, vh = view.w * size.h / size.w;
    return [view.cx - view.w / 2 + (clientX - r.left) * k, view.cy - vh / 2 + (clientY - r.top) * k];
  };
  const lonOf = (x) => ((x / U) % 360 + 360) % 360 - 180;
  function apply() {
    view.w = Math.max(W / 24, Math.min(W, view.w));
    const vh = view.w * size.h / size.w;
    view.cy = vh >= H ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, view.cy));
    view.cx = ((view.cx % W) + W) % W;
    svg.setAttribute('viewBox', `${view.cx - view.w / 2} ${view.cy - vh / 2} ${view.w} ${vh}`);
    drawMarks();
    drawHover();
  }
  function zoomBy(f, px = size.w / 2, py = size.h / 2) {
    const k = view.w / size.w, vh = view.w * size.h / size.w;
    const mx = view.cx - view.w / 2 + px * k, my = view.cy - vh / 2 + py * k;
    view.w /= f;
    const k2 = view.w / size.w, vh2 = view.w * size.h / size.w;
    view.cx = mx - px * k2 + view.w / 2;
    view.cy = my - py * k2 + vh2 / 2;
    apply();
  }
  const ro = new ResizeObserver(layout);
  ro.observe(svg);

  // gestes : glisser pour déplacer, pincer ou molette pour zoomer, toucher pour placer
  const pts = new Map();
  let moved = 0, downAt = 0, pinch = null;
  let hovered = null;
  function setHover(clientX, clientY) {
    if (api.done || locked) return;
    let c = null;
    if (clientX != null) { const [x, y] = toMap(clientX, clientY); c = countryAt(lonOf(x), P.latOfY(Math.max(0, Math.min(H, y)))); }
    if (c === hovered) return;
    hovered = c;
    drawHover();
  }
  function drawHover() {
    if (!hovered) { hover.setAttribute('d', ''); return; }
    const sx = W * Math.round((view.cx - X(0)) / W); // copie de la carte la plus proche du centre de la vue
    hover.setAttribute('d', [-W, 0, W].map((dx) => P.pathOf(hovered, sx + dx)).join(''));
  }
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setHover(null); });
  svg.addEventListener('pointerdown', (e) => {
    if (api.active && !api.done) setHover(e.clientX, e.clientY); // au doigt : le pays touché s'allume
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = 0; downAt = Date.now(); }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; }
  });
  svg.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse' && api.active && !api.done) setHover(e.clientX, e.clientY); return; }
    const k = view.w / size.w;
    if (pts.size === 1) {
      moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
      if (moved > 8) {
        view.cx -= (e.clientX - p.x) * k; view.cy -= (e.clientY - p.y) * k; apply();
        if (e.pointerType !== 'mouse') setHover(null);
      }
    }
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svg.getBoundingClientRect();
      zoomBy(dist / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = dist;
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0 && moved <= 8 && Date.now() - downAt < 700 && api.active && !api.done && !locked) place(...toMap(e.clientX, e.clientY));
  };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); moved = 99; });
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });

  let locked = L.res.length > L.k; // résultat affiché avant le pays suivant
  let nextTimer = null;
  function place(x, y) {
    const lon = lonOf(x), lat = P.latOfY(Math.max(0, Math.min(H, y)));
    const r = distanceToCountry(countryOf(L.k), lat, lon);
    L = { ...L, res: [...L.res, { g: [lat, lon], n: [r.near.lat, r.near.lon], km: r.km }] };
    locked = true;
    drawMarks();
    if (total() > GEO_TOTAL_KM) { api.finish(false, L); return; } // écart total dépassé : raté tout de suite
    if (L.res.length >= ids.length) { api.finish(true, L); return; }
    api.send(L);
    nextTimer = setTimeout(() => { // pays suivant
      L = { ...L, k: L.k + 1 };
      locked = false;
      hovered = null; drawHover();
      view.w = startW; apply();
      drawAsk(); drawMarks();
      api.send(L);
    }, 1600);
  }
  let shownFor = -1;
  function drawMarks() {
    marks.replaceChildren();
    const fmt = (km) => km.toLocaleString('fr-FR');
    const t = total();
    msg.textContent = L.res.length ? `Écart total ${fmt(t)} / ${fmt(GEO_TOTAL_KM)} km` : `Écart total max ${fmt(GEO_TOTAL_KM)} km`;
    msg.className = 'zz-msg ' + (L.res.length ? (t <= GEO_TOTAL_KM ? 'is-ok' : 'is-err') : '');
    const i = L.res.length - 1;
    if (i < 0 || i < L.k) return; // pas de résultat pour le pays en cours
    const res = L.res[i], country = countryOf(i);
    const toXY = ([lat, lon]) => [X(lon), Y(lat)];
    let [gx, gy] = toXY(res.g), [nx, ny] = toXY(res.n);
    // on dessine la copie de la carte la plus proche du centre de la vue
    const near = (x) => x + W * Math.round((view.cx - x) / W);
    const sx = near(gx) - gx;
    gx += sx; nx += sx;
    if (Math.abs(nx - gx) > W / 2) nx += nx > gx ? -W : W;
    marks.append(
      mk('path', { d: P.pathOf(country, sx), class: 'zz-country', 'fill-rule': 'evenodd' }),
      mk('line', { x1: gx, y1: gy, x2: nx, y2: ny, class: 'zz-gap' }),
      mk('circle', { cx: nx, cy: ny, r: 5 * view.w / size.w, class: 'zz-near' }),
      mk('circle', { cx: gx, cy: gy, r: 6 * view.w / size.w, class: 'zz-guess' }),
    );
    msg.textContent = `${res.km === 0 ? 'Dans le mille !' : `+${fmt(res.km)} km`} · total ${fmt(t)} / ${fmt(GEO_TOTAL_KM)} km`;
    if (shownFor !== i) { shownFor = i; focusOn(gx, gy, nx, ny); }
  }
  function focusOn(gx, gy, nx, ny) { // cadre le point posé et le pays
    view.cx = (gx + nx) / 2; view.cy = (gy + ny) / 2;
    const span = Math.max(Math.abs(gx - nx) * 1.6, Math.abs(gy - ny) * 1.6 * size.w / size.h, 30 * U);
    view.w = Math.max(view.w / 2, Math.min(view.w, span));
    apply();
  }
  return {
    update(nL) { // spectateur
      if (!nL?.res) return;
      const nextCountry = nL.k !== L.k;
      L = { k: 0, res: [], ...nL };
      if (nextCountry) { view.w = startW; apply(); drawAsk(); }
      drawMarks();
    },
    reveal() { clearTimeout(nextTimer); locked = true; },
    timeout() { api.finish(false, L); },
    summary() { const t = total(); return `Écart total ${t.toLocaleString('fr-FR')} km${t > GEO_TOTAL_KM ? ` (max ${GEO_TOTAL_KM.toLocaleString('fr-FR')})` : ''}`; },
    destroy() { ro.disconnect(); clearTimeout(nextTimer); },
  };
}

// ---------------------------------------------------------------- Le chemin : mémoriser puis retracer
function pathChallenge(body, foot, ch, api, L0) {
  const path = ch.p.path || randomPath();
  const st = { n: 0, err: 0, bad: null, ...(L0 || {}) };
  const cells = [];
  const grid = h('div.zz-path', { style: `--lanes: ${PATH_LANES}; --steps: ${PATH_STEPS}` });
  for (let s = 0; s < PATH_STEPS; s++) for (let l = 0; l < PATH_LANES; l++) {
    const c = h('button.zz-path-cell', { type: 'button', tabIndex: -1, onclick: () => tap(s, l, c) });
    if (s === 0 || s === PATH_STEPS - 1) c.classList.add('is-edge');
    cells.push(c);
    grid.append(c);
  }
  body.append(h('div.zz-path-wrap', grid));
  const dotsEl = h('span');
  const msg = h('p.zz-msg');
  foot.append(h('div.zz-foot-row', dotsEl, msg));
  const at = (s, l) => cells[s * PATH_LANES + l];
  const showing = () => api.now() < ch.startAt + PATH_SHOW_MS;
  let phase = null;

  function tap(s, l, c) {
    if (!api.active || api.done || showing()) return;
    const [es, el] = path[st.n];
    if (s === es && l === el) {
      st.n++;
      draw();
      if (st.n >= path.length) api.finish(true, { ...st });
      else api.send({ ...st });
      return;
    }
    if (path.slice(0, st.n).some(([a, b]) => a === s && b === l)) return; // case déjà trouvée
    st.err++;
    st.bad = [s, l, st.err];
    flash(c);
    draw();
    if (st.err >= PATH_ERRORS) api.finish(false, { ...st });
    else api.send({ ...st });
  }
  function flash(c) { c.classList.remove('is-bad'); void c.offsetWidth; c.classList.add('is-bad'); navigator.vibrate?.(60); }
  function draw() {
    const show = showing();
    cells.forEach((c) => c.classList.remove('is-lit', 'is-found'));
    path.forEach(([s, l], i) => {
      if (show) at(s, l).classList.add('is-lit');
      else if (i < st.n) at(s, l).classList.add('is-found');
    });
    dotsEl.replaceChildren(dots(st.err, PATH_ERRORS));
    const p = show ? 'show' : 'play';
    if (p !== phase) {
      phase = p;
      msg.textContent = show ? 'Mémorise !' : api.active ? 'À toi !' : '';
      msg.className = 'zz-msg';
      grid.classList.toggle('is-show', show);
    }
  }
  draw();
  let lastBad = st.bad?.[2] || 0;
  return {
    update(L) {
      Object.assign(st, L);
      if (st.bad && st.bad[2] !== lastBad) { lastBad = st.bad[2]; flash(at(st.bad[0], st.bad[1])); }
      draw();
    },
    tick() { if ((showing() ? 'show' : 'play') !== phase) draw(); },
    reveal(ok) { if (!ok) path.forEach(([s, l], i) => { if (i >= st.n) at(s, l).classList.add('is-missed'); }); },
    timeout() { api.finish(false, { ...st }); },
  };
}

// ---------------------------------------------------------------- Nonogramme 5 × 5
function nonogramChallenge(body, foot, ch, api, L0) {
  const N = 5;
  const sol = String(ch.p.sol || '').split('').map(Number);
  const clues = cluesOf(sol, N);
  let cells = (L0?.c || '0'.repeat(N * N)).split('').map(Number);
  const els = [];
  const table = h('div.zz-nono', { style: `--n: ${N}` });
  table.append(h('span.zz-nono-corner'));
  clues.cols.forEach((c) => table.append(h('span.zz-nono-clue.is-col', c.map((x) => h('b', String(x))))));
  for (let r = 0; r < N; r++) {
    table.append(h('span.zz-nono-clue.is-row', clues.rows[r].map((x) => h('b', String(x)))));
    for (let c = 0; c < N; c++) {
      const i = r * N + c;
      const el = h('span.zz-nono-cell', { 'data-i': i });
      els.push(el);
      table.append(el);
    }
  }
  body.append(h('div.zz-nono-wrap', table));
  // toucher noircit (ou efface) ; glisser étend le même geste aux cases survolées
  let paint = null;
  table.addEventListener('pointerdown', (e) => {
    const i = idx(e); if (i == null || !api.active || api.done) return;
    e.preventDefault();
    table.setPointerCapture(e.pointerId);
    paint = cells[i] ? 0 : 1;
    set(i);
  });
  table.addEventListener('pointermove', (e) => {
    if (paint == null) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const i = t?.dataset?.i;
    if (i != null) set(Number(i));
  });
  const end = () => { if (paint == null) return; paint = null; if (isSolved(cells, N, clues)) api.finish(true, { c: cells.join('') }); };
  table.addEventListener('pointerup', end);
  table.addEventListener('pointercancel', end);
  function idx(e) { const i = e.target?.dataset?.i; return i == null ? null : Number(i); }
  function set(i) {
    if (cells[i] === paint) return;
    cells[i] = paint;
    draw();
    api.send({ c: cells.join('') });
  }
  function draw() { els.forEach((el, i) => el.classList.toggle('is-on', cells[i] === 1)); }
  draw();
  return {
    update(L) { if (L?.c) { cells = L.c.split('').map(Number); draw(); } },
    reveal(ok) { if (!ok) els.forEach((el, i) => el.classList.toggle('is-sol', sol[i] === 1 && cells[i] !== 1)); table.classList.add('is-over'); },
    timeout() { api.finish(false, { c: cells.join('') }); },
  };
}
