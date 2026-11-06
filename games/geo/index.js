// Jeu « Géoquizz » : placer des pays sur une carte du monde, le plus près possible.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path     : sous-chemin de l'URL ([] | ['reglages'])
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.29.0';
import { createStore } from '../../js/core/storage.js?v=1.29.0';
import { QUESTIONS, KM_FOR_ZERO_POINTS, geometry, distanceToCountry, pointsFromKm, pickQuiz } from './geo.js?v=1.29.0';

const store = createStore('geoquizz', { version: 1 });
const MAX_ZOOM = 20;
const SVG_NS = 'http://www.w3.org/2000/svg';

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('gq');
  container.replaceChildren(h('div.loading', 'Chargement de la carte…'));

  const res = await fetch(new URL('./data/world.json' + new URL(import.meta.url).search, import.meta.url));
  if (!res.ok) throw new Error(`world.json : ${res.status}`);
  const D = await res.json();
  const byCode = new Map(D.countries.map((c) => [c.c, c]));

  // ---------------------------------------------------------------- projection
  // Mercator, comme les planisphères habituels. Les données sont en équirectangulaire et reprojetées ici ;
  // les distances, elles, sont calculées sur la sphère.
  const U = D.units, W = D.width, RAD = Math.PI / 180, S = U * 180 / Math.PI;
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + Math.max(-89, Math.min(89, lat)) * RAD / 2));
  const unmerc = (m) => (2 * Math.atan(Math.exp(m)) - Math.PI / 2) / RAD;
  const M0 = merc(D.latMax), H = (M0 - merc(D.latMin)) * S;
  const X = (lon) => (lon - D.lonMin) * U, Y = (lat) => (M0 - merc(lat)) * S;
  const latOfY = (y) => unmerc(M0 - y / S);
  const wrapLon = (l) => ((l + 180) % 360 + 360) % 360 - 180; // la carte se répète à gauche et à droite
  let worldDefs = null; // tracés de la carte, calculés une fois

  function reproject(d) { // tracé M/l/z en équirectangulaire → Mercator
    let out = '', x = 0, y = 0, m;
    const re = /([Mlz])([^Mlz]*)/g;
    while ((m = re.exec(d))) {
      if (m[1] === 'z') { out += 'z'; continue; }
      const n = (m[2].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (m[1] === 'M' && i === 0) { x = n[0]; y = n[1]; out += 'M'; } else { x += n[i]; y += n[i + 1]; out += 'L'; }
        out += x + ' ' + Math.round(Y(D.latMax - y / U)) + ' ';
      }
    }
    return out;
  }
  const pathOf = (g, digits = 1) => g.polys.map((poly) => poly.map((r) => 'M' + r.pts.map(([x, y]) => X(x).toFixed(digits) + ' ' + Y(y).toFixed(digits)).join('L') + 'Z').join('')).join('');
  function buildWorld() {
    if (worldDefs) return worldDefs;
    const grid = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((l) => `M${X(l)} 0V${H}`).join('')
      + [60, 30, 0, -30].map((l) => `M0 ${Y(l)}H${W}`).join('');
    worldDefs = {
      grid,
      land: reproject(D.land),
      borders: D.countries.map((c) => pathOf(geometry(c), 0)).join(''),
    };
    return worldDefs;
  }

  // ---------------------------------------------------------------- état
  let best = store.get('best', null); // { points, km, date }
  let played = store.get('played', 0);
  let game = loadGame();
  let cleanup = [];

  function loadGame() {
    const g = store.get('game', null);
    if (g && Array.isArray(g.codes) && g.codes.every((c) => byCode.has(c)) && Array.isArray(g.results) && g.results.length < g.codes.length) return g;
    return null;
  }
  function newGame() {
    game = { codes: pickQuiz(D.countries, QUESTIONS).map((c) => c.c), results: [] };
    store.set('game', game);
    return game;
  }
  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }
  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanup.push(() => target.removeEventListener(type, fn, opts));
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back } = {}) {
    return h('header.gq-bar',
      h('button.gq-icon-btn', { type: 'button', title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.gq-title', titleText),
      best ? h('span.gq-best', { title: 'Meilleur score' }, 'Record ', h('strong', best.points), ' / 100') : null,
      h('button.gq-icon-btn', { type: 'button', title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- vue : partie
  function renderPlay() {
    resetView();
    container.classList.add('is-play');
    if (!game) newGame();
    const quiz = game.codes.map((c) => byCode.get(c));
    const N = quiz.length;
    if (game.results.length >= N) { renderFinal(); return; }
    let idx = game.results.length;
    let phase = 'ask';
    let total = game.results.reduce((s, r) => s + r.km, 0);

    const world = buildWorld();
    const svg = svgEl('svg', { class: 'gq-map', preserveAspectRatio: 'none', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    const over = svgEl('g');
    svg.append(
      svgEl('defs', {}, svgEl('g', { id: 'gq-world' },
        svgEl('path', { class: 'gq-grid', d: world.grid }),
        svgEl('path', { class: 'gq-land', d: world.land }),
        svgEl('path', { class: 'gq-borders', d: world.borders })
      )),
      svgEl('use', { href: '#gq-world', x: -W }),
      svgEl('use', { href: '#gq-world', x: W }),
      svgEl('use', { href: '#gq-world' }),
      over
    );

    const count = h('span.gq-count');
    const country = h('strong.gq-country');
    const totalEl = h('strong', fmt(total) + ' km');
    const kmEl = h('div.gq-km');
    const placeEl = h('div.gq-place');
    const noteEl = h('div.gq-note');
    // Au clavier (e.detail = 0), la carte reprend le focus pour le pays suivant ; au toucher, non (pas de mire)
    const nextBtn = h('button.gq-btn.gq-btn-primary', { type: 'button', onclick: (e) => next(e.detail === 0) });
    const result = h('div.gq-result', { hidden: true, role: 'status', 'aria-live': 'polite' }, placeEl, kmEl, noteEl, nextBtn);
    const stage = h('div.gq-stage', {
      tabindex: '0',
      'aria-label': 'Carte du monde. Touche ou clique pour placer le pays demandé. Au clavier : flèches pour déplacer, plus et moins pour zoomer, Entrée pour valider le centre de la carte.',
    },
      svg,
      h('div.gq-hud.gq-hud-q', count, h('span.gq-ask', 'Où se trouve…'), country),
      h('div.gq-hud.gq-hud-total', h('span', 'Écart total'), totalEl),
      h('div.gq-tools',
        h('button', { type: 'button', 'aria-label': 'Zoom avant', title: 'Zoom avant', onclick: () => setZoom(view.z * 1.5) }, icon('plus')),
        h('button', { type: 'button', 'aria-label': 'Zoom arrière', title: 'Zoom arrière', onclick: () => setZoom(view.z / 1.5) }, icon('minus')),
        h('button', { type: 'button', 'aria-label': 'Vue d’ensemble', title: 'Vue d’ensemble', onclick: () => resetZoom() }, icon('home'))
      ),
      result
    );
    container.replaceChildren(topBar('Géoquizz'), stage);

    // --- vue (zoom et déplacement) : le viewBox suit le format de l'écran, sans bandes vides
    let view = { cx: W / 2, cy: H / 2, z: 1 }, vb = { x: 0, y: 0, w: W, h: H };
    const rectOf = () => { const r = stage.getBoundingClientRect(); return { left: r.left || 0, top: r.top || 0, width: r.width || 1000, height: r.height || 500 }; };
    function baseSize() {
      const r = rectOf(), ar = r.width / r.height;
      let vw = W, vh = W / ar;
      if (vh < H) { vh = H; vw = vh * ar; } // toute la hauteur de la carte est visible au départ
      return { vw, vh, r };
    }
    function apply() {
      const { vw, vh } = baseSize(), w = vw / view.z, hh = vh / view.z;
      view.cx = w >= W ? W / 2 : Math.max(w / 2, Math.min(W - w / 2, view.cx));
      view.cy = hh >= H ? H / 2 : Math.max(hh / 2, Math.min(H - hh / 2, view.cy));
      vb = { x: view.cx - w / 2, y: view.cy - hh / 2, w, h: hh };
      // Le dessin attend l'image suivante : plusieurs mouvements dans la même image ne redessinent qu'une fois
      if (!frame) frame = requestAnimationFrame(render);
    }
    let frame = 0;
    function render() {
      frame = 0;
      svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      drawOverlay();
    }
    cleanup.push(() => cancelAnimationFrame(frame));
    // Pendant un zoom ou un déplacement, rendu rapide (sans lissage) ; lissé dès que la carte s'arrête
    let movingTimer = 0;
    function moving() {
      stage.classList.add('is-moving');
      clearTimeout(movingTimer);
      movingTimer = setTimeout(() => stage.classList.remove('is-moving'), 160);
    }
    cleanup.push(() => clearTimeout(movingTimer));
    function toWorld(cx, cy) { const r = rectOf(); return { x: vb.x + (cx - r.left) / r.width * vb.w, y: vb.y + (cy - r.top) / r.height * vb.h }; }
    function setZoom(z, cx, cy) { // garde fixe le point de la carte sous (cx, cy)
      const r = rectOf();
      if (cx === undefined) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
      const before = toWorld(cx, cy);
      view.z = Math.max(1, Math.min(MAX_ZOOM, z)); apply();
      const after = toWorld(cx, cy);
      view.cx += before.x - after.x; view.cy += before.y - after.y; apply();
    }
    // Vue de départ : le monde entier ; sur un écran en hauteur, où il serait tout petit,
    // on zoome un peu (la carte remplit mieux l'écran), centré sur l'Europe et l'Afrique.
    function resetZoom() {
      const { vh } = baseSize();
      const z = Math.max(1, Math.min(1.8, vh / H));
      view = { cx: z > 1 ? X(15) : W / 2, cy: z > 1 ? Y(20) : H / 2, z };
      apply();
    }
    function fitTo(minX, maxX, minY, maxY) { // cadre une zone (en degrés), avec une marge
      const midLat = (minY + maxY) / 2;
      const spanX = Math.max(maxX - minX, 10) * U * 1.5, spanY = Math.max(Y(minY) - Y(maxY), Y(midLat - 3) - Y(midLat + 3)) * 1.5;
      const { vw, vh, r } = baseSize();
      const side = r.width > 640 ? Math.min(300, r.width * 0.3) : 0; // place du panneau de résultat, à droite
      const bottom = r.width > 640 ? 0 : Math.min(170, r.height * 0.4); // sur téléphone, il est en bas
      view.cx = X((minX + maxX) / 2); view.cy = (Y(minY) + Y(maxY)) / 2;
      view.z = Math.max(1, Math.min(MAX_ZOOM, Math.min(vw * (r.width - side) / r.width / spanX, vh * (r.height - bottom) / r.height / spanY)));
      apply();
      if (side) { view.cx += side / 2 * vb.w / r.width; apply(); }
      if (bottom) { view.cy += bottom / 2 * vb.h / r.height; apply(); }
    }

    // --- réponse sur la carte : pays en surbrillance, point posé, point le plus proche
    function drawOverlay() {
      const last = game.results[idx];
      if (phase !== 'result' || !last) { over.replaceChildren(); return; }
      const u = vb.w / rectOf().width;
      const gx = X(last.guess.lon), gy = Y(last.guess.lat), nx = X(last.near.lon), ny = Y(last.near.lat);
      over.replaceChildren(...[
        svgEl('path', { class: 'gq-reveal', 'fill-rule': 'evenodd', d: pathOf(geometry(quiz[idx])) }),
        last.km > 0 ? svgEl('line', { class: 'gq-link', x1: gx, y1: gy, x2: nx, y2: ny }) : null,
        last.km > 0 ? svgEl('circle', { class: 'gq-near', cx: nx, cy: ny, r: 5 * u }) : null,
        svgEl('circle', { class: 'gq-guess', cx: gx, cy: gy, r: 7 * u }),
      ].filter(Boolean));
    }

    // --- déroulé
    function showQuestion() {
      phase = 'ask';
      result.hidden = true;
      count.textContent = `Pays ${idx + 1} / ${N}`;
      country.textContent = quiz[idx].n;
      resetZoom();
    }
    function guess(lat, lon) {
      if (phase !== 'ask') return;
      const c = quiz[idx], r = distanceToCountry(c, lat, lon);
      game.results.push({ code: c.c, km: r.km, guess: { lat: round(lat), lon: round(lon) }, near: { lat: round(r.near.lat), lon: round(r.near.lon) } });
      store.set('game', game);
      total += r.km;
      phase = 'result';
      totalEl.textContent = fmt(total) + ' km';
      placeEl.textContent = c.n;
      kmEl.textContent = r.inside ? 'Dans le mille !' : fmt(r.km) + ' km';
      kmEl.classList.toggle('is-perfect', r.inside);
      noteEl.textContent = r.inside ? 'Ton point est dans le pays : 0 km d’écart.' : 'd’écart avec sa frontière';
      nextBtn.replaceChildren(idx < N - 1 ? 'Pays suivant' : 'Voir le score', icon('next'));
      result.hidden = false;
      const b = geometry(c).bbox;
      fitTo(Math.min(b.minX, lon), Math.max(b.maxX, lon), Math.min(b.minY, lat), Math.max(b.maxY, lat));
      if (document.activeElement === stage) nextBtn.focus({ preventScroll: true });
    }
    function next(keyboard = false) {
      if (phase !== 'result') return;
      if (idx < N - 1) { idx++; showQuestion(); if (keyboard) stage.focus({ preventScroll: true }); } else renderFinal();
    }

    // --- interactions : clic ou toucher pour placer, glisser pour déplacer, pincer ou molette pour zoomer
    const ptrs = new Map();
    let pan = null, pinch = null, moved = false;
    const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; };
    listen(svg, 'pointerdown', (e) => {
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      try { svg.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
      if (ptrs.size === 1) { pan = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; moved = false; }
      else if (ptrs.size === 2) { pinch = { d: pdist(), z: view.z }; pan = null; moved = true; }
    });
    listen(svg, 'pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        moving();
        setZoom(pinch.z * pdist() / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      } else if (pan) {
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        moved = true;
        moving();
        const r = rectOf();
        view.cx = pan.cx - dx * vb.w / r.width; view.cy = pan.cy - dy * vb.h / r.height; apply();
      }
    });
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) pan = null; };
    listen(svg, 'pointerup', up);
    listen(svg, 'pointercancel', up);
    listen(svg, 'wheel', (e) => { e.preventDefault(); moving(); setZoom(view.z * (e.deltaY < 0 ? 1.3 : 1 / 1.3), e.clientX, e.clientY); }, { passive: false });
    listen(svg, 'click', (e) => {
      if (moved) { moved = false; return; }
      const w = toWorld(e.clientX, e.clientY);
      guess(Math.max(D.latMin, Math.min(D.latMax, latOfY(w.y))), wrapLon(D.lonMin + w.x / U));
    });
    listen(stage, 'keydown', (e) => {
      if (e.target !== stage) return; // les boutons gardent leur comportement
      const step = 0.15, k = e.key;
      if (k === 'ArrowLeft') view.cx -= vb.w * step;
      else if (k === 'ArrowRight') view.cx += vb.w * step;
      else if (k === 'ArrowUp') view.cy -= vb.h * step;
      else if (k === 'ArrowDown') view.cy += vb.h * step;
      else if (k === '+' || k === '=') { e.preventDefault(); setZoom(view.z * 1.5); return; }
      else if (k === '-') { e.preventDefault(); setZoom(view.z / 1.5); return; }
      else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (phase === 'ask') guess(latOfY(view.cy), wrapLon(D.lonMin + view.cx / U)); else next(true);
        return;
      } else return;
      e.preventDefault(); apply();
    });
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => apply());
      ro.observe(stage);
      cleanup.push(() => ro.disconnect());
    } else listen(window, 'resize', apply);

    showQuestion();
  }

  // ---------------------------------------------------------------- vue : score final
  function renderFinal() {
    resetView();
    container.classList.add('is-play');
    const results = game.results;
    const total = results.reduce((s, r) => s + r.km, 0);
    const points = pointsFromKm(total);
    if (!game.done) { // on ne compte la partie qu'une fois
      game.done = true;
      played += 1;
      store.set('played', played);
      if (!best || points > best.points || (points === best.points && total < best.km)) {
        best = { points, km: total, date: Date.now() };
        store.set('best', best);
        game.record = true;
      }
      store.set('game', null);
    }
    const replay = h('button.gq-btn.gq-btn-primary', { type: 'button', onclick: () => { game = null; renderPlay(); } }, 'Rejouer');
    container.replaceChildren(
      topBar('Géoquizz'),
      h('section.gq-final',
        h('p.gq-final-label', 'Partie terminée'),
        h('p.gq-final-score', h('strong', points), ' / 100'),
        h('p.gq-final-total', `Écart total : ${fmt(total)} km`),
        game.record ? h('p.gq-final-record', icon('trophy'), 'Nouveau record !')
          : best ? h('p.gq-final-best', `Record : ${best.points} / 100`) : null,
        h('div.gq-final-actions',
          h('button.gq-btn', { type: 'button', onclick: ctx.home }, 'Accueil'),
          replay
        ),
        h('table.gq-table',
          h('thead', h('tr', h('th', 'Pays'), h('th.num', 'Écart'))),
          h('tbody', results.map((r) => h('tr', h('td', byCode.get(r.code)?.n ?? r.code), h('td.num', r.km ? `${fmt(r.km)} km` : '✓ 0 km'))))
        )
      )
    );
    setTimeout(() => replay.focus(), 50);
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    let armed = false;
    const resetBtn = h('button.gq-btn.gq-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      best = null; played = 0; game = null;
      ['best', 'played', 'game'].forEach((k) => store.remove(k));
      resetBtn.textContent = '✓ Scores effacés';
      resetBtn.disabled = true;
    } }, 'Effacer mes scores');
    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.gq-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.gq-hint', `Une partie compte ${QUESTIONS} pays, répartis sur tous les continents. Pour chacun, touche la carte là où tu penses qu’il se trouve : tu peux zoomer (pincer, molette ou boutons + et −) et déplacer la carte avant de choisir.`),
          h('p.gq-hint', `L’écart est la distance entre ton point et la frontière la plus proche du pays (0 km si tu es dedans). Les écarts s’additionnent, et le score sur 100 baisse avec l’écart total : 0 à partir de ${fmt(KM_FOR_ZERO_POINTS)} km.`)
        ),
        h('fieldset', h('legend', 'Scores'),
          h('p.gq-hint', best
            ? `Record : ${best.points} / 100 (${fmt(best.km)} km d’écart). ${played} partie${played > 1 ? 's' : ''} jouée${played > 1 ? 's' : ''}.`
            : 'Aucune partie terminée pour l’instant.'),
          resetBtn
        ),
        h('fieldset', h('legend', 'Carte'),
          h('p.gq-hint', 'Contours des pays : Natural Earth (domaine public), via world-atlas.')
        ),
        h('button.gq-btn.gq-btn-primary.gq-wide', { type: 'button', onclick: () => ctx.navigate() }, 'Retour au jeu'),
        h('p.gq-version', `Little Games · version ${ctx.version || '?'}`)
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
      container.classList.remove('gq', 'is-play');
    },
  };
}

// ------------------------------------------------------------------ utilitaires

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
const round = (n) => Math.round(n * 1000) / 1000;

function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of children) if (c) el.append(c);
  return el;
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
