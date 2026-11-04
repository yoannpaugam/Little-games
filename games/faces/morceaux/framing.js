// Calculs de cadrage de « Morceaux », sans DOM (testables avec node --test).

/** Inclinaison maximale (en degrés) d’une tête pour être proposée dans le jeu. */
export const MAX_TILT = 15;

/**
 * Inclinaison estimée de la tête (roulis, en degrés, signée), d’après les boîtes
 * du catalogue : décalage horizontal entre le centre des yeux et celui de la bouche.
 * Les dimensions de la photo ne sont pas connues : on se ramène à la boîte `complet`
 * (visage + 40 % de marge sur les côtés, 50 % au-dessus, 30 % en dessous, soit 1,8 fois
 * le visage dans les deux sens) et on suppose un visage 1,25 fois plus haut que large.
 */
export function tiltOf(person) {
  const { yeux, bouche, complet } = person.box || {};
  if (!yeux || !bouche || !complet) return 0;
  const dx = (yeux[0] + yeux[2] / 2 - (bouche[0] + bouche[2] / 2)) / complet[2];
  const dy = (bouche[1] + bouche[3] / 2 - (yeux[1] + yeux[3] / 2)) / complet[3];
  if (dy <= 0) return 90;
  return (Math.atan2(dx, dy * 1.25) * 180) / Math.PI;
}

export function isUpright(person, max = MAX_TILT) {
  return Math.abs(tiltOf(person)) < max;
}

/**
 * Cadre 2:3 le plus serré possible sur la boîte `complet` : la boîte remplit le cadre
 * dans un sens (en général la hauteur), le reste est rogné. Le cadre ne sort jamais
 * de la photo.
 * Renvoie la position de l’image dans le cadre, en % du cadre : { left, top, width, height }.
 */
export function portraitRect(box, nw, nh, ratio = 2 / 3) {
  const [bx, by, bw, bh] = box;
  const pw = bw * nw;
  const ph = bh * nh;
  let rw = pw / ph > ratio ? ph * ratio : pw;
  let rh = rw / ratio;
  const k = Math.min(1, nw / rw, nh / rh);
  rw *= k;
  rh *= k;
  const cx = (bx + bw / 2) * nw;
  const cy = (by + bh / 2) * nh;
  const x = clamp(cx - rw / 2, 0, nw - rw);
  const y = clamp(cy - rh / 2, 0, nh - rh);
  return {
    left: (-x / rw) * 100,
    top: (-y / rh) * 100,
    width: (nw / rw) * 100,
    height: (nh / rh) * 100,
  };
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Qualité d’une photo : hauteur, en pixels de la photo d’origine, du cadre 2:3
 * affiché (plan rapproché sur la boîte `complet`). Sur un téléphone, ce cadre fait
 * environ 580 px CSS de haut, soit 1 200 à 1 700 pixels réels : en dessous de
 * LOW_RES, la photo est très agrandie et paraît floue ou pixelisée.
 */
export const LOW_RES = 500;
export const MID_RES = 800;

export function faceResolution(box, nw, nh) {
  const r = portraitRect(box, nw, nh);
  return Math.round((nh * 100) / r.height);
}

export function qualityOf(px) {
  if (!px) return 'inconnue';
  return px < LOW_RES ? 'basse' : px < MID_RES ? 'moyenne' : 'bonne';
}
