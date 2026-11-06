// Jeu « Le chemin » : mémoriser un chemin lumineux sur une grille, puis le retracer case par case.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path     : sous-chemin de l'URL ([] | ['reglages'])
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.41.0';
import { createStore } from '../../js/core/storage.js?v=1.41.0';
import {
  LANES, STEPS, MAX_ERRORS, MAX_VIEWS, SHOW_SECONDS, ERROR_PENALTY, EXTRA_VIEW_PENALTY,
  generatePath, computeScore,
} from './path.js?v=1.41.0';

const store = createStore('chemin', { version: 1 });
const GAP = 3, TAG_GAP = 6; // espaces entre les cases et autour des étiquettes (px), repris dans styles.css

export function mount(container, ctx) {
  ensureStyles();
  container.classList.add('ch');

  // ---------------------------------------------------------------- état
  let best = store.get('best', null); // { score, errors, views, date }
  let played = store.get('played', 0);
  let won = store.get('won', 0);
  let muted = !!store.get('muted', false);
  const sound = createSound();
  sound.setMuted(muted);

  let game = null; // partie en cours (en mémoire seulement : une partie de mémoire ne se reprend pas)
  let cleanup = [];
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const stopTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  // Paysage (téléphone couché, ordinateur) : la grille se couche, 14 colonnes × 9 lignes, le panneau passe à gauche
  const mq = window.matchMedia ? window.matchMedia('(orientation: landscape) and (min-width: 600px)') : null;
  const isLandscape = () => !!(mq && mq.matches);

  function newGame() {
    game = { views: 0, totalErrors: 0, paths: 0, msg: '', bad: false };
    newPath(game);
    return game;
  }
  // Nouveau parcours : nouveau chemin, essais et affichages remis à neuf (les erreurs et affichages comptent toujours dans le score)
  function newPath(g) {
    const path = generatePath();
    Object.assign(g, {
      path,
      order: new Map(path.map(([s, l], i) => [s * LANES + l, i])),
      phase: 'idle', // idle → showing → play (→ reset) → done
      viewsLeft: MAX_VIEWS, errors: 0, next: 0,
    });
    g.paths++;
  }
  function resetView() {
    stopTimers();
    cleanup.forEach((fn) => fn());
    cleanup = [];
    // On quitte l'écran : un affichage en cours se termine, une manche perdue repart de zéro
    if (game?.phase === 'showing') { game.phase = 'play'; game.msg = 'À toi ! Touche le chemin en partant ' + fromTxt() + '.'; game.bad = false; }
    if (game?.phase === 'reset') { newPath(game); game.msg = 'Nouveau chemin ! Touche « Voir le chemin ».'; game.bad = false; }
  }
  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanup.push(() => target.removeEventListener(type, fn, opts));
  }
  const fromTxt = () => (isLandscape() ? 'de la gauche' : 'du haut');

  function setMuted(v) {
    muted = !!v; sound.setMuted(muted); store.set('muted', muted);
    container.querySelectorAll('.ch-sound').forEach((b) => { b.replaceChildren(icon(muted ? 'mute' : 'volume')); b.setAttribute('aria-pressed', String(muted)); });
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    return h('header.ch-bar',
      h('button.ch-icon-btn', { type: 'button', title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.ch-title', titleText),
      best ? h('span.ch-best', { title: 'Meilleur score' }, 'Record ', h('strong', best.score), ' / 100') : null,
      h('button.ch-icon-btn.ch-sound', { type: 'button', title: 'Couper le son', 'aria-label': 'Couper le son', 'aria-pressed': String(muted), onclick: () => setMuted(!muted) }, icon(muted ? 'mute' : 'volume')),
      h('button.ch-icon-btn', { type: 'button', title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- vue : partie
  function renderPlay() {
    resetView();
    container.classList.add('is-play');
    if (!game) newGame();
    if (game.phase === 'done') { renderEnd(); return; }
    const g = game;

    const hearts = Array.from({ length: MAX_ERRORS }, () => h('i'));
    const leds = Array.from({ length: MAX_VIEWS }, () => h('i'));
    const bar = h('span.ch-go-bar', { 'aria-hidden': 'true' });
    const goTxt = h('span.ch-go-txt');
    const goBtn = h('button.ch-go', { type: 'button', onclick: showPath }, bar, goTxt);
    let abT = null;
    const abandonBtn = h('button.ch-link', { type: 'button', onclick: () => {
      if (g.phase === 'done') return;
      if (abT) { clearTimeout(abT); timers.delete(abT); abT = null; finish(false, true); return; }
      abandonBtn.textContent = 'Confirmer (score 0)';
      abT = later(() => { abT = null; abandonBtn.textContent = 'Abandonner'; }, 3500);
    } }, 'Abandonner');
    const feedback = h('p.ch-feedback', { role: 'status', 'aria-live': 'polite' });

    const cells = Array.from({ length: STEPS * LANES }, (_, i) => {
      const s = Math.floor(i / LANES), l = i % LANES;
      const b = h('button.ch-cell', { type: 'button', tabindex: i === 0 ? '0' : '-1', 'aria-label': '' });
      b.dataset.i = i;
      b.style.setProperty('--s', s);
      b.style.setProperty('--l', l);
      if (s === 0) b.classList.add('z-start');
      else if (s === STEPS - 1) b.classList.add('z-end');
      if (g.order.has(i) && g.order.get(i) < g.next) b.classList.add('ok');
      return b;
    });
    const grid = h('div.ch-grid', { role: 'group' }, cells);
    const tagStart = h('div.ch-tag.ch-tag-start', h('span.ch-arrow'), h('span', 'Départ'));
    const tagEnd = h('div.ch-tag.ch-tag-end', h('span.ch-arrow'), h('span', 'Arrivée'));
    const gridBox = h('div.ch-gridbox', h('div.ch-gridwrap', tagStart, grid, tagEnd));
    const stage = h('div.ch-stage', gridBox);
    const intro = h('p.ch-intro',
      'Un chemin s’allume pendant ', h('b', `${SHOW_SECONDS} secondes`), ' : mémorise-le, puis retrace-le case par case, du départ à l’arrivée. ',
      `À la ${MAX_ERRORS}e erreur, un nouveau chemin est tiré. Tu peux revoir le chemin, mais chaque nouvel affichage coûte ${EXTRA_VIEW_PENALTY} points.`
    );
    const board = h('div.ch-board',
      h('div.ch-panel',
        h('div.ch-stats',
          h('div.ch-stat', h('span.ch-label', 'Essais'), h('span.ch-hearts', hearts)),
          h('div.ch-stat', h('span.ch-label', 'Affichages'), h('span.ch-leds', leds))
        ),
        h('div.ch-actions', goBtn, abandonBtn)
      ),
      stage
    );
    container.replaceChildren(topBar('Le chemin'), h('section.ch-play', intro, board, feedback));

    // --- affichage
    function say(t, bad) { g.msg = t; g.bad = !!bad; feedback.textContent = t; feedback.className = 'ch-feedback ' + (t ? (bad ? 'bad' : 'good') : ''); }
    function sync() {
      container.classList.toggle('is-started', g.phase !== 'idle');
      grid.dataset.locked = String(g.phase !== 'play');
      goBtn.disabled = !(g.phase === 'idle' || g.phase === 'play') || g.viewsLeft <= 0;
      leds.forEach((el, i) => el.classList.toggle('on', i < g.viewsLeft));
      hearts.forEach((el, i) => el.classList.toggle('lost', i < g.errors));
      if (g.phase !== 'showing') goTxt.textContent = g.phase === 'idle' ? (g.paths > 1 ? 'Voir le nouveau chemin' : 'Voir le chemin') : g.viewsLeft > 0 ? `Revoir (−${EXTRA_VIEW_PENALTY} pts)` : 'Plus d’affichage';
    }
    function orient() {
      const land = isLandscape();
      container.classList.toggle('is-landscape', land);
      grid.setAttribute('aria-label', 'Grille de ' + (land ? `${STEPS} colonnes sur ${LANES} lignes` : `${LANES} colonnes sur ${STEPS} lignes`));
      cells.forEach((b, i) => {
        const s = Math.floor(i / LANES), l = i % LANES;
        b.setAttribute('aria-label', land ? `Colonne ${s + 1}, ligne ${l + 1}` : `Ligne ${s + 1}, colonne ${l + 1}`);
      });
      fit();
    }
    // Taille des cases : la plus grande qui fait tenir la grille dans la place restante (sans défilement)
    function fit() {
      const land = isLandscape();
      const cols = land ? STEPS : LANES, rows = land ? LANES : STEPS;
      let w = gridBox.clientWidth, hh = gridBox.clientHeight;
      if (!w || !hh) return;
      // Les étiquettes Départ et Arrivée encadrent la grille dans le sens du chemin
      const tags = land ? tagStart.offsetWidth + tagEnd.offsetWidth : tagStart.offsetHeight + tagEnd.offsetHeight;
      if (land) w -= tags + 2 * TAG_GAP; else hh -= tags + 2 * TAG_GAP;
      const cell = Math.floor(Math.min((w - GAP * (cols - 1)) / cols, (hh - GAP * (rows - 1)) / rows));
      container.style.setProperty('--ch-cell', Math.max(14, Math.min(46, cell)) + 'px');
    }

    // --- déroulement
    function showPath() {
      if ((g.phase !== 'idle' && g.phase !== 'play') || g.viewsLeft <= 0) return;
      g.phase = 'showing'; g.viewsLeft--; g.views++;
      say('');
      sync();
      fit(); // l'introduction disparaît : la grille peut grandir
      g.path.forEach(([s, l]) => cells[s * LANES + l].classList.add('lit'));
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)'; void bar.offsetWidth;
      bar.style.transition = `transform ${SHOW_SECONDS}s linear`; bar.style.transform = 'scaleX(0)';
      const end = Date.now() + SHOW_SECONDS * 1000;
      const tick = () => {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        goTxt.textContent = `Mémorise… ${left} s`;
        if (Date.now() >= end) {
          cells.forEach((c) => c.classList.remove('lit'));
          bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)';
          g.phase = 'play'; sync();
          say(g.next ? 'À toi ! Continue le chemin.' : 'À toi ! Touche le chemin en partant ' + fromTxt() + '.');
          return;
        }
        later(tick, 200);
      };
      tick();
    }
    function restartRound() {
      newPath(g);
      cells.forEach((c) => c.classList.remove('ok', 'bad'));
      sync();
      say(`Nouveau chemin (parcours ${g.paths}) : touche « Voir le nouveau chemin ».`);
      goBtn.focus({ preventScroll: true });
    }
    function onCell(i) {
      if (g.phase !== 'play') return;
      const el = cells[i];
      if (el.classList.contains('ok')) return;
      if (g.order.get(i) === g.next) {
        el.classList.add('ok'); g.next++;
        sound.ok(g.next / g.path.length);
        if (g.next >= g.path.length) finish(true, false);
        return;
      }
      g.errors++; g.totalErrors++;
      el.classList.add('bad'); later(() => el.classList.remove('bad'), 600);
      sound.bad();
      try { if (navigator.vibrate) navigator.vibrate(60); } catch { /* sans vibreur */ }
      if (g.errors >= MAX_ERRORS) {
        g.phase = 'reset'; sync();
        say('Plus d’essais ! Un nouveau chemin arrive…', true);
        later(restartRound, 1500);
      } else {
        sync();
        const left = MAX_ERRORS - g.errors;
        say(`Mauvaise case ! Encore ${left} essai${left > 1 ? 's' : ''}.`, true);
      }
    }

    // --- événements
    listen(grid, 'click', (e) => { const b = e.target.closest('.ch-cell'); if (b) onCell(+b.dataset.i); });
    listen(grid, 'keydown', (e) => {
      const map = isLandscape()
        ? { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        : { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
      const d = map[e.key], cur = e.target.closest('.ch-cell');
      if (!d || !cur) return;
      e.preventDefault();
      const i = +cur.dataset.i, s = Math.floor(i / LANES) + d[0], l = (i % LANES) + d[1];
      if (s < 0 || s >= STEPS || l < 0 || l >= LANES) return;
      cur.tabIndex = -1;
      const n = cells[s * LANES + l]; n.tabIndex = 0; n.focus();
    });
    if (mq) {
      const onMq = () => orient();
      if (mq.addEventListener) { mq.addEventListener('change', onMq); cleanup.push(() => mq.removeEventListener('change', onMq)); }
      else { mq.addListener(onMq); cleanup.push(() => mq.removeListener(onMq)); }
    }
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => fit());
      ro.observe(gridBox);
      cleanup.push(() => ro.disconnect());
    } else listen(window, 'resize', fit);

    orient();
    sync();
    say(g.msg, g.bad);
    if (g.phase === 'idle') setTimeout(() => goBtn.focus({ preventScroll: true }), 50);
  }

  function finish(isWin, abandoned) {
    const g = game;
    stopTimers();
    g.phase = 'done';
    if (isWin) sound.win();
    g.score = computeScore(g.totalErrors, g.views, abandoned, g.paths);
    g.won = isWin; g.abandoned = abandoned;
    played += 1; store.set('played', played);
    if (isWin) { won += 1; store.set('won', won); }
    if (isWin && (!best || g.score > best.score || (g.score === best.score && g.totalErrors < best.errors))) {
      best = { score: g.score, errors: g.totalErrors, views: g.views, paths: g.paths, date: Date.now() };
      store.set('best', best);
      g.record = true;
    }
    // Le chemin réussi reste visible un instant avant le bilan
    if (isWin) later(renderEnd, 900); else renderEnd();
  }

  function renderEnd() {
    resetView();
    container.classList.add('is-play');
    const g = game;
    const replay = h('button.ch-btn.ch-btn-primary', { type: 'button', onclick: () => { game = null; renderPlay(); } }, 'Rejouer');
    container.replaceChildren(
      topBar('Le chemin'),
      h('section.ch-final',
        h('div.ch-seal' + (g.won ? '.won' : '.lost'), { 'aria-hidden': 'true' }, icon(g.won ? 'check' : 'close')),
        h('h2.ch-final-title', g.won ? 'Bravo, chemin retracé !' : 'Partie abandonnée'),
        h('p.ch-final-score', h('strong', g.score), ' / 100'),
        h('p.ch-final-details', `Erreurs : ${g.totalErrors} · Affichages : ${g.views}` + (g.paths > 1 ? ` · Parcours : ${g.paths}` : '')),
        g.record ? h('p.ch-final-record', icon('trophy'), 'Nouveau record !')
          : best ? h('p.ch-final-best', `Record : ${best.score} / 100`) : null,
        h('div.ch-final-actions',
          h('button.ch-btn', { type: 'button', onclick: ctx.home }, 'Accueil'),
          replay
        )
      )
    );
    setTimeout(() => replay.focus({ preventScroll: true }), 50);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play', 'is-started', 'is-landscape');
    let armed = false;
    const resetBtn = h('button.ch-btn.ch-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      best = null; played = 0; won = 0;
      ['best', 'played', 'won'].forEach((k) => store.remove(k));
      resetBtn.textContent = '✓ Scores effacés';
      resetBtn.disabled = true;
    } }, 'Effacer mes scores');
    const soundInput = h('input', { type: 'checkbox', role: 'switch', checked: muted, onchange: (e) => setMuted(e.target.checked) });
    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.ch-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.ch-hint', `Touche « Voir le chemin » : un chemin s’allume sur la grille pendant ${SHOW_SECONDS} secondes. Mémorise-le, puis touche ses cases une à une, dans l’ordre, du départ à l’arrivée.`),
          h('p.ch-hint', `Tu as droit à ${MAX_ERRORS} erreurs et ${MAX_VIEWS} affichages par parcours. À la ${MAX_ERRORS}e erreur, un nouveau chemin est tiré : il faut le mémoriser à son tour, avec à nouveau ${MAX_ERRORS} erreurs et ${MAX_VIEWS} affichages.`),
          h('p.ch-hint', `Score sur 100 : −${ERROR_PENALTY} points par erreur (tous parcours confondus), −${EXTRA_VIEW_PENALTY} par affichage après le premier de chaque parcours. Abandonner donne 0.`)
        ),
        h('fieldset', h('legend', 'Son'),
          h('label.ch-switch', soundInput, h('span.ch-switch-track', { 'aria-hidden': 'true' }), h('span', 'Couper le son'))
        ),
        h('fieldset', h('legend', 'Scores'),
          h('p.ch-hint', best
            ? `Record : ${best.score} / 100 (${best.errors} erreur${best.errors > 1 ? 's' : ''}, ${best.views} affichage${best.views > 1 ? 's' : ''}). ${won} chemin${won > 1 ? 's' : ''} réussi${won > 1 ? 's' : ''} sur ${played} partie${played > 1 ? 's' : ''}.`
            : played ? `Aucun chemin réussi pour l’instant (${played} partie${played > 1 ? 's' : ''}).` : 'Aucune partie terminée pour l’instant.'),
          resetBtn
        ),
        h('button.ch-btn.ch-btn-primary.ch-wide', { type: 'button', onclick: () => ctx.navigate() }, 'Retour au jeu'),
        h('p.ch-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
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
      sound.close();
      container.classList.remove('ch', 'is-play', 'is-started', 'is-landscape');
      container.style.removeProperty('--ch-cell');
    },
  };
}

// ------------------------------------------------------------------ son (Web Audio, sans fichier)

function createSound() {
  let ac = null, muted = false;
  const audio = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = ac || new AC();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  function tone(freqs, type, vol, dur) {
    if (muted) return;
    try {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      freqs.forEach(([f, dl]) => {
        const o = c.createOscillator(), gn = c.createGain();
        o.type = type; o.frequency.value = f;
        gn.gain.setValueAtTime(0.0001, t + dl);
        gn.gain.exponentialRampToValueAtTime(vol, t + dl + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dl + dur);
        o.connect(gn); gn.connect(c.destination);
        o.start(t + dl); o.stop(t + dl + dur + 0.02);
      });
    } catch { /* sans audio */ }
  }
  return {
    ok(p) { const f = 520 + 520 * p; tone([[f, 0], [f * 1.5, 0.07]], 'triangle', 0.16, 0.14); },
    bad() { tone([[180, 0], [130, 0.09]], 'square', 0.12, 0.2); },
    win() { tone([[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]], 'triangle', 0.16, 0.22); },
    setMuted(v) { muted = !!v; },
    close() { if (ac) { ac.close().catch(() => {}); ac = null; } },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
