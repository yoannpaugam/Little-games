// La taupe : dessins en SVG (portraits des personnages, meubles, murs, portes et fenêtres).
// Renvoie des chaînes SVG construites à partir de constantes du code (aucune donnée externe),
// transformées en éléments par index.js (DOMParser). Repris du fichier « mole-hunt » fourni par Yoann.

let seq = 0; // identifiants uniques des dégradés, un par portrait affiché

/* ---------- Personnages (portraits dessinés, style photo d’identité) ---------- */
export const AV = {
  0: { bg: '#b8433a', skin: '#e3b894', sk2: '#c98f6a', hair: '#2a1d15', style: 'short', acc: 'mustache', eye: '#4a3320', suit: '#2e3b48', shirt: '#f2f2ee', tie: '#8c1c25', f: 0 },
  1: { bg: '#7b4a9c', skin: '#dba67c', sk2: '#b97f55', hair: '#17141c', style: 'long', acc: 'none', eye: '#2c2018', suit: '#26242d', shirt: '#e9d9e6', tie: null, f: 1, ear: '#d4af37', lip: '#9c3a4a' },
  2: { bg: '#2f7bb0', skin: '#8f5d3e', sk2: '#6e4128', hair: '#0f0f10', style: 'bald', acc: 'shades', eye: '#1b120c', suit: '#1f2428', shirt: '#dfe3e6', tie: '#2a2f36', f: 0, beard: 1 },
  3: { bg: '#1f9a86', skin: '#f1cba6', sk2: '#d4a27c', hair: '#a85a22', style: 'bun', acc: 'glasses', eye: '#3d6a52', suit: '#5a3a2c', shirt: '#f6f1e8', tie: null, f: 1, ear: '#c0c0c8', lip: '#b34e50' },
  4: { bg: '#cf6a1c', skin: '#c88a52', sk2: '#a26a3a', hair: '#3f2514', style: 'short', acc: 'headset', eye: '#3a2412', suit: '#2a3d52', shirt: '#e9edf0', tie: '#d9a441', f: 0 },
  5: { bg: '#bd2b6a', skin: '#80502f', sk2: '#5e3820', hair: '#0e0d0d', style: 'long', acc: 'headset', eye: '#1c120b', suit: '#1e1e22', shirt: '#cfd3d8', tie: null, f: 1, ear: '#d4af37', lip: '#7e2c3a' },
  6: { bg: '#5f7186', skin: '#f2cda8', sk2: '#d3a47e', hair: '#cfcfcf', style: 'short', acc: 'glasses', eye: '#5b7a96', suit: '#1c2733', shirt: '#f4f4f1', tie: '#3b5b86', f: 0, beard: 2 },
  8: { bg: '#78858a', skin: '#e3b894', sk2: '#c98f6a', hair: '#6b4423', style: 'short', acc: 'none', eye: '#4a3320', suit: '#37485a', shirt: '#eceff0', tie: '#6a7a88', f: 0 },
  9: { bg: '#78858a', skin: '#dba67c', sk2: '#b97f55', hair: '#5b3a29', style: 'bun', acc: 'glasses', eye: '#3a2a1c', suit: '#37485a', shirt: '#eceff0', tie: null, f: 1, ear: '#c0c0c8', lip: '#a8504d' },
  10: { bg: '#78858a', skin: '#f1cba6', sk2: '#d4a27c', hair: '#222222', style: 'short', acc: 'glasses', eye: '#3a2a1c', suit: '#37485a', shirt: '#eceff0', tie: '#6a7a88', f: 0 }
};

/** Portrait n° i (64 × 64). dead : barré de rouge (la victime). */
export function avatar(i, dead) {
  const a = AV[i] || AV[0], u = `mh${++seq}`, hc = a.hair;
  const hairBack = a.style === 'long' ? `<path d="M15 30c-1-14 6-22 17-22s18 8 17 22l1 20c-3 3-7 3-9 1l-1-16H24l-1 16c-2 2-6 2-9-1z" fill="url(#${u}h)"/>` : '';
  const hairFront = {
    short: `<path d="M19.5 28c-1.5-12 4-19 12.5-19s14 7 12.5 19c-1-5-3-8-5-9-4 2-12 2-16 0-2 1-3 4-4 9z" fill="url(#${u}h)"/><path d="M25 12c4-2 10-2 14 1" stroke="rgba(255,255,255,.22)" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    long: `<path d="M19.5 29c-2-13 4-20 12.5-20s14.500 7 12.500 20c-1-6-3-10-6-12-4 3-12 3-16 0-2 2-2.500 6-3 12z" fill="url(#${u}h)"/><path d="M24 12c5-3 11-3 16 1" stroke="rgba(255,255,255,.2)" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    bun: `<circle cx="32" cy="7.5" r="5.500" fill="url(#${u}h)"/><path d="M19.5 29c-2-13 4-20 12.5-20s14.500 7 12.500 20c-1-6-3-10-6-12-4 3-12 3-16 0-2 2-2.500 6-3 12z" fill="url(#${u}h)"/><path d="M26 12c4-2 9-2 13 0" stroke="rgba(255,255,255,.2)" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    bald: `<path d="M20 25c1-9 5-13 12-13s11 4 12 13c-2-4-5-6-12-6s-10 2-12 6z" fill="${hc}" opacity=".35"/>`
  }[a.style];
  const beard = a.beard === 1 ? `<path d="M21 33c1 9 5 12 11 12s10-3 11-12c-2 3-4 4-6 4-2-1-3-1-5-1s-3 0-5 1c-2 0-4-1-6-4z" fill="${hc}" opacity=".92"/>`
    : a.beard === 2 ? `<path d="M21 34c1 8 5 11 11 11s10-3 11-11c-2 2-4 3-6 3h-10c-2 0-4-1-6-3z" fill="${hc}" opacity=".55"/>` : '';
  const brow = `<path d="M23.500 25.500c2-1.800 5-1.800 7 0M33.500 25.500c2-1.800 5-1.800 7 0" stroke="${a.f ? hc : hc}" stroke-width="${a.f ? 1.2 : 1.800}" fill="none" stroke-linecap="round" opacity=".9"/>`;
  const eyes = a.acc === 'shades' ? '' : [27, 37].map(x => `<ellipse cx="${x}" cy="29" rx="3" ry="1.800" fill="#fbfbf8"/><circle cx="${x}" cy="29" r="1.500" fill="${a.eye}"/><circle cx="${x}" cy="29" r=".7" fill="#0a0a0a"/><circle cx="${x + .6}" cy="28.400" r=".5" fill="#fff"/><path d="M${x - 3} 28.600c1.500-1.500 4.500-1.500 6 0" stroke="rgba(0,0,0,.45)" stroke-width=".8" fill="none"/>`).join('');
  const nose = `<path d="M32 28.500c-1.200 3.500-2.500 5.500-2 6.500 1 1 3 1 4 0 .5-1-.8-3-2-6.500z" fill="${a.sk2}" opacity=".35"/><path d="M29.800 35c1.500 1 3.200 1 4.400 0" stroke="${a.sk2}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  const mouth = a.f ? `<path d="M27.500 39.500c2-1.200 3-1 4.500-.6 1.500-.4 2.500-.6 4.500.6-1 2.800-3 3.800-4.500 3.800s-3.500-1-4.500-3.800z" fill="${a.lip}"/><path d="M27.500 39.500c3 .8 6 .8 9 0" stroke="rgba(0,0,0,.25)" stroke-width=".6" fill="none"/>`
    : `<path d="M27.500 40c3 1.800 6 1.800 9 0" stroke="#7a3b2e" stroke-width="1.400" fill="none" stroke-linecap="round"/>`;
  const acc = {
    mustache: `<path d="M26 37.500c2.500-2 4.500-.8 6-.8s3.500-1.200 6 .8c-2 2.500-4.500 1.600-6 1.600s-4 .9-6-1.600z" fill="${hc}"/>`,
    glasses: `<g fill="rgba(180,220,255,.16)" stroke="#1d1d22" stroke-width="1.300"><rect x="22.500" y="26" width="9" height="6.500" rx="2.500"/><rect x="32.500" y="26" width="9" height="6.500" rx="2.500"/></g><path d="M31.500 28.500h1M22.500 28l-3-1M41.500 28l3-1" stroke="#1d1d22" stroke-width="1.100"/><path d="M24 27.500l3 3" stroke="rgba(255,255,255,.55)" stroke-width=".8"/>`,
    shades: `<path d="M21.500 26.500h21c.8 0 1 .8 1 1.500v2c0 2.500-2 3.500-4.500 3.500-3 0-4.500-1.500-5-3.500h-4c-.5 2-2 3.500-5 3.500-2.500 0-4.500-1-4.500-3.500v-2c0-.7.2-1.500 1-1.500z" fill="url(#${u}s)"/><path d="M24 28l3 3M35 28l3 3" stroke="rgba(255,255,255,.5)" stroke-width="1" stroke-linecap="round"/>`,
    headset: `<path d="M19 28c-1-12 5-19 13-19s14 7 13 19" fill="none" stroke="#1c1c20" stroke-width="2.600"/><rect x="16.500" y="26" width="5" height="9" rx="2.200" fill="#25262c"/><rect x="42.500" y="26" width="5" height="9" rx="2.200" fill="#25262c"/><path d="M45 34c0 5-4 7-9 7" fill="none" stroke="#1c1c20" stroke-width="1.600"/><circle cx="35.500" cy="41" r="2" fill="#25262c"/><circle cx="35.500" cy="41" r=".8" fill="#e33"/>`,
    none: ''
  }[a.acc];
  const ear = a.ear ? `<circle cx="19.600" cy="34.500" r="1.200" fill="${a.ear}"/><circle cx="44.400" cy="34.500" r="1.200" fill="${a.ear}"/>` : '';
  const collar = a.f
    ? `<path d="M22 64l4-15 6 7 6-7 4 15z" fill="${a.shirt}"/><path d="M26 49l6 7 6-7" stroke="rgba(0,0,0,.18)" stroke-width="1" fill="none"/>`
    : `<path d="M25 47l7 9 7-9 4 17H21z" fill="${a.shirt}"/><path d="M25 47l7 9 7-9" stroke="rgba(0,0,0,.2)" stroke-width="1" fill="none"/>${a.tie ? `<path d="M30 54h4l2 4-3 7h-2l-3-7z" fill="${a.tie}"/><path d="M30.500 51.500h3l.8 2.500h-4.600z" fill="${a.tie}"/><path d="M31 56l1 8" stroke="rgba(255,255,255,.18)" stroke-width="1"/>` : ''}`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
<radialGradient id="${u}b" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>
<linearGradient id="${u}j" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.suit}"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
<radialGradient id="${u}f" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="${a.skin}"/><stop offset="1" stop-color="${a.sk2}"/></radialGradient>
<linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hc}"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2f36"/><stop offset="1" stop-color="#050608"/></linearGradient></defs>
<rect width="64" height="64" fill="${a.bg}"/><rect width="64" height="64" fill="url(#${u}b)"/>
${hairBack}
<path d="M2 64c0-12 10-18 22-19l8 9 8-9c12 1 22 7 22 19z" fill="${a.suit}"/><path d="M2 64c0-12 10-18 22-19l8 9 8-9c12 1 22 7 22 19z" fill="url(#${u}j)"/>
${collar}<path d="M24 45l-3 19M40 45l3 19" stroke="rgba(255,255,255,.12)" stroke-width="1.200"/>
<path d="M27 38h10v9c-2 3-8 3-10 0z" fill="${a.sk2}"/><path d="M27 43c3 2.500 7 2.500 10 0v3c-3 2.500-7 2.500-10 0z" fill="rgba(0,0,0,.2)"/>
<ellipse cx="19.500" cy="31" rx="2.200" ry="3.200" fill="${a.sk2}"/><ellipse cx="44.500" cy="31" rx="2.200" ry="3.200" fill="${a.sk2}"/>
<path d="M19.500 27c0-9.500 5-15.500 12.500-15.500S44.500 17.500 44.500 27c0 9-4.500 16-12.500 16S19.500 36 19.500 27z" fill="url(#${u}f)"/>
<ellipse cx="24.500" cy="35" rx="3.500" ry="2" fill="#e8736a" opacity=".13"/><ellipse cx="39.500" cy="35" rx="3.500" ry="2" fill="#e8736a" opacity=".13"/>
${beard}${hairFront}${brow}${eyes}${nose}${mouth}${acc}${ear}
${dead ? '<rect width="64" height="64" fill="#000" opacity=".22"/><path d="M8 8l48 48M56 8L8 56" stroke="#e53935" stroke-width="5" stroke-linecap="round" opacity=".92"/>' : ''}</svg>`;
}

/* ---------- Meubles (illustrations plates, en légère perspective, 40 × 40) ---------- */
const IN = 'stroke="#2a211a" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"';
const SH = '<ellipse cx="20" cy="36" rx="14" ry="2.800" fill="rgba(40,25,10,.2)" stroke="none"/>';
const ART = {
  fauteuil: `${SH}<g ${IN}><path d="M9 22V9a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v13z" fill="#f4ead6"/><path d="M12.500 8.500h15" stroke="#d6c5a0" fill="none"/><rect x="4" y="15" width="7" height="19" rx="3.200" fill="#e6d8bb"/><rect x="29" y="15" width="7" height="19" rx="3.200" fill="#e6d8bb"/><path d="M9 21h22v7H9z" fill="#faf3e3"/><path d="M9 28h22v5a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill="#e9dcc0"/><rect x="11" y="35" width="3" height="2.500" fill="#6b4a2c"/><rect x="26" y="35" width="3" height="2.500" fill="#6b4a2c"/></g>`,
  tapis: `<g ${IN}><rect x="3" y="9" width="34" height="23" rx="2" fill="#f7e5a6"/><rect x="6.500" y="12.500" width="27" height="16" rx="1" fill="none" stroke="#d3a43a" stroke-width="1.200"/><path d="M12 20.500h16M20 15v11" stroke="#e0bd5a" stroke-width="1.200" fill="none"/><path d="M3 12h-1.800M3 16h-1.800M3 20h-1.800M3 24h-1.800M3 28h-1.800M37 12h1.800M37 16h1.800M37 20h1.800M37 24h1.800M37 28h1.800" stroke="#c9ad6a" stroke-width=".9" fill="none"/></g>`,
  lit: `${SH}<g ${IN}><rect x="4" y="3" width="32" height="33" rx="3" fill="#c9a679"/><rect x="6" y="6" width="28" height="29" rx="2" fill="#fbfaf6"/><rect x="9" y="8" width="22" height="9" rx="3.500" fill="#fff"/><path d="M6 21h28v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="#a898d2"/><rect x="6" y="21" width="28" height="4.500" fill="#cbc1ea"/></g>`,
  bureau: `${SH}<g ${IN}><rect x="6" y="24" width="4" height="12" fill="#a8803f"/><rect x="30" y="24" width="4" height="12" fill="#a8803f"/><path d="M3 20h34v5H3z" fill="#d3ab5e"/><path d="M5 9h30l2 11H3z" fill="#f3d98f"/><path d="M13 11h14l1 7H12z" fill="#4a5360"/><path d="M14.500 12.300h11l.6 4.500H13.900z" fill="#82e4ec" stroke="none"/><rect x="7" y="12" width="4.500" height="5.500" fill="#fff" transform="rotate(-8 9 15)"/><circle cx="31.500" cy="15" r="2.300" fill="#fff"/><path d="M33.800 14.300q1.500.7 0 1.800" fill="none"/></g>`,
  ecran: `${SH}<g ${IN}><path d="M16 27h8l2 6H14z" fill="#59606e"/><rect x="10" y="33" width="20" height="3.500" rx="1.700" fill="#3f4450"/><rect x="4" y="4" width="32" height="24" rx="2.800" fill="#3b3f4a"/><rect x="7" y="7" width="26" height="18" rx="1.200" fill="#7fe3ea" stroke-width="1"/><circle cx="20" cy="16" r="5.500" fill="none" stroke="#12636d" stroke-width="1.300"/><path d="M20 8.500v5M20 18.500v5M12.500 16h5M22.500 16h5" stroke="#12636d" stroke-width="1.200" fill="none"/><path d="M9 22l4-3 3 2" stroke="#12636d" stroke-width="1" fill="none"/><circle cx="31" cy="26" r=".9" fill="#5dff9a" stroke="none"/></g>`,
  plante: `${SH}<g ${IN}><path d="M20 24C13 21 9 13 11 5c6 3 9 10 9 19z" fill="#58b45f"/><path d="M20 24C27 21 31 13 29 5c-6 3-9 10-9 19z" fill="#58b45f"/><path d="M20 25C16 17 16 9 20 2c4 7 4 15 0 23z" fill="#3f9a4d"/><path d="M20 24C12 25 6 21 4 15c7-1 13 2 16 9z" fill="#4aa957"/><path d="M20 24c8 1 14-3 16-9-7-1-13 2-16 9z" fill="#4aa957"/><path d="M11 24h18l-2.500 12h-13z" fill="#dd7a4b"/><rect x="10" y="22.500" width="20" height="4.200" rx="1.300" fill="#c4633a"/></g>`,
  etagere: `${SH}<g ${IN}><rect x="5" y="2" width="30" height="34" rx="2" fill="#b98250"/><rect x="8" y="5" width="24" height="28" fill="#6f4624"/><path d="M8 14h24M8 24h24" stroke="#b98250" stroke-width="2" fill="none"/><g stroke="none"><rect x="9.500" y="6" width="3" height="8" fill="#c0463f"/><rect x="13" y="7.500" width="2.800" height="6.500" fill="#3777b5"/><rect x="16.300" y="6" width="3.500" height="8" fill="#e0b84a"/><rect x="20.300" y="8" width="2.800" height="6" fill="#4c9a5c"/><rect x="23.600" y="6.500" width="3.200" height="7.500" fill="#8b5fb0"/><rect x="27.300" y="6" width="3.200" height="8" fill="#d9822f"/><rect x="9.500" y="17" width="4" height="7" fill="#3f9a9a"/><rect x="14" y="16" width="3" height="8" fill="#c0463f"/><rect x="18" y="18" width="3.500" height="6" fill="#e0b84a"/><rect x="23" y="16" width="8" height="8" fill="#e6dfcd"/><rect x="9.500" y="27" width="6" height="6" fill="#7b8a96"/><rect x="16.500" y="28" width="3.500" height="5" fill="#c0463f"/><rect x="21" y="26.500" width="3" height="6.500" fill="#3777b5"/><rect x="25" y="27.500" width="3.500" height="5.500" fill="#e0b84a"/></g></g>`
};
export function furniture(t) {
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${ART[t]}</svg>`;
}

/* ---------- Murs, portes et fenêtres : calque au-dessus des sols (une case = 100 unités) ---------- */
export function walls(cs) {
  const n = cs.n, W = '#17120f', doors = {};
  cs.doors.forEach(([y, x, dir, kind]) => { doors[(dir === 'right' ? 'v' : 'h') + y + ',' + x] = { kind }; });
  let walls = '', deco = '';
  const seg = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = cs.rooms[y][x];
    if (x + 1 < n && cs.rooms[y][x + 1] !== r) { // mur vertical à droite de la case
      const X = (x + 1) * 100, Y0 = y * 100, d = doors['v' + y + ',' + x];
      if (!d) walls += seg(X, Y0, X, Y0 + 100);
      else {
        walls += seg(X, Y0, X, Y0 + 28) + seg(X, Y0 + 72, X, Y0 + 100);
        deco += `<rect x="${X - 5}" y="${Y0 + 24}" width="10" height="9" fill="${W}"/><rect x="${X - 5}" y="${Y0 + 67}" width="10" height="9" fill="${W}"/>`;
        deco += d.kind === 'door'
          ? `<path d="M${X - 38} ${Y0 + 33}A38 38 0 0 1 ${X} ${Y0 + 71}" fill="none" stroke="rgba(30,20,10,.3)" stroke-width="1.500" stroke-dasharray="4 4"/><line x1="${X}" y1="${Y0 + 71}" x2="${X - 36}" y2="${Y0 + 62}" stroke="${W}" stroke-width="12" stroke-linecap="round"/><line x1="${X}" y1="${Y0 + 71}" x2="${X - 36}" y2="${Y0 + 62}" stroke="#c98a4a" stroke-width="7.500" stroke-linecap="round"/>`
          : `<line x1="${X}" y1="${Y0 + 33}" x2="${X}" y2="${Y0 + 67}" stroke="#e8d9b4" stroke-width="5"/>`;
      }
    }
    if (y + 1 < n && cs.rooms[y + 1][x] !== r) { // mur horizontal sous la case
      const Y = (y + 1) * 100, X0 = x * 100, d = doors['h' + y + ',' + x];
      if (!d) walls += seg(X0, Y, X0 + 100, Y);
      else {
        walls += seg(X0, Y, X0 + 28, Y) + seg(X0 + 72, Y, X0 + 100, Y);
        deco += `<rect x="${X0 + 24}" y="${Y - 5}" width="9" height="10" fill="${W}"/><rect x="${X0 + 67}" y="${Y - 5}" width="9" height="10" fill="${W}"/>`;
        deco += d.kind === 'door'
          ? `<path d="M${X0 + 33} ${Y - 38}A38 38 0 0 0 ${X0 + 71} ${Y}" fill="none" stroke="rgba(30,20,10,.3)" stroke-width="1.500" stroke-dasharray="4 4"/><line x1="${X0 + 71}" y1="${Y}" x2="${X0 + 62}" y2="${Y - 36}" stroke="${W}" stroke-width="12" stroke-linecap="round"/><line x1="${X0 + 71}" y1="${Y}" x2="${X0 + 62}" y2="${Y - 36}" stroke="#c98a4a" stroke-width="7.500" stroke-linecap="round"/>`
          : `<line x1="${X0 + 33}" y1="${Y}" x2="${X0 + 67}" y2="${Y}" stroke="#e8d9b4" stroke-width="5"/>`;
      }
    }
  }
  // fenêtres sur le pourtour : languette claire posée contre le mur
  cs.windows.forEach(([wy, wx, side]) => {
    const w = { x: wx, y: wy, side };
    const x0 = w.x * 100, y0 = w.y * 100, g = 'fill="#eaf7ff" stroke="#17120f" stroke-width="2.500"';
    if (w.side === 'top') deco += `<rect x="${x0 + 22}" y="${y0 + 1}" width="56" height="13" rx="6" ${g}/><rect x="${x0 + 30}" y="${y0 + 5}" width="40" height="5" rx="2.500" fill="#8fd0f2"/>`;
    if (w.side === 'bottom') deco += `<rect x="${x0 + 22}" y="${y0 + 86}" width="56" height="13" rx="6" ${g}/><rect x="${x0 + 30}" y="${y0 + 90}" width="40" height="5" rx="2.500" fill="#8fd0f2"/>`;
    if (w.side === 'left') deco += `<rect x="${x0 + 1}" y="${y0 + 22}" width="13" height="56" rx="6" ${g}/><rect x="${x0 + 5}" y="${y0 + 30}" width="5" height="40" rx="2.500" fill="#8fd0f2"/>`;
    if (w.side === 'right') deco += `<rect x="${x0 + 86}" y="${y0 + 22}" width="13" height="56" rx="6" ${g}/><rect x="${x0 + 90}" y="${y0 + 30}" width="5" height="40" rx="2.500" fill="#8fd0f2"/>`;
  });
  return `<svg class="mh-walls" viewBox="0 0 ${n * 100} ${n * 100}" preserveAspectRatio="none" aria-hidden="true"><g stroke="${W}" stroke-width="7" stroke-linecap="square" fill="none">${walls}</g>${deco}</svg>`;
}
