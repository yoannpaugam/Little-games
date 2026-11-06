// Jeu « Livres » : retrouver l'auteur d'un grand livre de la littérature, en 3 essais.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path     : sous-chemin de l'URL (['livre', id] | ['bibliotheque', annee?] | ['reglages'] | [])
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.40.0';
import { createStore } from '../../js/core/storage.js?v=1.40.0';
import { buildAuthors, checkAuthor, initialsOf } from './answers.js?v=1.40.0';

const store = createStore('livres', { version: 1 });
const DEFAULT_SETTINGS = { order: 'random' };
// Essais : 3 propositions fausses au plus. Après la 1re, la nationalité est donnée ; après la 2e, les initiales.
const MAX_TRIES = 3;
const WRONG = ['Ce n’est pas ça… Réessaie !', 'Raté ! Encore un essai ?', 'Non, ce n’est pas cet auteur.'];
// Couleurs de couverture (fond, filet) : choisies d'après l'identifiant du livre, toujours les mêmes
const COVERS = [
  ['#7a2e2e', '#e9c46a'], ['#1f4e5f', '#e8d9b5'], ['#2f4a2f', '#d9c27a'], ['#4a2c5e', '#e6c9a8'],
  ['#8a5a1f', '#f3e3c3'], ['#203a5c', '#d4b483'], ['#5c1f3a', '#efd6b0'], ['#2d2d2d', '#c9a227'],
  ['#3e5641', '#f0e6d2'], ['#6b3e26', '#e7cfa0'],
];

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('lv');
  container.replaceChildren(h('div.loading', 'Chargement des livres…'));

  const res = await fetch(new URL('./data/livres.json' + new URL(import.meta.url).search, import.meta.url), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`livres.json : ${res.status}`);
  const { authors, books } = await res.json();
  const byId = new Map(books.map((b) => [b.id, b]));
  const authorOf = new Map(authors.map((a) => [a.id, a]));
  const index = buildAuthors(authors);

  let settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  let found = store.get('found', {}); // id → date
  let tries = store.get('tries', {}); // id → nombre de propositions fausses
  let given = store.get('given', {}); // id → date (réponse donnée après 3 essais)
  let seed = store.get('seed', null) ?? reseed();
  let order = computeOrder();
  let currentId = store.get('current', null);
  if (!byId.has(currentId)) currentId = order[0];
  let cleanup = [];

  function reseed() {
    const s = Math.floor(Math.random() * 2 ** 31);
    store.set('seed', s);
    return s;
  }
  function computeOrder() {
    if (settings.order === 'chrono') return [...books].sort(byYear).map((b) => b.id);
    return seededShuffle(books.map((b) => b.id), seed);
  }
  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    store.set('settings', settings);
  }
  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }
  const nFound = () => Object.keys(found).filter((id) => byId.has(id)).length;

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    return h('header.lv-bar',
      h('button.lv-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.lv-title', titleText),
      h('span.lv-score', { title: 'Auteurs trouvés' }, h('strong', nFound()), ` / ${books.length}`),
      h('button.lv-icon-btn', { title: 'Bibliothèque', 'aria-label': 'Bibliothèque', onclick: () => ctx.navigate('bibliotheque') }, icon('grid')),
      h('button.lv-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- couverture
  // Couverture dessinée (pas d'image) : titre, année, et à la place de l'auteur les indices ou la réponse.
  function cover(book, { solved = false, n = 0 } = {}) {
    const [bg, ink] = COVERS[hash(book.id) % COVERS.length];
    const longest = Math.max(...book.title.split(/[\s-]+/).map((w) => w.length));
    // Taille du titre en % de la largeur de la couverture : assez petite pour les titres longs et les mots longs
    const fs = Math.min(15, 78 / Math.sqrt(book.title.length), 118 / longest);
    const author = h('p.lv-cover-author');
    const el = h('div.lv-cover',
      h('div.lv-cover-frame',
        author,
        h('span.lv-cover-orn', { 'aria-hidden': 'true' }, '❦'),
        h('h2.lv-cover-title', book.title),
        h('p.lv-cover-year', book.year)
      )
    );
    el.style.setProperty('--lv-bg', bg);
    el.style.setProperty('--lv-ink', ink);
    el.style.setProperty('--lv-fs', `${fs.toFixed(2)}cqw`);
    el.setAuthor = (solvedNow, triesNow) => {
      const a = authorOf.get(book.author);
      if (solvedNow) {
        author.className = 'lv-cover-author is-name';
        author.textContent = a.name;
      } else if (triesNow >= 1) {
        author.className = 'lv-cover-author is-hint';
        author.replaceChildren(
          h('span', `Littérature ${a.from}`),
          triesNow >= 2 ? h('strong', initialsOf(a.name)) : null
        );
      } else {
        author.className = 'lv-cover-author is-unknown';
        author.textContent = 'Auteur ?';
      }
    };
    el.setAuthor(solved, n);
    return el;
  }

  // ---------------------------------------------------------------- vue : jeu
  function renderPlay(id) {
    resetView();
    container.classList.add('is-play');
    if (id && byId.has(id)) currentId = id;
    store.set('current', currentId);
    const book = byId.get(currentId);
    const author = authorOf.get(book.author);
    const idx = order.indexOf(currentId);
    const isFound = Boolean(found[book.id]);
    const solved = isFound || Boolean(given[book.id]);
    const go = (delta) => ctx.navigate('livre', order[(idx + delta + order.length) % order.length]);
    const triesNow = () => Math.min(tries[book.id] || 0, MAX_TRIES);

    const art = cover(book, { solved, n: triesNow() });
    const feedback = h('p.lv-feedback', { role: 'status', 'aria-live': 'polite' });
    const announce = h('p.lv-sr', { role: 'status', 'aria-live': 'polite' });
    const input = h('input.lv-input', {
      type: 'text', placeholder: 'Nom de l’auteur…', autocomplete: 'off', autocapitalize: 'words', spellcheck: false,
      'aria-label': 'Nom de l’auteur', enterKeyHint: 'done',
    });
    input.setAttribute('autocorrect', 'off');
    let misses = 0;
    // Trois ronds sous la couverture, un par essai raté
    const dots = h('div.lv-tries', { role: 'img' }, Array.from({ length: MAX_TRIES }, () => h('span.lv-try')));
    const updTries = () => {
      const n = triesNow();
      [...dots.children].forEach((d, i) => d.classList.toggle('is-used', i < n));
      dots.setAttribute('aria-label', `${n} essai${n > 1 ? 's' : ''} raté${n > 1 ? 's' : ''} sur ${MAX_TRIES}`);
      dots.hidden = solved && !n;
    };

    const infoBlock = (gaveUp) => h('div.lv-reveal',
      gaveUp ? h('p.lv-bravo.is-given', 'C’était…') : h('p.lv-bravo', icon('check'), ' Bravo !'),
      h('h2.lv-author-name', author.name),
      // Une seule ligne : le panneau garde la hauteur du formulaire, la couverture ne change pas de taille
      // L'année, cliquable (bibliothèque à cette période), passe en premier pour rester visible avec un long titre
      h('p.lv-details',
        h('button.lv-link', { type: 'button', title: 'Voir les livres de cette période', onclick: () => ctx.navigate('bibliotheque', book.year) }, book.year),
        ' · ', h('i', book.title), ` · littérature ${author.from}`)
    );
    const solvedPanel = (gaveUp = !isFound && Boolean(given[book.id])) => {
      const next = h('button.lv-btn.lv-btn-primary', { type: 'button', onclick: () => go(1) }, 'Suivant', icon('next'));
      setTimeout(() => next.focus(), 50);
      return h('div.lv-solved', infoBlock(gaveUp), next);
    };

    const form = h('form.lv-form', {
      onsubmit: (e) => {
        e.preventDefault();
        const verdict = checkAuthor(input.value, book.author, index);
        if (!verdict) { input.focus(); return; }
        if (verdict.ok) {
          found[book.id] = Date.now();
          store.set('found', found);
          reveal(false);
          return;
        }
        // Presque juste (prénom seul, faute d'orthographe) : un indice, sans perdre d'essai
        if (verdict.near) {
          feedback.textContent = `Tu chauffes ! ${verdict.hint || ''}`.trim();
          feedback.className = 'lv-feedback is-error is-near';
        } else {
          misses++;
          const n = triesNow() + 1;
          tries[book.id] = n;
          store.set('tries', tries);
          updTries();
          art.setAuthor(false, n);
          if (n >= MAX_TRIES) {
            given[book.id] = Date.now();
            store.set('given', given);
            reveal(true);
            return;
          }
          feedback.textContent = n === 1 ? 'Raté ! Indice : sa nationalité.'
            : n === 2 ? 'Dernier essai ! Voici ses initiales.' : WRONG[(misses - 1) % WRONG.length];
          feedback.className = 'lv-feedback is-error';
        }
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        input.select();
      },
    },
      h('div.lv-input-row', input, h('button.lv-btn.lv-btn-primary', { type: 'submit' }, 'Valider')),
      feedback
    );

    function reveal(gaveUp) {
      art.setAuthor(true);
      stage.classList.add(gaveUp ? 'is-given' : 'is-solved');
      form.replaceWith(solvedPanel(gaveUp));
      announce.textContent = `${gaveUp ? '' : 'Bravo ! '}C’était ${author.name}.`;
      bar.replaceWith((bar = topBar('Livres')));
    }

    const stage = h('section.lv-stage', { class: `lv-stage${isFound ? ' is-solved' : solved ? ' is-given' : ''}` },
      h('div.lv-meta', h('span.lv-counter', `${idx + 1} / ${order.length}`), h('span.lv-question', 'Qui a écrit ce livre ?')),
      h('div.lv-cover-row',
        h('button.lv-nav', { 'aria-label': 'Précédent', title: 'Précédent (←)', onclick: () => go(-1) }, icon('prev')),
        h('div.lv-cover-box', art, dots),
        h('button.lv-nav', { 'aria-label': 'Suivant', title: 'Suivant (→)', onclick: () => go(1) }, icon('next'))
      ),
      solved ? solvedPanel() : form,
      h('div.lv-skip',
        h('button.lv-btn.lv-btn-ghost', { onclick: () => go(-1) }, icon('prev'), 'Précédent'),
        h('button.lv-btn.lv-btn-ghost', { onclick: () => go(1) }, 'Passer', icon('next'))
      )
    );

    let bar = topBar('Livres');
    updTries();
    container.replaceChildren(bar, stage, announce);
    if (!solved && matchMedia('(hover: hover)').matches) input.focus();

    onKey((e) => {
      const typing = document.activeElement === input && input.value !== '';
      if (typing || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  }

  // ---------------------------------------------------------------- vue : bibliothèque
  // Comme la grille des affiches : « Aller à… » par siècle (l'année est déjà sur chaque couverture),
  // ouverture sur une année (#/livres/bibliotheque/<année>) ou sur le livre en cours.
  function renderLibrary(year) {
    resetView();
    container.classList.remove('is-play');
    const sorted = [...books].sort(byYear);
    const target = Number(year) || null;
    const seenCenturies = new Set();
    const seenYears = new Set();
    const cards = sorted.map((book) => {
      const isFound = Boolean(found[book.id]);
      const isGiven = !isFound && Boolean(given[book.id]);
      const c = centuryOf(book.year);
      const firstC = !seenCenturies.has(c);
      const firstY = !seenYears.has(book.year);
      seenCenturies.add(c);
      seenYears.add(book.year);
      return h('button.lv-card', {
        class: `lv-card${isFound ? ' is-found' : isGiven ? ' is-given' : ''}${target ? (target === book.year ? ' is-target' : '') : book.id === currentId ? ' is-current' : ''}`,
        type: 'button',
        id: firstY ? `lv-y-${book.year}` : null,
        'data-century': firstC ? c : null,
        title: `${book.title} (${book.year})`,
        onclick: () => ctx.navigate('livre', book.id),
      },
        cover(book, { solved: isFound || isGiven, n: 0 }),
        h('span.lv-card-name', isFound || isGiven ? authorOf.get(book.author).name : ' ')
      );
    });
    const centuries = [...seenCenturies];
    const jump = h('select.lv-select', {
      'aria-label': 'Aller au siècle',
      onchange: (e) => {
        const el = container.querySelector(`.lv-card[data-century="${e.target.value}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    }, h('option', { value: '' }, 'Aller à…'),
      centuries.map((c) => h('option', { value: c, selected: target ? centuryOf(target) === c : false }, centuryLabel(c))));
    const n = nFound();
    container.replaceChildren(
      topBar('Bibliothèque', { back: () => ctx.navigate('livre', currentId) }),
      h('div.lv-grid-head',
        h('p', h('strong', n), ` auteur${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''} sur ${books.length} livres · du plus ancien au plus récent`),
        jump
      ),
      h('div.lv-grid', cards)
    );
    const el = target ? container.querySelector(`#lv-y-${target}`) : container.querySelector('.lv-card.is-current');
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: target ? 'start' : 'center' }));
    else window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    const radio = (name, value, label, desc) => h('label.lv-option',
      h('input', { type: 'radio', name, value, checked: settings[name] === value, onchange: () => {
        saveSettings({ [name]: value });
        if (name === 'order') order = computeOrder();
      } }),
      h('span', h('strong', label), desc ? h('small', desc) : null)
    );
    let resetArmed = false;
    const resetBtn = h('button.lv-btn.lv-btn-danger', { type: 'button', onclick: () => {
      if (!resetArmed) { resetArmed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      found = {}; tries = {}; given = {};
      store.set('found', found); store.set('tries', tries); store.set('given', given);
      resetBtn.textContent = '✓ Progression effacée';
      resetBtn.disabled = true;
    } }, 'Effacer ma progression');

    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate('livre', currentId) }),
      h('section.lv-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.lv-hint', `Trouve l’auteur de chaque livre. Tu as ${MAX_TRIES} essais : après le premier raté, sa nationalité s’affiche sur la couverture, après le deuxième, ses initiales. Le nom de famille seul suffit. Une réponse presque juste (prénom seul, faute d’orthographe) ne coûte pas d’essai.`)
        ),
        h('fieldset', h('legend', 'Ordre des livres'),
          radio('order', 'random', 'Aléatoire'),
          radio('order', 'chrono', 'Chronologique', 'Du plus ancien au plus récent.'),
          h('button.lv-btn.lv-btn-ghost', { type: 'button', onclick: (e) => {
            seed = reseed();
            order = computeOrder();
            e.currentTarget.textContent = '✓ Ordre aléatoire mélangé';
          } }, 'Mélanger à nouveau')
        ),
        h('fieldset', h('legend', 'Progression'),
          h('p.lv-hint', `${n2(nFound(), 'auteur trouvé', 'auteurs trouvés')} sur ${books.length} livres.`),
          resetBtn
        ),
        h('button.lv-btn.lv-btn-primary.lv-wide', { type: 'button', onclick: () => ctx.navigate('livre', currentId) }, 'Retour au jeu'),
        h('p.lv-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view, arg] = path || [];
    if (view === 'bibliotheque') renderLibrary(arg);
    else if (view === 'reglages') renderSettings();
    else renderPlay(view === 'livre' ? arg : null);
    if (view !== 'bibliotheque') window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('lv', 'is-play');
    },
  };
}

// ------------------------------------------------------------------ utilitaires

const byYear = (a, b) => a.year - b.year || a.title.localeCompare(b.title, 'fr');
// Siècle d'une année (1320 → 14, 1999 → 20, 2000 → 20, 2001 → 21) et son libellé (« XIVe siècle »)
const centuryOf = (y) => Math.ceil(y / 100);
const ROMAN = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function centuryLabel(c) {
  let n = c;
  let r = '';
  for (const [v, l] of ROMAN) while (n >= v) { r += l; n -= v; }
  return `${r}${c === 1 ? 'er' : 'e'} siècle`;
}
const n2 = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function hash(str) {
  let x = 2166136261;
  for (const c of str) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return x >>> 0;
}

function seededShuffle(arr, seed) {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
