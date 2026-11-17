// Jeu « Portrait-robot » : un témoin décrit quelqu'un (physique ou caractère), on compose le portrait
// pièce par pièce (tête, cheveux, yeux, nez, accessoires…), puis on le montre au témoin, qui dit s'il ressemble.
// Demande de Yoann (17 novembre 2026).
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (portrait) | ['album'] | ['album', id] | ['reglages']

import { h, icon } from '../../js/core/dom.js?v=1.59.0';
import { createStore } from '../../js/core/storage.js?v=1.59.0';
import {
  CATEGORIES, DEFAULT_FACE, cleanFace, choose, isChosen, randomFace, renderFace, scoreFace, checkText, reaction, quips,
} from './parts.js?v=1.59.0';

const store = createStore('robot', { version: 1 });
const ALBUM_MAX = 60;
const CUSTOM_MAX = 400;

let seq = 0;
/** Chaîne SVG (construite par parts.js à partir de constantes) → élément. */
function svg(str) {
  const doc = new DOMParser().parseFromString(str, 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  el.setAttribute('aria-hidden', 'true');
  return el;
}
const portrait = (face, opts = {}) => svg(renderFace(face, { uid: `pr${++seq}`, ...opts }));

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('pr');
  container.replaceChildren(h('div.loading', 'Le témoin arrive…'));

  const url = (p) => new URL(p + new URL(import.meta.url).search, import.meta.url);
  const res = await fetch(url('./data/temoins.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`temoins.json : ${res.status}`);
  const witnesses = await res.json();
  const byId = new Map(witnesses.map((w, i) => [w.id, { ...w, n: i + 1 }]));

  // Portrait en cours : { wid | null, text (description écrite par les joueurs), face, stage, cat, hidden, albumId }
  let cur = store.get('cur', null);
  if (cur && cur.wid && !byId.has(cur.wid)) cur = null;
  if (cur) cur.face = cleanFace(cur.face);
  let writing = false; // champ « Écrire ma description » ouvert

  const save = () => store.set('cur', cur);
  const witnessOf = (c) => (c?.wid ? byId.get(c.wid) : null);
  const textOf = (c) => witnessOf(c)?.text || c?.text || '';

  function pickWitness(exclude) {
    let seen = new Set(store.get('seen', []));
    let pool = witnesses.filter((w) => !seen.has(w.id) && w.id !== exclude);
    if (!pool.length) { seen = new Set(); pool = witnesses.filter((w) => w.id !== exclude); }
    const w = pool[Math.floor(Math.random() * pool.length)];
    seen.add(w.id);
    store.set('seen', [...seen]);
    return w.id;
  }
  function newCase({ text, exclude } = {}) {
    cur = { wid: text ? null : pickWitness(exclude), text: text || '', face: cleanFace(DEFAULT_FACE), stage: 'intro', cat: 0, hidden: false, albumId: null };
    writing = false;
    save();
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back, extra = [] } = {}) {
    return h('header.pr-bar',
      h('button.pr-icon-btn', { type: 'button', title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.pr-title', titleText),
      ...extra,
      h('button.pr-icon-btn', { type: 'button', title: 'Album des portraits', 'aria-label': 'Album des portraits', onclick: () => ctx.navigate('album') }, icon('grid')),
      h('button.pr-icon-btn', { type: 'button', title: 'Règles et réglages', 'aria-label': 'Règles et réglages', onclick: () => ctx.navigate('reglages') }, icon('settings')));
  }

  // ---------------------------------------------------------------- vue : déposition du témoin
  function renderIntro() {
    container.classList.add('is-play');
    const w = witnessOf(cur);
    const field = h('textarea.pr-textarea', {
      maxLength: CUSTOM_MAX, rows: 4, placeholder: 'Ex. : « Il a une tête à vendre des voitures d’occasion, et il porte toujours un bob. »',
      'aria-label': 'Description du témoin',
    });
    const startCustom = () => {
      const text = field.value.trim().replace(/\s+/g, ' ').slice(0, CUSTOM_MAX);
      if (!text) { field.focus(); return; }
      newCase({ text });
      cur.stage = 'draw';
      save();
      renderPlay();
    };
    container.replaceChildren(
      topBar('Portrait-robot'),
      h('section.pr-intro',
        h('article.pr-depo-big',
          h('p.pr-kicker', w ? `Déposition n° ${w.n}` : 'Déposition de vos amis'),
          h('blockquote.pr-quote', `« ${textOf(cur)} »`),
          h('p.pr-small', 'Compose le portrait du suspect pièce par pièce, au plus près de la description… ou complètement farfelu.')),
        h('div.pr-intro-actions',
          h('button.pr-btn.pr-btn-primary.pr-wide', { type: 'button', onclick: () => { cur.stage = 'draw'; save(); renderPlay(); } }, icon('sparkles'), 'Dessiner le portrait'),
          h('div.pr-row',
            h('button.pr-btn', { type: 'button', onclick: () => { newCase({ exclude: cur.wid }); renderPlay(); } }, icon('dice'), 'Autre témoin'),
            h('button.pr-btn', { type: 'button', 'aria-expanded': String(writing), onclick: () => { writing = !writing; renderPlay(); } }, 'Ma description')),
          writing ? h('div.pr-write',
            field,
            h('button.pr-btn.pr-btn-primary.pr-wide', { type: 'button', onclick: startCustom }, 'Dessiner d’après cette description')) : null,
          h('p.pr-tip', 'À plusieurs : l’un lit la déposition à voix haute, l’autre dessine sans la voir.'))));
    if (writing) field.focus();
  }

  // ---------------------------------------------------------------- vue : composition du portrait
  function renderDraw() {
    container.classList.add('is-play');
    const cat = () => CATEGORIES[cur.cat] || CATEGORIES[0];

    const frame = h('div.pr-frame', portrait(cur.face));
    const chips = h('div.pr-chips', { role: 'tablist', 'aria-label': 'Parties du visage' });
    const opts = h('div.pr-opts', { role: 'group' });

    const depoText = textOf(cur);
    const depo = h('button.pr-depo', {
      type: 'button', 'aria-expanded': String(!cur.hidden),
      title: cur.hidden ? 'Afficher la déposition' : 'Cacher la déposition',
      onclick: () => { cur.hidden = !cur.hidden; save(); renderDraw(); },
    },
    h('span.pr-depo-label', 'Le témoin'),
    cur.hidden ? h('span.pr-depo-hidden', 'Déposition cachée · touche pour la lire') : h('span.pr-depo-text', `« ${depoText} »`));

    function drawChips() {
      chips.replaceChildren(...CATEGORIES.map((c, i) => h('button.pr-chip', {
        type: 'button', role: 'tab', 'aria-selected': String(i === cur.cat), class: `pr-chip${i === cur.cat ? ' on' : ''}`,
        onclick: () => setCat(i),
      }, c.short || c.label)));
      const on = chips.children[cur.cat];
      if (on) chips.scrollLeft = on.offsetLeft - chips.clientWidth / 2 + on.clientWidth / 2;
    }
    function drawOpts() {
      const c = cat();
      const left = opts.scrollLeft, top = opts.scrollTop;
      opts.setAttribute('aria-label', c.label);
      opts.replaceChildren(...c.options.map(([id, label]) => {
        const chosen = isChosen(cur.face, c.id, id);
        const preview = chosen ? cur.face : choose(cur.face, c.id, id);
        return h('button', {
          type: 'button', class: `pr-opt${chosen ? ' on' : ''}`, 'aria-pressed': String(chosen),
          onclick: () => pick(c.id, id),
        }, h('span.pr-thumb', portrait(preview, { view: c.view, fit: 'meet' })), h('span.pr-opt-label', label));
      }));
      opts.scrollLeft = left;
      opts.scrollTop = top;
    }
    function setCat(i) {
      cur.cat = (i + CATEGORIES.length) % CATEGORIES.length;
      save();
      opts.scrollLeft = 0;
      opts.scrollTop = 0;
      drawChips();
      drawOpts();
      label.textContent = `${cur.cat + 1} / ${CATEGORIES.length} · ${cat().label}${cat().multi ? ' (plusieurs choix)' : ''}`;
    }
    function pick(catId, id) {
      cur.face = choose(cur.face, catId, id);
      save();
      frame.replaceChildren(portrait(cur.face));
      drawOpts();
    }
    const randomize = () => { cur.face = randomFace(); save(); frame.replaceChildren(portrait(cur.face)); drawOpts(); };

    const label = h('p.pr-catlabel', { 'aria-live': 'polite' });
    container.replaceChildren(
      topBar('Portrait-robot', {
        back: () => { cur.stage = 'intro'; save(); renderPlay(); },
        extra: [h('button.pr-icon-btn', { type: 'button', title: 'Visage au hasard', 'aria-label': 'Visage au hasard', onclick: randomize }, icon('dice'))],
      }),
      h('section.pr-draw',
        depo,
        h('div.pr-framebox', frame),
        h('div.pr-panel',
          h('div.pr-cats',
            h('button.pr-arrow', { type: 'button', title: 'Partie précédente', 'aria-label': 'Partie précédente', onclick: () => setCat(cur.cat - 1) }, icon('prev')),
            chips,
            h('button.pr-arrow', { type: 'button', title: 'Partie suivante', 'aria-label': 'Partie suivante', onclick: () => setCat(cur.cat + 1) }, icon('next'))),
          label,
          opts,
          h('button.pr-btn.pr-btn-primary.pr-wide.pr-show', { type: 'button', onclick: reveal }, 'Montrer au témoin'))));
    setCat(cur.cat);
  }

  function reveal() {
    const w = witnessOf(cur);
    const { pct } = scoreFace(cur.face, w?.want);
    const album = store.get('album', []);
    const entry = { id: cur.albumId || Date.now().toString(36), wid: cur.wid, text: cur.wid ? '' : cur.text, face: cur.face, pct, date: new Date().toISOString().slice(0, 10) };
    const i = album.findIndex((e) => e.id === entry.id);
    if (i >= 0) album.splice(i, 1);
    album.unshift(entry);
    store.set('album', album.slice(0, ALBUM_MAX));
    if (!cur.albumId) store.set('made', store.get('made', 0) + 1);
    cur.albumId = entry.id;
    cur.stage = 'reveal';
    save();
    renderPlay();
  }

  // ---------------------------------------------------------------- vue : le témoin regarde le portrait
  function verdictCard(face, wid, text) {
    const w = wid ? byId.get(wid) : null;
    if (!w) {
      return h('div.pr-verdict',
        h('p.pr-kicker', 'Le témoin regarde le portrait…'),
        h('p.pr-reaction', 'À vous de juger : ça ressemble ?'),
        h('blockquote.pr-quote-small', `« ${text} »`));
    }
    const { checks, pct } = scoreFace(face, w.want);
    const extra = quips(face, w.want);
    return h('div.pr-verdict',
      h('p.pr-kicker', 'Le témoin regarde le portrait…'),
      h('p.pr-reaction', reaction(pct)),
      extra.length ? h('p.pr-quips', extra.join(' ')) : null,
      h('p.pr-pct', h('strong', `${pct} %`), ' de ressemblance'),
      h('ul.pr-checks', checks.map((c) => h('li', { class: c.ok ? 'ok' : 'ko' }, h('span.pr-mark', c.ok ? '✓' : '✗'), checkText(c)))),
      h('blockquote.pr-quote-small', `« ${w.text} »`));
  }

  function renderReveal() {
    container.classList.add('is-play');
    container.replaceChildren(
      topBar('Portrait-robot', { back: () => { cur.stage = 'draw'; save(); renderPlay(); } }),
      h('section.pr-reveal',
        h('div.pr-framebox', h('div.pr-frame', portrait(cur.face))),
        h('div.pr-side',
          verdictCard(cur.face, cur.wid, cur.text),
          h('div.pr-row',
            h('button.pr-btn', { type: 'button', onclick: () => { cur.stage = 'draw'; save(); renderPlay(); } }, 'Retoucher'),
            h('button.pr-btn', { type: 'button', onclick: (e) => exportImage(cur.face, e.currentTarget) }, icon('share'), 'Image')),
          h('button.pr-btn.pr-btn-primary.pr-wide', { type: 'button', onclick: () => { newCase({ exclude: cur.wid }); renderPlay(); } }, 'Nouveau témoin'))));
    container.querySelector('.pr-btn-primary')?.focus();
  }

  function renderPlay() {
    if (!cur) newCase();
    if (cur.stage === 'draw') renderDraw();
    else if (cur.stage === 'reveal') renderReveal();
    else renderIntro();
  }

  // ---------------------------------------------------------------- vue : album
  function renderAlbum(openId) {
    container.classList.remove('is-play');
    const album = store.get('album', []);
    const entry = openId && album.find((e) => e.id === openId);
    if (entry) {
      container.classList.add('is-play');
      const face = cleanFace(entry.face);
      let armed = false;
      const del = h('button.pr-btn.pr-btn-danger', { type: 'button', onclick: () => {
        if (!armed) { armed = true; del.textContent = 'Confirmer'; setTimeout(() => { armed = false; del.textContent = 'Supprimer'; }, 3500); return; }
        store.set('album', store.get('album', []).filter((e) => e.id !== entry.id));
        ctx.navigate('album');
      } }, 'Supprimer');
      container.replaceChildren(
        topBar('Album', { back: () => ctx.navigate('album') }),
        h('section.pr-reveal',
          h('div.pr-framebox', h('div.pr-frame', portrait(face))),
          h('div.pr-side',
            verdictCard(face, entry.wid, entry.text),
            h('div.pr-row',
              h('button.pr-btn', { type: 'button', onclick: (e) => exportImage(face, e.currentTarget) }, icon('share'), 'Image'),
              del))));
      return;
    }
    container.replaceChildren(
      topBar('Album', { back: () => ctx.navigate() }),
      h('section.pr-album',
        h('p.pr-small', album.length
          ? `${album.length} portrait${album.length > 1 ? 's' : ''} (les ${ALBUM_MAX} derniers sont gardés sur cet appareil).`
          : 'Aucun portrait pour l’instant : ils s’ajoutent ici quand tu les montres au témoin.'),
        h('div.pr-grid', album.map((e) => {
          const w = e.wid ? byId.get(e.wid) : null;
          return h('button.pr-card', { type: 'button', onclick: () => ctx.navigate('album', e.id), title: w?.text || e.text },
            h('span.pr-card-img', portrait(cleanFace(e.face))),
            h('span.pr-card-text', w ? `n° ${w.n}` : 'Description libre', e.pct != null ? h('b', ` · ${e.pct} %`) : null));
        }))));
  }

  // ---------------------------------------------------------------- vue : règles et réglages
  function renderSettings() {
    container.classList.remove('is-play');
    const twoClicks = (labelText, confirm, done, action) => {
      let armed = false;
      const b = h('button.pr-btn.pr-btn-danger', { type: 'button', onclick: () => {
        if (!armed) { armed = true; b.textContent = confirm; setTimeout(() => { if (armed && !b.disabled) { armed = false; b.textContent = labelText; } }, 4000); return; }
        action();
        b.textContent = done;
        b.disabled = true;
      } }, labelText);
      return b;
    };
    const seen = store.get('seen', []).length;
    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.pr-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.pr-small', 'Un témoin décrit le suspect : parfois son physique, parfois juste son genre (« une tête à jouer à la pétanque »). Choisis la tête, le teint, les cheveux, les yeux, le nez, la bouche, les oreilles, la barbe, les signes particuliers, les lunettes, le chapeau, les bijoux et la tenue. Puis montre le portrait au témoin : il dit à combien de pour cent il ressemble.'),
          h('p.pr-small', 'Avec « Écrire la description », c’est vous qui décrivez quelqu’un, et vous qui jugez la ressemblance. Le dé fait un visage au hasard.')),
        h('fieldset', h('legend', 'Témoins'),
          h('p.pr-small', `${witnesses.length} témoins, ${Math.min(seen, witnesses.length)} déjà entendus. Ceux qu’on n’a pas encore entendus passent d’abord.`),
          twoClicks('Réentendre tous les témoins', 'Confirmer', '✓ C’est noté', () => store.remove('seen'))),
        h('fieldset', h('legend', 'Album'),
          h('p.pr-small', `${store.get('album', []).length} portraits dans l’album, ${store.get('made', 0)} portraits faits en tout.`),
          twoClicks('Vider l’album', 'Confirmer : tout effacer', '✓ Album vidé', () => { store.remove('album'); if (cur) cur.albumId = null; save(); })),
        h('p.pr-version', `Little Games · version ${ctx.version || '?'}`)));
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view, id] = path || [];
    if (view === 'reglages') renderSettings();
    else if (view === 'album') renderAlbum(id);
    else renderPlay();
    window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() { container.classList.remove('pr', 'is-play'); },
  };
}

/** Enregistre le portrait en image PNG (partage natif si possible, sinon téléchargement). */
async function exportImage(face, btn) {
  const old = btn?.textContent;
  try {
    const str = renderFace(face, { uid: 'png', size: [600, 900] });
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    canvas.getContext('2d').drawImage(img, 0, 0, 600, 900);
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
    const file = new File([blob], 'portrait-robot.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Portrait-robot' }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    const href = URL.createObjectURL(blob);
    const a = h('a', { href, download: 'portrait-robot.png' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  } catch {
    if (btn) { btn.textContent = 'Image impossible'; setTimeout(() => { btn.replaceChildren(icon('share'), old); }, 2500); }
  }
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
