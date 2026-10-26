/** Lamplight's wallpaper, drawn like a system wallpaper (iOS, Material): soft fields of the room's colors blooming
 *  into each other, the lamp as a warm glow toward the upper right (no rings, no hard center), two silk folds
 *  sweeping across with light along their top edges and a soft shade beneath, and a fine grain so nothing bands.
 *  Drawn from a room's colors, so every room has its own; a tall version for phones and a wide one for computers.
 *  The page fades it out (02-shell.css). */
export type WallArt = {
  sky: string;
  glow: string;
  b1: string;
  b2: string;
  b3: string;
};

/** Day light (Lamplight 2.0): where the lamp hangs on the tall picture (fractions), how strong it is, and its color. */
export type WallLamp = { x: number; y: number; strength: number; glow: string; warmth: number };

/**
 * Proairetos' quieter wall: a material surface with one pool of light, rather than a scene or a set of folds.
 * The room still supplies the material tint and the person's lamp still supplies the one active colour. Keeping this
 * separate from wallpaperSvg lets the companion apps retain their own visual landmarks while Today stays a calm desk
 * for reflection.
 */
export function materialWallpaperSvg(art: WallArt, page: string, light: boolean, wide = false, lamp?: WallLamp): string {
  const [w, h] = wide ? [2400, 1350] : [1200, 1600];
  const fx = lamp ? (wide ? 0.7 + (lamp.x - 0.6) : lamp.x) : wide ? 0.7 : 0.6;
  const fy = lamp ? (wide ? 0.08 + (lamp.y - 0.09) * 0.55 : lamp.y * 0.72) : wide ? 0.08 : 0.065;
  const [x, y] = [Math.round(w * fx), Math.round(h * fy)];
  const k = lamp ? 0.5 + 0.5 * lamp.strength : 1;
  if (lamp) art = { ...art, glow: lamp.glow };
  const grainOpacity = light ? 0.035 : 0.06;
  const poolOpacity = (light ? 0.22 : 0.12) * k;
  const washOpacity = light ? 0.18 : 0.16;
  const seamY = Math.round(h * (wide ? 0.72 : 0.58));
  const seam = `M-${Math.round(w * 0.08)} ${seamY} C${Math.round(w * 0.2)} ${seamY - h * 0.08}, ${Math.round(w * 0.46)} ${seamY + h * 0.05}, ${Math.round(w * 0.68)} ${seamY - h * 0.035} S${Math.round(w * 1.04)} ${seamY - h * 0.12}, ${Math.round(w * 1.08)} ${seamY - h * 0.08}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin slice">
<defs>
<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${art.sky}"/><stop offset=".58" stop-color="${page}" stop-opacity=".86"/><stop offset="1" stop-color="${page}"/></linearGradient>
<linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${art.b1}" stop-opacity="${washOpacity}"/><stop offset=".52" stop-color="${art.b2}" stop-opacity="${(washOpacity * 0.55).toFixed(3)}"/><stop offset="1" stop-color="${art.b3}" stop-opacity="${(washOpacity * 0.25).toFixed(3)}"/></linearGradient>
<radialGradient id="pool" cx="${x}" cy="${y}" r="${Math.round(Math.max(w, h) * 0.68)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${art.glow}" stop-opacity="${poolOpacity.toFixed(3)}"/><stop offset=".45" stop-color="${art.glow}" stop-opacity="${(poolOpacity * 0.42).toFixed(3)}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="seam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.glow}" stop-opacity="0"/><stop offset=".56" stop-color="${art.glow}" stop-opacity="${(light ? 0.18 : 0.12).toFixed(3)}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></linearGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .75 0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#base)"/>
<rect width="${w}" height="${h}" fill="url(#wash)"/>
<rect width="${w}" height="${h}" fill="url(#pool)"/>
<path d="${seam}" fill="none" stroke="url(#seam)" stroke-width="${wide ? 3 : 2}" vector-effect="non-scaling-stroke"/>
<rect width="${w}" height="${h}" filter="url(#grain)" opacity="${grainOpacity}"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}

/** The matching foot for the material wall: a soft pool and one quiet seam, fading into the page. */
export function materialFootSvg(art: WallArt, page: string, light: boolean, wide = false): string {
  const w = wide ? 2400 : 1200;
  const h = 1000;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice">
<defs>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${page}" stop-opacity="0"/><stop offset=".45" stop-color="${page}" stop-opacity="${light ? 0.28 : 0.5}"/><stop offset="1" stop-color="${page}"/></linearGradient>
<radialGradient id="pool" cx="${Math.round(w * 0.78)}" cy="${h}" r="${Math.round(w * 0.72)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${art.b2}" stop-opacity="${light ? 0.24 : 0.32}"/><stop offset="1" stop-color="${art.b2}" stop-opacity="0"/></radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.glow}" stop-opacity="0"/><stop offset=".6" stop-color="${art.glow}" stop-opacity="${light ? 0.16 : 0.1}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#pool)"/>
<rect width="${w}" height="${h}" fill="url(#fade)"/>
<path d="M-${Math.round(w * 0.08)} ${Math.round(h * 0.42)} C${Math.round(w * 0.25)} ${Math.round(h * 0.22)}, ${Math.round(w * 0.48)} ${Math.round(h * 0.54)}, ${Math.round(w * 0.72)} ${Math.round(h * 0.36)} S${Math.round(w * 1.03)} ${Math.round(h * 0.2)}, ${Math.round(w * 1.08)} ${Math.round(h * 0.28)}" fill="none" stroke="url(#rim)" stroke-width="${wide ? 3 : 2}" vector-effect="non-scaling-stroke"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}

export function wallpaperSvg(art: WallArt, page: string, light: boolean, wide = false, lamp?: WallLamp): string {
  const [w, h] = wide ? [2400, 1350] : [1200, 1600];
  // Above the page title and clear of the icons at the top right, so no button sits on the lamp. With day light the
  // lamp moves through the day from there (lower and nearer the middle late), the wide picture following the tall.
  const fx = lamp ? (wide ? 0.66 + (lamp.x - 0.6) : lamp.x) : wide ? 0.66 : 0.6;
  const fy = lamp ? (wide ? 0.12 + (lamp.y - 0.09) * 0.8 : lamp.y) : wide ? 0.12 : 0.09;
  const [x, y] = [Math.round(w * fx), Math.round(h * fy)];
  const k = lamp ? 0.5 + 0.5 * lamp.strength : 1;
  // Late in the day the lamp has no white heart, only its warm glow (in the light appearance; dark is night).
  const core = lamp ? k * (1 - 0.85 * lamp.warmth) : 1;
  if (lamp) art = { ...art, glow: lamp.glow };
  const unit = h / 1600;
  const big = Math.max(w, h);
  const night = nightLight(x, y, unit, w, h, art.glow, k);
  // A field of color: one radial bloom, strongest at its center and gone at its edge.
  const bloom = (id: string, color: string, cx: number, cy: number, r: number, strength: number) =>
    `<radialGradient id="${id}" cx="${Math.round(cx)}" cy="${Math.round(cy)}" r="${Math.round(r)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset=".5" stop-color="${color}" stop-opacity="${(strength * 0.45).toFixed(3)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  const fields = [
    bloom('f1', art.b1, w * 0.04, h * 0.42, big * 0.62, light ? 0.5 : 0.55),
    bloom('f2', art.b2, w * 1.02, h * 0.66, big * 0.55, light ? 0.42 : 0.5),
    bloom('f3', art.b3, w * 0.32, h * 1.02, big * 0.6, light ? 0.45 : 0.6),
    // At night (dark) the room's color around the light is a faint wash, not a lamp's warm pool.
    bloom('f4', art.glow, x, y, big * 0.62, (light ? 0.7 : 0.14) * k),
  ];
  // Two silk folds in phone units (1200 wide), scaled across for computers.
  const folds = [
    { d: 'M-100 760C240 560 560 900 880 700S1190 470 1300 520', color: art.b1, top: 470, depth: 520 },
    { d: 'M-100 1060C300 900 640 1160 960 1000S1200 860 1300 900', color: art.b2, top: 860, depth: 560 },
  ];
  const foldDefs = folds
    .map(
      (fold, i) =>
        `<linearGradient id="k${i}" x1="0" y1="${fold.top}" x2="0" y2="${fold.top + fold.depth}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${fold.color}" stop-opacity="${light ? 0.38 : 0.5}"/><stop offset="1" stop-color="${fold.color}" stop-opacity="0"/></linearGradient>` +
        `<linearGradient id="d${i}" x1="0" y1="${fold.top}" x2="0" y2="${fold.top + 220}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="${light ? 0.05 : 0.18}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`,
    )
    .join('');
  const foldShapes = folds
    .map(
      (fold, i) =>
        `<path fill="url(#d${i})" transform="translate(0 46)" d="${fold.d}V1700H-100Z"/><path fill="url(#k${i})" d="${fold.d}V1700H-100Z"/><path fill="none" stroke="url(#e)" stroke-width="2" vector-effect="non-scaling-stroke" d="${fold.d}"/>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin slice">
<defs>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${art.sky}"/><stop offset=".85" stop-color="${page}"/></linearGradient>
${fields.join('')}
${light ? `<radialGradient id="l" cx="${x}" cy="${y}" r="${Math.round(260 * unit)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${(0.55 * core).toFixed(3)}"/><stop offset=".35" stop-color="${art.glow}" stop-opacity="${(0.45 * k).toFixed(3)}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>` : night.defs}
<linearGradient id="e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.glow}" stop-opacity="0"/><stop offset=".6" stop-color="${art.glow}" stop-opacity="${light ? 0.35 : 0.22}"/><stop offset="1" stop-color="#fff" stop-opacity="${light ? 0.5 : 0.3}"/></linearGradient>
${foldDefs}
<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
${fields.map((_, i) => `<rect width="${w}" height="${h}" fill="url(#f${i + 1})"/>`).join('')}
<g transform="scale(${w / 1200} ${unit})">${foldShapes}</g>
${light ? `<rect width="${w}" height="${h}" fill="url(#l)"/>` : night.shapes}
<rect width="${w}" height="${h}" filter="url(#n)" opacity="${light ? 0.05 : 0.07}"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}

/*
 * Night (the dark appearance): no lamp and no disc, only a wide faint glow where the light would be and a few dim
 * stars kept to the sky above the folds, at the same places on every device.
 */
const STARS: [number, number, number][] = [
  [0.12, 0.05, 1.6], [0.27, 0.11, 1.1], [0.39, 0.035, 1.3], [0.84, 0.06, 1.2], [0.93, 0.15, 1.5], [0.08, 0.19, 1.1],
  [0.47, 0.17, 0.9], [0.74, 0.2, 1.1], [0.2, 0.27, 0.9], [0.9, 0.29, 1], [0.58, 0.26, 0.8],
];

function nightLight(x: number, y: number, unit: number, w: number, h: number, glow: string, k: number): { defs: string; shapes: string } {
  const halo = Math.round(320 * unit);
  const defs = `<radialGradient id="l" cx="${x}" cy="${y}" r="${halo}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f3eee2" stop-opacity="${(0.1 * k).toFixed(3)}"/><stop offset=".4" stop-color="${glow}" stop-opacity="${(0.07 * k).toFixed(3)}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
  const stars = STARS.map(([sx, sy, size]) => `<circle cx="${Math.round(sx * w)}" cy="${Math.round(sy * h)}" r="${(size * unit * 1.6).toFixed(1)}" fill="#f3eee2" opacity="${(0.32 * k).toFixed(2)}"/>`).join('');
  return { defs, shapes: `<rect width="${w}" height="${h}" fill="url(#l)"/>${stars}` };
}

/** The foot of Today in the same room, drawn like the wallpaper: two silk folds rising toward the lamp's side, each
 *  fading into the page, their top edges caught by its light, over a soft bloom of the room's color. No sun or moon
 *  of their own, so the wallpaper's lamp stays the one light on the page. */
export function footSvg(art: WallArt, page: string, light: boolean, wide = false): string {
  const w = wide ? 2400 : 1200;
  const h = 1000;
  const rim = light ? 0.45 : 0.35;
  const folds = [
    { d: 'M-100 520C240 380 520 560 820 450S1150 320 1300 360', color: art.b1, top: 330, strength: light ? 0.3 : 0.42 },
    { d: 'M-100 760C300 650 600 800 900 700S1200 610 1300 640', color: art.b3, top: 610, strength: light ? 0.32 : 0.5 },
  ];
  const fold = (i: number, color: string, top: number, strength: number) =>
    `<linearGradient id="r${i}" x1="0" y1="${top}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset=".55" stop-color="${color}" stop-opacity="${(strength * 0.35).toFixed(3)}"/><stop offset="1" stop-color="${page}" stop-opacity="${light ? 0.5 : 0.8}"/></linearGradient>` +
    `<linearGradient id="d${i}" x1="0" y1="${top}" x2="0" y2="${top + 180}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="${light ? 0.04 : 0.16}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice">
<defs>
${folds.map((each, i) => fold(i, each.color, each.top, each.strength)).join('')}
<radialGradient id="b" cx="${Math.round(w * 0.85)}" cy="${h}" r="${Math.round(w * 0.7)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${art.b2}" stop-opacity="${light ? 0.3 : 0.4}"/><stop offset="1" stop-color="${art.b2}" stop-opacity="0"/></radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.glow}" stop-opacity="0"/><stop offset=".55" stop-color="${art.glow}" stop-opacity="${rim * 0.35}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="${rim}"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#b)"/>
<g transform="scale(${w / 1200} 1)">
${folds.map((each, i) => `<path fill="url(#d${i})" transform="translate(0 40)" d="${each.d}V1000H-100Z"/><path fill="url(#r${i})" d="${each.d}V1000H-100Z"/>`).join('')}
<g fill="none" stroke="url(#rim)" stroke-width="2" vector-effect="non-scaling-stroke">${folds.map((each) => `<path d="${each.d}"/>`).join('')}</g>
</g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}
