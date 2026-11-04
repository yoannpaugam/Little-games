// Jeu « Affiches de cinéma » : retrouver le film derrière une affiche floutée.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path     : sous-chemin de l'URL (['film', id] | ['grille', annee] | ['reglages'] | [])
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.15.0';
import { createStore } from '../../js/core/storage.js?v=1.15.0';
import { isMatch, closeness, normalize } from '../../js/core/fuzzy.js?v=1.15.0';
import { loadManifest, posterUrl, resolvePoster, testTmdbKey, clearLiveCache, clearMisses, dropQueued, forgetPoster, checkAllPosters } from './posters.js?v=1.15.0';

const store = createStore('affiches');
const DEFAULT_SETTINGS = { order: 'random', blur: 'medium', tmdbKey: '', posterLang: 'fr-FR' };
const BLUR = { light: 10, medium: 18, strong: 28 };
// Essais : un rond par proposition fausse. Tous les 3 essais, le flou diminue ; au 12e, la réponse est donnée.
const MAX_TRIES = 12;
const TRY_STEP = 3;
const BLUR_STEPS = [1, 0.7, 0.45, 0.25]; // part du flou restant après 0, 3, 6 et 9 essais

const WRONG = ['Ce n’est pas ça… Réessaie !', 'Raté ! Encore un essai ?', 'Non, ce n’est pas le bon film.', 'Toujours pas… courage !'];

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('mp');
  container.replaceChildren(h('div.loading', 'Chargement des films…'));

  const [films] = await Promise.all([
    fetch(new URL('./data/films.json' + new URL(import.meta.url).search, import.meta.url), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`films.json : ${r.status}`); return r.json(); }),
    loadManifest(),
  ]);
  const byId = new Map(films.map((f) => [f.id, f]));
  const answers = buildAnswers(films);
  const answerOwners = ownersOf(answers);

  let settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  let found = store.get('found', {}); // id → timestamp
  let tries = store.get('tries', {}); // id → nombre de propositions fausses
  let given = store.get('given', {}); // id → timestamp (réponse donnée après 12 essais)
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
    if (settings.order === 'chrono') {
      return [...films].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'fr')).map((f) => f.id);
    }
    return seededShuffle(films.map((f) => f.id), seed);
  }
  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    store.set('settings', settings);
    container.style.setProperty('--mp-blur', `${BLUR[settings.blur] ?? BLUR.medium}px`);
  }
  saveSettings({});

  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    const nFound = Object.keys(found).filter((id) => byId.has(id)).length;
    return h('header.mp-bar',
      h('button.mp-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.mp-title', titleText),
      h('span.mp-score', { title: 'Films trouvés' }, h('strong', nFound), ` / ${films.length}`),
      h('button.mp-icon-btn', { title: 'Toutes les affiches', 'aria-label': 'Toutes les affiches', onclick: () => ctx.navigate('grille') }, icon('grid')),
      h('button.mp-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- image d'affiche
  function posterImg(film, { size = 'w500', reveal = false, lazy = false, priority = false } = {}) {
    const wrap = h('div.mp-poster', { class: `mp-poster${reveal ? ' is-revealed' : ''}` });
    const placeholder = h('div.mp-poster-empty',
      h('span', '?'),
      h('small', 'Recherche de l’affiche…')
    );
    const setSrc = (url) => {
      if (!url) {
        placeholder.querySelector('small').textContent = 'Affiche introuvable';
        return;
      }
      // alt neutre : le titre ne doit pas fuiter avant d'avoir trouvé
      const img = h('img', { src: url, alt: reveal ? `Affiche de ${film.title}` : 'Affiche mystère', loading: lazy ? 'lazy' : 'eager', decoding: 'async', draggable: false });
      img.addEventListener('load', () => wrap.classList.add('is-loaded'));
      img.addEventListener('error', () => { img.remove(); forgetPoster(film); placeholder.querySelector('small').textContent = 'Image indisponible'; });
      wrap.prepend(img);
    };
    wrap.append(placeholder);
    const known = posterUrl(film, size);
    if (known) setSrc(known);
    else if (lazy) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          resolvePoster(film, settings, size).then(setSrc);
        }
      }, { rootMargin: '400px' });
      io.observe(wrap);
      cleanup.push(() => io.disconnect());
    } else resolvePoster(film, settings, size, { priority }).then(setSrc);
    return wrap;
  }

  // ---------------------------------------------------------------- vue : jeu
  function renderPlay(id) {
    resetView();
    container.classList.add('is-play');
    if (id && byId.has(id)) currentId = id;
    store.set('current', currentId);
    const film = byId.get(currentId);
    const idx = order.indexOf(currentId);
    const isFound = Boolean(found[film.id]);
    const solved = isFound || Boolean(given[film.id]);
    const go = (delta) => ctx.navigate('film', order[(idx + delta + order.length) % order.length]);

    // Préchargement des voisins
    [1, -1, 2].forEach((d) => {
      const f = byId.get(order[(idx + d + order.length) % order.length]);
      resolvePoster(f, settings).then((url) => { if (url) new Image().src = url; });
    });

    const yearBtn = (settings.order === 'chrono' || solved)
      ? h('button.mp-year', { title: 'Voir toutes les affiches de cette période', onclick: () => ctx.navigate('grille', film.year) }, film.year)
      : null;

    const poster = posterImg(film, { reveal: solved, priority: true });
    const feedback = h('p.mp-feedback', { role: 'status', 'aria-live': 'polite' });
    const announce = h('p.mp-sr', { role: 'status', 'aria-live': 'polite' }); // annonce la bonne réponse aux lecteurs d'écran
    const input = h('input.mp-input', {
      type: 'text', placeholder: 'Titre du film…', autocomplete: 'off', autocapitalize: 'off', spellcheck: false,
      'aria-label': 'Titre du film', enterKeyHint: 'done',
    });
    input.setAttribute('autocorrect', 'off'); // pas via h() : sur Safari, la propriété est booléenne
    let attempts = 0;
    const triesNow = () => Math.min(tries[film.id] || 0, MAX_TRIES);
    const blurNow = () => (BLUR[settings.blur] ?? BLUR.medium) * BLUR_STEPS[Math.min(Math.floor(triesNow() / TRY_STEP), BLUR_STEPS.length - 1)];
    // Rangée de ronds sous l'affiche : un par essai, un petit espace tous les 3 essais (palier de flou)
    const dots = h('div.mp-tries', { role: 'img' },
      Array.from({ length: MAX_TRIES }, (_, i) => h('span', { class: `mp-try${i % TRY_STEP === 0 && i ? ' is-step' : ''}` })));
    const updTries = () => {
      const n = triesNow();
      [...dots.children].forEach((d, i) => d.classList.toggle('is-used', i < n));
      dots.setAttribute('aria-label', `${n} essai${n > 1 ? 's' : ''} sur ${MAX_TRIES}`);
      dots.hidden = solved && !n;
      if (!poster.classList.contains('is-revealed')) poster.style.setProperty('--mp-blur', `${blurNow()}px`);
    };

    const infoBlock = (gaveUp) => h('div.mp-reveal',
      gaveUp ? h('p.mp-bravo.is-given', 'C’était…') : h('p.mp-bravo', icon('check'), ' Bravo !'),
      h('h2.mp-film-title', film.title),
      // Titre original, année et réalisateur sur une seule ligne : le panneau garde la hauteur du formulaire,
      // l'affiche ne change donc pas de taille quand on trouve la réponse.
      h('p.mp-details',
        film.original ? h('span.mp-original', h('i', film.original), ' · ') : null,
        h('button.mp-link', { onclick: () => ctx.navigate('grille', film.year) }, film.year),
        ' · ', film.director
      )
    );

    const form = h('form.mp-form', {
      onsubmit: (e) => {
        e.preventDefault();
        const guess = input.value.trim();
        if (!guess) { input.focus(); return; }
        attempts++;
        const verdict = judge(guess, film.id, answers, answerOwners);
        if (verdict.ok) {
          found[film.id] = Date.now();
          store.set('found', found);
          reveal(false);
        } else {
          const n = triesNow() + 1;
          tries[film.id] = n;
          store.set('tries', tries);
          updTries();
          if (n >= MAX_TRIES) {
            given[film.id] = Date.now();
            store.set('given', given);
            reveal(true);
            return;
          }
          const near = verdict.near;
          // Tous les 3 essais, un message court (sur une ligne) annonce que le flou diminue
          feedback.textContent = near ? 'Tu chauffes ! Vérifie l’orthographe.'
            : n % TRY_STEP === 0 ? 'Raté ! L’affiche devient plus nette.' : WRONG[(attempts - 1) % WRONG.length];
          feedback.className = `mp-feedback is-error${near ? ' is-near' : ''}`;
          form.classList.remove('shake');
          void form.offsetWidth;
          form.classList.add('shake');
          input.select();
        }
      },
    },
      h('div.mp-input-row', input, h('button.mp-btn.mp-btn-primary', { type: 'submit' }, 'Valider')),
      feedback
    );

    const solvedPanel = (gaveUp = !isFound && Boolean(given[film.id])) => {
      const next = h('button.mp-btn.mp-btn-primary', { type: 'button', onclick: () => go(1) }, 'Suivant', icon('next'));
      setTimeout(() => next.focus(), 50);
      return h('div.mp-solved', infoBlock(gaveUp), next);
    };
    function reveal(gaveUp) {
      poster.classList.add('is-revealed');
      poster.style.removeProperty('--mp-blur');
      poster.querySelector('img')?.setAttribute('alt', `Affiche de ${film.title}`);
      stage.classList.add(gaveUp ? 'is-given' : 'is-solved');
      if (!yearBtn) stage.querySelector('.mp-meta').append(h('button.mp-year', { onclick: () => ctx.navigate('grille', film.year) }, film.year));
      form.replaceWith(solvedPanel(gaveUp));
      announce.textContent = `${gaveUp ? '' : 'Bravo ! '}C’était ${film.title}.`;
      bar.replaceWith((bar = topBar('Affiches de cinéma')));
    }

    const stage = h('section.mp-stage', { class: `mp-stage${isFound ? ' is-solved' : solved ? ' is-given' : ''}` },
      h('div.mp-meta', h('span.mp-counter', `${idx + 1} / ${order.length}`), yearBtn),
      h('div.mp-poster-row',
        h('button.mp-nav', { 'aria-label': 'Précédent', title: 'Précédent (←)', onclick: () => go(-1) }, icon('prev')),
        h('div.mp-poster-box', poster, dots),
        h('button.mp-nav', { 'aria-label': 'Suivant', title: 'Suivant (→)', onclick: () => go(1) }, icon('next'))
      ),
      solved ? solvedPanel() : form,
      h('div.mp-skip',
        h('button.mp-btn.mp-btn-ghost', { onclick: () => go(-1) }, icon('prev'), 'Précédent'),
        h('button.mp-btn.mp-btn-ghost', { onclick: () => go(1) }, 'Passer', icon('next'))
      )
    );

    let bar = topBar('Affiches de cinéma');
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

  // ---------------------------------------------------------------- vue : grille
  function renderGrid(year) {
    resetView();
    cleanup.push(dropQueued); // en quittant la grille, les affiches pas encore cherchées ne retardent plus le jeu
    container.classList.remove('is-play');
    const sorted = [...films].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'fr'));
    const years = [...new Set(sorted.map((f) => f.year))];
    const target = Number(year) || null;
    const seenYears = new Set();

    const cards = sorted.map((film) => {
      const isFound = Boolean(found[film.id]);
      const first = !seenYears.has(film.year);
      seenYears.add(film.year);
      return h('button.mp-card', {
        class: `mp-card${isFound ? ' is-found' : ''}${target === film.year ? ' is-target' : ''}`,
        id: first ? `mp-y-${film.year}` : null,
        title: isFound ? `${film.title} (${film.year})` : `Film mystère (${film.year})`,
        onclick: () => ctx.navigate('film', film.id),
      },
        posterImg(film, { size: 'w342', reveal: isFound, lazy: true }),
        h('span.mp-card-year', film.year),
        h('span.mp-card-title', isFound ? film.title : ' ')
      );
    });

    const jump = h('select.mp-select', {
      'aria-label': 'Aller à l’année',
      onchange: (e) => scrollToYear(Number(e.target.value), true),
    }, h('option', { value: '' }, 'Aller à…'), years.map((y) => h('option', { value: y, selected: y === target }, y)));

    const nFound = sorted.filter((f) => found[f.id]).length;
    container.replaceChildren(
      topBar('Toutes les affiches', { back: () => ctx.navigate('film', currentId) }),
      h('div.mp-grid-head',
        h('p', h('strong', nFound), ` trouvé${nFound > 1 ? 's' : ''} sur ${sorted.length} · triés par année de sortie`),
        jump
      ),
      h('div.mp-grid', cards)
    );

    function scrollToYear(y, smooth) {
      const el = container.querySelector(`#mp-y-${y}`);
      if (!el) return;
      container.querySelectorAll('.mp-card.is-target').forEach((c) => c.classList.remove('is-target'));
      container.querySelectorAll('.mp-card').forEach((c, i) => { if (sorted[i].year === y) c.classList.add('is-target'); });
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    }
    if (target) requestAnimationFrame(() => scrollToYear(target, false));
    else window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    const radio = (name, value, label, desc) => h('label.mp-option',
      h('input', { type: 'radio', name, value, checked: settings[name] === value, onchange: () => {
        saveSettings({ [name]: value });
        if (name === 'order') order = computeOrder();
        if (name === 'posterLang') clearLiveCache();
      } }),
      h('span', h('strong', label), desc ? h('small', desc) : null)
    );

    const keyInput = h('input.mp-input', { type: 'password', value: settings.tmdbKey, placeholder: 'Clé API v3 ou jeton v4', autocomplete: 'off', spellcheck: false });
    const keyStatus = h('small.mp-hint');
    const saveKey = async () => {
      const key = keyInput.value.trim();
      saveSettings({ tmdbKey: key });
      if (!key) { keyStatus.textContent = 'Clé supprimée.'; return; }
      keyStatus.textContent = 'Vérification…';
      try {
        const ok = await testTmdbKey(key);
        if (ok) clearMisses(); // les films « introuvables » seront cherchés à nouveau, avec TMDB
        keyStatus.textContent = ok ? '✓ Clé valide, les affiches manquantes seront chargées.' : '✗ Clé refusée par TMDB.';
      } catch {
        keyStatus.textContent = '✗ Impossible de joindre TMDB.';
      }
    };

    // Vérification de toutes les affiches, sur l'appareil du joueur : liste des introuvables à copier et envoyer
    function checkBlock() {
      const out = h('p.mp-hint', { role: 'status', 'aria-live': 'polite' });
      const list = h('ul.mp-missing');
      const copy = h('button.mp-btn', { type: 'button', hidden: true }, 'Copier la liste');
      let missing = [];
      copy.addEventListener('click', async () => {
        const text = missing.map((f) => `${f.title} (${f.year}) — ${f.id}`).join('\n');
        try { await navigator.clipboard.writeText(text); copy.textContent = '✓ Liste copiée'; }
        catch { out.textContent = text; }
      });
      const run = h('button.mp-btn', { type: 'button', onclick: async () => {
        run.disabled = true;
        clearMisses(); // les films marqués introuvables sont recherchés à nouveau
        missing = await checkAllPosters(films, settings, (done, total, miss) => {
          out.textContent = `Recherche… ${done} / ${total} · ${miss} introuvable${miss > 1 ? 's' : ''}`;
        });
        run.disabled = false;
        run.textContent = 'Vérifier à nouveau';
        out.textContent = missing.length
          ? `${missing.length} affiche${missing.length > 1 ? 's' : ''} introuvable${missing.length > 1 ? 's' : ''} sur ${films.length}. Copie la liste et envoie-la pour qu'elles soient corrigées.`
          : `✓ Les ${films.length} affiches ont été trouvées.`;
        list.replaceChildren(...missing.map((f) => h('li', h('button.mp-link', { type: 'button', onclick: () => ctx.navigate('film', f.id) }, f.title), ` (${f.year})`)));
        copy.hidden = !missing.length;
      } }, 'Vérifier toutes les affiches');
      return h('div.mp-check', h('p.mp-hint', 'Cherche les 460 affiches et liste celles qui restent introuvables (quelques minutes).'), h('div.mp-input-row', run, copy), out, list);
    }

    let resetArmed = false;
    const resetBtn = h('button.mp-btn.mp-btn-danger', { type: 'button', onclick: () => {
      if (!resetArmed) { resetArmed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      found = {}; tries = {}; given = {};
      store.set('found', found); store.set('tries', tries); store.set('given', given);
      resetBtn.textContent = '✓ Progression effacée';
      resetBtn.disabled = true;
    } }, 'Effacer ma progression');

    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate('film', currentId) }),
      h('section.mp-settings',
        h('fieldset', h('legend', 'Ordre des films'),
          radio('order', 'random', 'Aléatoire', 'L’année reste cachée jusqu’à la bonne réponse.'),
          radio('order', 'chrono', 'Chronologique', 'Du plus ancien au plus récent, l’année est affichée au-dessus de l’affiche.'),
          h('button.mp-btn.mp-btn-ghost', { type: 'button', onclick: (e) => {
            seed = reseed();
            order = computeOrder();
            e.currentTarget.textContent = '✓ Ordre aléatoire mélangé';
          } }, 'Mélanger à nouveau')
        ),
        h('fieldset', h('legend', 'Intensité du flou'),
          radio('blur', 'light', 'Léger', 'Pour les débutants.'),
          radio('blur', 'medium', 'Moyen'),
          radio('blur', 'strong', 'Fort', 'Pour les cinéphiles.')
        ),
        h('fieldset', h('legend', 'Affiches'),
          h('p.mp-hint', 'Par défaut, les affiches sont cherchées sur Wikipédia, sans rien configurer. Pour des affiches en meilleure qualité, tu peux ajouter une clé API gratuite The Movie Database (themoviedb.org → Paramètres → API).'),
          h('div.mp-input-row', keyInput, h('button.mp-btn', { type: 'button', onclick: saveKey }, 'Enregistrer')),
          keyStatus,
          radio('posterLang', 'fr-FR', 'Affiches françaises'),
          radio('posterLang', 'en-US', 'Affiches originales (anglais)'),
          h('button.mp-btn.mp-btn-ghost', { type: 'button', onclick: (e) => { clearLiveCache(); e.currentTarget.textContent = '✓ Cache vidé'; } }, 'Vider le cache des affiches'),
          checkBlock()
        ),
        h('fieldset', h('legend', 'Progression'),
          h('p.mp-hint', `${plural(Object.keys(found).length, 'film trouvé', 'films trouvés')} sur ${films.length}.`),
          resetBtn
        ),
        h('button.mp-btn.mp-btn-primary.mp-wide', { type: 'button', onclick: () => ctx.navigate('film', currentId) }, 'Retour au jeu'),
        h('p.mp-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
    keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveKey(); } });
  }


  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view, arg] = path || [];
    if (view === 'grille') renderGrid(arg);
    else if (view === 'reglages') renderSettings();
    else renderPlay(view === 'film' ? arg : null);
    if (view !== 'grille') window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('mp', 'is-play');
    },
  };
}

// ------------------------------------------------------------------ utilitaires

/** Réponses acceptées : titre FR, titre original, alternatives, + parties avant/après ":" si non ambiguës. */
export function buildAnswers(films) {
  const SPLIT = /\s*(?::|–|—| - )\s*/;
  const owners = new Map();
  const note = (str, id) => {
    const n = normalize(str);
    if (!n) return;
    if (!owners.has(n)) owners.set(n, new Set());
    owners.get(n).add(id);
  };
  const base = new Map();
  for (const f of films) {
    const list = [f.title, f.original, ...(f.alt || [])].filter(Boolean);
    base.set(f.id, list);
    for (const s of list) {
      note(s, f.id);
      const parts = s.split(SPLIT);
      if (parts.length > 1) note(parts[0], f.id);
    }
  }
  const fullNames = [...base].flatMap(([id, list]) => list.map((s) => [normalize(s), id]));
  const prefixOfOther = (n, id) => fullNames.some(([full, other]) => other !== id && full.startsWith(n + ' '));
  const result = new Map();
  for (const f of films) {
    const list = [...base.get(f.id)];
    for (const s of base.get(f.id)) {
      const parts = s.split(SPLIT).filter(Boolean);
      if (parts.length < 2) continue;
      const head = parts[0];
      const tail = parts.slice(1).join(' ');
      // Partie avant « : » si elle ne désigne qu'un film, ni le début du titre d'un autre (« Astérix et Obélix »)
      const nh = normalize(head);
      if (owners.get(nh)?.size === 1 && !prefixOfOther(nh, f.id)) list.push(head); // ex. « Kill Bill »
      // Partie après « : », sauf les mentions génériques (« Volume 1 », « Deuxième partie »)
      const nt = normalize(tail);
      if (nt.replace(/ /g, '').length >= 6 && !owners.has(nt) && !GENERIC_TAIL.test(nt)) list.push(tail); // ex. « Les Deux Tours »
    }
    result.set(f.id, [...new Set(list)]);
  }
  return result;
}

const GENERIC_TAIL = /^(vol|volume|partie|part|chapitre|chapitres|episode|premiere partie|deuxieme partie|seconde partie|\d+(e|eme)? partie)\b/;
const compact = (s) => normalize(s).replace(/ /g, '');
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/**
 * Juge une proposition pour un film → { ok, near }.
 * Une réponse qui est exactement celle d'un autre film est refusée (« Titane » n'est pas « Titanic »).
 */
export function judge(guess, id, answers, owners) {
  const other = owners.get(compact(guess));
  if (other && !other.has(id)) return { ok: false, near: false };
  if (isMatch(guess, answers.get(id))) return { ok: true, near: false };
  return { ok: false, near: closeness(guess, answers.get(id)) < 0.25 };
}

/** Réponse normalisée (sans espaces) → films qui l'acceptent. */
export function ownersOf(answers) {
  const owners = new Map();
  for (const [id, list] of answers) for (const s of list) {
    const k = compact(s);
    if (!owners.has(k)) owners.set(k, new Set());
    owners.get(k).add(id);
  }
  return owners;
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
