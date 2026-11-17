// Steep : les mondes et les parcours (données sans DOM, partagées par le moteur et le dessin).
//
// Chaque monde a sa physique (frottement, vitesse), ses obstacles, ses couleurs et son décor.
// Chaque monde propose trois parcours, toujours des mêmes types :
//   balade  : pentes douces, peu d'obstacles ;
//   bosses  : collines et tremplins, pour les figures ;
//   abimes  : pente raide, crevasses et falaises.

export const COURSE_TYPES = {
  balade: {
    slope: [0.2, 0.28],
    features: { run: 5, bumps: 3, kicker: 1 },
    gap: 0.04, cliff: 0.06,
    rocks: 0.35, // probabilité d'un obstacle sur une ligne droite
  },
  bosses: {
    slope: [0.24, 0.32],
    features: { run: 1, bumps: 5, kicker: 4 },
    gap: 0.1, cliff: 0.12,
    rocks: 0.5,
  },
  abimes: {
    slope: [0.3, 0.4],
    features: { run: 3, bumps: 1, kicker: 2 },
    gap: 0.42, cliff: 0.28,
    rocks: 0.55,
  },
};

export const COURSE_ORDER = ['balade', 'bosses', 'abimes'];

export const WORLDS = [
  {
    id: 'cimes',
    name: 'Les Cimes',
    board: 'snowboard',
    blurb: 'Neige fraîche et sapins sous les sommets.',
    physics: { friction: 1, maxSpeed: 330 },
    obstacle: { kind: 'rock', name: 'rocher' },
    gapName: 'crevasse', fall: 'Tombé dans une crevasse !',
    decor: 'pine',
    particles: 'snow',
    courses: { balade: 'La combe douce', bosses: 'Les bosses du col', abimes: 'Les crevasses' },
    colors: {
      sky: ['#6fa8dc', '#cfe4f5'],
      far: '#a9c4dc', farCap: '#f2f7fb',
      mid: '#7f9fbd',
      ground: ['#f6f9fc', '#d7e3ee'], edge: '#ffffff',
      obstacle: '#6c6f7a', obstacleLight: '#8c909c',
      decor: '#3f6b5a', decorLight: '#55836f',
      gap: '#2a3b52',
      particle: '#ffffff',
      coin: '#ffd447',
    },
  },
  {
    id: 'dunes',
    name: 'Les Dunes',
    board: 'sandboard',
    blurb: 'Sandboard sur les dunes dorées, entre les cactus.',
    physics: { friction: 1.25, maxSpeed: 300 },
    obstacle: { kind: 'cactus', name: 'cactus' },
    gapName: 'ravin', fall: 'Tombé dans le ravin !',
    decor: 'palm',
    particles: 'sand',
    courses: { balade: 'L’oasis', bosses: 'La mer de sable', abimes: 'Les canyons' },
    colors: {
      sky: ['#f29e4c', '#fde3b0'],
      far: '#d98b5f', farCap: '#e9a77a',
      mid: '#d49a5a',
      ground: ['#f3cf86', '#e0aa5c'], edge: '#ffe2a8',
      obstacle: '#4f8a4b', obstacleLight: '#6aa865',
      decor: '#6b8e3d', decorLight: '#8aae52',
      gap: '#7a3f2a',
      particle: '#f7d9a0',
      coin: '#fff1a8',
    },
  },
  {
    id: 'foret',
    name: 'La Forêt rousse',
    board: 'snowboard',
    blurb: 'Première neige sur la forêt d’automne, troncs couchés.',
    physics: { friction: 1.1, maxSpeed: 320 },
    obstacle: { kind: 'log', name: 'tronc' },
    gapName: 'torrent', fall: 'Plouf dans le torrent !',
    decor: 'birch',
    particles: 'leaves',
    courses: { balade: 'Le sous-bois', bosses: 'Les clairières', abimes: 'Les gorges' },
    colors: {
      sky: ['#c86f5a', '#f2c9a0'],
      far: '#9a6a6a', farCap: '#c99a8f',
      mid: '#8a5a3c',
      ground: ['#f4eee6', '#dccfbf'], edge: '#ffffff',
      obstacle: '#6b4428', obstacleLight: '#8b5e3c',
      decor: '#d9772b', decorLight: '#f0a040',
      gap: '#2f5b6b',
      particle: '#e8873a',
      coin: '#ffe066',
    },
  },
  {
    id: 'volcan',
    name: 'Le Volcan',
    board: 'snowboard',
    blurb: 'Pentes de cendre noire et coulées de lave.',
    physics: { friction: 1.05, maxSpeed: 340 },
    obstacle: { kind: 'basalt', name: 'bloc de basalte' },
    gapName: 'lave', fall: 'Plouf dans la lave !',
    decor: 'smoke',
    particles: 'ash',
    courses: { balade: 'Les cendres', bosses: 'Les cratères', abimes: 'Les coulées' },
    colors: {
      sky: ['#2b1b2e', '#8a3b2e'],
      far: '#3d2a33', farCap: '#ff6a2a',
      mid: '#2e2226',
      ground: ['#4a3f44', '#2c2428'], edge: '#7a6a70',
      obstacle: '#1d1719', obstacleLight: '#3a3034',
      decor: '#5a4a50', decorLight: '#7a6870',
      gap: '#ff5a1f',
      particle: '#b8a8a8',
      coin: '#ffb347',
    },
  },
  {
    id: 'banquise',
    name: 'La Banquise',
    board: 'snowboard',
    blurb: 'Glace bleue sous le ciel de nuit : ça glisse vite.',
    physics: { friction: 0.75, maxSpeed: 370 },
    obstacle: { kind: 'ice', name: 'bloc de glace' },
    gapName: 'faille', fall: 'Tombé dans la faille !',
    decor: 'iceberg',
    particles: 'stars',
    night: true,
    courses: { balade: 'La plaine gelée', bosses: 'Les congères', abimes: 'Les failles' },
    colors: {
      sky: ['#0b1433', '#25407a'],
      far: '#1f3566', farCap: '#7fb2e8',
      mid: '#2a4c82',
      ground: ['#d6ecfb', '#9cc6e6'], edge: '#ffffff',
      obstacle: '#8ec9ef', obstacleLight: '#c6e8ff',
      decor: '#b8dcf5', decorLight: '#e6f5ff',
      gap: '#06102a',
      particle: '#ffffff',
      coin: '#9ff0ff',
    },
  },
];

export const worldById = (id) => WORLDS.find((w) => w.id === id) || null;
export const isCourse = (c) => Object.prototype.hasOwnProperty.call(COURSE_TYPES, c);
