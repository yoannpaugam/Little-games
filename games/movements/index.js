// Jeu « Dans la rue » : placer des mouvements sociaux sur une frise chronologique.
// En haut, la frise (défilement horizontal) avec des zones en pointillés entre les cartes ;
// en dessous, l'événement à placer, résumé. On touche une zone, puis « Placer ici ».
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (partie) | ['reglages']

import { h, icon } from '../../js/core/dom.js?v=1.59.0';
import { createStore } from '../../js/core/storage.js?v=1.59.0';
import {
  THEMES, SCOPES, SINCE, MIN_POOL, DEFAULT_SETTINGS,
  filterEvents, drawGame, isRightZone, insertIndex, zoneLabel,
} from './frise.js?v=1.59.0';

const store = createStore('rue', { version: 1 });

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('dr');
  container.replaceChildren(h('div.loading', 'Chargement de la frise…'));

  const url = (p) => new URL(p + new URL(import.meta.url).search, import.meta.url);
  const res = await fetch(url('./data/evenements.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`evenements.json : ${res.status}`);
  const events = await res.json();
  const byId = new Map(events.map((e) => [e.id, e]));

  let settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  let game = store.get('game', null); // { settings, start, cards, placed, answers: [{ id, zone, ok }], counted }
  if (game && ![game.start, ...game.cards].every((id) => byId.has(id))) game = null; // catalogue modifié
  let reveal = null; // { id, ok, index } : la carte qu'on vient de poser, en attendant « Suivant »
  let selected = null; // zone choisie
  let cleanup = [];

  const pool = () => filterEvents(events, settings);
  const yearsOf = (ids) => ids.map((id) => byId.get(id).year);
  const scoreOf = (g) => g.answers.filter((a) => a.ok).length;
  const themeOf = (e) => THEMES[e.theme] || THEMES.travail;

  function newGame() {
    const list = pool();
    const seen = store.get('seen', []);
    const drawn = drawGame(list, Math.floor(Math.random() * 2 ** 31), seen);
    if (!drawn) { game = null; store.remove('game'); return false; }
    game = { settings: { ...settings }, start: drawn.start, cards: drawn.cards, placed: [drawn.start], answers: [], counted: false };
    // Événements déjà sortis : on fait le tour du catalogue avant de les revoir
    const ids = new Set(list.map((e) => e.id));
    let next = seen.filter((id) => byId.has(id));
    if (list.every((e) => next.includes(e.id))) next = next.filter((id) => !ids.has(id));
    store.set('seen', [...new Set([...next, drawn.start, ...drawn.cards])]);
    store.set('game', game);
    reveal = null;
    selected = null;
    return true;
  }

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
    return h('header.dr-bar',
      h('button.dr-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.dr-title', titleText),
      h('button.dr-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- vue : partie
  function renderPlay() {
    resetView();
    container.classList.add('is-play');
    if (!game && !newGame()) return renderEmpty();
    if (!reveal && game.answers.length >= game.cards.length) return renderEnd();

    const index = reveal ? reveal.index : game.answers.length;
    const total = game.cards.length;
    const current = byId.get(reveal ? reveal.id : game.cards[index]);
    const placedYears = yearsOf(game.placed);
    const th = themeOf(current);

    // ---- la frise
    const items = [];
    const zones = [];
    game.placed.forEach((id, i) => {
      if (!reveal) items.push(zoneEl(i));
      items.push(timelineCard(byId.get(id), reveal && id === reveal.id ? (reveal.ok ? 'is-new is-ok' : 'is-new is-ko') : ''));
    });
    if (!reveal) items.push(zoneEl(game.placed.length));

    function zoneEl(zi) {
      const [a, b] = zoneLabel(placedYears, zi);
      const el = h('button.dr-zone', {
        type: 'button', 'aria-pressed': String(selected === zi),
        'aria-label': `${a} ${b}`.trim(),
        onclick: () => select(zi),
      }, h('span.dr-zone-a', a), b ? h('span.dr-zone-b', b) : null);
      if (selected === zi) el.classList.add('is-sel');
      zones[zi] = el;
      return el;
    }
    const track = h('div.dr-track', items);
    const frise = h('div.dr-frise', { role: 'group', 'aria-label': 'Frise chronologique' }, track);

    // ---- l'événement
    const verdict = reveal
      ? h('p.dr-verdict', { class: `dr-verdict ${reveal.ok ? 'is-ok' : 'is-ko'}` },
        reveal.ok ? [icon('check'), ' Bien placé !'] : 'Raté !',
        h('span.dr-verdict-year', `${reveal.ok ? '' : 'C’était en '}${current.year}`))
      : null;
    const card = h('article.dr-event', { style: `--dr-hue: ${th.hue}`, class: `dr-event${reveal ? (reveal.ok ? ' is-ok' : ' is-ko') : ''}` },
      verdict,
      h('div.dr-event-head',
        h('span.dr-theme', th.label),
        h('span.dr-place', `${current.scope === 'france' ? 'France' : 'Monde'} · ${current.place}`)
      ),
      h('h2.dr-event-title', current.title),
      h('p.dr-event-text', current.summary)
    );

    // ---- action
    const last = index + 1 >= total;
    const action = reveal
      ? h('button.dr-btn.dr-btn-primary.dr-action', { type: 'button', onclick: next }, last ? 'Voir le score' : 'Carte suivante', icon('next'))
      : h('button.dr-btn.dr-btn-primary.dr-action', { type: 'button', disabled: selected == null, onclick: place },
        selected == null ? 'Touche une période' : 'Placer ici');
    const announce = h('p.dr-sr', { role: 'status', 'aria-live': 'polite' },
      reveal ? `${reveal.ok ? 'Bien placé' : 'Raté'} : ${current.title}, ${current.year}.` : '');

    const stage = h('section.dr-stage',
      h('div.dr-meta',
        h('span.dr-counter', `Carte ${Math.min(index + 1, total)} / ${total}`),
        h('span.dr-score', icon('check'), h('strong', scoreOf(game)), ` bien placée${scoreOf(game) > 1 ? 's' : ''}`)
      ),
      frise,
      h('div.dr-gap', { 'aria-hidden': 'true' }),
      h('div.dr-bottom', card, h('div.dr-actions', action))
    );
    container.replaceChildren(topBar('Dans la rue'), stage, announce);

    // Position de la frise : la carte posée, la zone choisie, ou la dernière carte ajoutée
    requestAnimationFrame(() => {
      let target = null;
      if (reveal) target = track.querySelector('.dr-tcard.is-new');
      else if (selected != null) target = zones[selected];
      else {
        const lastId = game.answers.length ? game.answers[game.answers.length - 1].id : game.start;
        target = [...track.querySelectorAll('.dr-tcard')][game.placed.indexOf(lastId)];
      }
      if (target) centerIn(frise, target, false);
      if (reveal || selected != null) action.focus({ preventScroll: true });
    });

    function select(zi) {
      if (reveal) return;
      selected = zi;
      zones.forEach((z, k) => {
        z.classList.toggle('is-sel', k === zi);
        z.setAttribute('aria-pressed', String(k === zi));
      });
      action.disabled = false;
      action.textContent = 'Placer ici';
      centerIn(frise, zones[zi], true);
    }

    function place() {
      if (reveal || selected == null) return;
      const ok = isRightZone(placedYears, selected, current.year);
      const at = insertIndex(placedYears, current.year, selected);
      game.placed.splice(at, 0, current.id);
      game.answers.push({ id: current.id, zone: selected, ok });
      store.set('game', game);
      reveal = { id: current.id, ok, index };
      selected = null;
      if (!ok) navigator.vibrate?.(120);
      renderPlay();
    }

    function next() {
      reveal = null;
      selected = null;
      renderPlay();
    }

    onKey((e) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.target.closest?.('input, select, textarea')) return;
      if (e.key === 'Enter' && document.activeElement !== action) {
        e.preventDefault();
        if (reveal) next(); else place();
      } else if (!reveal && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const n = game.placed.length;
        const from = selected ?? (e.key === 'ArrowRight' ? -1 : n + 1);
        select(Math.max(0, Math.min(n, from + (e.key === 'ArrowRight' ? 1 : -1))));
      }
    });
  }

  function timelineCard(e, cls = '') {
    return h('div.dr-tcard', { class: `dr-tcard ${cls}`.trim(), style: `--dr-hue: ${themeOf(e).hue}`, title: e.title },
      h('strong.dr-tyear', e.year),
      h('span.dr-ttitle', e.title)
    );
  }

  /** Centre un élément dans la frise (défilement horizontal seulement). */
  function centerIn(scroller, el, smooth) {
    const left = el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
  }

  // ---------------------------------------------------------------- vue : pas assez d'événements
  function renderEmpty() {
    container.classList.remove('is-play');
    container.replaceChildren(
      topBar('Dans la rue'),
      h('section.dr-panel',
        h('h2', 'Pas assez d’événements'),
        h('p.dr-small', `Avec ces réglages, il n’y a que ${pool().length} événement${pool().length > 1 ? 's' : ''} : il en faut au moins ${MIN_POOL}. Élargis la période, le terrain ou les thèmes.`),
        h('button.dr-btn.dr-btn-primary.dr-wide', { type: 'button', onclick: () => ctx.navigate('reglages') }, 'Ouvrir les réglages')
      )
    );
  }

  // ---------------------------------------------------------------- vue : fin de partie
  function renderEnd() {
    container.classList.remove('is-play');
    const score = scoreOf(game);
    const max = game.cards.length;
    let best = store.get('best', null);
    let isRecord = false;
    if (!game.counted) {
      game.counted = true;
      store.set('played', store.get('played', 0) + 1);
      if (!best || score / max > best.score / best.max || (score / max === best.score / best.max && max > best.max)) {
        best = { score, max, date: Date.now() };
        store.set('best', best);
        isRecord = true;
      }
      game.record = isRecord;
      store.set('game', game);
    } else isRecord = Boolean(game.record);

    const okOf = new Map(game.answers.map((a) => [a.id, a.ok]));
    const rows = game.placed.map((id) => {
      const e = byId.get(id);
      const ok = okOf.get(id);
      return h('li', { class: ok == null ? 'is-start' : ok ? 'is-ok' : 'is-ko' },
        h('span.dr-mark', ok == null ? '•' : ok ? '✓' : '✗'),
        h('strong.dr-end-year', e.year),
        h('span', e.title, h('small', `${e.scope === 'france' ? 'France' : 'Monde'} · ${e.place}`))
      );
    });
    const replay = h('button.dr-btn.dr-btn-primary', { type: 'button', onclick: () => { newGame(); renderPlay(); } }, 'Rejouer');
    container.replaceChildren(
      topBar('Dans la rue'),
      h('section.dr-end',
        h('h2', 'Partie terminée'),
        h('p.dr-end-score', h('strong', score), ` / ${max}`),
        h('p.dr-small', `${score} événement${score > 1 ? 's' : ''} bien placé${score > 1 ? 's' : ''} · ${SCOPES[game.settings.scope] || SCOPES.all}, depuis ${game.settings.since}`),
        isRecord ? h('p.dr-record', icon('trophy'), ' Nouveau record !') : best ? h('p.dr-small', `Record : ${best.score} / ${best.max}`) : null,
        h('div.dr-end-actions',
          h('button.dr-btn', { type: 'button', onclick: ctx.home }, icon('home'), 'Accueil'),
          h('button.dr-btn', { type: 'button', onclick: () => ctx.navigate('reglages') }, icon('settings'), 'Réglages'),
          replay
        ),
        h('h3', 'Ta frise'),
        h('ol.dr-end-list', rows)
      )
    );
    window.scrollTo(0, 0);
    replay.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    const count = h('p.dr-count');
    const startBtn = h('button.dr-btn.dr-btn-primary.dr-wide', { type: 'button', onclick: () => {
      if (newGame()) ctx.navigate();
    } }, 'Nouvelle partie avec ces réglages');
    function save(patch) {
      settings = { ...settings, ...patch };
      store.set('settings', settings);
      refresh();
    }
    function refresh() {
      const n = pool().length;
      count.replaceChildren(h('strong', n), ` événement${n > 1 ? 's' : ''} sur ${events.length} correspondent à ces réglages.`);
      count.classList.toggle('is-low', n < MIN_POOL);
      startBtn.disabled = n < MIN_POOL;
    }

    const radio = (name, value, label) => h('label.dr-chip',
      h('input', { type: 'radio', name, value: String(value), checked: settings[name] === value, onchange: () => save({ [name]: value }) }),
      h('span', label)
    );
    const allThemes = Object.keys(THEMES);
    const themeBoxes = allThemes.map((k) => {
      const on = !settings.themes || settings.themes.includes(k);
      return h('label.dr-chip.dr-chip-theme', { style: `--dr-hue: ${THEMES[k].hue}` },
        h('input', { type: 'checkbox', value: k, checked: on, onchange: () => {
          const picked = themeBoxes.map((l) => l.querySelector('input')).filter((i) => i.checked).map((i) => i.value);
          save({ themes: picked.length === allThemes.length ? null : picked });
        } }),
        h('span', THEMES[k].label, h('small', ` ${events.filter((e) => e.theme === k).length}`))
      );
    });
    const setAllThemes = (on) => {
      themeBoxes.forEach((l) => { l.querySelector('input').checked = on; });
      save({ themes: on ? null : [] });
    };

    let armed = false;
    const resetBtn = h('button.dr-btn.dr-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Confirmer : effacer'; return; }
      store.remove('best');
      store.remove('played');
      resetBtn.textContent = '✓ Scores effacés';
      resetBtn.disabled = true;
    } }, 'Effacer mes scores');
    const best = store.get('best', null);
    const played = store.get('played', 0);
    const inGame = game && game.answers.length < game.cards.length;

    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.dr-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.dr-small', 'Une carte est déjà posée sur la frise. Pour chaque événement, lis le résumé et touche la période où il s’est passé : avant, entre ou après les cartes déjà posées. Une bonne place rapporte un point ; bonne ou mauvaise, la carte rejoint la frise à sa vraie place. Deux événements de la même année se placent dans n’importe quel ordre.')
        ),
        h('fieldset', h('legend', 'Terrain'),
          h('div.dr-chips', Object.entries(SCOPES).map(([k, label]) => radio('scope', k, label)))
        ),
        h('fieldset', h('legend', 'Depuis'),
          h('div.dr-chips', SINCE.map((y) => radio('since', y, y === SINCE[0] ? `${y} (tout)` : String(y))))
        ),
        h('fieldset', h('legend', 'Thèmes'),
          h('div.dr-chips', themeBoxes),
          h('div.dr-row',
            h('button.dr-btn.dr-btn-ghost', { type: 'button', onclick: () => setAllThemes(true) }, 'Tout cocher'),
            h('button.dr-btn.dr-btn-ghost', { type: 'button', onclick: () => setAllThemes(false) }, 'Tout décocher')
          )
        ),
        count,
        startBtn,
        inGame ? h('button.dr-btn.dr-btn-ghost.dr-wide', { type: 'button', onclick: () => ctx.navigate() }, 'Reprendre la partie en cours') : null,
        h('fieldset', h('legend', 'Scores'),
          h('p.dr-small', best ? `Record : ${best.score} / ${best.max}. Parties terminées : ${played}.` : `Pas encore de record. Parties terminées : ${played}.`),
          resetBtn
        ),
        h('p.dr-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
    refresh();
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view] = path || [];
    if (view === 'reglages') renderSettings();
    else renderPlay();
    window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('dr', 'is-play');
    },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
