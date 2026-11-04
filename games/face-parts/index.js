// Jeu « Morceaux » : retrouver la célébrité à partir d’une bande du visage.
// Contrat : export mount(container, ctx) → { update(path), destroy() }

import { h, icon } from '../../js/core/dom.js?v=1.15.0';
import { createStore } from '../../js/core/storage.js?v=1.15.0';
import { buildAnswers, buildOwners, checkAnswer } from './answers.js?v=1.15.0';
import { isUpright, portraitRect, tiltOf, MAX_TILT } from './framing.js?v=1.15.0';

const store = createStore('morceaux');
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

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('mx');
  container.replaceChildren(h('div.loading', 'Chargement…'));

  const catalog = await fetch(
    new URL('./data/people.json' + new URL(import.meta.url).search, import.meta.url),
    { cache: 'no-cache' },
  ).then((r) => {
    if (!r.ok) throw new Error(`people.json : ${r.status}`);
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
  let settings = { view: 'bandes', ...store.get('settings', {}) }; // view : 'bandes' | 'entiere'
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
    return seededShuffle(people.map((p) => p.id), seed);
  }
  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function resetView() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
  }

  function ensureStage(id) {
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
      h('button.mx-icon-btn', { title: 'Crédits photo', 'aria-label': 'Crédits photo', onclick: () => ctx.navigate('credits') }, icon('info')),
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
   * - mode « bandes » : bande(s) sur toute la largeur disponible, hauteur = union des zones ;
   *   à la résolution, cadre 2:3 (même taille pour tout le monde).
   * - mode « photo entière » (réglage) : cadre 2:3 dès le début, photo très floutée,
   *   seule la zone visible est nette.
   * Premier affichage sans transition (évite le spoil) ; élargissements animés.
   */
  function faceFrame(person, boxKey, { revealName = false, whole = false } = {}) {
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
  function renderPlay(id) {
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
    const go = (delta) => ctx.navigate('personne', order[(idx + delta + order.length) % order.length]);

    // Préchargement voisins
    [1, -1].forEach((d) => {
      const p = byId.get(order[(idx + d + order.length) % order.length]);
      if (p) { const im = new Image(); im.src = p.img; }
    });

    const whole = settings.view === 'entiere';
    const frame = faceFrame(person, solved ? 'complet' : st.seq[level], { revealName: solved, whole });
    const feedback = h('p.mx-feedback', { role: 'status', 'aria-live': 'polite' });
    const announce = h('p.mx-sr', { role: 'status', 'aria-live': 'polite' });
    const partLabel = h('span.mx-part', solved ? PART_LABEL.complet : partLabelText(st.seq[level]));
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
      partLabel.textContent = partLabelText(key);
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
      h('p.mx-credit', creditLine(person))
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
      partLabel.textContent = PART_LABEL.complet;
      stageEl.classList.add(gaveUp ? 'is-given' : 'is-solved');
      form.replaceWith(solvedPanel(gaveUp));
      hintBtn.hidden = true;
      announce.textContent = `${gaveUp ? '' : 'Bravo ! '}C’était ${person.name}.`;
      bar.replaceWith((bar = topBar('Morceaux')));
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

    let bar = topBar('Morceaux');
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
      const draw = () => {
        if (!img.naturalWidth) return;
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
          h('small', creditLine(p))
        ),
        stage
      );
    });

    container.replaceChildren(
      topBar('Debug détection', { back: () => ctx.navigate('personne', currentId) }),
      h('section.mx-debug',
        h('p.mx-hint',
          `Rectangles = boîtes du catalogue (MediaPipe). Yeux / nez / bouche, et le cadre complet (pointillé). ${catalog.length - people.length} photos où la tête est trop penchée sont écartées du jeu.`
        ),
        legend,
        h('div.mx-debug-grid', cards)
      )
    );
  }

  // ---------------------------------------------------------------- crédits
  function renderCredits() {
    resetView();
    container.classList.remove('is-play');
    container.classList.add('is-scroll');
    container.replaceChildren(
      topBar('Crédits photo', { back: () => ctx.navigate('personne', currentId) }),
      h('section.mx-credits',
        h('h2', 'Photos'),
        h('p.mx-hint', 'Photos issues de Wikimedia Commons. Attribution affichée selon la licence.'),
        h('ul.mx-credit-list',
          people.map((p) => h('li',
            h('strong', p.name),
            h('small', creditLine(p))
          ))
        )
      )
    );
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
      topBar('Réglages', { back: () => ctx.navigate('personne', currentId) }),
      h('section.mx-settings',
        h('fieldset', h('legend', 'Affichage'),
          h('p.mx-hint', 'Comment montrer la partie visible du visage.'),
          h('div.mx-choices', { role: 'radiogroup', 'aria-label': 'Affichage' },
            [['bandes', 'Bandes seules', 'Seule la bande du visage est visible.'],
              ['entiere', 'Photo entière floutée', 'Toute la photo est très floutée, sauf la zone visible.']]
              .map(([val, label, desc]) => h('label.mx-choice',
                h('input', { type: 'radio', name: 'mx-view', value: val, checked: settings.view === val,
                  onchange: () => { settings = { ...settings, view: val }; store.set('settings', settings); } }),
                h('span', h('strong', label), h('small', desc))
              )))
        ),
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
        h('fieldset', h('legend', 'Crédits'),
          h('p.mx-hint', 'Auteur et licence de chaque photo Commons.'),
          h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: () => ctx.navigate('credits') }, 'Voir les crédits photo')
        ),
        h('fieldset', h('legend', 'Développement'),
          h('p.mx-hint', 'Vérifie les boîtes yeux / nez / bouche détectées sur chaque photo.'),
          h('button.mx-btn.mx-btn-ghost', { type: 'button', onclick: () => ctx.navigate('debug') }, 'Page debug détection')
        ),
        h('button.mx-btn.mx-btn-primary.mx-wide', { type: 'button', onclick: () => ctx.navigate('personne', currentId) }, 'Retour au jeu'),
        h('p.mx-version', `Little Games · version ${ctx.version || '?'}`)
      )
    );
  }

  function update(path) {
    const [view, arg] = path || [];
    if (view === 'credits') renderCredits();
    else if (view === 'reglages') renderSettings();
    else if (view === 'debug') renderDebug();
    else renderPlay(view === 'personne' ? arg : null);
    if (view !== 'credits' && view !== 'debug') window.scrollTo(0, 0);
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
