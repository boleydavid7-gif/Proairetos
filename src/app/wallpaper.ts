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

export function wallpaperSvg(art: WallArt, page: string, light: boolean, wide = false): string {
  const [w, h] = wide ? [2400, 1350] : [1200, 1600];
  // Above the page title and clear of the icons at the top right, so no button sits on the lamp.
  const [x, y] = [Math.round(w * (wide ? 0.66 : 0.6)), Math.round(h * (wide ? 0.12 : 0.09))];
  const unit = h / 1600;
  const big = Math.max(w, h);
  // A field of color: one radial bloom, strongest at its center and gone at its edge.
  const bloom = (id: string, color: string, cx: number, cy: number, r: number, strength: number) =>
    `<radialGradient id="${id}" cx="${Math.round(cx)}" cy="${Math.round(cy)}" r="${Math.round(r)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset=".5" stop-color="${color}" stop-opacity="${(strength * 0.45).toFixed(3)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  const fields = [
    bloom('f1', art.b1, w * 0.04, h * 0.42, big * 0.62, light ? 0.5 : 0.55),
    bloom('f2', art.b2, w * 1.02, h * 0.66, big * 0.55, light ? 0.42 : 0.5),
    bloom('f3', art.b3, w * 0.32, h * 1.02, big * 0.6, light ? 0.45 : 0.6),
    bloom('f4', art.glow, x, y, big * 0.62, light ? 0.7 : 0.42),
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
<radialGradient id="l" cx="${x}" cy="${y}" r="${Math.round(260 * unit)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${light ? 0.55 : 0.28}"/><stop offset=".35" stop-color="${art.glow}" stop-opacity="${light ? 0.45 : 0.32}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.glow}" stop-opacity="0"/><stop offset=".6" stop-color="${art.glow}" stop-opacity="${light ? 0.35 : 0.22}"/><stop offset="1" stop-color="#fff" stop-opacity="${light ? 0.5 : 0.3}"/></linearGradient>
${foldDefs}
<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
${fields.map((_, i) => `<rect width="${w}" height="${h}" fill="url(#f${i + 1})"/>`).join('')}
<g transform="scale(${w / 1200} ${unit})">${foldShapes}</g>
<rect width="${w}" height="${h}" fill="url(#l)"/>
<rect width="${w}" height="${h}" filter="url(#n)" opacity="${light ? 0.05 : 0.07}"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
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
