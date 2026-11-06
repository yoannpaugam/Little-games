// Jeu « Compète de zinzin » : un jeu de plateau qui enchaîne des défis tirés des autres jeux de l'application.
// On lance le dé, le pion avance, et la case donne un défi (affiche, visage, livre, pays, chemin, nonogramme).
// Tant que le défi n'est pas réussi, l'équipe reste sur la case. La première équipe qui finit ses tours de plateau gagne.
//
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (accueil du jeu) | ['nouvelle'] | ['rejoindre', code?] | ['partie']
//
// Principe :
//   - toute la logique tient dans applyAction(G, action) (logic.js), la même sur un seul téléphone et en multi ;
//   - toute interaction passe par dispatch(action) : sur un seul téléphone ou chez l'arbitre, l'action est appliquée,
//     sauvegardée et affichée ; chez un invité, elle est envoyée à l'arbitre sans rien modifier en local ;
//   - render() reconstruit l'écran à partir de G.

import { h, icon } from '../../js/core/dom.js?v=1.36.0';
import { createStore } from '../../js/core/storage.js?v=1.36.0';
import { GAMES } from '../registry.js?v=1.36.0';
import {
  BOARD_COLS, BOARD_ROWS, MIN_TEAMS, MAX_TEAMS, MIN_LAPS, MAX_LAPS, DICE_MS, STEP_MS, REVEAL_MS, GRACE_MS,
  cellPos, newGame, applyAction, cellOf, goalOf, ranking, cleanName,
} from './logic.js?v=1.36.0';
import { CHALLENGE_GAMES, loadCatalogs, pick, mountChallenge } from './challenges.js?v=1.36.0';
import { openLink, BROKERS } from './net.js?v=1.36.0';

const store = createStore('zinzin', { version: 1 });
const DEFAULTS = { mode: 'solo', teams: 2, laps: 1, names: [] };

const rid = (n = 10) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join('');
};
/** Code de partie à 5 chiffres, tiré avec crypto.getRandomValues. */
const newCode = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(10000 + (a[0] % 90000)); };

// Identifiant persistant de l'appareil : il relie un téléphone à son équipe, même après une reconnexion.
let CID = store.get('cid', null);
if (!CID) { CID = rid(12); store.set('cid', CID); }

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('zz');
  const meta = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  const boardGames = GAMES.map((g) => g.id).filter((id) => CHALLENGE_GAMES.includes(id));
  const brokers = (() => { const b = store.get('broker', null); return b ? [b] : BROKERS; })(); // relais local pour les tests

  let path = ctx.path || [];
  let settings = { ...DEFAULTS, ...store.get('settings', {}) };
  /** Jeux choisis pour le plateau (tous par défaut, au moins un). */
  const chosenGames = () => { const g = boardGames.filter((id) => !settings.off?.includes(id)); return g.length ? g : boardGames; };
  const saveSettings = () => store.set('settings', settings);

  // ---------------------------------------------------------------- session
  // S.kind : 'solo' (un seul téléphone) | 'host' (arbitre) | 'guest' (invité)
  const S = {
    kind: null, G: null, code: null, link: null, up: true, upSince: 0,
    clockOff: 0, join: null, pending: new Map(), seen: new Set(), acks: [], notFound: null, ended: false,
  };
  const now = () => Date.now() - S.clockOff; // heure de l'arbitre
  const timers = [];
  const every = (fn, ms) => timers.push(setInterval(fn, ms));

  function saveGame() {
    if (S.kind === 'solo') store.set('solo', S.G);
    if (S.kind === 'host') store.set('hostG', { G: S.G, acks: S.acks.slice(-60) });
  }
  const session = () => store.get('session', null);

  function resumeIfAny() {
    if (S.kind) return;
    const s = session();
    if (!s) return;
    if (s.role === 'solo') {
      const G = store.get('solo', null);
      if (!G) { store.remove('session'); return; }
      Object.assign(S, { kind: 'solo', G });
      loadCatalogs();
    } else if (s.role === 'host') {
      const saved = store.get('hostG', null);
      if (!saved?.G) { store.remove('session'); return; }
      Object.assign(S, { kind: 'host', G: saved.G, code: s.code, acks: saved.acks || [] });
      S.acks.forEach((id) => S.seen.add(id));
      loadCatalogs();
      connectHost();
    } else if (s.role === 'guest') {
      startGuest(s.code);
    }
  }

  function endSession({ silent = false } = {}) {
    if (S.kind === 'host' && S.link) S.link.clearState(); // message retenu vide : la partie est terminée pour tous
    if (S.kind === 'guest' && S.link && !silent) sendNow({ t: 'leave' });
    const link = S.link;
    if (link) setTimeout(() => link.close(), 400);
    store.remove('session'); store.remove('solo'); store.remove('hostG');
    Object.assign(S, { kind: null, G: null, code: null, link: null, join: null, ended: false, clockOff: 0, acks: [] });
    S.pending.clear(); S.seen.clear();
    clearTimeout(S.notFound);
    closeChallenge();
  }

  function startSolo() {
    endSession({ silent: true });
    const names = Array.from({ length: settings.teams }, (_, i) => ({ name: settings.names[i] || '' }));
    Object.assign(S, { kind: 'solo', G: newGame({ mode: 'solo', laps: settings.laps, games: chosenGames(), teams: names }) });
    store.set('session', { role: 'solo' });
    saveGame();
    loadCatalogs();
    ctx.navigate('partie');
  }

  async function startHost() {
    endSession({ silent: true });
    const code = newCode();
    const G = newGame({ mode: 'multi', laps: settings.laps, maxTeams: settings.teams, games: chosenGames(), teams: [{ cid: CID, name: store.get('myName', '') }] });
    Object.assign(S, { kind: 'host', G, code });
    store.set('session', { role: 'host', code });
    saveGame();
    loadCatalogs();
    ctx.navigate('partie');
    await connectHost();
  }

  async function connectHost() {
    try {
      S.link = await openLink({
        code: S.code, cid: CID, role: 'host', brokers,
        onAct: (a) => hostApply(a, true),
        onStatus: (up) => { S.up = up; if (up) { S.upSince = Date.now(); publish(); } render(); },
      });
      publish();
    } catch (e) {
      console.error(e);
      S.up = false; render();
    }
  }

  async function startGuest(code) {
    if (S.kind === 'guest' && S.code === code && S.link) return;
    endSession({ silent: true });
    Object.assign(S, { kind: 'guest', code, join: 'wait', clockOff: Infinity });
    store.set('session', { role: 'guest', code });
    loadCatalogs();
    // Tant que l'arbitre ne nous a pas ajoutés, on renvoie join toutes les 3 s (il était peut-être hors ligne ou en veille)
    send({ t: 'join', name: store.get('myName', '') }, { keep: 'join' });
    S.notFound = setTimeout(() => { if (!S.G && S.kind === 'guest') { S.join = 'notfound'; render(); } }, 8000);
    try {
      S.link = await openLink({
        code, cid: CID, role: 'guest', brokers,
        onState: guestState,
        onStatus: (up) => { S.up = up; if (up) flushPending(); render(); },
      });
      flushPending();
    } catch (e) {
      console.error(e);
      S.up = false; render();
    }
    render();
  }

  function guestState(m) {
    if (S.kind !== 'guest') return;
    if (m === null) { // l'arbitre a terminé la partie
      if (S.G || S.join === 'ok') { S.ended = true; render(); }
      return;
    }
    clearTimeout(S.notFound);
    // Décalage d'horloge : le plus petit écart observé (le délai de transmission s'y ajoute toujours)
    const off = Date.now() - m.ts;
    if (!Number.isFinite(S.clockOff) || off < S.clockOff) S.clockOff = off;
    const G = m.G;
    for (const id of m.acks || []) if (S.pending.get(id)?.keep !== 'join') S.pending.delete(id);
    const me = G.teams.findIndex((t) => t.cid === CID);
    if (me >= 0) {
      for (const [id, a] of S.pending) if (a.keep === 'join' && !G.teams[me].away) S.pending.delete(id);
      S.join = 'ok';
      S.G = G;
    } else {
      S.G = null;
      S.join = G.phase !== 'lobby' ? 'started' : G.teams.length >= G.maxTeams ? 'full' : 'wait';
    }
    render();
  }

  // ---------------------------------------------------------------- actions
  /** Toute interaction d'un joueur passe par ici. */
  function dispatch(a) { send(a); }

  function send(a, { keep = null } = {}) {
    const act = { ...a, cid: CID, id: rid() };
    if (S.kind === 'guest') {
      if (a.t !== 'live') S.pending.set(act.id, { ...act, keep });
      S.link?.sendAct(act);
      return;
    }
    hostApply(act);
  }
  function sendNow(a) { S.link?.sendAct({ ...a, cid: CID, id: rid() }); }
  function flushPending() {
    for (const a of S.pending.values()) { const { keep, ...act } = a; S.link?.sendAct(act); }
  }

  function hostApply(a, fromNet = false) {
    if (!S.G || S.seen.has(a.id)) { if (fromNet) publish(); return; }
    S.seen.add(a.id);
    S.acks.push(a.id);
    if (S.acks.length > 60) S.acks.splice(0, S.acks.length - 60);
    const changed = applyAction(S.G, a, { now: Date.now(), rnd: Math.random, pick });
    if (changed) saveGame();
    if (S.kind === 'host') publish(a.t === 'live');
    if (changed) render();
  }

  // Diffusion de l'état complet (retenu) ; les mises à jour en direct sont regroupées toutes les 120 ms.
  let pubTimer = null;
  function publish(soon = false) {
    if (S.kind !== 'host' || !S.link) return;
    const go = () => { pubTimer = null; S.link?.sendState({ G: S.G, ts: Date.now(), acks: S.acks.slice(-40) }); };
    if (!soon) { clearTimeout(pubTimer); go(); return; }
    pubTimer ||= setTimeout(go, 120);
  }

  every(() => { // renvois et délais
    if (S.kind === 'guest' && S.link && S.pending.size) flushPending();
    const T = S.G?.turn;
    if ((S.kind === 'host' || S.kind === 'solo') && T?.stage === 'challenge' && Date.now() > T.ch.deadline + GRACE_MS
      && (S.kind === 'solo' || (S.up && Date.now() - S.upSince > 3000))) {
      hostApply({ t: 'timeout', ch: T.ch.id, cid: CID, id: rid() });
    }
  }, 3000);

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    S.link?.wake(); // reconnexion immédiate au retour au premier plan
    if (S.kind === 'guest') flushPending();
    if (S.kind === 'host') publish();
  };
  document.addEventListener('visibilitychange', onVisible);
  // Coupure du réseau de l'appareil : la pastille « reconnexion… » s'affiche tout de suite
  const onOffline = () => { if (S.link) { S.up = false; render(); } };
  const onOnline = () => { S.link?.wake(); setTimeout(() => { if (S.link?.connected) { S.up = true; S.upSince = Date.now(); onVisible(); render(); } }, 1500); };
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);

  let screen = null; // { key, el, update(), tick(), destroy() }

  // Hauteur visible (clavier ouvert compris)
  const vv = window.visualViewport;
  const onViewport = () => { container.style.setProperty('--zz-h', `${Math.round(vv.height)}px`); if (screen?.key === 'game') window.scrollTo(0, 0); };
  vv?.addEventListener('resize', onViewport);
  if (vv) onViewport();

  // ---------------------------------------------------------------- rendu

  function screenKey() {
    const p = path[0] || '';
    if (p === 'nouvelle') return 'new';
    if (p === 'rejoindre') return S.kind === 'guest' && S.G && !S.ended ? 'redirect' : 'join';
    if (p === 'partie') {
      if (S.ended) return 'ended';
      if (!S.G) return S.kind === 'guest' ? 'join' : 'home';
      return S.G.phase === 'lobby' ? 'lobby' : 'game';
    }
    return 'home';
  }

  function render() {
    const key = screenKey();
    if (key === 'redirect') { ctx.navigate('partie'); return; }
    if (!screen || screen.key !== key) {
      screen?.destroy?.();
      if (key !== 'game') closeChallenge();
      screen = SCREENS[key]();
      screen.key = key;
      container.replaceChildren(screen.el);
      container.classList.toggle('is-play', key === 'game');
    }
    // garde le focus et la saisie de l'élément actif
    const active = document.activeElement;
    const keepId = active && container.contains(active) ? active.id : null;
    const sel = keepId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
    screen.update?.();
    if (keepId) {
      const el = document.getElementById(keepId);
      if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch { /* ignore */ } }
    }
  }
  every(() => screen?.tick?.(), 100);

  const topBar = (title, back, ...extra) => h('header.zz-bar',
    h('button.zz-icon-btn', { type: 'button', 'aria-label': 'Retour', title: 'Retour', onclick: back }, icon('back')),
    title ? h('h1.zz-title', title) : null,
    ...extra);

  const stepper = (label, value, min, max, onChange) => {
    const out = h('output.zz-step-val', String(value));
    const set = (v) => { v = Math.max(min, Math.min(max, v)); out.textContent = String(v); onChange(v); };
    let cur = value;
    return h('div.zz-field',
      h('span.zz-label', label),
      h('div.zz-stepper',
        h('button.zz-round', { type: 'button', 'aria-label': `${label} : moins`, onclick: () => set(cur = Math.max(min, cur - 1)) }, icon('minus')),
        out,
        h('button.zz-round', { type: 'button', 'aria-label': `${label} : plus`, onclick: () => set(cur = Math.min(max, cur + 1)) }, icon('plus'))));
  };

  const pawn = (t, extra = '') => h('i.zz-pawn' + extra, { style: `--team: ${t.color}` }, (t.name || '?').trim()[0]?.toUpperCase() || '?');

  const SCREENS = {
    // ---------------------------------------------------------------- accueil du jeu
    home() {
      const el = h('div.zz-page');
      let confirm = false;
      return {
        el,
        update() {
          const has = Boolean(session());
          const quit = h('button.zz-link', {
            type: 'button',
            onclick: () => {
              if (!confirm) { confirm = true; quit.textContent = 'Confirmer l’abandon'; quit.classList.add('is-danger'); setTimeout(() => { confirm = false; render(); }, 3000); return; }
              endSession(); confirm = false; render();
            },
          }, 'Abandonner la partie en cours');
          el.replaceChildren(
            topBar(null, ctx.home),
            h('main.zz-home',
              h('div.zz-logo', h('span.zz-logo-icon', icon('pawn')), h('h1', 'Compète', h('span', 'de zinzin'))),
              h('div.zz-actions',
                has ? h('button.zz-btn.zz-btn--go.zz-btn--big', { type: 'button', onclick: () => ctx.navigate('partie') }, 'Reprendre la partie') : null,
                h('button.zz-btn.zz-btn--big' + (has ? '' : '.zz-btn--go'), { type: 'button', onclick: () => ctx.navigate('nouvelle') }, icon('plus'), 'Créer une partie'),
                h('button.zz-btn.zz-btn--big', { type: 'button', onclick: () => ctx.navigate('rejoindre') }, icon('phones'), 'Rejoindre une partie'),
                has ? quit : null),
              h('p.zz-version', `Version ${ctx.version}`)));
        },
      };
    },

    // ---------------------------------------------------------------- nouvelle partie
    new() {
      const el = h('div.zz-page');
      const draw = () => {
        const multi = settings.mode === 'multi';
        const modeBtn = (mode, ic, label) => h('button.zz-mode', {
          type: 'button', 'aria-pressed': String(settings.mode === mode),
          onclick: () => { settings.mode = mode; saveSettings(); draw(); },
        }, icon(ic), h('span', label));
        const names = multi ? null : h('div.zz-names', Array.from({ length: settings.teams }, (_, i) => h('input.zz-input', {
          id: `zz-name-${i}`, type: 'text', maxLength: 18, placeholder: `Équipe ${i + 1}`, value: settings.names[i] || '', autocomplete: 'off',
          'aria-label': `Nom de l’équipe ${i + 1}`,
          oninput: (e) => { settings.names[i] = cleanName(e.target.value); saveSettings(); },
        })));
        el.replaceChildren(
          topBar('Nouvelle partie', () => ctx.navigate()),
          h('main.zz-form-page',
            h('div.zz-modes', modeBtn('solo', 'phone', 'Un seul téléphone'), modeBtn('multi', 'phones', 'Un téléphone par équipe')),
            stepper(multi ? 'Équipes (au plus)' : 'Équipes', settings.teams, MIN_TEAMS, MAX_TEAMS, (v) => { settings.teams = v; saveSettings(); if (!multi) draw(); }),
            names,
            stepper('Tours de plateau', settings.laps, MIN_LAPS, MAX_LAPS, (v) => { settings.laps = v; saveSettings(); }),
            h('div.zz-field.zz-field--col', h('span.zz-label', 'Jeux du plateau'),
              h('div.zz-games', boardGames.map((id) => {
                const m = meta[id], on = chosenGames().includes(id);
                return h('button.zz-game-chip', {
                  type: 'button', 'aria-pressed': String(on), style: `--game: ${m.accent}`,
                  onclick: () => {
                    const off = new Set(settings.off || []);
                    if (on) { if (chosenGames().length <= 1) return; off.add(id); } else off.delete(id); // au moins un jeu
                    settings.off = [...off]; saveSettings(); draw();
                  },
                }, h('span.zz-chip-icon', icon(m.icon)), h('span', m.title));
              }))),
            h('button.zz-btn.zz-btn--go.zz-btn--big.zz-cta', { type: 'button', onclick: () => (multi ? startHost() : startSolo()) }, multi ? 'Créer la partie' : 'Lancer le jeu')));
      };
      draw();
      return { el };
    },

    // ---------------------------------------------------------------- rejoindre
    join() {
      const status = h('p.zz-status', { role: 'status' });
      const input = h('input.zz-code-input', {
        id: 'zz-code', type: 'text', inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5, autocomplete: 'off',
        placeholder: '•••••', 'aria-label': 'Code de la partie', enterKeyHint: 'go',
        oninput: () => { input.value = input.value.replace(/\D/g, '').slice(0, 5); btn.disabled = input.value.length !== 5; },
      });
      const btn = h('button.zz-btn.zz-btn--go.zz-btn--big', { type: 'submit', disabled: true }, 'Rejoindre');
      const form = h('form.zz-join', {
        onsubmit: (e) => { e.preventDefault(); if (input.value.length === 5) { startGuest(input.value); ctx.navigate('partie'); } },
      }, h('label.zz-label', { for: 'zz-code' }, 'Code de la partie'), input, btn, status);
      const el = h('div.zz-page', topBar('Rejoindre', () => { if (S.kind === 'guest' && !S.G) endSession(); ctx.navigate(); }), h('main.zz-form-page', form));
      const deep = path[0] === 'rejoindre' && /^\d{5}$/.test(path[1] || '') ? path[1] : null;
      if (deep) { input.value = deep; btn.disabled = false; setTimeout(() => { startGuest(deep); ctx.navigate('partie'); }, 0); }
      else if (S.code && S.kind === 'guest') { input.value = S.code; btn.disabled = false; }
      setTimeout(() => { if (!deep) input.focus({ preventScroll: true }); }, 50);
      return {
        el,
        update() {
          const txt = S.kind !== 'guest' ? '' : {
            wait: 'Connexion à la partie…', notfound: 'Partie introuvable, vérifie le code',
            full: 'Partie complète', started: 'La partie a déjà commencé', ok: '',
          }[S.join] || '';
          status.textContent = txt;
          status.className = 'zz-status' + (S.join === 'wait' ? '' : ' is-err');
        },
      };
    },

    // ---------------------------------------------------------------- partie terminée par l'arbitre
    ended() {
      const el = h('div.zz-page', topBar(null, () => { endSession({ silent: true }); ctx.navigate(); }),
        h('main.zz-home', h('p.zz-status.is-err', 'La partie est terminée.'),
          h('button.zz-btn.zz-btn--go.zz-btn--big', { type: 'button', onclick: () => { endSession({ silent: true }); ctx.navigate(); } }, 'Retour')));
      return { el };
    },

    // ---------------------------------------------------------------- salle d'attente
    lobby() {
      const codeEl = h('p.zz-code');
      const share = h('button.zz-btn', { type: 'button', onclick: doShare }, icon('share'), 'Partager');
      let nameTimer = null;
      const nameIn = h('input.zz-input.zz-input--name', {
        id: 'zz-myname', type: 'text', maxLength: 18, autocomplete: 'off', 'aria-label': 'Nom de ton équipe', placeholder: 'Nom de ton équipe', enterKeyHint: 'done',
        oninput: () => {
          clearTimeout(nameTimer);
          nameTimer = setTimeout(() => { const n = cleanName(nameIn.value); if (n) { store.set('myName', n); dispatch({ t: 'name', name: n }); } }, 450);
        },
        onkeydown: (e) => { if (e.key === 'Enter') nameIn.blur(); },
      });
      const list = h('ul.zz-teams');
      const count = h('span.zz-count');
      const launch = h('button.zz-btn.zz-btn--go.zz-btn--big', { type: 'button', onclick: () => dispatch({ t: 'start' }) }, 'Lancer');
      const wait = h('p.zz-status', 'L’hôte va lancer la partie');
      const badge = h('span.zz-badge', { hidden: true }, 'reconnexion…');
      const el = h('div.zz-page',
        topBar(null, () => ctx.navigate(), badge),
        h('main.zz-lobby',
          h('div.zz-code-box', h('span.zz-label', 'Code de la partie'), codeEl, share),
          h('label.zz-label', { for: 'zz-myname' }, 'Nom de ton équipe'), nameIn,
          h('div.zz-teams-head', h('span.zz-label', 'Équipes'), count), list,
          h('div.zz-lobby-foot', S.kind === 'host' ? launch : wait)));
      async function doShare() {
        const url = `${location.href.split('#')[0]}#/zinzin/rejoindre/${S.code}`;
        const text = `Rejoins ma partie de Compète de zinzin : code ${S.code}`;
        try {
          if (navigator.share) { await navigator.share({ title: 'Compète de zinzin', text, url }); return; }
          await navigator.clipboard.writeText(`${text}\n${url}`);
          share.lastChild.textContent = 'Lien copié';
        } catch { /* partage annulé */ }
      }
      return {
        el,
        update() {
          const G = S.G;
          codeEl.textContent = `${S.code.slice(0, 2)} ${S.code.slice(2)}`;
          const me = G.teams.find((t) => t.cid === CID);
          if (document.activeElement !== nameIn && me && nameIn.value !== me.name) nameIn.value = me.name;
          list.replaceChildren(...G.teams.map((t, i) => h('li', { class: t.cid === CID ? 'is-me' : '' }, pawn(t), h('span', t.name), i === 0 ? h('small', 'hôte') : null)));
          count.textContent = `${G.teams.length} / ${G.maxTeams}`;
          launch.disabled = G.teams.length < MIN_TEAMS;
          badge.hidden = S.up;
        },
      };
    },

    game: gameScreen,
  };

  // ---------------------------------------------------------------- écran de jeu
  function gameScreen() {
    const pills = h('div.zz-pills');
    const badge = h('span.zz-badge', { hidden: true }, 'reconnexion…');
    const board = h('div.zz-board');
    const pawnsLayer = h('div.zz-pawns');
    const center = h('div.zz-center');
    const overlay = h('div.zz-overlay', { hidden: true });
    const endEl = h('div.zz-end', { hidden: true });
    const stage = h('div.zz-stage', board, overlay, endEl);
    const el = h('div.zz-game', h('header.zz-bar.zz-bar--game',
      h('button.zz-icon-btn', { type: 'button', 'aria-label': 'Retour', title: 'Retour', onclick: () => ctx.navigate() }, icon('back')),
      pills, badge), stage);

    let dims = null; // { cols, rows }
    let cellEls = [];
    const pawnEls = new Map();

    function buildBoard() {
      const r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const land = r.width > r.height * 1.15;
      const cols = land ? BOARD_ROWS : BOARD_COLS, rows = land ? BOARD_COLS : BOARD_ROWS;
      // cases un peu plus hautes (ou larges) que carrées pour occuper toute la place, sans trop les déformer
      let cw = r.width / cols, chh = r.height / rows;
      cw = Math.floor(Math.min(cw, chh * 1.3)); chh = Math.floor(Math.min(chh, cw * 1.3));
      board.style.setProperty('--cols', cols);
      board.style.setProperty('--rows', rows);
      board.style.setProperty('--cw', `${cw}px`);
      board.style.setProperty('--chh', `${chh}px`);
      board.style.setProperty('--cell', `${Math.min(cw, chh)}px`);
      const key = `${cols}x${rows}:${S.G.board.join()}`;
      if (dims?.key === key) return;
      dims = { cols, rows, key };
      cellEls = S.G.board.map((g, i) => {
        const [c, rr] = cellPos(i, cols, rows);
        const m = meta[g];
        return h('div.zz-cell' + (g === 'depart' ? '.is-start' : ''), {
          style: `grid-column: ${c + 1}; grid-row: ${rr + 1}; --game: ${m?.accent || '#888'}`,
          title: g === 'depart' ? 'Départ' : m?.title,
        }, g === 'depart' ? h('span.zz-start', 'Départ') : icon(m?.icon || 'dice'));
      });
      center.style.cssText = `grid-column: 2 / ${cols}; grid-row: 2 / ${rows}`;
      board.replaceChildren(...cellEls, center, pawnsLayer);
      pawnEls.clear();
      pawnsLayer.replaceChildren();
    }
    const ro = new ResizeObserver(() => { buildBoard(); placePawns(); });
    ro.observe(stage);

    // Position affichée d'une équipe : pendant l'animation du lancer, le pion avance case par case.
    function shownSteps(i) {
      const G = S.G, t = G.teams[i], roll = G.turn.roll;
      if (!roll || roll.team !== i) return t.steps;
      const el2 = now() - roll.at;
      if (el2 < DICE_MS) return roll.from;
      return Math.min(roll.to, roll.from + Math.floor((el2 - DICE_MS) / STEP_MS) + 1);
    }

    function placePawns() {
      const G = S.G;
      if (!dims || !G) return;
      const at = new Map();
      G.teams.forEach((t, i) => { const c = shownSteps(i) % G.board.length; (at.get(c) || at.set(c, []).get(c)).push(i); });
      const OFF = [[0, 0], [-0.2, -0.2], [0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [0, 0]];
      for (const [c, list] of at) {
        const [x, y] = cellPos(c, dims.cols, dims.rows);
        list.forEach((i, k) => {
          const t = G.teams[i];
          let p = pawnEls.get(i);
          if (!p) { p = pawn(t); pawnEls.set(i, p); pawnsLayer.append(p); }
          const o = list.length > 1 ? OFF[(k + 1) % OFF.length] : OFF[0];
          p.style.left = `${((x + 0.5 + o[0]) / dims.cols) * 100}%`;
          p.style.top = `${((y + 0.5 + o[1]) / dims.rows) * 100}%`;
          p.classList.toggle('is-small', list.length > 1);
          p.classList.toggle('is-turn', G.turn.team === i && G.phase === 'play');
          p.classList.toggle('is-away', t.away);
          p.style.setProperty('--team', t.color);
          p.textContent = (t.name || '?').trim()[0]?.toUpperCase() || '?';
        });
      }
    }

    const canAct = () => S.kind === 'solo' || S.G.teams[S.G.turn.team]?.cid === CID;
    const die = h('button.zz-die', { type: 'button', 'aria-label': 'Lancer le dé', onclick: () => { if (canAct() && S.G.turn.stage === 'roll') dispatch({ t: 'roll' }); } });
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    let face = 0;
    function drawDie(v) {
      if (v === face) return;
      face = v;
      die.replaceChildren(...Array.from({ length: 9 }, (_, k) => h('i', { class: PIPS[v]?.includes(k) ? 'is-on' : '' })));
    }
    const bannerEl = h('p.zz-turn');
    const retryBtn = h('button.zz-btn.zz-btn--go', { type: 'button', onclick: () => dispatch({ t: 'retry' }) }, 'Retenter');
    const retryTile = h('span.zz-retry-tile');
    const actionBox = h('div.zz-action');
    center.append(bannerEl, actionBox);

    let centerKey = '';
    function updateCenter() {
      const G = S.G, T = G.turn, t = G.teams[T.team];
      const mine = canAct();
      const rolling = T.roll && now() - T.roll.at < DICE_MS;
      const key = [T.team, T.stage, mine, rolling, t.name, t.color, G.seq].join('|');
      if (key === centerKey) return;
      centerKey = key;
      bannerEl.replaceChildren(h('i.zz-dot', { style: `background: ${t.color}` }),
        S.kind !== 'solo' && mine ? 'À toi !' : `Au tour de ${t.name}`);
      if (T.stage === 'retry' && !rolling) {
        const g = G.board[cellOf(G, t)], m = meta[g];
        retryTile.replaceChildren(icon(m?.icon || 'dice'));
        retryTile.style.setProperty('--game', m?.accent || '#888');
        actionBox.replaceChildren(retryTile, mine ? retryBtn : h('p.zz-sub', 'retente sa case'));
      } else {
        if (actionBox.firstChild !== die) actionBox.replaceChildren(die);
        die.disabled = !(mine && T.stage === 'roll');
        die.classList.toggle('is-ready', mine && T.stage === 'roll');
      }
    }

    function updatePills() {
      const G = S.G, goal = goalOf(G);
      pills.replaceChildren(...G.teams.map((t, i) => h('div.zz-pill', {
        class: ['zz-pill', i === G.turn.team && G.phase === 'play' ? 'is-turn' : '', t.cid === CID && S.kind !== 'solo' ? 'is-me' : '', t.stuck ? 'is-stuck' : '', t.away ? 'is-away' : ''].join(' '),
        style: `--team: ${t.color}`,
      }, pawn(t), h('span.zz-pill-meta', h('b', t.name), h('span.zz-bar-mini', h('i', { style: `width: ${(shownSteps(i) / goal) * 100}%` }))),
      G.laps > 1 ? h('small', `${Math.min(G.laps, Math.floor(shownSteps(i) / G.board.length) + 1)}/${G.laps}`) : null)));
    }

    function updateEnd() {
      const G = S.G;
      const show = G.phase === 'end' && now() >= (G.endAt || 0);
      endEl.hidden = !show;
      if (!show || endEl.dataset.seq === String(G.seq)) return;
      endEl.dataset.seq = String(G.seq);
      const w = G.teams[G.winner];
      const goal = goalOf(G);
      const canRestart = S.kind !== 'guest';
      endEl.replaceChildren(h('div.zz-end-card',
        h('span.zz-trophy', icon('trophy')),
        h('h2', { style: `color: ${w.color}` }, w.name),
        h('p.zz-sub', 'gagne la compète !'),
        h('ol.zz-rank', ranking(G).map((t) => h('li', pawn(t), h('span', t.name), h('small', `${Math.min(t.steps, goal)} / ${goal}`)))),
        h('div.zz-end-actions',
          canRestart ? h('button.zz-btn.zz-btn--go.zz-btn--big', { type: 'button', onclick: () => dispatch({ t: 'restart' }) }, 'Rejouer') : null,
          h('button.zz-btn.zz-btn--big', { type: 'button', onclick: () => { endSession(); ctx.navigate(); } }, 'Retour à l’accueil'))));
    }

    // Défi en cours : il s'ouvre quand le pion est arrivé, et reste affiché pendant la révélation de la réponse.
    function updateOverlay() {
      const G = S.G, T = G.turn, ch = T.ch;
      let want = null, reveal = false;
      if (T.last?.c && now() < T.last.at + REVEAL_MS) { want = T.last.c; reveal = true; } // réponse du défi terminé
      else if (ch && G.phase === 'play' && T.stage === 'challenge' && now() >= ch.startAt) want = ch;
      if (!want) { if (CH.id != null) closeChallenge(); overlay.hidden = true; return; }
      if (CH.id !== want.id) openChallenge(want, overlay);
      overlay.hidden = false;
      if (!CH.ctl) return;
      if (reveal) CH.ctl.reveal(T.last.ok, T.last.L);
      else CH.ctl.update(T.live);
      CH.ctl.tick();
    }

    return {
      el,
      update() {
        if (!S.G) return;
        buildBoard();
        updatePills();
        updateCenter();
        placePawns();
        updateOverlay();
        updateEnd();
        badge.hidden = S.up || S.kind === 'solo';
      },
      tick() {
        if (!S.G) return;
        const T = S.G.turn;
        const el2 = T.roll ? now() - T.roll.at : Infinity;
        drawDie(el2 < DICE_MS ? 1 + Math.floor(Math.random() * 6) : T.roll?.value || 6);
        die.classList.toggle('is-rolling', el2 < DICE_MS);
        if (el2 < DICE_MS + 7 * STEP_MS) { placePawns(); updatePills(); }
        updateCenter();
        updateOverlay();
        updateEnd();
      },
      destroy() { ro.disconnect(); closeChallenge(); },
    };
  }

  // ---------------------------------------------------------------- défi affiché
  const CH = { id: null, ctl: null, token: 0 };
  function closeChallenge() {
    CH.ctl?.destroy?.();
    Object.assign(CH, { id: null, ctl: null, token: CH.token + 1 });
  }
  async function openChallenge(ch, el) {
    closeChallenge();
    CH.id = ch.id;
    const token = CH.token;
    const G = S.G, T = G.turn;
    const current = T.stage === 'challenge' && T.ch?.id === ch.id; // défi en cours (et non réponse affichée)
    const team = G.teams[current ? T.team : T.last?.team ?? T.team];
    const active = current && (S.kind === 'solo' || team.cid === CID);
    let liveTimer = null, liveL = null;
    el.replaceChildren(h('div.zz-ch-loading'));
    const ctl = await mountChallenge(el, ch, {
      active,
      L: current ? T.live : T.last?.L,
      now,
      meta: meta[ch.game] || {},
      team,
      send: (L) => { // envois en direct regroupés toutes les 150 ms
        liveL = L;
        liveTimer ||= setTimeout(() => { liveTimer = null; dispatch({ t: 'live', ch: ch.id, L: liveL }); }, 150);
      },
      finish: (ok, L) => { clearTimeout(liveTimer); liveTimer = null; dispatch({ t: 'result', ch: ch.id, ok, L }); },
    });
    if (token !== CH.token) { ctl.destroy?.(); return; }
    CH.ctl = ctl;
    screen?.tick?.();
  }

  resumeIfAny();
  render();

  return {
    update(p) { path = p || []; render(); },
    destroy() {
      timers.forEach(clearInterval);
      clearTimeout(pubTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      vv?.removeEventListener('resize', onViewport);
      screen?.destroy?.();
      closeChallenge();
      S.link?.close();
      container.classList.remove('zz', 'is-play');
    },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) document.head.append(h('link', { rel: 'stylesheet', href }));
}
