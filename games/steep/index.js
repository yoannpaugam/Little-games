// Jeu « Steep » : descente sans fin à travers plusieurs mondes. On saute d'un appui, on fait des saltos en restant appuyé.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (choix du monde) | [monde, parcours] (descente) | ['reglages']

import { h, icon } from '../../js/core/dom.js?v=1.59.0';
import { createStore } from '../../js/core/storage.js?v=1.59.0';
import { WORLDS, COURSE_ORDER, worldById, isCourse } from './worlds.js?v=1.59.0';
import { createRun, step, distanceM, totalScore, crashText, autoPilot, POINTS } from './engine.js?v=1.59.0';
import { drawFrame, createCamera, followCamera } from './render.js?v=1.59.0';

const store = createStore('steep', { version: 1 });

const COURSE_LABEL = { balade: 'Balade · facile', bosses: 'Bosses · figures', abimes: 'Abîmes · difficile' };

export function mount(container, ctx) {
  ensureStyles();
  container.classList.add('st');

  let settings = { world: 'cimes', course: 'balade', ...store.get('settings', {}) };
  if (!worldById(settings.world)) settings.world = 'cimes';
  if (!isCourse(settings.course)) settings.course = 'balade';
  let best = store.get('best', {});        // { 'monde:parcours': { score, dist, flips, coins, date } }
  let played = store.get('played', 0);
  let totalM = store.get('totalM', 0);
  let muted = !!store.get('muted', false);
  const sound = createSound();
  sound.setMuted(muted);

  let cleanup = [];
  let raf = 0;
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); cleanup.push(() => target.removeEventListener(type, fn, opts)); };
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    cleanup.forEach((fn) => fn()); cleanup = [];
  }
  const saveSettings = () => store.set('settings', settings);
  const keyOf = (w, c) => `${w}:${c}`;

  function setMuted(v) {
    muted = !!v; sound.setMuted(muted); store.set('muted', muted);
    container.querySelectorAll('.st-sound').forEach((b) => { b.replaceChildren(icon(muted ? 'mute' : 'volume')); b.setAttribute('aria-pressed', String(muted)); });
  }

  function topBar(titleText, { back, extra = [], noSettings = false } = {}) {
    return h('header.st-bar',
      h('button.st-icon-btn', { type: 'button', title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.st-title', titleText),
      ...extra,
      h('button.st-icon-btn.st-sound', { type: 'button', title: 'Couper le son', 'aria-label': 'Couper le son', 'aria-pressed': String(muted), onclick: () => setMuted(!muted) }, icon(muted ? 'mute' : 'volume')),
      noSettings ? null : h('button.st-icon-btn', { type: 'button', title: 'Règles et records', 'aria-label': 'Règles et records', onclick: () => ctx.navigate('reglages') }, icon('settings')));
  }

  // Canvas qui suit la taille de son cadre, à la résolution de l'écran
  function fitCanvas(canvas, box, onResize) {
    const apply = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = hh + 'px';
      canvas.__view = { w, h: hh, dpr };
      onResize?.();
    };
    apply();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(apply);
      ro.observe(box);
      cleanup.push(() => ro.disconnect());
    } else listen(window, 'resize', apply);
  }

  // ================================================================ choix du monde et du parcours
  function renderChoice() {
    const W = worldById(settings.world);
    const preview = h('canvas.st-preview-canvas', { 'aria-hidden': 'true' });
    const previewBox = h('div.st-preview', preview,
      h('div.st-preview-text', h('strong', W.name), h('span', W.blurb)));

    const worlds = h('div.st-worlds', { role: 'radiogroup', 'aria-label': 'Monde' },
      WORLDS.map((w) => h('button.st-world' + (w.id === W.id ? '.is-on' : ''), {
        type: 'button', role: 'radio', 'aria-checked': String(w.id === W.id),
        style: `--sky0:${w.colors.sky[0]};--sky1:${w.colors.sky[1]};--gnd:${w.colors.ground[0]};--far:${w.colors.far}`,
        onclick: () => { settings.world = w.id; saveSettings(); show(); },
      }, h('span.st-world-art'), h('span.st-world-name', w.name))));

    const courses = h('div.st-courses',
      COURSE_ORDER.map((c) => {
        const b = best[keyOf(W.id, c)];
        return h('button.st-course' + (c === settings.course ? '.is-last' : ''), {
          type: 'button',
          onclick: () => { settings.course = c; saveSettings(); ctx.navigate(W.id, c); },
        },
        h('span.st-course-main', h('strong', W.courses[c]), h('span.st-course-type', COURSE_LABEL[c])),
        h('span.st-course-best', b ? [h('strong', String(b.score)), ' pts'] : 'Nouveau'));
      }));

    container.replaceChildren(
      h('div.st-screen.st-choice',
        topBar('Steep'),
        worlds,
        previewBox,
        h('p.st-hint', 'Choisis un parcours pour partir'),
        courses));

    // Aperçu animé : un planchiste automatique descend le monde choisi
    let demo = null, demoT = 0;
    const cam = createCamera();
    const fx = { particles: [], spray: [] };
    const newDemo = () => { demo = createRun({ world: W.id, course: 'abimes', seed: 7 + Math.floor(Math.random() * 1000) }); cam.ready = false; demoT = 0; };
    newDemo();
    const c2d = preview.getContext('2d');
    fitCanvas(preview, previewBox);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
      const input = autoPilot(demo, { flips: true });
      step(demo, dt, input);
      demo.events.length = 0;
      if (demo.state === 'crashed' && demo.t - demo.crash.t > 1.2) newDemo();
      const v = preview.__view;
      if (v) {
        c2d.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        followCamera(cam, demo, v.w, v.h, dt);
        drawFrame(c2d, demo, cam, v, fx, { dt, time: (demoT += dt) + 20 });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ================================================================ descente
  function renderPlay(worldId, course) {
    const W = worldById(worldId);
    if (!W || !isCourse(course)) { ctx.navigate(); return; }
    settings.world = W.id; settings.course = course; saveSettings();
    const key = keyOf(W.id, course);

    const canvas = h('canvas.st-canvas', { 'aria-label': `Descente : ${W.name}, ${W.courses[course]}` });
    const distEl = h('strong', '0');
    const scoreEl = h('strong', '0');
    const coinEl = h('strong', '0');
    const hud = h('div.st-hud', { 'aria-live': 'off' },
      h('span.st-hud-dist', distEl, ' m'),
      h('span.st-hud-score', scoreEl, ' pts'),
      h('span.st-hud-coins', h('i.st-coin-ico', { 'aria-hidden': 'true' }), coinEl));
    const pop = h('div.st-pop', { 'aria-live': 'polite' });
    const overlay = h('div.st-overlay');
    const stage = h('div.st-stage', canvas, hud, pop, overlay);
    const pauseBtn = h('button.st-icon-btn', { type: 'button', title: 'Pause', 'aria-label': 'Pause', onclick: () => togglePause() }, icon('pause'));

    container.replaceChildren(
      h('div.st-screen.st-play',
        topBar(h('span', W.name, h('small', ' · ' + W.courses[course])), { back: () => ctx.navigate(), extra: [pauseBtn], noSettings: true }),
        stage));

    const c2d = canvas.getContext('2d');
    let run, cam, fx, phase, held = false, fresh = false, releaseAfter = false, paused = false, popTimer = 0, crashShown = false;
    function reset() {
      run = createRun({ world: W.id, course, seed: (Math.random() * 2 ** 31) >>> 0 });
      cam = createCamera();
      fx = { particles: [], spray: [] };
      phase = 'ready';
      held = false; fresh = false; releaseAfter = false; crashShown = false;
      showReady();
      updateHud();
      draw(0);
    }

    function showReady() {
      const b = best[key];
      overlay.replaceChildren(h('div.st-card',
        h('p.st-card-kicker', W.name),
        h('h2.st-card-title', W.courses[course]),
        h('p.st-card-sub', COURSE_LABEL[course]),
        h('ul.st-rules',
          h('li', h('strong', 'Appuie'), ' : tu te baisses et tu prends de la vitesse.'),
          h('li', h('strong', 'Lâche'), ' pour sauter : plus tu es resté baissé, plus tu sautes loin. Choisis bien le moment !'),
          h('li', h('strong', 'En l’air'), ', appuie à nouveau et reste appuyé pour un salto arrière.')),
        b ? h('p.st-card-best', 'Record : ', h('strong', b.score), ' pts · ', b.dist, ' m') : null,
        h('p.st-go', 'Touche l’écran pour partir')));
      overlay.hidden = false;
    }

    function showPause() {
      overlay.replaceChildren(h('div.st-card',
        h('h2.st-card-title', 'Pause'),
        h('div.st-actions',
          h('button.st-btn.st-btn-primary', { type: 'button', onclick: (e) => { e.stopPropagation(); togglePause(false); } }, 'Reprendre'),
          h('button.st-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); reset(); } }, 'Recommencer'),
          h('button.st-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); ctx.navigate(); } }, 'Changer de parcours'))));
      overlay.hidden = false;
      overlay.querySelector('.st-btn-primary')?.focus();
    }

    function togglePause(v = !paused) {
      if (phase !== 'ride') return;
      paused = v;
      held = false;
      if (paused) showPause(); else { overlay.hidden = true; overlay.replaceChildren(); last = performance.now(); }
    }

    function showCrash() {
      crashShown = true;
      const score = totalScore(run);
      const dist = distanceM(run);
      const prev = best[key];
      const record = !prev || score > prev.score;
      if (record) { best[key] = { score, dist, flips: run.flips, coins: run.coins, date: new Date().toISOString().slice(0, 10) }; store.set('best', best); }
      played++; store.set('played', played);
      totalM += dist; store.set('totalM', totalM);
      const replay = h('button.st-btn.st-btn-primary', { type: 'button', onclick: (e) => { e.stopPropagation(); reset(); } }, icon('replay'), 'Rejouer');
      overlay.replaceChildren(h('div.st-card.st-end',
        h('p.st-card-kicker', crashText(run.crash.reason, W.id)),
        h('p.st-big', h('strong', score), ' pts'),
        record && prev ? h('p.st-record', 'Nouveau record !') : prev ? h('p.st-card-best', 'Record : ', h('strong', prev.score), ' pts') : h('p.st-record', 'Premier record !'),
        h('dl.st-stats',
          h('div', h('dt', 'Distance'), h('dd', dist, ' m')),
          h('div', h('dt', 'Saltos'), h('dd', run.flips)),
          h('div', h('dt', 'Pièces'), h('dd', run.coins)),
          h('div', h('dt', 'Réceptions parfaites'), h('dd', run.perfects))),
        h('div.st-actions',
          replay,
          h('button.st-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); ctx.navigate(); } }, 'Changer de parcours'))));
      overlay.hidden = false;
      replay.focus();
      const head = container.querySelector('.st-bar .st-title');
      if (head && record) head.classList.add('st-flash');
    }

    function updateHud() {
      distEl.textContent = distanceM(run);
      scoreEl.textContent = run.score;
      coinEl.textContent = run.coins;
    }

    function popText(text, cls = '') {
      pop.replaceChildren(h('span.st-pop-text' + cls, text));
      popTimer = 1.3;
    }

    function handleEvents() {
      for (const e of run.events) {
        if (e.type === 'coin') sound.coin();
        else if (e.type === 'jump') sound.jump();
        else if (e.type === 'land') {
          if (e.turns > 0) {
            const name = e.turns === 1 ? 'Salto arrière' : e.turns === 2 ? 'Double salto' : `Salto ×${e.turns}`;
            popText(`${name}${e.combo > 1 ? ' · combo ×' + Math.min(e.combo, 5) : ''}  +${e.pts}`, e.perfect ? '.is-perfect' : '');
            sound.trick();
          } else if (e.perfect && e.pts) { popText(`Réception parfaite  +${POINTS.perfect}`, '.is-perfect'); sound.land(); }
          else sound.land();
        } else if (e.type === 'crash') { sound.crash(); navigator.vibrate?.(120); }
      }
      run.events.length = 0;
    }

    function draw(dt) {
      const v = canvas.__view;
      if (!v) return;
      c2d.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      followCamera(cam, run, v.w, v.h, dt || 1);
      drawFrame(c2d, run, cam, v, fx, { dt: dt || 1 / 60 });
    }

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
      if (phase === 'ride' && !paused) {
        step(run, dt, { held });
        // Un appui très bref (appui et relâchement dans la même image) compte quand même
        fresh = false;
        if (releaseAfter) { held = false; releaseAfter = false; }
        handleEvents();
        updateHud();
        if (run.state === 'crashed' && !crashShown && run.t - run.crash.t > 0.9) { phase = 'over'; showCrash(); }
        if (popTimer > 0 && (popTimer -= dt) <= 0) pop.replaceChildren();
      } else if (phase === 'over') {
        step(run, dt, {}); // la planche finit de glisser
      }
      if (!paused) draw(phase === 'ready' ? 0 : dt);
      raf = requestAnimationFrame(loop);
    };

    // ------------------------------------------------ commandes
    function press() {
      if (phase === 'ready') { phase = 'ride'; overlay.hidden = true; overlay.replaceChildren(); sound.unlock(); last = performance.now(); return; }
      if (phase !== 'ride' || paused) return;
      held = true; fresh = true;
    }
    const release = () => { if (fresh) releaseAfter = true; else held = false; };
    listen(stage, 'pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (e.button != null && e.button > 0) return;
      e.preventDefault();
      try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      press();
    });
    listen(stage, 'pointerup', release);
    listen(stage, 'pointercancel', release);
    listen(stage, 'contextmenu', (e) => e.preventDefault());
    listen(window, 'keydown', (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      const k = e.key;
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'z') {
        if (e.target.closest?.('button') && phase !== 'ride') return; // laisser l'espace activer un bouton
        e.preventDefault();
        if (!e.repeat) press();
      } else if (k === 'Escape' || k === 'p') {
        if (phase === 'ride') { e.preventDefault(); togglePause(); }
      } else if (k === 'Enter' && phase === 'ready') { e.preventDefault(); press(); }
    });
    listen(window, 'keyup', (e) => { if ([' ', 'ArrowUp', 'w', 'z'].includes(e.key)) release(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && phase === 'ride' && !paused) togglePause(true); });
    listen(window, 'blur', release);

    fitCanvas(canvas, stage, () => run && draw(0));
    reset();
    raf = requestAnimationFrame(loop);
  }

  // ================================================================ règles et records
  function renderSettings() {
    let confirmUntil = 0;
    const clearBtn = h('button.st-btn.st-btn-danger', { type: 'button' }, 'Effacer mes records');
    clearBtn.addEventListener('click', () => {
      if (Date.now() < confirmUntil) {
        best = {}; played = 0; totalM = 0;
        store.set('best', best); store.set('played', 0); store.set('totalM', 0);
        show();
        return;
      }
      confirmUntil = Date.now() + 3500;
      clearBtn.textContent = 'Confirmer : tout effacer';
      setTimeout(() => { if (clearBtn.isConnected) clearBtn.textContent = 'Effacer mes records'; }, 3500);
    });
    container.replaceChildren(
      h('div.st-screen.st-settings',
        topBar('Steep · règles', { back: () => ctx.navigate() }),
        h('div.st-page',
          h('section.st-panel',
            h('h2', 'Règle du jeu'),
            h('p', 'Une descente sans fin. Ton planchiste avance tout seul : à toi d’éviter les obstacles et de sauter les trous.'),
            h('ul',
              h('li', h('strong', 'Appuie'), ' (écran, Espace ou ↑) : le planchiste plie les jambes et accélère.'),
              h('li', h('strong', 'Lâche'), ' pour sauter. Un appui bref donne un petit saut ; resté baissé un peu plus d’une demi-seconde, le saut est complètement chargé. On peut encore sauter un instant après avoir quitté le sol.'),
              h('li', h('strong', 'Pièges'), ' : grands trous (saut chargé), îlots et piliers entre deux trous (ni trop court, ni trop loin), obstacle juste après la réception, bord d’en face plus haut. Il faut choisir à la fois la force et le moment du saut.'),
              h('li', h('strong', 'En l’air'), ', appuie à nouveau et reste appuyé pour tourner en salto arrière ; relâche pour te redresser.'),
              h('li', 'Pour te poser, la planche doit suivre la pente (à 54° près). Réception parfaite : +25 pts et un coup d’accélérateur.'),
              h('li', 'Salto : +100 pts, double salto : +400. Les saltos enchaînés sans tomber multiplient les points (jusqu’à ×5).'),
              h('li', 'Pièce : +10 pts. Chaque mètre parcouru : +1 pt.'),
              h('li', 'Un obstacle touché, un trou, un saut trop court ou une mauvaise réception : c’est la chute.'),
              h('li', 'Le parcours change à chaque descente et devient plus difficile au fil des mètres.')),
            h('p', 'Échap ou P : pause.')),
          h('section.st-panel',
            h('h2', 'Les mondes'),
            h('table.st-table',
              h('thead', h('tr', h('th', 'Monde'), COURSE_ORDER.map((c) => h('th', COURSE_LABEL[c].split(' · ')[0])))),
              h('tbody', WORLDS.map((w) => h('tr',
                h('th', { scope: 'row' }, w.name, h('small', w.blurb)),
                COURSE_ORDER.map((c) => {
                  const b = best[keyOf(w.id, c)];
                  return h('td', h('span.st-td-name', w.courses[c]), b ? h('span', h('strong', b.score), ' pts · ', b.dist, ' m') : h('span.st-muted', '—'));
                })))))),
          h('section.st-panel',
            h('h2', 'Statistiques'),
            h('p', `${played} descente${played > 1 ? 's' : ''}, ${totalM.toLocaleString('fr-FR')} m parcourus au total.`),
            h('div.st-actions', clearBtn)))));
  }

  // ================================================================ routeur
  function show(path = ctx.path) {
    stop();
    container.scrollTop = 0;
    if (path[0] === 'reglages') renderSettings();
    else if (path.length >= 2) renderPlay(path[0], path[1]);
    else renderChoice();
  }
  show();

  return {
    update(path) { show(path); },
    destroy() { stop(); sound.close(); container.classList.remove('st'); },
  };
}

// ------------------------------------------------------------------ sons (générés, sans fichier)
function createSound() {
  let ac = null, muted = false;
  const get = () => {
    if (muted) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ac.state === 'suspended') ac.resume?.();
    return ac;
  };
  function tone(freq, dur, { type = 'sine', vol = 0.08, to = null } = {}) {
    const a = get(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
    if (to) o.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }
  return {
    setMuted(v) { muted = v; },
    unlock() { get(); },
    coin() { tone(1180, 0.09, { type: 'triangle', vol: 0.05 }); },
    jump() { tone(320, 0.12, { type: 'sine', vol: 0.04, to: 520 }); },
    land() { tone(140, 0.1, { type: 'sine', vol: 0.06, to: 70 }); },
    trick() { tone(520, 0.12, { type: 'triangle', vol: 0.06, to: 1040 }); setTimeout(() => tone(780, 0.14, { type: 'triangle', vol: 0.05, to: 1300 }), 90); },
    crash() { tone(200, 0.35, { type: 'sawtooth', vol: 0.05, to: 50 }); },
    close() { try { ac?.close(); } catch { /* ignore */ } },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
