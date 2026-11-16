// Jeu « Pionnières » : découvrir des femmes célèbres ou oubliées de l'histoire.
// On voit son portrait, son nom et ses dates ; on devine son accomplissement principal parmi 4 réponses visibles.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : sous-chemin de l'URL (['femme', id] | ['galerie'] | ['reglages'] | [])

import { h, icon } from '../../js/core/dom.js?v=1.46.0';
import { createStore } from '../../js/core/storage.js?v=1.46.0';
import { DOMAINS, optionsFor, correctIndex, playOrder, lifespan, initials } from './quiz.js?v=1.46.0';

const store = createStore('pionnieres', { version: 1 });
const DEFAULT_SETTINGS = { order: 'random' };
const LETTERS = ['A', 'B', 'C', 'D'];
const REVEAL_MS = 900; // bonne et mauvaise réponse en couleur, avant l'explication
const SOURCES = [
  ['Savanturières. Une histoire naturelle au féminin', 'Muséum national d’Histoire naturelle, 2025'],
  ['AWARE', 'Archives of Women Artists, Research and Exhibitions'],
  ['Les femmes de l’histoire', 'compte Instagram @lesfemmes_delhistoire'],
  ['Parcours de pionnières', 'compte Instagram @parcoursdepionnieres'],
];

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('pn');
  container.replaceChildren(h('div.loading', 'Chargement des pionnières…'));

  const url = (p) => new URL(p + new URL(import.meta.url).search, import.meta.url);
  const res = await fetch(url('./data/femmes.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`femmes.json : ${res.status}`);
  const women = await res.json();
  let photos = {};
  try {
    const r = await fetch(url('./data/photos.json'), { cache: 'no-cache' });
    if (r.ok) photos = await r.json();
  } catch { /* sans photos : portraits dessinés */ }
  const byId = new Map(women.map((w) => [w.id, w]));

  let settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  let answers = store.get('answers', {}); // id → { pick, ok, at }
  let seed = store.get('seed', null) ?? reseed();
  let order = computeOrder();
  let currentId = store.get('current', null);
  if (!byId.has(currentId)) currentId = order.find((id) => !answers[id]) || order[0];
  let cleanup = [];

  function reseed() {
    const s = Math.floor(Math.random() * 2 ** 31);
    store.set('seed', s);
    return s;
  }
  function computeOrder() {
    if (settings.order === 'chrono') return [...women].sort((a, b) => a.born - b.born || a.name.localeCompare(b.name, 'fr')).map((w) => w.id);
    return playOrder(women, seed);
  }
  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    store.set('settings', settings);
  }
  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    cleanup.push(() => clearTimeout(t));
  }
  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }
  const stats = () => {
    const list = Object.entries(answers).filter(([id]) => byId.has(id));
    return { played: list.length, good: list.filter(([, a]) => a.ok).length };
  };

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    const { played, good } = stats();
    return h('header.pn-bar',
      h('button.pn-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.pn-title', titleText),
      h('span.pn-score', { title: 'Bonnes réponses / femmes découvertes' }, h('strong', good), ` / ${played}`),
      h('button.pn-icon-btn', { title: 'Galerie', 'aria-label': 'Galerie', onclick: () => ctx.navigate('galerie') }, icon('grid')),
      h('button.pn-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- portrait
  // Photo (Wikimedia Commons, via scripts/fetch-pionnieres-photos.mjs) ou, sans photo, portrait dessiné.
  function portrait(w, { caption = true } = {}) {
    const dom = DOMAINS[w.domain] || DOMAINS.sci;
    const el = h('div.pn-portrait', { style: `--pn-hue: ${dom.hue}` },
      h('div.pn-drawn', { 'aria-hidden': 'true' },
        h('span.pn-drawn-initials', initials(w.name)),
        h('span.pn-drawn-icon', icon('venus'))
      )
    );
    const ph = photos[w.id];
    if (ph?.img) {
      const img = h('img.pn-photo', { src: ph.img, alt: `Portrait de ${w.name}`, loading: 'lazy', decoding: 'async', draggable: false, referrerPolicy: 'no-referrer' });
      img.addEventListener('load', () => el.classList.add('has-photo'));
      img.addEventListener('error', () => img.remove());
      el.append(img);
    }
    if (caption) {
      el.append(h('div.pn-caption',
        h('strong.pn-name', w.name),
        h('span.pn-life', `${lifespan(w)} · ${w.from}`)
      ));
    }
    return el;
  }
  const creditOf = (w) => {
    const ph = photos[w.id];
    return ph?.img ? [ph.by, ph.lic].filter(Boolean).join(' · ') : '';
  };

  // ---------------------------------------------------------------- vue : jeu
  function renderPlay(id) {
    resetView();
    container.classList.add('is-play');
    if (id && byId.has(id)) currentId = id;
    store.set('current', currentId);
    const w = byId.get(currentId);
    const idx = order.indexOf(currentId);
    const go = (delta) => ctx.navigate('femme', order[(idx + delta + order.length) % order.length]);
    const options = optionsFor(w, seed);
    const good = correctIndex(options);
    const done = answers[w.id];

    const announce = h('p.pn-sr', { role: 'status', 'aria-live': 'polite' });
    const buttons = options.map((o, i) => h('button.pn-choice', {
      type: 'button', 'aria-label': `${LETTERS[i]}. ${o.text}`, onclick: () => choose(i),
    }, h('span.pn-letter', LETTERS[i]), h('span.pn-choice-text', o.text)));
    const choices = h('div.pn-choices', { role: 'group', 'aria-label': 'Réponses' }, buttons);
    const area = h('div.pn-area', choices);
    const hint = h('p.pn-hint', 'Qu’a-t-elle accompli ? Une seule réponse : choisis bien !');
    const row = h('div.pn-row', hint);

    function panel(a) {
      const picked = options[a.pick];
      const credit = creditOf(w);
      const next = h('button.pn-btn.pn-btn-primary', { type: 'button', onclick: () => go(1) }, 'Suivante', icon('next'));
      row.replaceChildren(next);
      later(() => next.focus({ preventScroll: true }), 60);
      return h('div.pn-reveal', { class: `pn-reveal ${a.ok ? 'is-ok' : 'is-ko'}` },
        h('p.pn-verdict', a.ok ? [icon('check'), ' Bravo !'] : 'Raté !'),
        h('p.pn-answer', options[good].text),
        h('p.pn-fact', w.fact),
        !a.ok && picked ? h('p.pn-picked', h('span', 'Ta réponse : '), picked.text) : null,
        credit ? h('p.pn-credit', `Photo : ${credit}`) : null
      );
    }

    function choose(i) {
      if (answers[w.id]) return;
      const a = { pick: i, ok: i === good, at: Date.now() };
      answers[w.id] = a;
      store.set('answers', answers);
      buttons.forEach((b, k) => {
        b.disabled = true;
        b.classList.toggle('is-good', k === good);
        b.classList.toggle('is-bad', k === i && i !== good);
        b.classList.toggle('is-picked', k === i);
      });
      stage.classList.add(a.ok ? 'is-ok' : 'is-ko');
      announce.textContent = `${a.ok ? 'Bravo !' : 'Raté.'} ${w.name} : ${options[good].text}.`;
      bar.replaceWith((bar = topBar('Pionnières')));
      later(() => { area.replaceChildren(panel(a)); }, REVEAL_MS);
    }

    const stage = h('section.pn-stage', { class: `pn-stage${done ? (done.ok ? ' is-ok' : ' is-ko') : ''}` },
      h('div.pn-meta',
        h('span.pn-counter', `${idx + 1} / ${order.length}`),
        h('span.pn-domain', { style: `--pn-hue: ${(DOMAINS[w.domain] || DOMAINS.sci).hue}` }, (DOMAINS[w.domain] || DOMAINS.sci).label)
      ),
      h('div.pn-portrait-row',
        h('button.pn-nav', { 'aria-label': 'Précédente', title: 'Précédente (←)', onclick: () => go(-1) }, icon('prev')),
        h('div.pn-portrait-box', portrait(w)),
        h('button.pn-nav', { 'aria-label': 'Suivante', title: 'Suivante (→)', onclick: () => go(1) }, icon('next'))
      ),
      area,
      row
    );
    if (done) area.replaceChildren(panel(done));

    let bar = topBar('Pionnières');
    container.replaceChildren(bar, stage, announce);

    onKey((e) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
      if (answers[w.id]) return;
      const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
      if (k != null) { e.preventDefault(); choose(k); }
    });
  }

  // ---------------------------------------------------------------- vue : galerie
  function renderGallery() {
    resetView();
    container.classList.remove('is-play');
    const cards = order.map((id, i) => {
      const w = byId.get(id);
      const a = answers[id];
      return h('button.pn-gcard', {
        class: `pn-gcard${a ? (a.ok ? ' is-ok' : ' is-ko') : ''}${id === currentId ? ' is-current' : ''}`,
        type: 'button', title: w.name, onclick: () => ctx.navigate('femme', id),
      },
        portrait(w, { caption: false }),
        h('span.pn-gnum', i + 1),
        a ? h('span.pn-gmark', a.ok ? '✓' : '✗') : null,
        h('span.pn-gname', w.name)
      );
    });
    const credited = women.filter((w) => creditOf(w)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const { played, good } = stats();
    container.replaceChildren(
      topBar('Galerie', { back: () => ctx.navigate('femme', currentId) }),
      h('div.pn-grid-head', h('p', h('strong', played), ` découverte${played > 1 ? 's' : ''} sur ${women.length} · ${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}`)),
      h('div.pn-grid', cards),
      credited.length ? h('details.pn-credits',
        h('summary', 'Crédits photo'),
        h('ul', credited.map((w) => h('li', h('strong', w.name), ` : ${creditOf(w)}`)))
      ) : null
    );
    const el = container.querySelector('.pn-gcard.is-current');
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'center' }));
    else window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    const radio = (name, value, label, desc) => h('label.pn-option',
      h('input', { type: 'radio', name, value, checked: settings[name] === value, onchange: () => {
        saveSettings({ [name]: value });
        order = computeOrder();
      } }),
      h('span', h('strong', label), desc ? h('small', desc) : null)
    );
    let armed = false;
    const resetBtn = h('button.pn-btn.pn-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      answers = {};
      store.set('answers', answers);
      resetBtn.textContent = '✓ Progression effacée';
      resetBtn.disabled = true;
    } }, 'Effacer ma progression');
    const { played, good } = stats();
    const nPhotos = women.filter((w) => photos[w.id]?.img).length;

    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate('femme', currentId) }),
      h('section.pn-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.pn-small', `Découvre ${women.length} femmes, célèbres ou oubliées de l’histoire. Pour chacune, devine ce qu’elle a accompli parmi 4 réponses. Une seule tentative par femme : 1 point par bonne réponse.`)
        ),
        h('fieldset', h('legend', 'Ordre'),
          radio('order', 'random', 'Aléatoire', 'Des femmes célèbres reviennent de temps en temps parmi les oubliées.'),
          radio('order', 'chrono', 'Par époque', 'De l’Antiquité à aujourd’hui.'),
          h('button.pn-btn.pn-btn-ghost', { type: 'button', onclick: (e) => {
            seed = reseed();
            order = computeOrder();
            e.currentTarget.textContent = '✓ Ordre et réponses mélangés';
          } }, 'Mélanger à nouveau')
        ),
        h('fieldset', h('legend', 'Progression'),
          h('p.pn-small', `${played} femme${played > 1 ? 's' : ''} découverte${played > 1 ? 's' : ''} sur ${women.length}, ${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}.`),
          resetBtn
        ),
        h('fieldset', h('legend', 'Sources'),
          h('ul.pn-sources', SOURCES.map(([t, d]) => h('li', h('strong', t), h('small', d)))),
          h('p.pn-small', nPhotos
            ? `${nPhotos} portraits viennent de Wikimedia Commons (auteur et licence dans la galerie).`
            : 'Les portraits sont dessinés en attendant les photos de Wikimedia Commons.')
        ),
        h('button.pn-btn.pn-btn-primary.pn-wide', { type: 'button', onclick: () => ctx.navigate('femme', currentId) }, 'Retour au jeu'),
        h('p.pn-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view, arg] = path || [];
    if (view === 'galerie') renderGallery();
    else if (view === 'reglages') renderSettings();
    else renderPlay(view === 'femme' ? arg : null);
    if (view !== 'galerie') window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('pn', 'is-play');
    },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
