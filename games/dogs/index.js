// Jeu « Chiens » : retrouver la race d'un chien d'après sa photo.
// QCM : 4 races proposées, une seule réponse par chien, 1 point par bonne réponse.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (partie) | ['races'] | ['reglages']

import { h, icon } from '../../js/core/dom.js?v=1.50.0';
import { createStore } from '../../js/core/storage.js?v=1.50.0';
import { GROUPS, FAMILIES, LEVELS, newGame, pointsFor, maxScore, updateSeen } from './quiz.js?v=1.50.0';
import { fetchPhotos } from './wiki.js?v=1.50.0';

const store = createStore('chiens', { version: 1 });
const DEFAULT_SETTINGS = { level: 'normal' };
const MISS_TTL = 3 * 24 * 3600 * 1000; // une photo introuvable en direct est recherchée à nouveau au bout de 3 jours

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('dg');
  container.replaceChildren(h('div.loading', 'Chargement des chiens…'));

  const v = new URL(import.meta.url).search;
  const load = async (name) => {
    const res = await fetch(new URL(`./data/${name}${v}`, import.meta.url), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${name} : ${res.status}`);
    return res.json();
  };
  const [breeds, bundled] = await Promise.all([load('chiens.json'), load('photos.json')]);
  const byId = new Map(breeds.map((b) => [b.id, b]));

  let settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  if (!LEVELS[settings.level]) settings.level = 'normal';
  let live = store.get('photos', {}); // photos cherchées en direct : id → photo | { miss: date }
  const photoOf = (id) => bundled[id] || (live[id]?.img ? live[id] : null);
  const playable = () => breeds.filter((b) => photoOf(b.id));

  // Photos absentes de photos.json : cherchées sur Wikipédia depuis l'appareil
  const missing = breeds.filter((b) => !photoOf(b.id) && !(live[b.id]?.miss > Date.now() - MISS_TTL));
  if (missing.length) {
    const fetching = fetchPhotos(missing).then((found) => {
      for (const b of missing) live[b.id] = found[b.id] || { miss: Date.now() };
      store.set('photos', live);
    }).catch(() => {});
    if (playable().length < 10) {
      container.replaceChildren(h('div.loading', 'Recherche des photos…'));
      await fetching;
    }
  }

  // Record de la 1.43.0 (carte cachée à 2 points) au-dessus du nouveau maximum de 10 : il ne serait jamais battu
  if (store.get('best', null)?.score > 10) store.set('best', null);
  let game = store.get('game', null);
  if (game && !(Array.isArray(game.qs) && game.qs.every((q) => byId.has(q.id) && q.options.every((o) => byId.has(o))))) game = null;
  let shown = null; // index de la question dont on montre la réponse (avant « Suivant »)
  let cleanup = [];

  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }
  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    store.set('settings', settings);
  }
  function startGame() {
    const list = playable();
    game = newGame(list, breeds, { level: settings.level, seen: store.get('seen', []) });
    store.set('seen', updateSeen(store.get('seen', []), game.qs.map((q) => q.id), list.length));
    store.set('game', game);
    shown = null;
  }
  const scoreOf = (g) => g.answers.reduce((s, a) => s + a.pts, 0);

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    return h('header.dg-bar',
      h('button.dg-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.dg-title', titleText),
      game && !back ? h('span.dg-score', { title: 'Score de la partie' }, h('strong', scoreOf(game)), ' pts') : null,
      h('button.dg-icon-btn', { title: 'Toutes les races', 'aria-label': 'Toutes les races', onclick: () => ctx.navigate('races') }, icon('grid')),
      h('button.dg-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // Photo du chien : l'image entière, posée sur la même image floutée qui remplit le cadre 2:3
  function photo(id, { small = false } = {}) {
    const p = photoOf(id);
    const frame = h('div.dg-photo');
    if (!p) { frame.append(h('span.dg-photo-none', icon('dog'), 'Photo indisponible')); return frame; }
    const src = small ? p.thumb : p.img;
    const bg = h('img.dg-photo-bg', { src, alt: '', 'aria-hidden': 'true', decoding: 'async', loading: small ? 'lazy' : 'eager' });
    const fg = h('img.dg-photo-img', { src, alt: 'Photo du chien', decoding: 'async', loading: small ? 'lazy' : 'eager' });
    fg.addEventListener('error', () => {
      if (!small || fg.src === p.img) { frame.replaceChildren(h('span.dg-photo-none', icon('dog'), 'Photo indisponible')); return; }
      fg.src = p.img; bg.src = p.img; // vignette introuvable : photo d'origine
    });
    frame.append(bg, fg);
    return frame;
  }
  const credit = (id) => {
    const p = photoOf(id);
    return p ? `Photo : ${p.by} · ${p.lic} · Wikimedia Commons` : '';
  };

  // ---------------------------------------------------------------- vue : partie
  function renderPlay() {
    resetView();
    container.classList.add('is-play');
    if (!game) startGame();
    if (!game.qs.length) {
      container.replaceChildren(topBar('Chiens'), h('p.dg-empty', 'Les photos des chiens ne sont pas disponibles pour le moment. Vérifie ta connexion et réessaie.'));
      return;
    }
    const i = shown ?? game.answers.length;
    if (i >= game.qs.length) { renderEnd(); return; }
    const q = game.qs[i];
    const answered = game.answers[i];
    const breed = byId.get(q.id);

    const status = h('p.dg-status', { role: 'status', 'aria-live': 'polite' });
    const cards = q.options.map((id, k) => h('button.dg-card', { type: 'button', onclick: () => choose(k) },
      h('span.dg-key', { 'aria-hidden': 'true' }, k + 1),
      h('span.dg-card-name', byId.get(id).name)
    ));
    const next = h('button.dg-btn.dg-btn-primary', { type: 'button', onclick: goNext },
      i + 1 < game.qs.length ? 'Suivant' : 'Voir le score', icon('next'));
    const foot = h('div.dg-foot', status);

    function paint(a) {
      cards.forEach((c, k) => {
        c.disabled = true;
        c.classList.toggle('is-right', q.options[k] === q.id);
        c.classList.toggle('is-wrong', k === a.choice && a.pts === 0);
        c.classList.toggle('is-chosen', k === a.choice);
      });
      const extra = `${GROUPS[breed.group]} · ${breed.origin}`;
      status.replaceChildren(
        h('span.dg-line',
          h('span.dg-verdict', { class: `dg-verdict ${a.pts ? 'is-ok' : 'is-err'}` },
            a.pts ? 'Bravo ! +1' : 'Raté !'),
          ' ', h('span.dg-extra', extra)),
        h('strong.dg-answer', breed.name)
      );
      foot.replaceChildren(status, next);
      stage.classList.add('is-answered');
      setTimeout(() => next.focus(), 50);
    }
    function choose(k) {
      if (game.answers[i]) return;
      const a = { choice: k, pts: pointsFor(q, k) };
      game.answers[i] = a;
      store.set('game', game);
      shown = i;
      if (navigator.vibrate && !a.pts) navigator.vibrate(120);
      paint(a);
      bar.replaceWith((bar = topBar('Chiens')));
      creditLine.textContent = credit(q.id);
    }
    function goNext() {
      shown = null;
      renderPlay();
    }

    const creditLine = h('p.dg-credit', answered ? credit(q.id) : ' ');
    const stage = h('section.dg-stage',
      h('div.dg-meta', h('span.dg-counter', `Chien ${i + 1} / ${game.qs.length}`), h('span.dg-question', 'Quelle est cette race ?')),
      h('div.dg-photo-box', photo(q.id), creditLine),
      h('div.dg-side',
        h('div.dg-cards', cards),
        foot
      )
    );
    if (!answered) status.replaceChildren(h('span.dg-hint', 'Une seule réponse par chien : choisis bien !'));
    let bar = topBar('Chiens');
    container.replaceChildren(bar, stage);
    if (answered) paint(answered);

    // Photo suivante chargée à l'avance
    const nq = game.qs[i + 1];
    if (nq && photoOf(nq.id)) new Image().src = photoOf(nq.id).img;

    onKey((e) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (!game.answers[i] && /^[1-4]$/.test(e.key)) { e.preventDefault(); choose(Number(e.key) - 1); }
      else if (game.answers[i] && (e.key === 'ArrowRight')) { e.preventDefault(); goNext(); }
    });
  }

  // ---------------------------------------------------------------- fin de partie
  function renderEnd() {
    resetView();
    container.classList.remove('is-play');
    const score = scoreOf(game);
    const max = maxScore(game.qs);
    const right = game.answers.filter((a) => a.pts).length;
    const best = store.get('best', null);
    let record = false;
    if (!game.counted) {
      store.set('played', store.get('played', 0) + 1);
      if (!best || score > best.score) { store.set('best', { score, max, date: Date.now() }); record = score > 0; }
      game.counted = true;
      game.record = record;
      store.set('game', game);
    }
    record = game.record;
    const nowBest = store.get('best', null);
    const replay = h('button.dg-btn.dg-btn-primary', { type: 'button', onclick: () => { startGame(); renderPlay(); } }, 'Rejouer');
    container.replaceChildren(
      topBar('Chiens'),
      h('section.dg-end',
        h('h2.dg-end-title', 'Partie terminée'),
        h('p.dg-end-score', h('strong', score), ` / ${max} points`),
        h('p.dg-end-sub', `${right} race${right > 1 ? 's' : ''} sur ${game.qs.length} · niveau ${LEVELS[game.level]?.label.toLowerCase() || 'normal'}`),
        record ? h('p.dg-record', icon('trophy'), ' Nouveau record !') : nowBest ? h('p.dg-end-sub', `Record : ${nowBest.score} points`) : null,
        h('div.dg-end-actions',
          h('button.dg-btn', { type: 'button', onclick: ctx.home }, icon('home'), 'Accueil'),
          replay
        ),
        h('ol.dg-recap', game.qs.map((q, k) => {
          const a = game.answers[k];
          return h('li', { class: a?.pts ? 'is-ok' : 'is-err' },
            h('span.dg-recap-mark', a?.pts ? '✓' : '✗'),
            h('span.dg-recap-name', byId.get(q.id).name),
            h('span.dg-recap-pts', a?.pts ? `+${a.pts}` : byId.get(q.options[a?.choice])?.name || '')
          );
        }))
      )
    );
    setTimeout(() => replay.focus(), 50);
  }

  // ---------------------------------------------------------------- vue : toutes les races
  function renderBreeds() {
    resetView();
    container.classList.remove('is-play');
    const sections = Object.entries(FAMILIES).map(([g, label]) => {
      const list = breeds.filter((b) => b.group === g).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      return h('section.dg-family',
        h('h2.dg-family-title', label, h('small', ` · ${list.length}`)),
        h('div.dg-grid', list.map((b) => h('figure.dg-tile', { title: credit(b.id) || b.name },
          photo(b.id, { small: true }),
          h('figcaption', h('strong', b.name), h('small', b.origin))
        )))
      );
    });
    const credits = breeds.filter((b) => photoOf(b.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map((b) => h('li', h('strong', b.name), ` — ${photoOf(b.id).by} · ${photoOf(b.id).lic} (${photoOf(b.id).file})`));
    container.replaceChildren(
      topBar('Toutes les races', { back: () => ctx.navigate() }),
      h('p.dg-grid-head', `${breeds.length} races, par famille.`),
      ...sections,
      h('details.dg-credits', h('summary', 'Crédits photo'),
        h('p.dg-hint', 'Photos de Wikimedia Commons (images principales des articles Wikipédia), sous licence libre.'),
        h('ul', credits))
    );
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    const best = store.get('best', null);
    const played = store.get('played', 0);
    const levelNote = h('p.dg-hint');
    const radios = Object.entries(LEVELS).map(([key, l]) => h('label.dg-option',
      h('input', { type: 'radio', name: 'level', value: key, checked: settings.level === key, onchange: () => {
        saveSettings({ level: key });
        levelNote.textContent = game && game.answers.length < game.qs.length ? 'Le niveau changera à la prochaine partie.' : '';
      } }),
      h('span', h('strong', l.label), h('small', l.desc))
    ));
    let armed = false;
    const reset = h('button.dg-btn.dg-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; reset.textContent = 'Confirmer'; return; }
      store.set('best', null); store.set('played', 0); store.set('seen', []);
      reset.textContent = '✓ Scores effacés';
      reset.disabled = true;
    } }, 'Effacer mes scores');
    const inGame = game && game.answers.length < game.qs.length;
    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.dg-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.dg-hint', 'Une partie compte 10 chiens. Pour chacun, 4 races sont proposées : une seule réponse par chien, et 1 point par bonne réponse. Le niveau règle la ressemblance entre les mauvaises réponses et la bonne race.')
        ),
        h('fieldset', h('legend', 'Niveau'), radios, levelNote),
        h('fieldset', h('legend', 'Scores'),
          h('p.dg-hint', best ? `Record : ${best.score} points (sur ${best.max}). ${played} partie${played > 1 ? 's' : ''} jouée${played > 1 ? 's' : ''}.` : `Pas encore de record. ${played} partie${played > 1 ? 's' : ''} jouée${played > 1 ? 's' : ''}.`),
          reset
        ),
        inGame ? h('button.dg-btn.dg-btn-ghost', { type: 'button', onclick: () => { startGame(); ctx.navigate(); } }, 'Recommencer une partie') : null,
        h('button.dg-btn.dg-btn-primary.dg-wide', { type: 'button', onclick: () => ctx.navigate() }, inGame ? 'Reprendre la partie' : 'Jouer'),
        h('p.dg-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view] = path || [];
    if (view === 'races') renderBreeds();
    else if (view === 'reglages') renderSettings();
    else {
      renderPlay();
    }
    if (view !== 'races') window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('dg', 'is-play');
    },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
