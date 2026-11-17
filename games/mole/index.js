// Jeu « Murdoku » : enquête par déduction, grilles infinies. On place chaque personne sur le plan
// d'après ses indices (une personne par ligne et par colonne), puis on démasque la taupe :
// la seule personne présente dans la pièce de la victime.
// 4 niveaux (plans de 4 × 4 à 7 × 7) ; chaque grille est tirée par generator.js et vérifiée par le solveur.
// Adapté du fichier « mole-hunt » fourni par Yoann (17 novembre 2026).
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (partie) | ['reglages']

import { h, icon } from '../../js/core/dom.js?v=1.56.0';
import { createStore } from '../../js/core/storage.js?v=1.56.0';
import {
  OBJECTS, MAX_POINTS, CHECK_PENALTY, ACCUSE_PENALTY, HINT_PENALTY, MAX_HINTS, LEVELS,
  key, roomAt, objectMap, peopleOf, clueText, victimText, wrongPlaced, caseScore, hintTarget,
} from './logic.js?v=1.56.0';
import { generateCase } from './generator.js?v=1.56.0';
import { avatar, furniture, walls } from './art.js?v=1.56.0';

// Format 2 (1.56.0) : une grille en cours par niveau. Le format 1 (dossier de 3 enquêtes) n'est pas repris.
const store = createStore('taupe', {
  version: 2,
  migrate(from, s) {
    if (from < 2) ['game', 'best', 'played'].forEach((k) => s.remove(k));
  },
});
const ROOM_COLORS = 7; // teintes de sol unies, une par pièce (classes r0…r6)
const levelOf = (n) => LEVELS.find((l) => l.n === n) || LEVELS[1];

/** Chaîne SVG (constantes du code, art.js) → élément. */
function svg(str, cls) {
  const doc = new DOMParser().parseFromString(str.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  if (cls) el.setAttribute('class', cls);
  return el;
}
const look = (p) => p.look || p.av;

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('mh');
  container.replaceChildren(h('div.loading', 'Ouverture du dossier…'));

  // Les 3 enquêtes d'origine servent de première grille des niveaux Facile, Moyen et Difficile.
  const url = (p) => new URL(p + new URL(import.meta.url).search, import.meta.url);
  const res = await fetch(url('./data/enquetes.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`enquetes.json : ${res.status}`);
  const originals = await res.json();

  let settings = { level: 5, ...store.get('settings', {}) };
  if (!LEVELS.some((l) => l.n === settings.level)) settings.level = 5;
  let game = null; // { level, number, case, cur: { stage, placed, crosses, locked, fails, wrong, hints, score } }
  let sel = null; // personne en main
  let focus = null; // personne dont on lit les indices (téléphone)
  let mode = 'place'; // 'place' | 'cross'
  let msg = '';
  let bad = new Set(); // personnes mal placées à la dernière vérification

  const stats = () => store.get('stats', {}); // { n: { solved, points } }
  const freshCur = () => ({ stage: 'intro', placed: {}, crosses: [], locked: [], fails: 0, wrong: 0, hints: 0 });
  const save = () => store.set(`game:${game.level}`, game);
  function resetScreen() { sel = null; focus = null; mode = 'place'; msg = ''; bad = new Set(); }

  /** La grille en cours du niveau n, ou une nouvelle. */
  function loadLevel(n) {
    const saved = store.get(`game:${n}`, null);
    if (saved && saved.case && saved.cur) { game = saved; return; }
    newGrid(n);
  }
  function newGrid(n) {
    const st = stats()[n] || { solved: 0 };
    const seen = store.get('seenOriginals', []);
    const original = originals.find((c) => c.n === n && !seen.includes(c.id));
    let cs = null;
    if (original && !st.solved) {
      cs = original;
      store.set('seenOriginals', [...seen, original.id]);
    }
    while (!cs) cs = generateCase(Math.floor(Math.random() * 2 ** 32), n);
    const number = (store.get('numbers', {})[n] || 0) + 1;
    store.set('numbers', { ...store.get('numbers', {}), [n]: number });
    game = { level: n, number, case: cs, cur: freshCur() };
    resetScreen();
    save();
  }
  function setLevel(n) {
    settings = { ...settings, level: n };
    store.set('settings', settings);
    resetScreen();
    loadLevel(n);
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back, play } = {}) {
    let armed = false;
    const dice = play ? h('button.mh-icon-btn', {
      type: 'button', title: 'Nouvelle grille', 'aria-label': 'Nouvelle grille',
      onclick: () => {
        const started = game.cur.stage === 'play' && (Object.keys(game.cur.placed).length || game.cur.crosses.length);
        if (started && !armed) {
          armed = true;
          dice.classList.add('is-armed');
          const m = container.querySelector('.mh-msg');
          if (m) m.textContent = 'Touche encore le dé pour abandonner cette grille.';
          setTimeout(() => { armed = false; dice.classList.remove('is-armed'); }, 3000);
          return;
        }
        newGrid(game.level);
        renderPlay();
      },
    }, icon('dice')) : null;
    return h('header.mh-bar',
      h('button.mh-icon-btn', { type: 'button', title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.mh-title', titleText),
      dice,
      h('button.mh-icon-btn', { type: 'button', title: 'Règles et réglages', 'aria-label': 'Règles et réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  // ---------------------------------------------------------------- vue : partie
  function renderPlay() {
    if (!game) loadLevel(settings.level);
    const cur = game.cur;
    if (cur.stage === 'intro') return renderIntro();

    container.classList.add('is-play');
    const cs = game.case;
    const people = peopleOf(cs);
    const person = (id) => people.find((p) => p.id === id);
    const objs = objectMap(cs);
    const at = (y, x) => Object.keys(cur.placed).find((id) => cur.placed[id][0] === y && cur.placed[id][1] === x) || null;
    const locked = new Set(cur.locked);
    const crosses = new Set(cur.crosses);
    const playing = cur.stage === 'play';
    if (!focus || !person(focus)) focus = sel || (people.find((p) => !cur.placed[p.id]) || people[0]).id;

    // ---- le plan
    const roomKeys = Object.keys(cs.roomNames);
    const usedRows = new Set(Object.values(cur.placed).map((c) => c[0]));
    const usedCols = new Set(Object.values(cur.placed).map((c) => c[1]));
    // Étiquette de chaque pièce : sur la plus longue suite de cases libres de la pièce (vers la droite),
    // de préférence en bas ; elle peut s'étaler sur ces cases.
    const labels = roomKeys.map((rk) => {
      let best = null;
      for (let y = 0; y < cs.n; y++) for (let x = 0; x < cs.n; x++) {
        if (cs.rooms[y][x] !== rk || objs[key(y, x)]) continue;
        let run = 0;
        while (x + run < cs.n && cs.rooms[y][x + run] === rk && !objs[key(y, x + run)]) run++;
        if (!best || run > best.run || (run === best.run && y > best.y)) best = { y, x, run };
      }
      if (!best) { // pièce entièrement meublée : première case
        const y = cs.rooms.findIndex((row) => row.includes(rk));
        best = { y, x: cs.rooms[y].indexOf(rk), run: 1 };
      }
      const pc = (v) => `${(v * 100) / cs.n}%`;
      return h('span.mh-label', { style: `left: ${pc(best.x)}; top: ${pc(best.y)}; width: ${pc(best.run)}; height: ${pc(1)}` },
        h('span', cs.roomNames[rk].name));
    });
    const cells = [];
    for (let y = 0; y < cs.n; y++) for (let x = 0; x < cs.n; x++) {
      const r = roomAt(cs, y, x);
      const t = objs[key(y, x)];
      const o = t && OBJECTS[t];
      const id = at(y, x);
      const cls = ['mh-cell', `r${roomKeys.indexOf(r) % ROOM_COLORS}`];
      const blocked = o && !o.occ;
      if (blocked) cls.push('blocked');
      if (!id && !blocked && (usedRows.has(y) || usedCols.has(x))) cls.push('line');
      if (crosses.has(key(y, x))) cls.push('x');
      if (id) {
        cls.push('has');
        if (bad.has(id)) cls.push('bad');
        if (locked.has(id)) cls.push('lock');
        if (sel === id) cls.push('sel');
      }
      const p = id && person(id);
      cells.push(h('button', {
        type: 'button', class: cls.join(' '),
        'aria-label': `Ligne ${y + 1}, colonne ${x + 1}, ${cs.roomNames[r].name}${o ? `, ${o.label}` : ''}${p ? `, ${p.name}` : ''}`,
        onclick: () => onCell(y, x),
      },
      t ? svg(furniture(t), 'mh-obj') : null,
      p ? h('span.mh-token', { title: p.name }, svg(avatar(look(p), p.dead))) : null,
      h('span.mh-cross', { 'aria-hidden': 'true' }, '✕')));
    }
    const board = h('div.mh-board', { style: `--n: ${cs.n}`, role: 'group', 'aria-label': 'Plan du bâtiment' },
      cells, svg(walls(cs)), h('div.mh-labels', { 'aria-hidden': 'true' }, labels));

    // ---- les personnes : cartes avec indices (grand écran), pastilles + indices de la personne choisie (téléphone)
    const cluesOf = (p) => (p.dead ? [victimText(cs)] : p.clues.map((c) => clueText(c, p, cs)));
    const cards = people.map((p) => {
      const placed = Boolean(cur.placed[p.id]);
      const cls = ['mh-card'];
      if (sel === p.id) cls.push('sel');
      if (placed) cls.push('placed');
      if (p.dead) cls.push('victim');
      if (bad.has(p.id)) cls.push('bad');
      if (focus === p.id) cls.push('focus');
      return h('button', {
        type: 'button', class: cls.join(' '), 'aria-pressed': String(sel === p.id), disabled: !playing,
        'aria-label': `${p.name}${p.dead ? ', victime' : ''}${placed ? ', placé' + (p.g === 'f' ? 'e' : '') : ''}. ${cluesOf(p).join(' ')}`,
        onclick: () => pick(p.id),
      },
      h('span.mh-av', svg(avatar(look(p), p.dead))),
      h('span.mh-ct',
        h('b', p.name, p.dead ? h('small', ' · victime') : null),
        h('span.mh-clues', cluesOf(p).map((c) => h('span', c)))),
      h('span.mh-st', { 'aria-hidden': 'true' }, placed ? '✓' : ''));
    });
    const fp = person(focus);
    const focusPanel = h('div.mh-focus', { 'aria-hidden': 'true', class: `mh-focus${fp.dead ? ' victim' : ''}` },
      h('b', fp.name, fp.dead ? ' · victime' : '', cur.placed[fp.id] ? h('span.mh-ok', ' ✓') : null),
      h('span.mh-clues', cluesOf(fp).map((c) => h('span', c))));

    // ---- zone du bas : personnes, accusation ou verdict
    let panel;
    let actions;
    if (cur.stage === 'accuse') {
      panel = h('div.mh-accuse',
        h('p', h('b', 'Plan reconstitué ! '), `Qui était seul avec ${lower(cs.victim.name)} dans sa pièce ?`),
        h('div.mh-accuse-list', people.filter((p) => !p.dead).map((p) =>
          h('button.mh-accuse-btn', { type: 'button', onclick: () => accuse(p.id) }, h('span.mh-av', svg(avatar(look(p)))), p.name))));
      actions = h('div.mh-actions');
    } else if (cur.stage === 'solved') {
      const m = person(cs.murderer);
      const v = cs.victim;
      panel = h('div.mh-verdict',
        h('h2', icon('check'), ` Taupe démasquée : ${m.name}`),
        h('p', `${m.name} était ${m.g === 'f' ? 'la seule suspecte' : 'le seul suspect'} ${cs.roomNames[roomAt(cs, ...v.cell)].in} avec ${lower(v.name)}. Grille notée `,
          h('b', `${cur.score} / ${MAX_POINTS}`), '.'));
      actions = h('div.mh-actions',
        h('button.mh-btn.mh-btn-primary.mh-wide', { type: 'button', onclick: () => { newGrid(game.level); renderPlay(); } }, 'Grille suivante', icon('next')));
    } else {
      panel = h('div.mh-people', h('div.mh-cards', cards), focusPanel);
      const ready = Object.keys(cur.placed).length === people.length;
      actions = h('div.mh-actions',
        h('button.mh-btn', { type: 'button', 'aria-pressed': String(mode === 'cross'), class: `mh-btn${mode === 'cross' ? ' is-on' : ''}`, onclick: toggleCross, title: 'Barrer des cases' },
          h('span.mh-x', '✕'), h('span.mh-lbl', 'Barrer')),
        h('button.mh-btn', { type: 'button', disabled: cur.hints >= MAX_HINTS, onclick: hint, title: `Indice : place une personne (−${HINT_PENALTY} pts)` },
          icon('sparkles'), h('span.mh-lbl', 'Indice'), h('small', ` ${MAX_HINTS - cur.hints}`)),
        h('button.mh-btn.mh-btn-primary', { type: 'button', disabled: !ready, onclick: verify, title: `Vérifier le plan (−${CHECK_PENALTY} pts s’il est faux)` },
          icon('check'), 'Vérifier'));
    }

    const defaultMsg = mode === 'cross' ? 'Mode barrage : touche les cases à éliminer.'
      : sel ? `Touche une case du plan pour placer ${person(sel).name}.`
        : cur.stage === 'accuse' ? 'Regarde qui partage la pièce de la victime.'
          : cur.stage === 'solved' ? '' : 'Choisis une personne, puis une case du plan.';
    const msgEl = h('p.mh-msg', { role: 'status', 'aria-live': 'polite' }, msg || defaultMsg);
    const lv = levelOf(game.level);

    const stage = h('section', { class: `mh-stage is-${cur.stage}` },
      h('div.mh-meta',
        h('span.mh-case', `${lv.label} · n° ${game.number}`, h('b', ` · ${cs.title}`)),
        h('span.mh-pts', h('strong', cur.stage === 'solved' ? cur.score : caseScore(cur)), ` / ${MAX_POINTS} pts`)),
      h('div.mh-body',
        h('div.mh-boardbox', board),
        h('div.mh-side', panel, msgEl, actions)));
    container.replaceChildren(topBar('Murdoku', { play: true }), stage);
    const focusBtn = cur.stage === 'solved' ? actions.querySelector('button') : null;
    focusBtn?.focus({ preventScroll: true });

    // ---------------------------------------------------------------- actions
    function pick(id) {
      if (cur.stage !== 'play') return;
      focus = id;
      mode = 'place';
      if (cur.placed[id]) {
        if (locked.has(id)) { msg = 'Cette personne a été placée par un indice.'; return renderPlay(); }
        delete cur.placed[id];
        bad.delete(id);
        save();
        sel = id;
      } else sel = sel === id ? null : id;
      msg = '';
      renderPlay();
    }
    function onCell(y, x) {
      if (cur.stage !== 'play') return;
      const t = objs[key(y, x)];
      const o = t && OBJECTS[t];
      const k = key(y, x);
      if (mode === 'cross') {
        if (at(y, x)) return;
        cur.crosses = crosses.has(k) ? cur.crosses.filter((c) => c !== k) : [...cur.crosses, k];
        msg = '';
        save();
        return renderPlay();
      }
      if (o && !o.occ) { msg = `Impossible : on ne peut pas se tenir sur ${o.un} ${o.label}.`; return renderPlay(); }
      const occ = at(y, x);
      if (sel) {
        if (occ && occ !== sel) {
          if (locked.has(occ)) { msg = 'Cette case a été donnée par un indice.'; return renderPlay(); }
          delete cur.placed[occ];
          bad.delete(occ);
        }
        cur.placed[sel] = [y, x];
        bad.delete(sel);
        cur.crosses = cur.crosses.filter((c) => c !== k);
        const p = person(sel);
        msg = `${p.name} placé${p.g === 'f' ? 'e' : ''}.`;
        sel = null;
        const nextUp = people.find((q) => !cur.placed[q.id]); // la personne suivante à placer devient la personne lue
        focus = nextUp ? nextUp.id : p.id;
        save();
      } else if (occ) {
        if (locked.has(occ)) { msg = 'Cette case a été donnée par un indice.'; return renderPlay(); }
        sel = occ;
        focus = occ;
        delete cur.placed[occ];
        bad.delete(occ);
        msg = `${person(occ).name} repris${person(occ).g === 'f' ? 'e' : ''} : choisis une nouvelle case.`;
        save();
      } else {
        msg = 'Choisis d’abord une personne.';
      }
      renderPlay();
    }
    function toggleCross() {
      mode = mode === 'cross' ? 'place' : 'cross';
      sel = null;
      msg = '';
      renderPlay();
    }
    function verify() {
      const wrong = wrongPlaced(cs, cur.placed);
      if (!wrong.length) {
        cur.stage = 'accuse';
        bad = new Set();
        msg = '';
        sel = null;
      } else {
        cur.fails++;
        bad = new Set(wrong);
        msg = `${wrong.length} personne${wrong.length > 1 ? 's' : ''} mal placée${wrong.length > 1 ? 's' : ''} (en rouge) : −${CHECK_PENALTY} pts.`;
        navigator.vibrate?.(120);
      }
      save();
      renderPlay();
    }
    function hint() {
      if (cur.hints >= MAX_HINTS || cur.stage !== 'play') return;
      const p = hintTarget(cs, cur.placed, cur.locked);
      if (!p) return;
      const k = at(p.cell[0], p.cell[1]);
      if (k && k !== p.id) { delete cur.placed[k]; bad.delete(k); }
      cur.placed[p.id] = p.cell.slice();
      cur.locked.push(p.id);
      cur.crosses = cur.crosses.filter((c) => c !== key(p.cell[0], p.cell[1]));
      cur.hints++;
      bad.delete(p.id);
      if (sel === p.id) sel = null;
      focus = p.id;
      msg = `Indice : ${p.name} est à sa place. −${HINT_PENALTY} pts.`;
      save();
      renderPlay();
    }
    function accuse(id) {
      if (cur.stage !== 'accuse') return;
      if (id === cs.murderer) {
        cur.stage = 'solved';
        cur.score = caseScore(cur);
        const all = stats();
        const st = all[game.level] || { solved: 0, points: 0 };
        store.set('stats', { ...all, [game.level]: { solved: st.solved + 1, points: st.points + cur.score } });
        msg = '';
      } else {
        cur.wrong++;
        const p = person(id);
        msg = `${p.name} n’était pas seul${p.g === 'f' ? 'e' : ''} avec la victime : −${ACCUSE_PENALTY} pts.`;
        navigator.vibrate?.(120);
      }
      save();
      renderPlay();
    }
  }

  // ---------------------------------------------------------------- vue : présentation d'une grille (et choix du niveau)
  function renderIntro() {
    container.classList.add('is-play');
    const cs = game.case;
    const people = peopleOf(cs);
    const types = [...new Set(cs.objects.map((o) => o[2]))];
    const start = h('button.mh-btn.mh-btn-primary.mh-wide', { type: 'button', onclick: () => {
      game.cur.stage = 'play';
      save();
      renderPlay();
    } }, 'Commencer l’enquête', icon('next'));
    const levels = h('div.mh-levels', { role: 'radiogroup', 'aria-label': 'Niveau' }, LEVELS.map((l) =>
      h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(l.n === game.level), class: `mh-level${l.n === game.level ? ' is-on' : ''}`,
        onclick: () => { if (l.n !== game.level) { setLevel(l.n); renderPlay(); } },
      }, h('b', l.label), h('small', `${l.n} × ${l.n}`))));
    container.replaceChildren(
      topBar('Murdoku', { play: true }),
      h('section.mh-intro',
        levels,
        h('div.mh-intro-card',
          h('span.mh-tag', `Grille n° ${game.number} · ${cs.n - 1} suspects`),
          h('h2', cs.title),
          h('p.mh-teaser', cs.teaser),
          h('div.mh-intro-people', people.map((p) => h('span.mh-av', { title: p.name }, svg(avatar(look(p), p.dead))))),
          rulesBlock(types, false)),
        start));
    start.focus({ preventScroll: true });
  }

  /** Règles du jeu, avec la légende des meubles donnés (version courte ou complète). */
  function rulesBlock(types, full) {
    const occ = types.filter((t) => OBJECTS[t].occ);
    const blk = types.filter((t) => !OBJECTS[t].occ);
    const names = (list) => list.map((t) => OBJECTS[t].label).join(', ');
    return h('ul.mh-rules',
      h('li.mh-key', h('b', 'Une seule personne par ligne et par colonne.')),
      h('li', 'Place tout le monde d’après les indices, ', h('b', 'victime comprise'), ' : elle occupe la dernière case libre.'),
      h('li', occ.length ? [h('b', 'Occupables : '), `${names(occ)}. `] : null, blk.length ? [h('b', 'Interdits : '), `${names(blk)}.`] : null,
        h('span.mh-legend', occ.map((t) => svg(furniture(t), 'mh-obj')), occ.length && blk.length ? h('i') : null, blk.map((t) => svg(furniture(t), 'mh-obj')))),
      full ? h('li', '« À côté de » : case voisine (haut, bas, gauche ou droite), dans la même pièce. Nord = haut du plan, est = droite.') : null,
      h('li', h('b', 'La taupe est la seule personne présente dans la pièce de la victime.')),
      full ? h('li', 'Les cases grisées sont sur la ligne ou la colonne d’une personne déjà placée. « Barrer » marque d’une croix les cases que tu élimines. Le dé, en haut, tire une autre grille.') : null);
  }

  // ---------------------------------------------------------------- vue : règles et réglages
  function renderSettings() {
    container.classList.remove('is-play');
    const all = stats();
    let armed = false;
    const reset = h('button.mh-btn.mh-btn-danger', { type: 'button', onclick: () => {
      if (!armed) { armed = true; reset.textContent = 'Confirmer : effacer'; setTimeout(() => { if (!reset.disabled) { armed = false; reset.textContent = 'Effacer mes statistiques'; } }, 4000); return; }
      store.remove('stats');
      reset.textContent = '✓ Statistiques effacées';
      reset.disabled = true;
    } }, 'Effacer mes statistiques');
    container.replaceChildren(
      topBar('Réglages', { back: () => ctx.navigate() }),
      h('section.mh-settings',
        h('fieldset', h('legend', 'Règle du jeu'),
          h('p.mh-small', 'Une victime a été retrouvée dans le bâtiment. Retrouve où se tenait chaque personne au moment des faits, puis démasque la taupe. Chaque grille est tirée au hasard (lieu, plan, meubles, personnages, indices) et n’a qu’une seule solution.'),
          rulesBlock(Object.keys(OBJECTS), true)),
        h('fieldset', h('legend', 'Barème'),
          h('p.mh-small', `Une grille vaut ${MAX_POINTS} points. Plan vérifié mais faux : −${CHECK_PENALTY} pts. Indice (une personne placée pour toi, ${MAX_HINTS} au plus par grille) : −${HINT_PENALTY} pts. Mauvaise accusation : −${ACCUSE_PENALTY} pts.`)),
        h('fieldset', h('legend', 'Statistiques'),
          h('table.mh-table',
            h('thead', h('tr', h('th', 'Niveau'), h('th.num', 'Résolues'), h('th.num', 'Moyenne'))),
            h('tbody', LEVELS.map((l) => {
              const st = all[l.n] || { solved: 0, points: 0 };
              return h('tr', h('td', `${l.label} (${l.n} × ${l.n})`), h('td.num', st.solved), h('td.num', st.solved ? `${Math.round(st.points / st.solved)} / ${MAX_POINTS}` : '—'));
            }))),
          reset),
        h('button.mh-btn.mh-btn-primary.mh-wide', { type: 'button', onclick: () => ctx.navigate() }, 'Reprendre la partie'),
        h('p.mh-version', `Little Games · version ${ctx.version || '?'}`)));
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view] = path || [];
    sel = null; mode = 'place'; msg = '';
    if (view === 'reglages') renderSettings();
    else renderPlay();
    window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() { container.classList.remove('mh', 'is-play'); },
  };
}

const lower = (name) => name.toLowerCase();

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
}
