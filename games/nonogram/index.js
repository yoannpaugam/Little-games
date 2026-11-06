// Jeu « Nonogramme » : noircir les cases d'une grille d'après les indices des lignes et des colonnes.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path     : sous-chemin de l'URL ([] | ['reglages'])
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.32.0';
import { createStore } from '../../js/core/storage.js?v=1.32.0';
import { LEVELS, levelById, generate, cluesOf, isSolved, lineMatches, rowOf, colOf, formatTime } from './nonogram.js?v=1.32.0';

const store = createStore('nonogramme', { version: 1 });
const EMPTY = 0, FILL = 1, CROSS = 2;
const CLUE_RATIO = 0.62; // largeur d'un chiffre d'indice, en fraction de case

export function mount(container, ctx) {
  ensureStyles();
  container.classList.add('ng');

  // ---------------------------------------------------------------- état
  const settings = { level: 'facile', ...store.get('settings', {}) };
  let best = store.get('best', {});     // { niveau: ms }
  let solved = store.get('solved', {}); // { niveau: nombre de grilles résolues }
  let game = null;   // grille en cours du niveau choisi
  let cleanup = [];
  let tick = null;

  const mq = window.matchMedia ? window.matchMedia('(max-height: 520px) and (orientation: landscape) and (min-width: 600px)') : null;

  function saveSettings() { store.set('settings', settings); }
  // Partie : { n, sol: '0101…', cells: '0012…', time (ms), done }
  function loadGame(levelId) {
    const lv = levelById(levelId);
    const g = store.get('game:' + lv.id, null);
    if (g && g.n === lv.size && g.sol?.length === lv.size ** 2 && g.cells?.length === lv.size ** 2) return hydrate(g);
    return newGame(lv.id);
  }
  function hydrate(g) {
    const sol = [...g.sol].map(Number);
    return { level: g.level, n: g.n, sol, cells: [...g.cells].map(Number), time: g.time || 0, done: !!g.done, clues: cluesOf(sol, g.n), undo: [] };
  }
  function newGame(levelId) {
    const lv = levelById(levelId);
    const { grid } = generate(lv.size);
    const g = { level: lv.id, n: lv.size, sol: grid, cells: new Array(lv.size ** 2).fill(EMPTY), time: 0, done: false, clues: cluesOf(grid, lv.size), undo: [] };
    persist(g);
    return g;
  }
  function persist(g = game) {
    if (!g) return;
    store.set('game:' + g.level, { level: g.level, n: g.n, sol: g.sol.join(''), cells: g.cells.join(''), time: Math.round(g.time), done: g.done });
  }
  const hasProgress = (g) => !g.done && g.cells.some((v) => v !== EMPTY);

  // Chronomètre : il tourne quand l'écran de jeu est visible et la grille pas encore résolue
  let lastTick = 0;
  function startClock(show) {
    stopClock();
    lastTick = performance.now();
    tick = setInterval(() => {
      const now = performance.now();
      if (game && !game.done && document.visibilityState === 'visible') game.time += now - lastTick;
      lastTick = now;
      show();
    }, 500);
  }
  function stopClock() {
    if (tick) { clearInterval(tick); tick = null; }
    if (game && !game.done && lastTick) game.time += performance.now() - lastTick;
    lastTick = 0;
  }

  function resetView() {
    stopClock();
    persist();
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }
  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanup.push(() => target.removeEventListener(type, fn, opts));
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back, extra } = {}) {
    return h('header.ng-bar',
      h('button.ng-icon-btn', { type: 'button', title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.ng-title', titleText),
      extra || null,
      h('button.ng-icon-btn', { type: 'button', title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- vue : partie
  function renderPlay() {
    resetView();
    container.classList.add('is-play');
    if (!game || game.level !== settings.level) game = loadGame(settings.level);
    const g = game, n = g.n;

    // --- nouvelle grille (bouton en haut) : confirmation si une grille est commencée
    let armT = null;
    const newTxt = h('span.ng-new-txt', 'Nouvelle grille');
    const newBtn = h('button.ng-new.ng-new-wide', { type: 'button', title: 'Nouvelle grille', onclick: () => {
      if (hasProgress(game) && !armT) {
        newTxt.textContent = 'Confirmer ?';
        newBtn.classList.add('armed');
        armT = setTimeout(() => { armT = null; newTxt.textContent = 'Nouvelle grille'; newBtn.classList.remove('armed'); }, 3000);
        return;
      }
      clearTimeout(armT); armT = null;
      game = newGame(settings.level);
      renderPlay();
    } }, refreshIcon(), newTxt);
    cleanup.push(() => clearTimeout(armT));

    // --- niveaux
    const levels = h('div.ng-levels', { role: 'radiogroup', 'aria-label': 'Niveau' },
      LEVELS.map((lv) => h('button.ng-level' + (lv.id === settings.level ? '.on' : ''), {
        type: 'button', role: 'radio', 'aria-checked': String(lv.id === settings.level),
        onclick: () => { if (lv.id === settings.level) return; persist(); settings.level = lv.id; saveSettings(); game = loadGame(lv.id); renderPlay(); },
      }, h('span', lv.label), h('small', `${lv.size}×${lv.size}`)))
    );
    const clock = h('span.ng-clock', { 'aria-label': 'Temps' });
    const bestEl = h('span.ng-bestline');

    // --- grille
    const rowClues = g.clues.rows, colClues = g.clues.cols;
    // largeur des indices de ligne, en chiffres : un nombre à deux chiffres compte pour 1,5
    const rcl = Math.max(1, ...rowClues.map((c) => c.reduce((a, x) => a + (x >= 10 ? 1.5 : 1), 0) + 0.2));
    const ccl = Math.max(1, ...colClues.map((c) => c.length));
    const rowEls = rowClues.map((c, r) => h('div.ng-rclue', { style: { gridRow: String(r + 2) } }, (c.length ? c : [0]).map((x) => h('span', x))));
    const colEls = colClues.map((c, cIdx) => h('div.ng-cclue', { style: { gridColumn: String(cIdx + 2) } }, (c.length ? c : [0]).map((x) => h('span', x))));
    const cells = g.cells.map((_, i) => {
      const r = Math.floor(i / n), c = i % n;
      const b = h('button.ng-cell', { type: 'button', tabindex: i === 0 ? '0' : '-1', 'aria-label': `Ligne ${r + 1}, colonne ${c + 1}` });
      b.dataset.i = i;
      b.style.gridRow = String(r + 2);
      b.style.gridColumn = String(c + 2);
      if (c === 0) b.classList.add('bl');
      if (r === 0) b.classList.add('bt');
      if (c % 5 === 4) b.classList.add('br');
      if (r % 5 === 4) b.classList.add('bb');
      return b;
    });
    const board = h('div.ng-grid', { role: 'grid', 'aria-label': `Grille de ${n} × ${n}` }, h('div.ng-corner'), colEls, rowEls, cells);
    board.style.setProperty('--n', n);
    board.style.setProperty('--rcl', rcl);
    board.style.setProperty('--ccl', ccl);
    const boardBox = h('div.ng-boardbox', board);

    // --- outils
    const winPanel = h('div.ng-win', { hidden: true });

    container.replaceChildren(
      topBar('Nonogramme'),
      h('section.ng-play',
        h('div.ng-head', levels, h('div.ng-meta', clock, bestEl)),
        h('div.ng-main', boardBox, h('div.ng-side', winPanel, newBtn))
      )
    );

    // --- affichage
    function paint(i) {
      const el = cells[i], v = g.cells[i];
      el.classList.toggle('fill', v === FILL);
      el.classList.toggle('cross', v === CROSS);
    }
    function markLines() {
      for (let k = 0; k < n; k++) {
        rowEls[k].classList.toggle('done', lineMatches(rowOf(g.cells, n, k), rowClues[k]));
        colEls[k].classList.toggle('done', lineMatches(colOf(g.cells, n, k), colClues[k]));
      }
    }
    function showClock() { clock.textContent = '⏱ ' + formatTime(g.time); }
    function showBest() { bestEl.textContent = best[g.level] ? 'Record ' + formatTime(best[g.level]) : ''; }
    function sync() {
      container.classList.toggle('is-done', g.done);
      board.dataset.locked = String(g.done);
      winPanel.hidden = !g.done;
      if (g.done) {
        winPanel.replaceChildren(
          h('p.ng-win-title', 'Bravo !'),
          h('p.ng-win-time', `Grille résolue en ${formatTime(g.time)}`),
          g.record ? h('p.ng-win-record', icon('trophy'), 'Nouveau record !') : null
        );
      }
    }
    // Taille des cases : la plus grande qui fait tenir la grille et ses indices dans la place restante
    function fit() {
      const w = boardBox.clientWidth, hh = boardBox.clientHeight;
      if (!w || !hh) return;
      const cell = Math.floor(Math.min(w / (n + rcl * CLUE_RATIO), hh / (n + ccl * CLUE_RATIO)));
      container.style.setProperty('--ng-cell', Math.max(12, Math.min(n <= 5 ? 64 : 44, cell)) + 'px');
    }

    // --- coups : un « trait » = toutes les cases modifiées entre l'appui et le relâchement
    let stroke = null; // { target, changes: Map(i → ancienne valeur), start: [r, c], axis }
    function apply(i) {
      if (!stroke || stroke.changes.has(i) && g.cells[i] === stroke.target) return;
      const v = g.cells[i];
      // Un trait de remplissage ne recouvre pas les croix (et inversement) ; effacer n'efface que le même type
      if (stroke.target === EMPTY ? v !== stroke.from : v !== EMPTY && v !== stroke.target) return;
      if (v === stroke.target) return;
      if (!stroke.changes.has(i)) stroke.changes.set(i, v);
      g.cells[i] = stroke.target;
      paint(i);
    }
    function begin(i, useMode) {
      if (g.done) return;
      const v = g.cells[i];
      const target = v === useMode ? EMPTY : useMode;
      stroke = { target, from: v, changes: new Map(), start: [Math.floor(i / n), i % n], axis: null };
      apply(i);
    }
    function moveTo(i) {
      if (!stroke) return;
      const r = Math.floor(i / n), c = i % n, [r0, c0] = stroke.start;
      // Le trait reste sur la ligne ou la colonne de départ
      if (!stroke.axis && (r !== r0 || c !== c0)) stroke.axis = Math.abs(r - r0) >= Math.abs(c - c0) ? 'col' : 'row';
      if (!stroke.axis) return;
      const tr = stroke.axis === 'col' ? r : r0, tc = stroke.axis === 'col' ? c0 : c;
      const [a, b] = stroke.axis === 'col' ? [r0, tr] : [c0, tc];
      for (let k = Math.min(a, b); k <= Math.max(a, b); k++) apply(stroke.axis === 'col' ? k * n + c0 : r0 * n + k);
    }
    function end() {
      if (!stroke) return;
      if (stroke.changes.size) {
        g.undo.push(stroke.changes);
        if (g.undo.length > 200) g.undo.shift();
        afterChange();
      }
      stroke = null;
    }
    function undo() {
      const last = g.undo.pop();
      if (!last || g.done) return;
      last.forEach((v, i) => { g.cells[i] = v; paint(i); });
      afterChange();
    }
    function afterChange() {
      markLines();
      if (isSolved(g.cells, n, g.clues)) win();
      else persist();
      sync();
    }
    function win() {
      stopClock();
      g.done = true;
      g.cells = g.cells.map((v) => (v === FILL ? FILL : EMPTY));
      cells.forEach((_, i) => paint(i));
      g.record = !best[g.level] || g.time < best[g.level];
      if (g.record) { best = { ...best, [g.level]: Math.round(g.time) }; store.set('best', best); }
      solved = { ...solved, [g.level]: (solved[g.level] || 0) + 1 };
      store.set('solved', solved);
      persist();
      showClock(); showBest();
      board.classList.add('won');
      try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch { /* sans vibreur */ }
      setTimeout(() => newBtn.focus({ preventScroll: true }), 50);
    }

    // --- événements (souris, doigt, stylet) : appui long ou clic droit = croix
    const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('.ng-cell');
    let pid = null;
    listen(board, 'pointerdown', (e) => {
      const b = e.target.closest('.ng-cell');
      if (!b || g.done || pid != null) return;
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      pid = e.pointerId;
      try { board.setPointerCapture(pid); } catch { /* ancien navigateur */ }
      b.focus({ preventScroll: true });
      const i = +b.dataset.i;
      begin(i, e.button === 2 ? CROSS : FILL);
      // Doigt ou stylet : un appui long sans bouger pose une croix à la place
      if (e.pointerType !== 'mouse') {
        clearTimeout(pressT);
        pressT = setTimeout(() => {
          if (!stroke || stroke.axis || stroke.target === CROSS) return;
          stroke.changes.forEach((v, k) => { g.cells[k] = v; paint(k); });
          begin(i, CROSS);
          try { if (navigator.vibrate) navigator.vibrate(25); } catch { /* sans vibreur */ }
        }, 450);
      }
    });
    let pressT = null;
    cleanup.push(() => clearTimeout(pressT));
    listen(board, 'pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const b = cellAt(e.clientX, e.clientY);
      if (b && board.contains(b)) moveTo(+b.dataset.i);
    });
    const up = (e) => { if (e.pointerId !== pid) return; clearTimeout(pressT); pid = null; end(); };
    listen(board, 'pointerup', up);
    listen(board, 'pointercancel', up);
    listen(board, 'contextmenu', (e) => e.preventDefault());
    // Clavier : flèches pour se déplacer, Espace ou Entrée pour remplir, X pour une croix
    listen(board, 'keydown', (e) => {
      const cur = e.target.closest('.ng-cell');
      if (!cur) return;
      const i = +cur.dataset.i;
      const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
      if (d) {
        e.preventDefault();
        const r = Math.floor(i / n) + d[0], c = (i % n) + d[1];
        if (r < 0 || r >= n || c < 0 || c >= n) return;
        cur.tabIndex = -1;
        const nx = cells[r * n + c]; nx.tabIndex = 0; nx.focus();
        return;
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'x') {
        e.preventDefault();
        begin(i, e.key.toLowerCase() === 'x' ? CROSS : FILL); end();
      }
    });
    listen(window, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });
    listen(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => fit());
      ro.observe(boardBox);
      cleanup.push(() => ro.disconnect());
    } else listen(window, 'resize', fit);
    if (mq) {
      const onMq = () => container.classList.toggle('is-landscape', mq.matches);
      onMq();
      if (mq.addEventListener) { mq.addEventListener('change', onMq); cleanup.push(() => mq.removeEventListener('change', onMq)); }
    }

    cells.forEach((_, i) => paint(i));
    if (g.done) board.classList.add('won');
    markLines();
    showClock(); showBest();
    sync();
    fit();
    startClock(showClock);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play', 'is-done', 'is-landscape');
    let armed = false;
    const resetBtn = h('button.ng-btn.ng-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      best = {}; solved = {};
      ['best', 'solved'].forEach((k) => store.remove(k));
      resetBtn.textContent = '✓ Records effacés';
      resetBtn.disabled = true;
    } }, 'Effacer mes records');
    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.ng-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.ng-hint', 'Il faut noircir des cases de la grille pour faire apparaître un dessin. Les chiffres à gauche de chaque ligne et au-dessus de chaque colonne donnent, dans l’ordre, la longueur des blocs de cases noires. Deux blocs sont toujours séparés par au moins une case blanche.'),
          h('p.ng-hint', 'Touche une case pour la noircir, ou fais glisser le doigt pour en noircir plusieurs. Un appui long (clic droit sur ordinateur) pose une croix sur une case que tu sais blanche. Ctrl+Z annule le dernier coup. Un indice s’estompe quand sa ligne est juste.'),
          h('p.ng-hint', 'Chaque grille a une seule solution, qu’on trouve par logique, sans jamais deviner. « Nouvelle grille », en bas de l’écran, en tire une autre.')
        ),
        h('fieldset', h('legend', 'Records'),
          LEVELS.map((lv) => h('p.ng-hint', h('b', `${lv.label} (${lv.size}×${lv.size}) : `),
            best[lv.id] ? `${formatTime(best[lv.id])}` : 'pas encore de record',
            solved[lv.id] ? ` · ${solved[lv.id]} grille${solved[lv.id] > 1 ? 's' : ''} résolue${solved[lv.id] > 1 ? 's' : ''}` : '')),
          resetBtn
        ),
        h('button.ng-btn.ng-btn-primary.ng-wide', { type: 'button', onclick: () => ctx.navigate() }, 'Retour au jeu'),
        h('p.ng-version', `Little Games · version ${ctx.version || '?'}`)
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
      container.classList.remove('ng', 'is-play', 'is-done', 'is-landscape');
      container.style.removeProperty('--ng-cell');
    },
  };
}

function refreshIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', 'M20 12a8 8 0 11-2.34-5.66M20 4v5h-5');
  svg.append(p);
  return svg;
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
