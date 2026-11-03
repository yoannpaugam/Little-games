// Petit wrapper autour de localStorage, avec un espace de noms par jeu.
// Ne plante jamais (navigation privée, stockage plein, etc.).

const PREFIX = 'little-games:';

/**
 * createStore('mon-jeu')                                  → stockage simple
 * createStore('mon-jeu', { version: 2, migrate(from, s) }) → stockage versionné :
 *   au premier appel après une mise à jour, migrate(ancienneVersion, store) est appelé une fois
 *   pour transformer les données enregistrées, puis la nouvelle version est mémorisée.
 *   Un joueur qui n'a encore rien enregistré reçoit directement la version courante.
 */
export function createStore(namespace, { version, migrate } = {}) {
  const key = (k) => `${PREFIX}${namespace}:${k}`;
  const store = {
    get(k, fallback) {
      try {
        const raw = localStorage.getItem(key(k));
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(k, value) {
      try {
        localStorage.setItem(key(k), JSON.stringify(value));
      } catch {
        /* stockage indisponible : on continue sans persistance */
      }
    },
    remove(k) {
      try {
        localStorage.removeItem(key(k));
      } catch {
        /* ignore */
      }
    },
    /** Clés enregistrées pour ce jeu (sans le préfixe). */
    keys() {
      try {
        const start = `${PREFIX}${namespace}:`;
        return Object.keys(localStorage).filter((k) => k.startsWith(start)).map((k) => k.slice(start.length));
      } catch {
        return [];
      }
    },
  };
  if (version != null) {
    const saved = store.get('__version', null);
    if (saved !== version) {
      const hasData = store.keys().some((k) => k !== '__version');
      if (saved != null || hasData) {
        try { migrate?.(saved ?? 0, store); } catch { /* une migration ratée ne doit pas bloquer le jeu */ }
      }
      store.set('__version', version);
    }
  }
  return store;
}
