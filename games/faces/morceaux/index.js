// Modes « Morceaux » et « Portraits de jeunesse » du jeu Visages.
// - morceaux : retrouver la célébrité à partir d’une bande du visage (catalogue people.json)
// - jeunesse : retrouver la célébrité sur une photo de jeunesse (catalogue jeunesse.json)
// Monté par games/faces/index.js : mount(container, ctx) → { update(path), destroy() },
// avec ctx.mode = 'morceaux' | 'jeunesse'.

import { h, icon } from '../../../js/core/dom.js?v=1.35.0';
import { createStore } from '../../../js/core/storage.js?v=1.35.0';
import { buildAnswers, buildOwners, checkAnswer } from './answers.js?v=1.35.0';
import { isUpright, portraitRect, tiltOf, MAX_TILT, faceResolution, qualityOf, LOW_RES, thumbUrl } from './framing.js?v=1.35.0';

const MAX_TRIES = 9;
const TRY_STEP = 3;
const PART_LABEL = { yeux: 'les yeux', nez: 'le nez', bouche: 'la bouche', complet: 'le visage' };
const PARTS = ['yeux', 'nez', 'bouche'];
const WRONG = ['Ce n’est pas ça… Réessaie !', 'Raté ! Encore un essai ?', 'Non, ce n’est pas la bonne personne.', 'Toujours pas… courage !'];

/**
 * Séquences cumulatives : une bande, puis on en ajoute une, puis les trois.
 * Le visage complet n’apparaît qu’à la résolution (trouvé / solution).
 * Ex. seed → [['yeux'], ['yeux','nez'], ['yeux','nez','bouche']]
 */
function pickSequence(seed) {
  const first = PARTS[seed % 3];
  const rest = PARTS.filter((p) => p !== first);
  const second = rest[(seed >>> 3) % 2];
  const third = rest[1 - ((seed >>> 3) % 2)];
  return [[first], [first, second], [first, second, third]];
}

function isValidSeq(seq) {
  return Array.isArray(seq) && seq.length >= 2
    && seq.every((step) => Array.isArray(step) && step.length >= 1
      && step.every((k) => PARTS.includes(k)));
}

/** Libellé du palier : « les yeux », « les yeux et le nez », … */
function partLabelText(keys) {
  if (keys === 'complet' || (Array.isArray(keys) && keys.includes('complet'))) {
    return PART_LABEL.complet;
  }
  const list = (Array.isArray(keys) ? keys : [keys])
    .map((k) => PART_LABEL[k])
    .filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  if (list.length === 2) return `${list[0]} et ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}

const MODES = {
  morceaux: { file: 'people.json', store: 'morceaux', title: 'Morceaux', strips: true },
  jeunesse: { file: 'jeunesse.json', store: 'jeunesse', title: 'Jeunesse', strips: false },
};

export async function mount(container, ctx) {
  const CFG = MODES[ctx.mode] || MODES.morceaux;
  const store = createStore(CFG.store);
  ensureStyles();
  container.classList.add('mx');
  container.replaceChildren(h('div.loading', 'Chargement…'));

  const catalog = await fetch(
    new URL(`./data/${CFG.file}` + new URL(import.meta.url).search, import.meta.url),
    { cache: 'no-cache' },
  ).then((r) => {
    if (!r.ok) throw new Error(`${CFG.file} : ${r.status}`);
    return r.json();
  });
  // Têtes trop penchées écartées du jeu (visibles dans la page debug)
  const people = catalog.filter((p) => isUpright(p));

  const byId = new Map(people.map((p) => [p.id, p]));
  const answers = buildAnswers(people);
  const owners = buildOwners(answers);

  let found = store.get('found', {});
  let tries = store.get('tries', {});
  let given = store.get('given', {});
  let stage = store.get('stage', {}); // id → { seq: string[], i: number }
  // Photos mesurées trop petites sur cet appareil (id → hauteur utile en px) : écartées du jeu
  let lowres = store.get('lowres', {});
  let seed = store.get('seed', null) ?? reseed();
  let order = computeOrder();
  let currentId = store.get('current', null);
  if (!byId.has(currentId) || lowres[currentId]) currentId = order[0] ?? null;
  let cleanup = [];

  function reseed() {
    const s = Math.floor(Math.random() * 2 ** 31);
    store.set('seed', s);
    return s;
  }
  function computeOrder() {
    const ids = people.map((p) => p.id).filter((id) => !lowres[id]);
    return seededShuffle(ids.length ? ids : people.map((p) => p.id), seed);
  }
  /** Mesure une photo chargée ; si elle est trop petite, la note comme écartée. Renvoie la hauteur utile. */
  function measure(person, im) {
    if (!im.naturalWidth) return 0;
    const px = faceResolution(person.box.complet, im.naturalWidth, im.naturalHeight);
    if (px < LOW_RES && !lowres[person.id]) {
      lowres[person.id] = px;
      store.set('lowres', lowres);
    }
    return px;
  }
  const backToGame = () => (currentId ? ctx.navigate('personne', currentId) : ctx.navigate());
  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }

  function ensureStage(id) {
    // Jeunesse : la photo est visible en entier dès le début (un seul palier)
    if (!CFG.strips) return { seq: [['complet']], i: 0 };
    if (!stage[id] || !isValidSeq(stage[id].seq)) {
      const personSeed = (seed ^ hashId(id)) >>> 0;
      const prev = stage[id]?.i || 0;
      const seq = pickSequence(personSeed);
      stage[id] = { seq, i: Math.min(prev, seq.length - 1) };
      store.set('stage', stage);
    }
    return stage[id];
  }

  function topBar(titleText, { back } = {}) {
    const nFound = Object.keys(found).filter((id) => byId.has(id)).length;
    return h('header.mx-bar',
      h('button.mx-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: back || ctx.home }, icon('back')),
      h('h1.mx-title', titleText),
      h('span.mx-score', { title: 'Personnes trouvées' }, h('strong', nFound), ` / ${people.length}`),
      h('button.mx-icon-btn', { title: 'Toutes les photos', 'aria-label': 'Toutes les photos', onclick: () => ctx.navigate('grille') }, icon('grid')),
      h('button.mx-icon-btn', { title: 'Réglages', 'aria-label': 'Réglages', onclick: () => ctx.navigate('reglages') }, icon('settings'))
    );
  }

  /**
   * Région affichée : union verticale des bandes demandées, pleine largeur
   * du visage. `complet` → boîte visage (mode cover 2:3 à part).
   */
  function displayBox(person, keys) {
    const face = person.box.complet;
    const list = Array.isArray(keys) ? keys : [keys];
    if (list.includes('complet')) return face;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const k of list) {
      const feat = person.box[k];
      if (!feat) continue;
      y0 = Math.min(y0, feat[1]);
      y1 = Math.max(y1, feat[1] + feat[3]);
    }
    if (!Number.isFinite(y0) || y1 <= y0) return face;
    return [face[0], y0, face[2], y1 - y0];
  }

  /**
   * Cadre de jeu.
   * - Morceaux (whole) : cadre 2:3 dès le début, photo très floutée, seule la zone visible
   *   (les bandes) est nette. Depuis la 1.31.0, c'est l'unique affichage de Morceaux.
   * - sans whole (ancien mode « bandes seules ») : bande(s) sur toute la largeur disponible ;
   *   à la résolution, cadre 2:3 (même taille pour tout le monde).
   * Premier affichage sans transition (évite le spoil) ; élargissements animés.
   */
  function faceFrame(person, boxKey, { revealName = false, whole = false, onMeasure = null } = {}) {
    let currentKey = boxKey;
    const wrap = h('div.mx-frame', {
      'aria-label': revealName ? person.name : 'Visage mystère',
    });
    wrap.classList.toggle('is-whole', whole);
    const empty = h('div.mx-frame-empty', 'Chargement…');
    const imgProps = { src: person.img, decoding: 'async', draggable: false, referrerPolicy: 'no-referrer-when-downgrade' };
    const img = h('img.mx-sharp', { ...imgProps, alt: revealName ? person.name : 'Visage mystère' });
    const blur = whole ? h('img.mx-blur', { ...imgProps, alt: '', 'aria-hidden': 'true' }) : null;
    const imgs = blur ? [blur, img] : [img];

    const place = (el, l, t, w, hh) => {
      el.style.left = `${l}%`;
      el.style.top = `${t}%`;
      el.style.width = `${w}%`;
      el.style.height = `${hh}%`;
    };

    const applyBox = (key = currentKey, { animate = false } = {}) => {
      currentKey = key;
      wrap.classList.toggle('is-anim', Boolean(animate));
      const full = key === 'complet' || (Array.isArray(key) && key.includes('complet'));
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const portrait = whole || full;
      wrap.classList.toggle('is-full', portrait);

      if (portrait) {
        // Cadre 2:3 identique pour tous, photo en « cover » centrée sur le visage
        wrap.style.setProperty('--mx-ar', String(2 / 3));
        // Plan rapproché : la boîte « complet » remplit le cadre 2:3
        const r = portraitRect(person.box.complet, nw, nh);
        imgs.forEach((el) => place(el, r.left, r.top, r.width, r.height));
        if (whole) {
          const [bx, by, bw, bh] = full ? [0, 0, 1, 1] : displayBox(person, key);
          const pct = (v) => `${(Math.max(0, v) * 100).toFixed(3)}%`;
          img.style.clipPath = `inset(${pct(by)} ${pct(1 - bx - bw)} ${pct(1 - by - bh)} ${pct(bx)} round ${full ? 0 : 6}px)`;
        }
      } else {
        // Bande pleine largeur du visage, hauteur = union des zones
        const [bx, by, bw, bh] = displayBox(person, key);
        wrap.style.setProperty('--mx-ar', String((bw * nw) / (bh * nh)));
        place(img, (-bx / bw) * 100, (-by / bh) * 100, 100 / bw, 100 / bh);
      }
    };

    const onReady = () => {
      if (!img.naturalWidth) return;
      if (onMeasure && onMeasure(measure(person, img)) === false) return; // photo écartée : pas d’affichage
      // Coupure immédiate, sans glisser depuis l’image entière
      applyBox(currentKey, { animate: false });
      wrap.classList.add('is-loaded');
      empty.remove();
    };
    img.addEventListener('load', onReady);
    img.addEventListener('error', () => {
      empty.textContent = 'Image indisponible';
      wrap.classList.add('is-error');
    });
    wrap.append(empty, ...imgs);
    wrap._setBox = (key, opts) => {
      if (img.naturalWidth) applyBox(key, opts);
      else currentKey = key;
    };
    if (img.complete) onReady();
    return wrap;
  }

  // ---------------------------------------------------------------- vue : jeu
  function renderEmpty() {
    resetView();
    container.classList.remove('is-play');
    container.classList.add('is-scroll');
    container.replaceChildren(
      topBar(CFG.title),
      h('section.mx-settings',
        h('fieldset', h('legend', 'Aucune photo pour l’instant'),
          h('p.mx-hint', 'Le catalogue des photos de jeunesse est vide. Il se remplit avec le script scripts/celeb-quiz-builder.py --jeunesse, à partir d’une liste de photos Wikimedia Commons (scripts/jeunesse-seed.json).'),
          h('button.mx-btn.mx-btn-primary', { type: 'button', onclick: ctx.home }, 'Retour à Visages')
        )
      )
    );
  }

  function renderPlay(id) {
    if (!people.length) { renderEmpty(); return; }
    resetView();
    container.classList.add('is-play');
    container.classList.remove('is-scroll');
    if (id && byId.has(id)) currentId = id;
    store.set('current', currentId);
    const person = byId.get(currentId);
    const idx = order.indexOf(currentId);
    const isFound = Boolean(found[person.id]);
    const solved = isFound || Boolean(given[person.id]);
    const st = ensureStage(person.id);
    let level = solved ? st.seq.length - 1 : Math.min(st.i, st.seq.length - 1);
    // Navigation : on saute les photos mesurées trop petites
    const go = (delta) => {
      const n = order.length;
      let i = idx < 0 ? 0 : idx;
      for (let k = 0; k < n; k++) {
        i = (i + delta + n) % n;
        if (!lowres[order[i]] || k === n - 1) break;
      }
      ctx.navigate('personne', order[i]);
    };

    // Préchargement des voisins (et mesure de leur qualité)
    [1, -1].forEach((d) => {
      const p = byId.get(order[(idx + d + order.length) % order.length]);
      if (p) { const im = new Image(); im.onload = () => measure(p, im); im.src = p.img; }
    });

    const whole = CFG.strips; // Morceaux : photo entière floutée, seule la zone visible est nette
    const stepLabel = (keys) => (CFG.strips ? partLabelText(keys) : person.year ? `photo de ${person.year}` : 'photo de jeunesse');
    let skipped = false;
    const frame = faceFrame(person, solved ? 'complet' : st.seq[level], {
      revealName: solved,
      whole,
      // Photo trop petite (floue une fois agrandie) : on passe à la suivante, sauf si déjà résolue
      onMeasure: (px) => {
        if (px >= LOW_RES || solved || skipped || order.length < 2) return true;
        skipped = true;
        go(1);
        return false;
      },
    });
    const feedback = h('p.mx-feedback', { role: 'status', 'aria-live': 'polite' });
    const announce = h('p.mx-sr', { role: 'status', 'aria-live': 'polite' });
    const partLabel = h('span.mx-part', solved && CFG.strips ? PART_LABEL.complet : stepLabel(st.seq[level]));
    const input = h('input.mx-input', {
      type: 'text', placeholder: 'Qui est-ce ?', autocomplete: 'off', autocapitalize: 'off', spellcheck: false,
      'aria-label': 'Nom de la personne', enterKeyHint: 'done',
    });
    input.setAttribute('autocorrect', 'off');

    let attempts = 0;
    const triesNow = () => Math.min(tries[person.id] || 0, MAX_TRIES);
    const dots = h('div.mx-tries', { role: 'img' },
      Array.from({ length: MAX_TRIES }, (_, i) => h('span', { class: `mx-try${i % TRY_STEP === 0 && i ? ' is-step' : ''}` })));
    const updTries = () => {
      const n = triesNow();
      [...dots.children].forEach((d, i) => d.classList.toggle('is-used', i < n));
      dots.setAttribute('aria-label', `${n} essai${n > 1 ? 's' : ''} sur ${MAX_TRIES}`);
      dots.hidden = solved && !n;
    };

    const syncFrame = ({ animate = true } = {}) => {
      const key = st.seq[level];
      frame._setBox(key, { animate });
      partLabel.textContent = stepLabel(key);
      if (hintBtn) {
        const last = level >= st.seq.length - 1;
        hintBtn.textContent = last ? 'Solution' : 'Voir plus';
        hintBtn.title = last ? 'Afficher la réponse' : 'Ajouter une partie du visage';
      }
    };

    const advanceLevel = (fromTries) => {
      if (level >= st.seq.length - 1) return false;
      level += 1;
      st.i = level;
      store.set('stage', stage);
      syncFrame({ animate: true });
      if (fromTries) feedback.textContent = 'Raté ! On voit un peu plus du visage.';
      return true;
    };

    const infoBlock = (gaveUp) => h('div.mx-reveal',
      gaveUp ? h('p.mx-bravo.is-given', 'C’était…') : h('p.mx-bravo', icon('check'), ' Bravo !'),
      h('h2.mx-who', person.name),
      h('p.mx-credit', [person.year && !CFG.strips ? `Photo de ${person.year}` : null, creditLine(person)].filter(Boolean).join(' · '))
    );

    let hintBtn = null;

    const form = h('form.mx-form', {
      onsubmit: (e) => {
        e.preventDefault();
        const guess = input.value.trim();
        if (!guess) { input.focus(); return; }
        attempts++;
        const verdict = checkAnswer(guess, answers.get(person.id), owners);
        if (verdict?.ok) {
          found[person.id] = Date.now();
          store.set('found', found);
          level = st.seq.length - 1;
          st.i = level;
          store.set('stage', stage);
          reveal(false);
        } else {
          const n = triesNow() + 1;
          tries[person.id] = n;
          store.set('tries', tries);
          updTries();
          if (n >= MAX_TRIES) {
            given[person.id] = Date.now();
            store.set('given', given);
            reveal(true);
            return;
          }
          const stepped = n % TRY_STEP === 0;
          const advanced = stepped && advanceLevel(true);
          const near = verdict?.near;
          feedback.textContent = near
            ? (verdict.hint || 'Tu chauffes ! Vérifie l’orthographe.')
            : advanced
              ? (feedback.textContent || 'Raté ! On voit un peu plus du visage.')
              : WRONG[(attempts - 1) % WRONG.length];
          feedback.className = `mx-feedback is-error${near ? ' is-near' : ''}`;
          form.classList.remove('mx-shake');
          void form.offsetWidth;
          form.classList.add('mx-shake');
          input.select();
        }
      },
    },
      h('div.mx-input-row', input, h('button.mx-btn.mx-btn-primary', { type: 'submit' }, 'Valider')),
      feedback
    );

    const solvedPanel = (gaveUp = !isFound && Boolean(given[person.id])) => {
      const next = h('button.mx-btn.mx-btn-primary', { type: 'button', onclick: () => go(1) }, 'Suivant', icon('next'));
      setTimeout(() => next.focus(), 50);
      return h('div.mx-solved', infoBlock(gaveUp), next);
    };

    function reveal(gaveUp) {
      level = st.seq.length - 1;
      st.i = level;
      store.set('stage', stage);
      frame._setBox('complet', { animate: true });
      frame.querySelector('img')?.setAttribute('alt', person.name);
      if (CFG.strips) partLabel.textContent = PART_LABEL.complet;
      stageEl.classList.add(gaveUp ? 'is-given' : 'is-solved');
      form.replaceWith(solvedPanel(gaveUp));
      hintBtn.hidden = true;
      announce.textContent = `${gaveUp ? '' : 'Bravo ! '}C’était ${person.name}.`;
      bar.replaceWith((bar = topBar(CFG.title)));
    }

    hintBtn = h('button.mx-btn.mx-btn-ghost', {
      type: 'button',
      onclick: () => {
        if (level >= st.seq.length - 1) {
          given[person.id] = Date.now();
          store.set('given', given);
          reveal(true);
          return;
        }
        advanceLevel(false);
        feedback.textContent = '';
        feedback.className = 'mx-feedback';
      },
    }, level >= st.seq.length - 1 ? 'Solution' : 'Voir plus');

    hintBtn.hidden = solved;
    const navRow = h('div.mx-navrow',
      h('button.mx-nav', { type: 'button', 'aria-label': 'Précédent', title: 'Précédent (←)', onclick: () => go(-1) }, icon('prev')),
      hintBtn,
      h('button.mx-nav', { type: 'button', 'aria-label': solved ? 'Suivant' : 'Passer', title: `${solved ? 'Suivant' : 'Passer'} (→)`, onclick: () => go(1) }, icon('next'))
    );

    const stageEl = h('section.mx-stage', { class: `mx-stage${isFound ? ' is-solved' : solved ? ' is-given' : ''}` },
      h('div.mx-meta', h('span.mx-counter', `${idx + 1} / ${order.length}`), partLabel),
      h('div.mx-frame-row', h('div.mx-frame-box', frame, dots)),
      navRow,
      solved ? solvedPanel() : form,
      announce
    );

    let bar = topBar(CFG.title);
    updTries();
    container.replaceChildren(bar, stageEl);
    if (!solved && matchMedia('(hover: hover)').matches) input.focus();

    onKey((e) => {
      const typing = document.activeElement === input && input.value !== '';
      if (typing || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  }

  // ---------------------------------------------------------------- debug : boîtes MediaPipe
  const DEBUG_LAYERS = [
    { key: 'yeux', label: 'Yeux', color: '#00e5ff' },
    { key: 'nez', label: 'Nez', color: '#ffd600' },
    { key: 'bouche', label: 'Bouche', color: '#ff4081' },
    { key: 'complet', label: 'Complet', color: '#ffffff', dashed: true },
  ];

  function renderDebug() {
    resetView();
    container.classList.remove('is-play');
    container.classList.add('is-scroll');

    const legend = h('div.mx-debug-legend',
      DEBUG_LAYERS.map((l) => h('span.mx-debug-chip', {
        style: { '--c': l.color, borderStyle: l.dashed ? 'dashed' : 'solid' },
      }, l.label))
    );

    const cards = catalog.map((p) => {
      const stage = h('div.mx-debug-stage');
      const img = h('img.mx-debug-img', {
        src: p.img,
        alt: p.name,
        loading: 'lazy',
        decoding: 'async',
        referrerPolicy: 'no-referrer-when-downgrade',
      });
      const overlays = h('div.mx-debug-overlays');
      const q = h('small.mx-q', 'Qualité : …');
      const draw = () => {
        if (!img.naturalWidth) return;
        const px = faceResolution(p.box.complet, img.naturalWidth, img.naturalHeight);
        q.textContent = `Qualité : ${qualityOf(px)} (${img.naturalWidth}×${img.naturalHeight}, visage ${px} px)`;
        q.className = `mx-q is-${qualityOf(px)}`;
        // Le stage prend le ratio réel de la photo pour que les % des boîtes collent
        stage.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        overlays.replaceChildren(...DEBUG_LAYERS.map((l) => {
          const b = p.box[l.key];
          if (!b) return null;
          const [x, y, w, hh] = b;
          return h('div.mx-debug-box', {
            title: `${l.label} [${x}, ${y}, ${w}, ${hh}]`,
            style: {
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${hh * 100}%`,
              borderColor: l.color,
              borderStyle: l.dashed ? 'dashed' : 'solid',
              background: `${l.color}33`,
            },
          }, h('span', { style: { color: l.color } }, l.label));
        }).filter(Boolean));
      };
      img.addEventListener('load', draw);
      img.addEventListener('error', () => {
        stage.classList.add('is-error');
        overlays.replaceChildren(h('p.mx-debug-err', 'Image indisponible'));
      });
      if (img.complete && img.naturalWidth) draw();
      stage.append(img, overlays);
      return h('article.mx-debug-card',
        h('header.mx-debug-head',
          h('strong', p.name),
          h('small', `Inclinaison ≈ ${Math.round(tiltOf(p))}°${isUpright(p) ? '' : ` · écartée (≥ ${MAX_TILT}°)`}`),
          q,
          h('small', creditLine(p))
        ),
        stage
      );
    });

    container.replaceChildren(
      topBar('Debug détection', { back: backToGame }),
      h('section.mx-debug',
        h('p.mx-hint',
          `Rectangles = boîtes du catalogue (MediaPipe). Yeux / nez / bouche, et le cadre complet (pointillé). ${catalog.length - people.length} photos où la tête est trop penchée sont écartées du jeu.`
        ),
        legend,
        h('div.mx-debug-grid', cards)
      )
    );
  }

  // ---------------------------------------------------------------- analyse de la qualité
  function renderQuality() {
    resetView();
    container.classList.remove('is-play');
    container.classList.add('is-scroll');
    let alive = true;
    cleanup.push(() => { alive = false; });
    const results = new Map(); // id → px (0 = image indisponible)
    const progress = h('p.mx-hint', `Analyse de ${people.length} photos…`);
    const bar = h('progress.mx-progress', { max: people.length, value: 0 });
    const list = h('ul.mx-credit-list');
    const copyBtn = h('button.mx-btn.mx-btn-ghost', { type: 'button', disabled: true, onclick: async () => {
      const low = sortedLow();
      const text = low.map(([p, px]) => `${p.name} (${p.id}) : ${px ? `visage ${px} px` : 'image indisponible'} · ${p.img}`).join('\n');
      try { await navigator.clipboard.writeText(text); copyBtn.textContent = `✓ ${low.length} lignes copiées`; } catch { copyBtn.textContent = 'Copie refusée par le navigateur'; }
    } }, 'Copier la liste à remplacer');
    const sortedLow = () => [...results].filter(([, px]) => px < LOW_RES)
      .map(([id, px]) => [byId.get(id), px]).sort((a, b) => a[1] - b[1]);
    const showList = () => {
      const low = sortedLow();
      list.replaceChildren(...low.map(([p, px]) => h('li',
        h('strong', p.name),
        h('small', px ? `Visage ${px} px (minimum ${LOW_RES}) · ${creditLine(p)}` : 'Image indisponible')
      )));
      copyBtn.disabled = !low.length;
    };

    let next = 0;
    let done = 0;
    const worker = () => new Promise((resolve) => {
      const step = () => {
        if (!alive || next >= people.length) { resolve(); return; }
        const p = people[next++];
        const im = new Image();
        im.referrerPolicy = 'no-referrer-when-downgrade';
        const end = (px) => {
          results.set(p.id, px);
          done++;
          bar.value = done;
          progress.textContent = `${done} / ${people.length} photos analysées`;
          step();
        };
        im.onload = () => end(measure(p, im));
        im.onerror = () => end(0);
        im.src = p.img;
      };
      step();
    });
    Promise.all(Array.from({ length: 4 }, worker)).then(() => {
      if (!alive) return;
      const low = sortedLow();
      const q = { bonne: 0, moyenne: 0 };
      for (const px of results.values()) if (px >= LOW_RES) q[qualityOf(px)]++;
      progress.textContent = `${people.length} photos analysées : ${q.bonne} bonnes, ${q.moyenne} moyennes, ${low.length} de basse qualité ou indisponibles. Les photos de basse qualité sont retirées du jeu sur cet appareil.`;
      order = computeOrder();
      showList();
    });

    container.replaceChildren(
      topBar('Qualité des photos', { back: () => ctx.navigate('reglages') }),
      h('section.mx-credits',
        h('h2', 'Analyse de la qualité'),
        h('p.mx-hint', `Chaque photo est chargée et mesurée : on regarde combien de pixels de la photo d’origine remplissent le cadre du visage. En dessous de ${LOW_RES} px, elle paraît floue ou pixelisée une fois agrandie.`),
        bar, progress, copyBtn, list
      )
    );
  }

  // ---------------------------------------------------------------- grille de toutes les photos
  /** Vignette 2:3 en plan rapproché (petite image Commons, puis l’originale si elle échoue). */
  function thumb(person) {
    const box = h('div.mx-thumb');
    const img = h('img', {
      src: thumbUrl(person.img), alt: '', loading: 'lazy', decoding: 'async', draggable: false,
      referrerPolicy: 'no-referrer-when-downgrade',
    });
    img.addEventListener('load', () => {
      if (!img.naturalWidth) return;
      const r = portraitRect(person.box.complet, img.naturalWidth, img.naturalHeight);
      Object.assign(img.style, { left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` });
      box.classList.add('is-loaded');
    });
    img.addEventListener('error', () => {
      if (img.src !== person.img) img.src = person.img;
      else box.classList.add('is-error');
    });
    box.append(img);
    return box;
  }

  function renderGrid(showCredits = false) {
    if (!people.length) { renderEmpty(); return; }
    resetView();
    container.classList.remove('is-play');
    container.classList.add('is-scroll');
    // Ordre du jeu (celui du compteur « n / total ») : la position ne révèle rien du nom
    const list = order.map((id) => byId.get(id)).filter(Boolean);
    const cards = list.map((p, i) => {
      const isFound = Boolean(found[p.id]);
      const isGiven = !isFound && Boolean(given[p.id]);
      const known = isFound || isGiven;
      return h('button.mx-card', {
        class: `mx-card${isFound ? ' is-found' : isGiven ? ' is-given' : ''}${p.id === currentId ? ' is-current' : ''}`,
        type: 'button',
        title: known ? `${p.name} · photo ${creditLine(p)}` : `Personne mystère n° ${i + 1}`,
        onclick: () => ctx.navigate('personne', p.id),
      },
        thumb(p),
        h('span.mx-card-num', i + 1),
        h('span.mx-card-name', known ? p.name : ' ')
      );
    });
    const n = list.filter((p) => found[p.id]).length;
    const credits = h('details.mx-credits-box', { id: 'mx-credits', open: showCredits },
      h('summary', `Crédits photo (${people.length})`),
      h('p.mx-hint', 'Photos issues de Wikimedia Commons. Attribution affichée selon la licence.'),
      h('ul.mx-credit-list',
        [...people].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((p) => h('li',
          h('strong', p.name),
          h('small', creditLine(p))
        ))
      )
    );
    container.replaceChildren(
      topBar('Photos', { back: backToGame }),
      h('div.mx-grid-head',
        h('p', h('strong', n), ` trouvée${n > 1 ? 's' : ''} sur ${list.length} · dans l’ordre du jeu`),
        h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: () => {
          credits.open = true;
          credits.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } }, 'Crédits photo')
      ),
      h('div.mx-grid', cards),
      credits
    );
    const target = showCredits ? credits : container.querySelector('.mx-card.is-current');
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: showCredits ? 'start' : 'center' }));
    else window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- réglages
  function renderSettings() {
    resetView();
    container.classList.remove('is-play');
    container.classList.add('is-scroll');
    let resetArmed = false;
    const resetBtn = h('button.mx-btn.mx-btn-danger', { type: 'button', onclick: () => {
      if (!resetArmed) { resetArmed = true; resetBtn.textContent = 'Confirmer la remise à zéro'; return; }
      found = {}; tries = {}; given = {}; stage = {};
      store.set('found', found); store.set('tries', tries); store.set('given', given); store.set('stage', stage);
      resetBtn.textContent = '✓ Progression effacée';
      resetBtn.disabled = true;
    } }, 'Effacer ma progression');

    container.replaceChildren(
      topBar('Réglages', { back: backToGame }),
      h('section.mx-settings',
        h('fieldset', h('legend', 'Ordre'),
          h('p.mx-hint', 'Les personnes sont proposées dans un ordre aléatoire mémorisé.'),
          h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: (e) => {
            seed = reseed();
            order = computeOrder();
            e.currentTarget.textContent = '✓ Ordre mélangé';
          } }, 'Mélanger à nouveau')
        ),
        h('fieldset', h('legend', 'Progression'),
          h('p.mx-hint', `${plural(Object.keys(found).filter((id) => byId.has(id)).length, 'personne trouvée', 'personnes trouvées')} sur ${people.length}.`),
          resetBtn
        ),
        h('fieldset', h('legend', 'Qualité des photos'),
          h('p.mx-hint', Object.keys(lowres).length
            ? `${plural(Object.keys(lowres).length, 'photo de basse qualité est écartée', 'photos de basse qualité sont écartées')} du jeu sur cet appareil.`
            : 'Les photos trop petites (floues une fois agrandies) sont écartées automatiquement quand elles sont chargées.'),
          h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: () => ctx.navigate('qualite') }, 'Analyser toutes les photos'),
          Object.keys(lowres).length ? h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: (e) => {
            lowres = {}; store.set('lowres', lowres); order = computeOrder();
            e.currentTarget.textContent = '✓ Photos remises dans le jeu';
          } }, 'Remettre ces photos dans le jeu') : null
        ),
        h('fieldset', h('legend', 'Crédits'),
          h('p.mx-hint', 'Auteur et licence de chaque photo Commons.'),
          h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: () => ctx.navigate('credits') }, 'Voir les crédits photo')
        ),
        h('fieldset', h('legend', 'Développement'),
          h('p.mx-hint', 'Vérifie les boîtes yeux / nez / bouche détectées sur chaque photo.'),
          h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: () => ctx.navigate('debug') }, 'Page debug détection')
        ),
        h('button.mx-btn.mx-btn-primary.mx-wide', { type: 'button', onclick: backToGame }, 'Retour au jeu'),
        h('p.mx-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
  }

  function update(path) {
    const [view, arg] = path || [];
    if (view === 'grille') renderGrid(false);
    else if (view === 'credits') renderGrid(true);
    else if (view === 'reglages') renderSettings();
    else if (view === 'debug') renderDebug();
    else if (view === 'qualite') renderQuality();
    else renderPlay(view === 'personne' ? arg : null);
    if (!['grille', 'credits', 'debug', 'qualite'].includes(view)) window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      resetView();
      container.classList.remove('mx', 'is-play', 'is-scroll');
    },
  };
}

function creditLine(p) {
  return [p.by, p.lic].filter(Boolean).join(' · ');
}

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return h >>> 0;
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
