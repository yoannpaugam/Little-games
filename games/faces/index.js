// Jeu « Visages » : reconnaître une célébrité à partir de son visage.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (choix du mode) | ['portraits', id?] | ['enfance', id?] | ['photos', 'enfance'?] | ['remplir', 'enfance'?] | ['reglages']
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.8.0';
import { createStore } from '../../js/core/storage.js?v=1.8.0';
import { buildAnswers, buildOwners, checkAnswer, matchFileName, findByName } from './answers.js?v=1.8.0';
import * as P from './photos.js?v=1.8.0';

// Version 1 du format des données enregistrées. Pour changer ce format : version: 2 + migrate(from, store).
const store = createStore('visages', { version: 1 });

const PART_NAME = { eyes: 'Les yeux', mouth: 'La bouche', nose: 'Le nez', ears: 'Les oreilles', top: 'Front + cheveux' };
const PART_BTN = { eyes: 'les yeux', mouth: 'la bouche', nose: 'le nez', ears: 'les oreilles', top: 'le front' };
const PART_CHIP = { eyes: 'Yeux', mouth: 'Bouche', nose: 'Nez', ears: 'Oreilles', top: 'Front' };
const MODES = {
  portraits: { kind: 'portrait', title: 'Portraits' },
  enfance: { kind: 'enfance', title: 'Enfance' },
};
const ROUTE_OF = { portrait: 'portraits', enfance: 'enfance' };
const KIND_LABEL = { portrait: 'Portrait', enfance: 'Photo d’enfance' };
const DEFAULT_SETTINGS = { order: [...P.PARTS], off: [], who: 'all' };
const WRONG = ['Ce n’est pas ça… Réessaie !', 'Raté ! Encore un essai ?', 'Non, ce n’est pas cette personne.', 'Toujours pas… courage !'];

const SVG = {
  photo: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
  restore: '<path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7"/><path d="M4 4v4h4"/>',
};
function svgIcon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'icon');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = SVG[name];
  return s;
}

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('vz');
  container.replaceChildren(h('div.loading', 'Chargement des célébrités…'));

  const [celebs] = await Promise.all([
    fetch(new URL('./data/celebs.json' + new URL(import.meta.url).search, import.meta.url), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`celebs.json : ${r.status}`); return r.json(); }),
    P.init(),
  ]);
  const byId = new Map(celebs.map((c) => [c.id, c]));
  const answers = buildAnswers(celebs);
  const owners = buildOwners(answers);

  let settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  if (!Array.isArray(settings.order)) settings.order = [...P.PARTS];
  if (!Array.isArray(settings.off)) settings.off = [];
  if (!['all', 'f', 'm'].includes(settings.who)) settings.who = 'all';
  settings.order = [...settings.order.filter((p) => P.PARTS.includes(p)), ...P.PARTS.filter((p) => !settings.order.includes(p))];
  const found = { portrait: {}, enfance: {}, ...store.get('found', {}) };  // kind → id → { t, n }
  const given = { portrait: {}, enfance: {}, ...store.get('given', {}) };  // kind → id → t (solution affichée)
  let rev = store.get('rev', {});
  // Célébrités retirées par le joueur (jugées peu connues) : masquées du jeu, à retirer du catalogue plus tard
  const excluded = new Set(Array.isArray(store.get('excluded', null)) ? store.get('excluded') : []);
  const saveExcluded = () => store.set('excluded', [...excluded]);                                          // id → nombre de parties visibles
  const current = store.get('current', {});                                // kind → id
  let seed = store.get('seed', null) ?? reseed();
  let lastMode = null;
  let phKind = 'portrait';
  let cleanup = [];
  let viewSeq = 0;        // change à chaque vue : une tâche qui finit après un changement de vue n'y touche plus
  let importing = false;  // un seul import à la fois, quelle que soit la vue
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reseed() {
    const s = Math.floor(Math.random() * 2 ** 31);
    store.set('seed', s);
    return s;
  }
  const saveSettings = () => store.set('settings', settings);
  const activeParts = () => settings.order.filter((p) => !settings.off.includes(p));
  const solved = (kind, id) => Boolean(found[kind][id] || given[kind][id]);
  const revealed = (id) => Math.min(Math.max(rev[id] || 1, 1), Math.max(activeParts().length, 1));
  function deck(kind) {
    return seededShuffle(celebs.map((c) => c.id), seed)
      .filter((id) => P.has(kind, id) && !excluded.has(id) && (settings.who === 'all' || byId.get(id).g === settings.who));
  }

  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanup.push(() => target.removeEventListener(type, fn, opts));
  }
  function resetView() {
    viewSeq++;
    cleanup.forEach((fn) => fn());
    cleanup = [];
    container.classList.remove('is-play', 'is-full');
  }

  // ---------------------------------------------------------------- barre du haut
  function topBar(titleText, { back, kind } = {}) {
    let score = null;
    if (kind) {
      const d = deck(kind);
      score = h('span.vz-score', { title: 'Célébrités trouvées' }, h('strong', d.filter((id) => found[kind][id]).length), ` / ${d.length}`);
    }
    return h('header.vz-bar',
      h('button.vz-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.vz-title', titleText),
      score,
      h('button.vz-icon-btn', { title: 'Photos', 'aria-label': 'Photos', onclick: () => ctx.navigate('photos') }, svgIcon('photo')),
      h('button.vz-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, svgIcon('sliders'))
    );
  }
  const backFromTools = () => (lastMode ? ctx.navigate(lastMode) : ctx.navigate());

  // ---------------------------------------------------------------- vue : choix du mode
  function renderHome() {
    resetView();
    const card = (route, title, desc, pic) => {
      const kind = MODES[route].kind;
      const d = deck(kind);
      const f = d.filter((id) => found[kind][id]).length;
      const n = P.count(kind);
      return h('button.vz-mode', {
        type: 'button',
        onclick: () => {
          if (d.length) ctx.navigate(route);
          else if (n) ctx.navigate('reglages');
          else { phKind = kind; ctx.navigate('photos', kind === 'enfance' ? 'enfance' : ''); }
        },
      },
        h('span.vz-mode-pic', { innerHTML: pic }),
        h('span.vz-mode-meta',
          h('strong', title),
          h('small', desc),
          h('em', d.length ? `${f} trouvée${f > 1 ? 's' : ''} sur ${d.length} · ${n} photo${n > 1 ? 's' : ''}`
            : n ? 'Aucune photo avec le filtre actuel (Réglages)' : 'Aucune photo pour l’instant : touche pour en ajouter')
        )
      );
    };
    container.replaceChildren(
      topBar('Visages'),
      h('section.vz-home',
        h('p.vz-lead', 'Qui se cache derrière ces visages ?'),
        card('portraits', 'Portraits', 'Les yeux d’abord, puis le visage se dévoile pièce par pièce.',
          '<svg viewBox="0 0 64 96"><ellipse cx="22" cy="40" rx="9" ry="6" fill="#e8b04a"/><ellipse cx="42" cy="40" rx="9" ry="6" fill="#e8b04a"/><ellipse cx="32" cy="53" rx="5" ry="8" fill="#e8b04a33"/><ellipse cx="32" cy="67" rx="10" ry="5" fill="#e8b04a33"/></svg>'),
        card('enfance', 'Photos d’enfance', 'La photo est visible dès le début : reconnais la star quand elle était petite.',
          '<svg viewBox="0 0 64 96"><circle cx="32" cy="44" r="17" fill="#ff8a65"/><circle cx="26" cy="42" r="2.4" fill="#121015"/><circle cx="38" cy="42" r="2.4" fill="#121015"/><path d="M26 51q6 5 12 0" stroke="#121015" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 96q0-26 18-26t18 26" fill="#ff8a6577"/></svg>'),
        P.PHOTOS.size ? null : h('p.vz-hint', `${celebs.length} célébrités au catalogue. Commence par importer leurs photos depuis ton appareil (icône photo en haut).`)
      )
    );
  }

  // ---------------------------------------------------------------- vue : jeu
  function renderPlay(route, wantedId) {
    resetView();
    container.classList.add('is-play');
    lastMode = route;
    const kind = MODES[route].kind;
    const d = deck(kind);
    const bar = () => topBar(MODES[route].title, { back: () => ctx.navigate(), kind });

    if (!d.length) {
      const filtered = P.count(kind) > 0; // des photos existent, mais le filtre femmes/hommes les écarte
      container.replaceChildren(bar(), h('div.vz-empty',
        h('p', filtered ? `Aucune photo avec le filtre actuel (${settings.who === 'f' ? 'femmes' : 'hommes'} seulement).`
          : kind === 'portrait' ? 'Aucun portrait pour l’instant. Importe des photos de célébrités pour commencer.'
          : 'Aucune photo d’enfance pour l’instant. Importe-en pour jouer à ce mode.'),
        filtered
          ? h('button.vz-btn.vz-btn-primary', { onclick: () => ctx.navigate('reglages') }, 'Changer le filtre')
          : h('button.vz-btn.vz-btn-primary', { onclick: () => { phKind = kind; ctx.navigate('photos', kind === 'enfance' ? 'enfance' : ''); } }, 'Ajouter des photos')
      ));
      return;
    }

    let id = d.includes(wantedId) ? wantedId : d.includes(current[kind]) ? current[kind] : (d.find((x) => !solved(kind, x)) || d[0]);
    current[kind] = id;
    store.set('current', current);
    const celeb = byId.get(id);
    const rec = P.get(kind, id);
    const idx = d.indexOf(id);
    const go = (delta) => ctx.navigate(route, d[(idx + delta + d.length) % d.length]);
    P.preload([1, -1].map((k) => P.pkey(kind, d[(idx + k + d.length) % d.length])));

    let img = null;
    let maskA = kind === 'portrait' && !solved(kind, id) ? 1 : 0;
    let anim = 0;
    const canvas = h('canvas.vz-canvas', { 'aria-label': 'Photo mystère', role: 'img' });
    const frame = h('div.vz-frame', canvas);
    const shownParts = () => (kind === 'portrait' ? (solved(kind, id) ? activeParts() : activeParts().slice(0, revealed(id))) : []);
    const paint = () => P.drawPhoto(canvas, img, rec, shownParts(), maskA);
    P.bitmap(rec.key).then((b) => { img = b; paint(); });
    const ro = new ResizeObserver(paint);
    ro.observe(frame);
    cleanup.push(() => { ro.disconnect(); cancelAnimationFrame(anim); });

    const chips = h('div.vz-chips');
    const feedback = h('p.vz-feedback', { role: 'status', 'aria-live': 'polite' });
    const input = h('input.vz-input', {
      type: 'text', placeholder: 'Qui est-ce ?', autocomplete: 'off', autocapitalize: 'words', spellcheck: false,
      'aria-label': 'Nom de la célébrité', enterKeyHint: 'done',
    });
    input.setAttribute('autocorrect', 'off'); // pas via h() : sur Safari, la propriété est booléenne
    const announce = h('p.vz-sr', { role: 'status', 'aria-live': 'polite' });
    const revealLabel = h('span.vz-ellipsis');
    const revealBtn = h('button.vz-btn.vz-grow', { type: 'button', onclick: reveal }, revealLabel);
    let attempts = 0;

    function updChips() {
      const ap = activeParts();
      const n = solved(kind, id) ? ap.length : revealed(id);
      chips.replaceChildren(...(kind === 'portrait' ? ap.map((p, i) => h('span.vz-chip', { class: `vz-chip${i < n ? ' is-on' : ''}` }, PART_CHIP[p])) : []));
      const next = ap[revealed(id)];
      revealLabel.textContent = kind === 'portrait' && next ? `Voir ${PART_BTN[next]}` : 'Solution';
      revealBtn.disabled = solved(kind, id);
    }

    const form = h('form.vz-form', {
      onsubmit: (e) => {
        e.preventDefault();
        const guess = input.value.trim();
        const r = checkAnswer(guess, answers.get(id), owners);
        if (!r) { input.focus(); return; }
        if (r.ok) return finish(true);
        attempts++;
        feedback.textContent = r.near ? `Tu chauffes ! ${r.hint}` : WRONG[(attempts - 1) % WRONG.length];
        feedback.className = `vz-feedback is-error${r.near ? ' is-near' : ''}`;
        form.classList.remove('vz-shake');
        void form.offsetWidth;
        form.classList.add('vz-shake');
        input.select();
      },
    }, h('div.vz-input-row', input, h('button.vz-btn.vz-btn-primary', { type: 'submit' }, 'Valider')));

    function solvedPanel() {
      const f = found[kind][id];
      const next = h('button.vz-btn.vz-btn-primary', { type: 'button', onclick: skip }, 'Suivant', icon('next'));
      setTimeout(() => next.focus({ preventScroll: true }), 50);
      return h('div.vz-solved',
        h('div.vz-who',
          f ? h('p.vz-bravo', icon('check'), ' Bravo !', kind === 'portrait' && f.n ? h('span', ` · ${f.n} indice${f.n > 1 ? 's' : ''}`) : null)
            : h('p.vz-bravo.is-given', 'C’était…'),
          h('h2.vz-name', celeb.name),
          h('p.vz-job', `${celeb.job} · ${celeb.g === 'f' ? 'née' : 'né'} en ${celeb.born}`)
        ),
        next
      );
    }
    function finish(ok) {
      if (ok) {
        found[kind][id] = { t: Date.now(), n: kind === 'portrait' ? revealed(id) : 0 };
        store.set('found', found);
      } else {
        given[kind][id] = Date.now();
        store.set('given', given);
      }
      input.blur();
      answerBox.replaceChildren(solvedPanel());
      announce.textContent = `${ok ? 'Bravo ! ' : ''}C’était ${celeb.name}.`;
      canvas.setAttribute('aria-label', `Photo de ${celeb.name}`);
      stage.classList.add(ok ? 'is-solved' : 'is-given');
      updChips();
      head.replaceWith((head = bar()));
      const from = maskA, t0 = performance.now();
      const step = (now) => {
        const k = reduceMotion ? 1 : Math.min((now - t0) / 700, 1);
        maskA = from * (1 - (1 - (1 - k) ** 3));
        paint();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    function reveal() {
      if (solved(kind, id)) return;
      const n = revealed(id);
      if (kind === 'portrait' && n < activeParts().length) {
        rev[id] = n + 1;
        store.set('rev', rev);
        updChips();
        paint();
        feedback.textContent = '';
      } else finish(false);
    }
    function skip() {
      for (let k = 1; k <= d.length; k++) {
        const nid = d[(idx + k) % d.length];
        if (!solved(kind, nid)) return ctx.navigate(route, nid);
      }
      // Plus rien à trouver : le message va dans le panneau visible (le formulaire a pu disparaître)
      const msg = 'Tout est trouvé ! Ajoute d’autres photos ou efface la progression.';
      announce.textContent = msg;
      const nextBtn = answerBox.querySelector('.vz-solved .vz-btn-primary');
      if (nextBtn) { nextBtn.textContent = 'Tout est trouvé ✓'; nextBtn.disabled = true; }
      else { feedback.textContent = msg; feedback.className = 'vz-feedback'; }
    }

    const isSolved = solved(kind, id);
    const answerBox = h('div.vz-answer', isSolved ? solvedPanel() : [form, feedback]);
    const stage = h('section.vz-stage', { class: `vz-stage${isSolved ? (found[kind][id] ? ' is-solved' : ' is-given') : ''}` },
      h('div.vz-frame-box', frame),
      chips,
      answerBox,
      h('div.vz-nav',
        h('button.vz-btn.vz-arrow', { type: 'button', 'aria-label': 'Précédent', title: 'Précédent (←)', onclick: () => go(-1) }, icon('prev')),
        revealBtn,
        h('button.vz-btn', { type: 'button', onclick: skip }, 'Passer'),
        h('button.vz-btn.vz-arrow', { type: 'button', 'aria-label': 'Suivant', title: 'Suivant (→)', onclick: () => go(1) }, icon('next'))
      )
    );
    let head = bar();
    updChips();
    container.replaceChildren(head, stage, announce);
    if (!isSolved && matchMedia('(hover: hover)').matches) input.focus({ preventScroll: true });

    on(document, 'keydown', (e) => {
      if (container.querySelector('.vz-dialog')) return;
      const typing = document.activeElement === input && input.value !== '';
      if (typing || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  }

  // ---------------------------------------------------------------- vue : photos
  function renderPhotos(kindArg) {
    resetView();
    container.classList.add('is-full');
    if (kindArg === 'enfance') phKind = 'enfance';
    else if (kindArg === 'portraits') phKind = 'portrait';

    const status = h('p.vz-status', { role: 'status' });
    const segBtns = {};
    const seg = h('div.vz-seg', ['portrait', 'enfance'].map((k) => (segBtns[k] = h('button', {
      type: 'button',
      onclick: () => { phKind = k; refresh(); },
    }, k === 'portrait' ? 'Portraits' : 'Enfance', h('small')))));
    const multi = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) importBatch(fs); } });
    const search = h('input.vz-input.vz-small', { type: 'search', placeholder: 'Rechercher…', 'aria-label': 'Rechercher une personne', oninput: filter });
    const sel = h('select.vz-select', { onchange: filter, 'aria-label': 'Filtrer les photos' },
      h('option', { value: 'all' }, 'Toutes'), h('option', { value: 'miss' }, 'À ajouter'),
      h('option', { value: 'has' }, 'Ajoutées'), h('option', { value: 'check' }, 'À vérifier'),
      h('option', { value: 'removed' }, 'Retirées'));
    const list = h('div.vz-list');
    const drop = h('div.vz-drop', 'Dépose tes photos ici');

    const rows = [...celebs].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((c) => {
      const th = h('span.vz-thumb', { 'aria-hidden': 'true' });
      const imgLink = h('a.vz-chip-link', { target: '_blank', rel: 'noopener' }, 'Images');
      // Toute la carte est un bouton : sans photo, elle colle l'image copiée ; avec photo, elle ouvre l'aperçu
      const card = h('button.vz-row-card', { type: 'button' }, th,
        h('span.vz-row-meta', h('strong', c.name), h('small', `${c.job} · ${c.born}`)));
      const trash = h('button.vz-row-trash', { type: 'button', onclick: () => toggleExcluded(c) });
      const row = h('div.vz-row', card, imgLink, trash);
      card.addEventListener('click', () => {
        if (P.has(phKind, c.id)) openPreview(phKind, c.id, refresh);
        else pasteFor(c);
      });
      return { c, row, th, card, trash, imgLink, q: `${c.name} ${c.job}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() };
    });
    list.append(...rows.map((r) => r.row));

    function filter() {
      const q = search.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
      const f = sel.value;
      for (const r of rows) {
        const rec = P.get(phKind, r.c.id);
        const out = excluded.has(r.c.id);
        let show = (!q || r.q.includes(q)) && (f === 'removed' ? out : !out);
        if (f === 'miss') show &&= !rec;
        if (f === 'has') show &&= Boolean(rec);
        if (f === 'check') show &&= Boolean(rec) && !rec.auto && !rec.manual;
        r.row.hidden = !show;
        if (!show) continue;
        r.th.classList.toggle('has', Boolean(rec));
        r.th.classList.toggle('warn', Boolean(rec) && !rec.auto && !rec.manual);
        r.th.style.backgroundImage = rec ? `url(${P.thumbUrl(rec.key)})` : '';
        r.th.textContent = rec ? '' : '+';
        r.card.setAttribute('aria-label', rec ? `${r.c.name} : voir la photo` : `${r.c.name} : coller l’image copiée`);
        r.trash.replaceChildren(svgIcon(out ? 'restore' : 'trash'));
        r.trash.setAttribute('aria-label', out ? `Remettre ${r.c.name}` : `Retirer ${r.c.name} (peu connu)`);
        r.trash.title = out ? 'Remettre dans le jeu' : 'Retirer du jeu';
        r.imgLink.href = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(r.c.name + (phKind === 'enfance' ? ' enfant' : ' portrait'))}`;
      }
    }
    function refresh() {
      for (const k of ['portrait', 'enfance']) {
        segBtns[k].classList.toggle('is-on', k === phKind);
        segBtns[k].querySelector('small').textContent = P.count(k) || '';
      }
      filter();
    }

    async function importBatch(files, target) {
      if (importing) { status.textContent = 'Un import est déjà en cours, patiente un instant…'; return; }
      importing = true;
      const v = viewSeq;
      const unknown = [];
      let ok = 0, noFace = 0;
      status.textContent = 'Chargement de la détection de visage…';
      const detectorOk = await P.loadDetector();
      for (let i = 0; i < files.length; i++) {
        status.textContent = `Analyse des photos… ${i + 1} / ${files.length}`;
        const f = files[i];
        let id, kind;
        if (target) ({ id, kind } = target);
        else {
          const m = matchFileName(f.name, celebs, answers);
          if (!m.id) { unknown.push(f); continue; }
          id = m.id;
          kind = m.kid ? 'enfance' : phKind;
        }
        try { if (!(await P.importFile(f, id, kind))) noFace++; ok++; }
        catch (e) { console.warn(e); unknown.push(f); }
      }
      let msg = ok ? `${ok} photo${ok > 1 ? 's' : ''} ajoutée${ok > 1 ? 's' : ''}.` : '';
      if (noFace) msg += ` ${noFace} sans visage détecté : filtre « À vérifier » pour les placer à la main.`;
      if (!detectorOk) msg += ' Détection de visage indisponible : zones placées au centre.';
      if (!P.persistent) msg += ' Attention : ce navigateur n’enregistre pas les photos.';
      importing = false;
      if (v !== viewSeq) return; // on a quitté l'écran Photos pendant l'import
      status.textContent = msg.trim();
      refresh();
      if (target && ok) openPreview(target.kind, target.id, refresh);
      if (unknown.length) openUnknown(unknown, refresh);
    }

    // Toucher une carte sans photo : on lit directement l'image copiée (appui long → « Copier l'image »).
    // Si le navigateur refuse, une petite fenêtre propose de coller par appui long, ou de choisir un fichier.
    async function pasteFor(c) {
      if (importing) { status.textContent = 'Un import est déjà en cours, patiente un instant…'; return; }
      const kind = phKind;
      if (navigator.clipboard?.read) {
        try {
          for (const item of await navigator.clipboard.read()) {
            const type = item.types.find((ty) => ty.startsWith('image/'));
            if (type) return addPasted(await item.getType(type), c, kind);
          }
          status.textContent = 'Aucune image copiée : sur la photo, fais un appui long puis « Copier l’image ».';
          return;
        } catch { /* accès refusé : on passe par la fenêtre de collage */ }
      }
      openPasteDialog(c, kind);
    }
    async function addPasted(blob, c, kind) {
      if (importing) return;
      importing = true;
      const v = viewSeq;
      status.textContent = `Analyse de la photo de ${c.name}…`;
      try {
        await P.loadDetector();
        const auto = await P.importFile(blob, c.id, kind);
        if (v === viewSeq) status.textContent = `✓ Photo ajoutée pour ${c.name}` + (auto ? '' : ' · visage non détecté, touche la carte pour vérifier');
      } catch (err) {
        console.warn(err);
        if (v === viewSeq) status.textContent = 'Cette image n’a pas pu être lue. Copie une autre photo (JPEG ou PNG).';
      } finally {
        importing = false;
        if (v === viewSeq) refresh();
      }
    }
    function openPasteDialog(c, kind) {
      if (container.querySelector('.vz-dialog')) return;
      const zone = h('div.vz-fill-zone', { 'aria-label': 'Zone où coller l’image', role: 'textbox' });
      zone.setAttribute('contenteditable', 'true');
      zone.setAttribute('inputmode', 'none');
      zone.dataset.hint = 'Appui long ici → « Coller »';
      const msg = h('p.vz-pv-msg', { role: 'status' });
      const pick = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) { d.close(); addPasted(f, c, kind); } } });
      zone.addEventListener('input', () => { zone.textContent = ''; });
      zone.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.textContent = '';
        const data = e.clipboardData;
        const f = [...(data?.files || [])].find((x) => x.type.startsWith('image/'))
          || [...(data?.items || [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'))?.getAsFile();
        if (f) { d.close(); addPasted(f, c, kind); }
        else msg.textContent = data?.getData('text') ? 'C’est un lien : sur la photo, choisis « Copier l’image ».' : 'Aucune image dans le presse-papiers.';
      });
      const d = dialog(c.name,
        h('p.vz-sub', `${KIND_LABEL[kind]} · ${c.job}`),
        zone, msg,
        h('div.vz-dialog-btns',
          h('label.vz-btn', 'Fichier…', pick),
          h('button.vz-btn.vz-btn-primary', { type: 'button', onclick: () => d.close() }, 'Fermer')));
      requestAnimationFrame(() => zone.focus({ preventScroll: true }));
    }
    // Ctrl+V sur ordinateur : colle pour la dernière carte touchée sans photo
    let pasteTarget = null;
    list.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.vz-row-card');
      const r = card && rows.find((x) => x.card === card);
      pasteTarget = r && !P.has(phKind, r.c.id) ? r.c : null;
    });
    on(document, 'paste', (e) => {
      if (!pasteTarget || container.querySelector('.vz-dialog') || e.target.closest?.('input, textarea')) return;
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); addPasted(f, pasteTarget, phKind); }
    });

    let lastExcluded = null;
    function toggleExcluded(c) {
      if (excluded.has(c.id)) {
        excluded.delete(c.id);
        status.textContent = `${c.name} est de retour dans le jeu.`;
      } else {
        excluded.add(c.id);
        lastExcluded = c;
        status.replaceChildren(`${c.name} est ${c.g === 'f' ? 'retirée' : 'retiré'} du jeu. `,
          h('button.vz-link', { type: 'button', onclick: () => { excluded.delete(lastExcluded.id); saveExcluded(); status.textContent = `${lastExcluded.name} est de retour dans le jeu.`; refresh(); } }, 'Annuler'));
      }
      saveExcluded();
      refresh();
    }

    on(document, 'dragenter', (e) => { e.preventDefault(); drop.classList.add('is-on'); });
    on(document, 'dragover', (e) => e.preventDefault());
    on(document, 'dragleave', (e) => { if (!e.relatedTarget) drop.classList.remove('is-on'); });
    on(document, 'drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-on');
      const fs = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(f.name));
      if (fs.length) importBatch(fs);
    });

    container.replaceChildren(
      topBar('Photos', { back: backFromTools }),
      h('section.vz-photos',
        h('div.vz-photos-top',
          seg,
          h('div.vz-photos-actions',
            h('button.vz-btn.vz-btn-primary', { type: 'button', onclick: () => ctx.navigate('remplir', phKind === 'enfance' ? 'enfance' : '') }, 'Remplir à la suite'),
            h('label.vz-btn', 'Fichiers…', multi)),
          h('details.vz-help',
            h('summary', 'Comment ajouter les photos ?'),
            h('p', 'Nomme chaque fichier avec le nom de la personne (« omar-sy.jpg », « Céline Dion.png »), puis importe-les tous d’un coup : ils sont rangés tout seuls. Ajoute « enfant » au nom (« omar-sy-enfant.jpg ») pour une photo d’enfance. Tu peux aussi toucher une case vide pour ajouter la photo d’une seule personne, ou glisser des fichiers sur cette page.'),
            h('p', 'Le visage est repéré automatiquement. Touche une photo pour vérifier les zones ou les placer à la main. Les photos restent sur cet appareil.')
          ),
          h('div.vz-filter', search, sel),
          status
        ),
        list
      ),
      drop
    );
    refresh();
  }

  // ---------------------------------------------------------------- fenêtres
  let dialogSeq = 0;
  /** Fenêtre modale : Échap ou un clic à côté la ferme, le focus y entre puis revient où il était. */
  function dialog(title, ...content) {
    const titleId = `vz-dlg-${++dialogSeq}`;
    const box = h('div.vz-dialog-box', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, h(`h3#${titleId}`, title), ...content);
    const dlg = h('div.vz-dialog', { onclick: (e) => { if (e.target === dlg) close(); } }, box);
    const previous = document.activeElement;
    const onClose = [];
    let closed = false;
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown, true);
      onClose.forEach((fn) => fn());
      dlg.remove();
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    }
    document.addEventListener('keydown', onKeyDown, true);
    container.append(dlg);
    cleanup.push(close);
    requestAnimationFrame(() => box.querySelector('button, input:not([type=file]), [tabindex]')?.focus({ preventScroll: true }));
    return { dlg, box, close, onClose: (fn) => onClose.push(fn) };
  }

  let previewOpening = false;
  async function openPreview(kind, id, onChange) {
    if (previewOpening || container.querySelector('.vz-dialog')) return; // pas deux fenêtres l'une sur l'autre
    previewOpening = true;
    const v = viewSeq;
    try { await openPreviewNow(kind, id, onChange, v); } finally { previewOpening = false; }
  }
  async function openPreviewNow(kind, id, onChange, v) {
    const c = byId.get(id);
    const key = P.pkey(kind, id);
    const canvas = h('canvas');
    const wrap = h('div.vz-pv', canvas);
    const msg = h('p.vz-pv-msg', { role: 'status' });
    let img = await P.bitmap(key);
    if (v !== viewSeq) return;
    let pick = 0, A = null, geo = null;
    const draw = () => { const rec = P.PHOTOS.get(key); if (rec) geo = P.drawPreview(canvas, img, rec, A); };
    const say = () => {
      const rec = P.PHOTOS.get(key);
      msg.classList.toggle('is-hl', pick > 0);
      msg.textContent = pick === 1 ? '① Touche le milieu, entre les deux yeux'
        : pick === 2 ? '② Touche maintenant le centre de la bouche'
        : !rec ? '' : rec.manual ? 'Zones placées à la main.'
        : rec.auto ? 'Visage détecté automatiquement. Le cadre blanc montre ce qui sera affiché.'
        : 'Visage non détecté : place-le à la main pour un bon cadrage.';
    };
    canvas.addEventListener('pointerdown', async (e) => {
      if (!pick || !geo) return;
      const pt = geo.toImage(e.clientX, e.clientY);
      if (!pt) return;
      if (pick === 1) { A = pt; pick = 2; say(); draw(); return; }
      await P.placeManually(key, A, pt);
      img = await P.bitmap(key);
      pick = 0; A = null; wrap.classList.remove('is-pick');
      say(); draw(); onChange?.();
    });
    let armed = false;
    const delBtn = h('button.vz-btn.vz-btn-danger', { type: 'button', onclick: async () => {
      if (!armed) { armed = true; delBtn.textContent = 'Confirmer ?'; return; }
      await P.remove(key); d.close(); onChange?.();
    } }, 'Supprimer');
    const replace = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (importing) { msg.textContent = 'Un import est déjà en cours, patiente un instant…'; return; }
      importing = true;
      msg.textContent = 'Analyse…';
      try {
        await P.loadDetector();
        await P.importFile(f, id, kind);
        img = await P.bitmap(key);
        say(); draw(); onChange?.();
      } catch (err) {
        console.warn(err);
        msg.textContent = 'Cette image n’a pas pu être lue. Essaie une photo JPEG ou PNG.';
      } finally { importing = false; }
    } });
    const d = dialog(c.name,
      h('p.vz-sub', `${KIND_LABEL[kind]} · ${c.job}`),
      wrap, msg,
      h('div.vz-dialog-btns',
        h('button.vz-btn', { type: 'button', onclick: () => { pick = 1; A = null; wrap.classList.add('is-pick'); say(); draw(); } }, 'Placer'),
        h('label.vz-btn', 'Remplacer', replace),
        delBtn,
        h('button.vz-btn.vz-btn-primary', { type: 'button', onclick: () => d.close() }, 'Fermer')
      )
    );
    d.box.classList.add('is-tall');
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    d.onClose(() => ro.disconnect());
    say();
  }

  function openUnknown(files, onChange) {
    const datalist = h('datalist#vz-names', celebs.map((c) => h('option', { value: c.name })));
    const urls = [];
    const rows = files.map((f) => {
      const url = URL.createObjectURL(f);
      urls.push(url);
      const input = h('input.vz-input.vz-small', { placeholder: f.name, 'aria-label': `Nom de la personne sur ${f.name}`, autocomplete: 'off' });
      input.setAttribute('list', 'vz-names');
      input.setAttribute('autocorrect', 'off');
      const btn = h('button.vz-btn.vz-btn-sm', { type: 'button' }, 'Valider');
      const row = h('div.vz-unknown', h('img', { src: url, alt: '' }), input, btn);
      let pending = false;
      const assign = async () => {
        if (pending || row.classList.contains('is-done')) return;
        const c = findByName(input.value, celebs, answers);
        if (!c) { input.classList.add('is-bad'); return; }
        pending = true;
        btn.disabled = true; btn.textContent = '…';
        try {
          await P.importFile(f, c.id, matchFileName(f.name, celebs, answers).kid ? 'enfance' : phKind);
          input.value = c.name; input.disabled = true; btn.textContent = '✓';
          row.classList.add('is-done');
          onChange?.();
        } catch (err) {
          console.warn(err);
          btn.disabled = false; btn.textContent = 'Valider';
          input.classList.add('is-bad');
          input.value = '';
          input.placeholder = 'Image illisible';
        } finally { pending = false; }
      };
      btn.addEventListener('click', assign);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') assign(); });
      return row;
    });
    const d = dialog('Photos non reconnues',
      h('p.vz-sub', 'Indique de qui il s’agit pour chaque photo.'),
      datalist,
      h('div.vz-unknown-list', rows),
      h('div.vz-dialog-btns', h('button.vz-btn.vz-btn-primary', { type: 'button', onclick: () => d.close() }, 'Terminé'))
    );
    d.onClose(() => urls.forEach((u) => URL.revokeObjectURL(u)));
  }

  // ---------------------------------------------------------------- vue : remplir à la suite
  // Une personne à la fois : on cherche une image, on la copie, on la colle ici, et on passe à la suivante.
  function renderFill(kindArg) {
    resetView();
    container.classList.add('is-full');
    const kind = kindArg === 'enfance' ? 'enfance' : 'portrait';
    phKind = kind;
    const v = viewSeq;
    const skips = store.get('fillSkip', {});
    const skipped = new Set(Array.isArray(skips[kind]) ? skips[kind] : []);
    const saveSkips = () => store.set('fillSkip', { ...store.get('fillSkip', {}), [kind]: [...skipped] });
    const order = [...celebs].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const nextPerson = () => order.find((c) => !P.has(kind, c.id) && !skipped.has(c.id) && !excluded.has(c.id)) || null;
    let cur = null;
    let last = null; // dernière photo ajoutée : { id, auto }
    let busy = false;

    const progress = h('p.vz-fill-progress');
    const name = h('h2.vz-fill-name');
    const job = h('p.vz-fill-job');
    const search = h('a.vz-btn.vz-btn-wide-link', { target: '_blank', rel: 'noopener' }, '1. Chercher une image ↗');
    const status = h('p.vz-fill-status', { role: 'status', 'aria-live': 'polite' });
    // Zone de collage : un appui long dessus fait apparaître « Coller » sur mobile ; Ctrl+V marche partout sur ordinateur.
    const zone = h('div.vz-fill-zone', { contentEditable: 'true', inputMode: 'none', 'aria-label': 'Zone où coller l’image', role: 'textbox' });
    zone.setAttribute('inputmode', 'none');
    zone.setAttribute('contenteditable', 'true');
    zone.dataset.hint = 'ou appui long ici → « Coller »';
    const pasteBtn = h('button.vz-btn.vz-btn-primary.vz-wide', { type: 'button', onclick: pasteFromClipboard }, '2. Coller l’image copiée');
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) add(f); } });
    const pickBtn = h('label.vz-btn', 'Fichier…', file);
    const skipBtn = h('button.vz-btn', { type: 'button', onclick: skip }, 'Passer');
    const lastThumb = h('div.vz-fill-thumb');
    const lastText = h('p.vz-fill-last-text');
    const undoBtn = h('button.vz-btn.vz-btn-sm.vz-btn-ghost', { type: 'button', onclick: undo }, 'Annuler');
    const checkBtn = h('button.vz-btn.vz-btn-sm.vz-btn-ghost', { type: 'button', onclick: () => last && openPreview(kind, last.id, draw) }, 'Vérifier');
    const lastBox = h('div.vz-fill-last', lastThumb, h('div.vz-fill-last-meta', lastText, h('div.vz-fill-last-btns', checkBtn, undoBtn)));
    const card = h('div.vz-fill-card', name, job, search, pasteBtn, zone, h('div.vz-fill-row', pickBtn, skipBtn));
    const done = h('div.vz-fill-done');

    function draw() {
      if (v !== viewSeq) return;
      cur = nextPerson();
      const n = P.count(kind);
      progress.textContent = `${n} / ${celebs.length} ${kind === 'enfance' ? 'photos d’enfance' : 'portraits'}`
        + (skipped.size ? ` · ${plural(skipped.size, 'personne passée', 'personnes passées')}` : '');
      card.hidden = !cur;
      done.hidden = Boolean(cur);
      if (cur) {
        name.textContent = cur.name;
        job.textContent = `${cur.job} · ${cur.born}`;
        search.href = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(cur.name + (kind === 'enfance' ? ' enfant' : ' portrait'))}`;
      } else {
        done.replaceChildren(
          h('p', n >= celebs.length ? 'Toutes les photos sont ajoutées 🎉' : 'Plus personne à remplir pour l’instant.'),
          skipped.size ? h('button.vz-btn', { type: 'button', onclick: () => { skipped.clear(); saveSkips(); draw(); } }, `Revoir les ${plural(skipped.size, 'personne passée', 'personnes passées')}`) : null,
          h('button.vz-btn.vz-btn-primary', { type: 'button', onclick: () => ctx.navigate(kind === 'enfance' ? 'enfance' : 'portraits') }, 'Jouer')
        );
      }
      lastBox.hidden = !last;
      if (last) {
        const rec = P.get(kind, last.id);
        lastThumb.style.backgroundImage = rec ? `url(${P.thumbUrl(rec.key)})` : '';
        lastText.textContent = `✓ ${byId.get(last.id).name}` + (last.auto ? '' : ' · visage non détecté, à vérifier');
      }
    }

    async function add(blob) {
      if (!cur) return;
      if (busy || importing) { status.textContent = 'Analyse en cours, patiente un instant…'; return; }
      busy = importing = true;
      const id = cur.id;
      status.textContent = `Analyse de la photo de ${cur.name}…`;
      try {
        await P.loadDetector();
        const auto = await P.importFile(blob, id, kind);
        last = { id, auto };
        status.textContent = '';
      } catch (err) {
        console.warn(err);
        status.textContent = 'Cette image n’a pas pu être lue. Copie une autre photo (JPEG ou PNG).';
      } finally {
        busy = importing = false;
        draw();
      }
    }

    async function pasteFromClipboard() {
      if (!navigator.clipboard?.read) {
        status.textContent = 'Ce navigateur ne permet pas ce bouton : fais un appui long dans le cadre en pointillés, puis « Coller ».';
        zone.focus();
        return;
      }
      try {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find((ty) => ty.startsWith('image/'));
          if (type) return add(await item.getType(type));
        }
        status.textContent = 'Pas d’image copiée : fais un appui long sur la photo, puis « Copier l’image ».';
      } catch {
        status.textContent = 'Le navigateur a refusé l’accès : fais un appui long dans le cadre en pointillés, puis « Coller ».';
        zone.focus();
      }
    }

    function onPaste(e) {
      if (e.target.closest?.('input, textarea') && e.target !== zone) return;
      const data = e.clipboardData;
      const fileItem = [...(data?.files || [])].find((f) => f.type.startsWith('image/'))
        || [...(data?.items || [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'))?.getAsFile();
      e.preventDefault();
      zone.textContent = '';
      if (fileItem) add(fileItem);
      else if (data?.getData('text')) status.textContent = 'C’est un lien, pas une image : sur la photo, choisis « Copier l’image » (et non « Copier l’adresse »).';
    }

    function skip() {
      if (!cur) return;
      skipped.add(cur.id);
      saveSkips();
      status.textContent = '';
      draw();
    }

    async function undo() {
      if (!last) return;
      await P.remove(P.pkey(kind, last.id));
      last = null;
      status.textContent = 'Photo retirée.';
      draw();
    }

    zone.addEventListener('input', () => { zone.textContent = ''; });
    on(document, 'paste', onPaste);

    const seg = h('div.vz-seg', ['portrait', 'enfance'].map((k) => h('button', {
      type: 'button', class: k === kind ? 'is-on' : '',
      onclick: () => { if (k !== kind) ctx.navigate('remplir', k === 'enfance' ? 'enfance' : ''); },
    }, k === 'portrait' ? 'Portraits' : 'Enfance')));

    container.replaceChildren(
      topBar('Remplir à la suite', { back: () => ctx.navigate('photos', kind === 'enfance' ? 'enfance' : '') }),
      h('section.vz-fill', seg, progress, card, done, status, lastBox)
    );
    draw();
  }

  // ---------------------------------------------------------------- vue : réglages
  function renderSettings() {
    resetView();
    const orderList = h('ol.vz-order');
    function drawOrder() {
      let n = 0;
      orderList.replaceChildren(...settings.order.map((p, i) => {
        const off = settings.off.includes(p);
        if (!off) n++;
        const move = (delta) => {
          const o = settings.order;
          [o[i], o[i + delta]] = [o[i + delta], o[i]];
          saveSettings(); drawOrder();
        };
        return h('li', { class: off ? 'is-off' : '' },
          h('span.vz-order-num', off ? '–' : n),
          h('span.vz-order-name', PART_NAME[p]),
          h('label.vz-switch', { title: off ? 'Activer' : 'Désactiver' },
            h('input', { type: 'checkbox', checked: !off, 'aria-label': PART_NAME[p], onchange: (e) => {
              if (e.target.checked) settings.off = settings.off.filter((x) => x !== p);
              else if (activeParts().length > 1) settings.off.push(p);
              else e.target.checked = true;
              saveSettings(); drawOrder();
            } }),
            h('span')),
          h('button.vz-move', { type: 'button', 'aria-label': 'Monter', disabled: i === 0, onclick: () => move(-1) }, '↑'),
          h('button.vz-move', { type: 'button', 'aria-label': 'Descendre', disabled: i === settings.order.length - 1, onclick: () => move(1) }, '↓'));
      }));
    }
    drawOrder();

    const radio = (value, label) => h('label.vz-option',
      h('input', { type: 'radio', name: 'vz-who', value, checked: settings.who === value, onchange: () => { settings.who = value; saveSettings(); } }),
      h('span', h('strong', label)));

    const twoStep = (label, done, fn) => {
      let armed = false;
      const btn = h('button.vz-btn.vz-btn-danger', { type: 'button', onclick: async () => {
        if (!armed) { armed = true; btn.textContent = 'Confirmer ?'; return; }
        armed = false;
        try { await fn(); } catch { btn.textContent = 'Import en cours, réessaie dans un instant'; return; }
        btn.textContent = done;
        btn.disabled = true;
      } }, label);
      return btn;
    };
    function excludedFieldset() {
      const hint = h('p.vz-hint');
      const copy = h('button.vz-btn', { type: 'button', onclick: async () => {
        const list = [...excluded].map((id) => byId.get(id)).filter(Boolean).map((c) => `${c.name} (${c.id})`).join('\n');
        try { await navigator.clipboard.writeText(list); copy.textContent = '✓ Liste copiée'; }
        catch { hint.textContent = list; }
      } }, 'Copier la liste');
      const reset = h('button.vz-btn.vz-btn-ghost', { type: 'button', onclick: () => { excluded.clear(); saveExcluded(); renderSettings(); } }, 'Tout remettre');
      const n = excluded.size;
      hint.textContent = n
        ? `${plural(n, 'célébrité retirée', 'célébrités retirées')} du jeu sur cet appareil. Copie la liste et envoie-la pour les retirer du catalogue.`
        : 'Aucune. Dans l’écran Photos, la poubelle au bout d’une ligne retire une célébrité trop peu connue.';
      return h('fieldset', h('legend', 'Célébrités retirées'), hint, n ? h('div.vz-fill-row', copy, reset) : null);
    }
    const dataHint = h('p.vz-hint');
    const updHint = () => {
      const nFound = Object.keys(found.portrait).length + Object.keys(found.enfance).length;
      dataHint.textContent = `${plural(nFound, 'célébrité trouvée', 'célébrités trouvées')} · ${plural(P.count('portrait'), 'portrait', 'portraits')} et ${plural(P.count('enfance'), 'photo d’enfance', 'photos d’enfance')} sur cet appareil.`
        + (P.persistent ? '' : ' Ce navigateur n’enregistre pas les photos : elles seront perdues en fermant la page.');
    };
    updHint();

    container.replaceChildren(
      topBar('Réglages', { back: backFromTools }),
      h('section.vz-settings',
        h('fieldset', h('legend', 'Ordre de dévoilement (Portraits)'),
          h('p.vz-hint', 'La première partie est visible dès le début, les suivantes se dévoilent une par une. Une partie désactivée n’est jamais montrée avant la réponse.'),
          orderList),
        h('fieldset', h('legend', 'Célébrités'),
          radio('all', 'Tout le monde'), radio('f', 'Femmes'), radio('m', 'Hommes'),
          h('button.vz-btn.vz-btn-ghost', { type: 'button', onclick: (e) => { seed = reseed(); e.currentTarget.textContent = '✓ Ordre mélangé'; } }, 'Mélanger à nouveau')),
        excludedFieldset(),
        h('fieldset', h('legend', 'Progression et photos'),
          dataHint,
          twoStep('Effacer ma progression', '✓ Progression effacée', () => {
            found.portrait = {}; found.enfance = {}; given.portrait = {}; given.enfance = {}; rev = {};
            store.set('found', found); store.set('given', given); store.set('rev', rev);
            updHint();
          }),
          twoStep('Supprimer toutes les photos', '✓ Photos supprimées', async () => {
            if (importing) throw new Error('import en cours');
            await P.clearAll();
            updHint();
          })),
        h('button.vz-btn.vz-btn-primary.vz-wide', { type: 'button', onclick: backFromTools }, lastMode ? 'Retour au jeu' : 'Retour'),
        h('p.vz-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view, arg] = path || [];
    if (MODES[view]) renderPlay(view, arg);
    else if (view === 'photos') renderPhotos(arg);
    else if (view === 'remplir') renderFill(arg);
    else if (view === 'reglages') renderSettings();
    else renderHome();
    window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('vz');
    },
  };
}

// ------------------------------------------------------------------ utilitaires

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

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
  if (!document.querySelector(`link[href="${href}"]`)) document.head.append(h('link', { rel: 'stylesheet', href }));
}
