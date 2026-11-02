// Petit wrapper autour de localStorage, avec un espace de noms par jeu.
// Ne plante jamais (navigation privée, stockage plein, etc.).

const PREFIX = 'little-games:';

export function createStore(namespace) {
  const key = (k) => `${PREFIX}${namespace}:${k}`;
  return {
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
  };
}
