// Jeu « Visages » : reconnaître une célébrité à partir de son visage.
// Depuis la 1.19.0, Visages regroupe les deux modes à photos du catalogue (Morceaux et Portraits de jeunesse),
// dans ./morceaux/ (chargés à la demande). Les modes Portraits et Photos d'enfance (photos importées) ont été retirés.
// Contrat de module : export mount(container, ctx) → { update(path), destroy() }
//   ctx.path : [] (choix du mode) | ['morceaux', …] | ['jeunesse', …]
//   ctx.navigate : (...path) => change l'URL du jeu
//   ctx.home     : () => retour à l'accueil

import { h, icon } from '../../js/core/dom.js?v=1.27.0';
import { isUpright } from './morceaux/framing.js?v=1.27.0';

const SUB_MODES = ['morceaux', 'jeunesse'];
const SUB_FILES = { morceaux: 'people.json', jeunesse: 'jeunesse.json' };

export async function mount(container, ctx) {
  ensureStyles();
  container.classList.add('vz');

  // ---------------------------------------------------------------- modes du catalogue (Morceaux, Jeunesse)
  let sub = null; // { mode, instance }
  let subSeq = 0;
  async function openSub(mode, rest) {
    if (sub?.mode === mode) { sub.instance.update(rest); return; }
    closeSub();
    const token = ++subSeq;
    container.classList.remove('vz');
    container.replaceChildren(h('div.loading', 'Chargement…'));
    try {
      const mod = await import('./morceaux/index.js?v=1.27.0');
      if (token !== subSeq) return;
      const instance = await mod.mount(container, {
        path: rest,
        mode,
        navigate: (...p) => ctx.navigate(mode, ...p),
        home: () => ctx.navigate(),
        version: ctx.version,
      });
      if (token !== subSeq) { instance.destroy(); return; }
      sub = { mode, instance };
    } catch (err) {
      if (token !== subSeq) return;
      console.error(err);
      container.replaceChildren(h('div.loading',
        h('p', 'Impossible de charger ce mode. Vérifie ta connexion.'),
        h('button.vz-btn', { type: 'button', onclick: () => ctx.navigate() }, 'Retour à Visages')));
    }
  }
  function closeSub() {
    subSeq++;
    if (sub) { sub.instance.destroy(); sub = null; }
    container.classList.add('vz');
  }

  // Nombre de photos de chaque catalogue (affiché sur les cartes)
  const subCounts = {};
  function subCard(mode, title, desc, pic) {
    const info = h('em', subCounts[mode] == null ? '…' : subCountText(mode));
    if (subCounts[mode] == null) {
      fetch(new URL(`./morceaux/data/${SUB_FILES[mode]}` + new URL(import.meta.url).search, import.meta.url))
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => { subCounts[mode] = Array.isArray(list) ? list.filter((p) => isUpright(p)).length : 0; info.textContent = subCountText(mode); })
        .catch(() => { info.textContent = ''; });
    }
    return h('button.vz-mode', { type: 'button', onclick: () => ctx.navigate(mode) },
      h('span.vz-mode-pic', { innerHTML: pic }), // dessin statique, écrit ici
      h('span.vz-mode-meta', h('strong', title), h('small', desc), info));
  }
  function subCountText(mode) {
    const n = subCounts[mode];
    return n ? `${n} photo${n > 1 ? 's' : ''} au catalogue` : 'Bientôt : catalogue en préparation';
  }

  // ---------------------------------------------------------------- vue : choix du mode
  function renderHome() {
    container.replaceChildren(
      h('header.vz-bar',
        h('button.vz-icon-btn', { title: 'Retour', 'aria-label': 'Retour', onclick: ctx.home }, icon('back')),
        h('h1.vz-title', 'Visages')
      ),
      h('section.vz-home',
        h('p.vz-lead', 'Qui se cache derrière ces visages ?'),
        subCard('morceaux', 'Morceaux', 'Un œil, un nez ou une bouche : devine la star pièce par pièce.',
          '<svg viewBox="0 0 64 96"><rect x="6" y="36" width="52" height="14" rx="3" fill="#7eb8da"/><ellipse cx="22" cy="43" rx="6" ry="4" fill="#121015"/><ellipse cx="42" cy="43" rx="6" ry="4" fill="#121015"/><rect x="6" y="58" width="52" height="10" rx="3" fill="#7eb8da44"/></svg>'),
        subCard('jeunesse', 'Portraits de jeunesse', 'Une photo de la star quand elle était jeune : à toi de la reconnaître.',
          '<svg viewBox="0 0 64 96"><circle cx="32" cy="42" r="15" fill="#c9a0dc"/><circle cx="27" cy="40" r="2.2" fill="#121015"/><circle cx="37" cy="40" r="2.2" fill="#121015"/><path d="M27 48q5 4 10 0" stroke="#121015" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M16 96q0-24 16-24t16 24" fill="#c9a0dc77"/></svg>')
      )
    );
  }

  // ---------------------------------------------------------------- routage interne
  function update(path) {
    const [view] = path || [];
    if (SUB_MODES.includes(view)) { openSub(view, (path || []).slice(1)); return; }
    if (sub || !container.classList.contains('vz')) closeSub();
    // Anciens liens (portraits, enfance, photos, remplir, credits, reglages) : retour au choix du mode
    if (view) { ctx.navigate(); return; }
    renderHome();
    window.scrollTo(0, 0);
  }
  update(ctx.path);

  return {
    update,
    destroy() {
      closeSub();
      container.classList.remove('vz');
    },
  };
}

function ensureStyles() {
  const href = new URL('./styles.css' + new URL(import.meta.url).search, import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) document.head.append(h('link', { rel: 'stylesheet', href }));
}
