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
    load: () => import('./movie-posters/index.js?v=1.16.0'),
  },
  {
    id: 'visages',
    title: 'Visages',
    description: 'Reconnais la célébrité : pièce par pièce, en morceaux, ou sur une photo de jeunesse.',
    emoji: '👤',
    accent: '#ff8a65',
    load: () => import('./faces/index.js?v=1.16.0'),
  },
];
