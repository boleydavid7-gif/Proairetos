/** Lamplight's wallpaper: a lamp toward the upper right with rings of light around it, and three bands sweeping
 *  across below. Drawn from a room's colors, so every room has its own; a tall version for phones and a wide
 *  one for computers. The page fades it out (02-shell.css). */
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
  const ring = light ? 0.5 : 0.28;
  const band = light ? 0.75 : 0.85;
  const rings = [190, 300, 430, 590]
    .map(
      (r, i) =>
        `<circle cx="${x}" cy="${y}" r="${Math.round(r * unit)}" stroke-opacity="${(ring * [1, 0.75, 0.5, 0.3][i]).toFixed(3)}"/>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin slice">
<defs>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${art.sky}"/><stop offset=".8" stop-color="${page}"/></linearGradient>
<radialGradient id="h" cx="${x}" cy="${y}" r="${Math.round(820 * unit)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${art.glow}" stop-opacity="${light ? 0.85 : 0.55}"/><stop offset=".35" stop-color="${art.glow}" stop-opacity="${light ? 0.3 : 0.16}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="l"><stop offset="0" stop-color="#fff" stop-opacity="${light ? 0.85 : 0.6}"/><stop offset=".25" stop-color="${art.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.b1}" stop-opacity="${band}"/><stop offset="1" stop-color="${art.b1}" stop-opacity=".15"/></linearGradient>
<linearGradient id="g2" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${art.b2}" stop-opacity="${band}"/><stop offset="1" stop-color="${art.b2}" stop-opacity=".2"/></linearGradient>
<linearGradient id="g3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.b3}" stop-opacity=".9"/><stop offset="1" stop-color="${art.b3}" stop-opacity=".5"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<rect width="${w}" height="${h}" fill="url(#h)"/>
<g fill="none" stroke="${art.glow}" stroke-width="3">${rings}</g>
<circle cx="${x}" cy="${y}" r="${Math.round(130 * unit)}" fill="url(#l)"/>
<g transform="scale(${w / 1200} ${unit})">
<path fill="url(#g1)" d="M-100 560C240 400 540 740 840 560S1170 360 1300 440V820C1010 720 760 960 430 900S40 780-100 860Z"/>
<path fill="url(#g2)" d="M-100 780C200 660 470 940 800 820S1150 640 1300 720V1060C1000 960 780 1160 430 1100S60 980-100 1060Z"/>
<path fill="url(#g3)" d="M-100 1000C260 880 560 1160 880 1030S1180 880 1300 950V1700H-100Z"/>
</g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}

/** The foot of Today in the same room: three ridges rising toward the lamp's side, their tops caught by its light.
 *  No sun or moon of their own, so the wallpaper's lamp stays the one light on the page. */
export function footSvg(art: WallArt, page: string, light: boolean, wide = false): string {
  const w = wide ? 2400 : 1200;
  const h = 1000;
  const rim = light ? 0.55 : 0.4;
  const fill = light ? [0.55, 0.6, 0.75] : [0.7, 0.8, 0.95];
  const ridge = (id: string, color: string, top: number, opacity: number) =>
    `<linearGradient id="${id}" x1="0" y1="${top}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${page}" stop-opacity="${light ? 0.6 : 0.9}"/></linearGradient>`;
  const paths = [
    'M-100 430C200 300 430 470 720 370S1090 230 1300 300',
    'M-100 610C260 510 540 680 840 570S1160 470 1300 520',
    'M-100 790C300 710 600 850 900 770S1200 690 1300 720',
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice">
<defs>
${ridge('r1', art.b2, 300, fill[0])}
${ridge('r2', art.b1, 470, fill[1])}
${ridge('r3', art.b3, 690, fill[2])}
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${art.glow}" stop-opacity="0"/><stop offset=".55" stop-color="${art.glow}" stop-opacity="${rim * 0.35}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="${rim}"/></linearGradient>
</defs>
<g transform="scale(${w / 1200} 1)">
${paths.map((d, i) => `<path fill="url(#r${i + 1})" d="${d}V1000H-100Z"/>`).join('')}
<g fill="none" stroke="url(#rim)" stroke-width="2.5" vector-effect="non-scaling-stroke">${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
</g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}
