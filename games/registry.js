// Liste des jeux disponibles dans l'accueil.
// Pour ajouter un jeu : créer games/<id>/index.js exportant `mount(container, ctx)`
// puis l'ajouter ici. Le module n'est chargé qu'à l'ouverture du jeu.

export const GAMES = [
  {
    id: 'affiches',
    title: 'Affiches de cinéma',
    description: 'Retrouve le film derrière l’affiche floutée.',
    emoji: '🎬',
    accent: '#e8b04a',
    load: () => import('./movie-posters/index.js?v=1.25.0'),
  },
  {
    id: 'visages',
    title: 'Visages',
    description: 'Reconnais la célébrité : en morceaux ou sur une photo de jeunesse.',
    emoji: '👤',
    accent: '#ff8a65',
    load: () => import('./faces/index.js?v=1.25.0'),
  },
  {
    id: 'livres',
    title: 'Livres',
    description: 'Retrouve l’auteur de 300 grands livres, en 3 essais.',
    emoji: '📚',
    accent: '#c9a0dc',
    load: () => import('./books/index.js?v=1.25.0'),
  },
  {
    id: 'geoquizz',
    title: 'Géoquizz',
    description: 'Place 10 pays sur la carte du monde, au plus près.',
    emoji: '🌍',
    accent: '#4fb3d9',
    load: () => import('./geo/index.js?v=1.25.0'),
  },
  {
    id: 'chemin',
    title: 'Le chemin',
    description: 'Mémorise le chemin lumineux, puis retrace-le case par case.',
    emoji: '👣',
    accent: '#7b86ff',
    load: () => import('./path/index.js?v=1.25.0'),
  },
];
