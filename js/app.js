// Coquille de l'application : accueil + routeur par hash (#/jeu/sous-page).
// Chaque jeu est un module autonome déclaré dans games/registry.js.

import { GAMES } from '../games/registry.js?v=1.5.0';
import { h } from './core/dom.js?v=1.5.0';

// Version affichée dans les réglages des jeux. À incrémenter à chaque mise en ligne.
export const APP_VERSION = '1.5.0';

const root = document.getElementById('app');
let current = null; // { id, instance }

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { gameId: parts[0] || null, path: parts.slice(1) };
}

export function navigate(gameId, ...path) {
  const target = '#/' + [gameId, ...path].filter((p) => p != null && p !== '').map(encodeURIComponent).join('/');
  if (location.hash !== target) location.hash = target;
  else route();
}

function renderHome() {
  document.title = 'Little Games';
  root.replaceChildren(
    h('main.home',
      h('header.home-header',
        h('h1.logo', 'Little', h('span', 'Games')),
        h('p.tagline', 'Des jeux d’ambiance à partager entre amis.')
      ),
      h('ul.game-list',
        GAMES.map((g) =>
          h('li',
            h('a.game-card', { href: `#/${g.id}`, style: { '--accent': g.accent || '#e8b04a' } },
              h('span.game-emoji', g.emoji || '🎲'),
              h('span.game-meta', h('strong', g.title), h('small', g.description))
            )
          )
        ),
        h('li.game-card.soon', h('span.game-emoji', '✨'), h('span.game-meta', h('strong', 'Bientôt'), h('small', 'Devinettes, quiz, et plus encore…')))
      )
    )
  );
}

async function route() {
  const { gameId, path } = parseHash();
  const game = GAMES.find((g) => g.id === gameId);

  if (!game) {
    current?.instance?.destroy?.();
    current = null;
    renderHome();
    return;
  }
  if (current?.id === game.id) {
    current.instance.update?.(path);
    return;
  }
  current?.instance?.destroy?.();
  root.replaceChildren(h('div.loading', 'Chargement…'));
  const mod = await game.load();
  const container = h('div.game-root');
  root.replaceChildren(container);
  const instance = await mod.mount(container, {
    path,
    navigate: (...p) => navigate(game.id, ...p),
    home: () => navigate(''),
    version: APP_VERSION,
  });
  current = { id: game.id, instance };
}

window.addEventListener('hashchange', route);
route();
