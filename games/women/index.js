// Jeu « Pionnières » : découvrir des femmes célèbres ou oubliées de l'histoire.
// On voit son portrait, son nom et ses dates ; on devine son accomplissement principal parmi 4 réponses visibles.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : sous-chemin de l'URL (['femme', id] | ['galerie'] | ['reglages'] | [])

import { h, icon } from '../../js/core/dom.js?v=1.47.0';
import { createStore } from '../../js/core/storage.js?v=1.47.0';
import { DOMAINS, optionsFor, correctIndex, playOrder, lifespan, initials } from './quiz.js?v=1.47.0';

const store = createStore('pionnieres', { version: 1 });
const DEFAULT_SETTINGS = { order: 'random' };
const LETTERS = ['A', 'B', 'C', 'D'];
const REVEAL_MS = 900; // bonne et mauvaise réponse en couleur, avant la carte biographie
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
    return { played: list.length };
  };

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    return h('header.pn-bar',
      h('button.pn-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.pn-title', titleText),
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
  // Question : portrait et 4 réponses. Une fois la réponse donnée (ou en revenant sur une femme déjà révélée) :
  // la carte biographie, avec les flèches ‹ › pour passer à la précédente ou à la suivante.
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
    const dom = DOMAINS[w.domain] || DOMAINS.sci;
    const announce = h('p.pn-sr', { role: 'status', 'aria-live': 'polite' });
    const meta = () => h('div.pn-meta',
      h('span.pn-counter', `${idx + 1} / ${order.length}`),
      h('span.pn-domain', { style: `--pn-hue: ${dom.hue}` }, dom.label)
    );
    const nav = (dir) => h('button.pn-nav', {
      'aria-label': dir < 0 ? 'Précédente' : 'Suivante', title: dir < 0 ? 'Précédente (←)' : 'Suivante (→)', onclick: () => go(dir),
    }, icon(dir < 0 ? 'prev' : 'next'));

    // Carte biographie (après la réponse)
    function bioCard(a) {
      const picked = a ? options[a.pick] : null;
      const credit = creditOf(w);
      const next = h('button.pn-btn.pn-btn-primary.pn-bio-next', { type: 'button', onclick: () => go(1) }, 'Suivante', icon('next'));
      later(() => next.focus({ preventScroll: true }), 60);
      return h('article.pn-bio', { class: `pn-bio${a ? (a.ok ? ' is-ok' : ' is-ko') : ''}`, 'aria-label': `Biographie de ${w.name}` },
        h('header.pn-bio-head',
          h('div.pn-bio-thumb', portrait(w, { caption: false })),
          h('div.pn-bio-id',
            h('h2.pn-bio-name', w.name),
            h('p.pn-bio-life', lifespan(w)),
            h('p.pn-bio-from', w.from.charAt(0).toUpperCase() + w.from.slice(1))
          )
        ),
        h('div.pn-bio-body',
          a ? h('p.pn-verdict', a.ok ? [icon('check'), ' Bonne réponse'] : 'Ce n’était pas ça') : null,
          h('p.pn-answer', w.answer),
          picked && !a.ok ? h('p.pn-picked', h('span', 'Ta réponse : '), picked.text) : null,
          h('p.pn-bio-text', w.bio),
          h('div.pn-bio-fact', h('strong', 'Le saviez-vous ?'), h('p', w.fact)),
          credit ? h('p.pn-credit', `Portrait : ${credit}`) : null
        ),
        h('footer.pn-bio-nav', nav(-1), next, nav(1))
      );
    }

    function showCard(a) {
      resetView();
      bindKeys();
      stage.replaceChildren(meta(), bioCard(a));
      stage.classList.add('is-card');
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
      });
      stage.classList.add(a.ok ? 'is-ok' : 'is-ko');
      announce.textContent = `${a.ok ? 'Bonne réponse.' : 'Raté.'} ${w.name} : ${w.answer}.`;
      later(() => showCard(a), REVEAL_MS);
    }

    const buttons = options.map((o, i) => h('button.pn-choice', {
      type: 'button', 'aria-label': `${LETTERS[i]}. ${o.text}`, onclick: () => choose(i),
    }, h('span.pn-letter', LETTERS[i]), h('span.pn-choice-text', o.text)));

    const stage = h('section.pn-stage',
      meta(),
      h('div.pn-portrait-row', nav(-1), h('div.pn-portrait-box', portrait(w)), nav(1)),
      h('div.pn-area', h('div.pn-choices', { role: 'group', 'aria-label': 'Qu’a-t-elle accompli ?' }, buttons))
    );
    container.replaceChildren(topBar('Pionnières'), stage, announce);
    if (answers[w.id]) showCard(answers[w.id]);
    else bindKeys();

    // Glisser vers la gauche ou la droite (téléphone) : femme suivante ou précédente
    let touch = null;
    stage.addEventListener('touchstart', (e) => { touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    function bindKeys() {
      onKey((e) => {
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
        if (answers[w.id]) return;
        const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
        if (k != null) { e.preventDefault(); choose(k); }
      });
    }
  }

  // ---------------------------------------------------------------- vue : galerie
  function renderGallery() {
    resetView();
    container.classList.remove('is-play');
    const cards = order.map((id, i) => {
      const w = byId.get(id);
      const a = answers[id];
      return h('button.pn-gcard', {
        class: `pn-gcard${a ? ' is-seen' : ''}${id === currentId ? ' is-current' : ''}`,
        type: 'button', title: w.name, onclick: () => ctx.navigate('femme', id),
      },
        portrait(w, { caption: false }),
        h('span.pn-gnum', i + 1),
        h('span.pn-gname', w.name)
      );
    });
    const credited = women.filter((w) => creditOf(w)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const { played } = stats();
    container.replaceChildren(
      topBar('Galerie', { back: () => ctx.navigate('femme', currentId) }),
      h('div.pn-grid-head', h('p', h('strong', played), ` révélée${played > 1 ? 's' : ''} sur ${women.length}`)),
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
      if (!armed) { armed = true; resetBtn.textContent = 'Confirmer : tout recacher'; return; }
      answers = {};
      store.set('answers', answers);
      resetBtn.textContent = '✓ Toutes les personnes sont à nouveau cachées';
      resetBtn.disabled = true;
    } }, 'Recommencer à zéro');
    const { played } = stats();
    const nPhotos = women.filter((w) => photos[w.id]?.img).length;

    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate('femme', currentId) }),
      h('section.pn-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.pn-small', `Découvre ${women.length} femmes, célèbres ou oubliées de l’histoire. Pour chacune, devine ce qu’elle a accompli parmi 4 réponses, en une seule tentative, puis découvre sa biographie. Les flèches ‹ › (ou un glissement du doigt) passent à la précédente ou à la suivante.`)
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
        h('fieldset', h('legend', 'Personnes révélées'),
          h('p.pn-small', `${played} femme${played > 1 ? 's' : ''} révélée${played > 1 ? 's' : ''} sur ${women.length}. Une femme révélée montre directement sa biographie. Recommencer à zéro les cache toutes à nouveau.`),
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
