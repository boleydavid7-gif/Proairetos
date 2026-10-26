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

import type { WallStyle } from '../core/look/lamplight';
import { mixHex } from '../lamplight/daylight';
import type { Hex } from '../lamplight/color';

/** Day light (Lamplight 2.0): where the lamp hangs on the tall picture (fractions), how strong it is, and its color. */
export type WallLamp = { x: number; y: number; strength: number; glow: string; warmth: number };

/** Small, deterministic marks keep the material treatments repeatable across devices. */
function paperFibers(w: number, h: number, fiber: string, shadow: string): string {
  const fibers = Array.from({ length: 30 }, (_, i) => {
    const x = (i * 431) % w;
    const y = 120 + ((i * 271) % Math.max(1, h - 180));
    const length = 18 + ((i * 37) % 46);
    const bend = (i % 2 ? 1 : -1) * (4 + (i % 5));
    const color = i % 4 === 0 ? shadow : fiber;
    return `<path d="M${x} ${y}q${Math.round(length * 0.5)} ${bend} ${length} 0" fill="none" stroke="${color}" stroke-width="${i % 3 === 0 ? 2.4 : 1.4}" stroke-linecap="round" opacity="${i % 4 === 0 ? 0.09 : 0.135}"/>`;
  }).join('');
  const flecks = Array.from({ length: 22 }, (_, i) => {
    const x = (i * 193) % w;
    const y = 80 + ((i * 149) % Math.max(1, h - 120));
    return `<circle cx="${x}" cy="${y}" r="${(1.5 + (i % 3) * 0.8).toFixed(1)}" fill="${i % 3 === 0 ? shadow : fiber}" opacity="${i % 3 === 0 ? 0.075 : 0.1}"/>`;
  }).join('');
  return fibers + flecks;
}

function woodGrain(w: number, h: number, dark: string, glow: string): string {
  return Array.from({ length: 15 }, (_, i) => {
    const y = Math.round(h * (0.12 + i * 0.06));
    const bend = 18 + (i % 4) * 8;
    const d = `M-${Math.round(w * 0.08)} ${y} C${Math.round(w * 0.18)} ${y - bend}, ${Math.round(w * 0.32)} ${y + bend}, ${Math.round(w * 0.48)} ${y} S${Math.round(w * 0.8)} ${y - bend}, ${Math.round(w * 1.08)} ${y + Math.round(bend * 0.4)}`;
    const color = i % 3 === 0 ? dark : glow;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${i % 3 === 0 ? 5 : 3}" stroke-linecap="round" opacity="${i % 3 === 0 ? 0.07 : 0.055}"/>`;
  }).join('') + `<ellipse cx="${Math.round(w * 0.27)}" cy="${Math.round(h * 0.42)}" rx="${Math.round(w * 0.12)}" ry="${Math.round(h * 0.035)}" fill="none" stroke="${dark}" stroke-width="4" opacity="0.055"/><ellipse cx="${Math.round(w * 0.27)}" cy="${Math.round(h * 0.42)}" rx="${Math.round(w * 0.07)}" ry="${Math.round(h * 0.02)}" fill="none" stroke="${glow}" stroke-width="3" opacity="0.045"/>`;
}

function inkPools(w: number, h: number, light: boolean): string {
  const ink = light ? '#4a4654' : '#0b101a';
  const bloom = light ? '#7b7089' : '#53647c';
  const first = `M${Math.round(w * 0.02)} ${Math.round(h * 0.32)} C${Math.round(w * 0.18)} ${Math.round(h * 0.2)}, ${Math.round(w * 0.34)} ${Math.round(h * 0.4)}, ${Math.round(w * 0.48)} ${Math.round(h * 0.3)} S${Math.round(w * 0.76)} ${Math.round(h * 0.15)}, ${Math.round(w * 1.05)} ${Math.round(h * 0.28)} C${Math.round(w * 0.82)} ${Math.round(h * 0.5)}, ${Math.round(w * 0.5)} ${Math.round(h * 0.42)}, ${Math.round(w * 0.18)} ${Math.round(h * 0.56)}Z`;
  const second = `M${Math.round(w * 0.3)} ${Math.round(h * 0.72)} C${Math.round(w * 0.48)} ${Math.round(h * 0.58)}, ${Math.round(w * 0.62)} ${Math.round(h * 0.78)}, ${Math.round(w * 0.94)} ${Math.round(h * 0.62)} C${Math.round(w * 1.08)} ${Math.round(h * 0.84)}, ${Math.round(w * 0.76)} ${Math.round(h * 0.98)}, ${Math.round(w * 0.42)} ${Math.round(h * 0.9)}Z`;
  return `<path d="${first}" fill="${ink}" opacity="${light ? 0.12 : 0.17}" filter="url(#ink-bleed)"/><path d="${second}" fill="${bloom}" opacity="${light ? 0.1 : 0.14}" filter="url(#ink-bleed)"/><circle cx="${Math.round(w * 0.62)}" cy="${Math.round(h * 0.36)}" r="${Math.round(w * 0.11)}" fill="${ink}" opacity="${light ? 0.05 : 0.08}" filter="url(#ink-bleed)"/>`;
}

/**
 * Proairetos' quieter wall: a material surface with one pool of light, rather than a scene or a set of folds.
 * The room still supplies the material tint and the person's lamp still supplies the one active colour. Keeping this
 * separate from wallpaperSvg lets the companion apps retain their own visual landmarks while Today stays a calm desk
 * for reflection.
 */
export function wallpaperStyleSvg(art: WallArt, page: string, light: boolean, wide = false, lamp?: WallLamp, style: WallStyle = 'paper'): string {
  const [w, h] = wide ? [2400, 1350] : [1200, 1600];
  const fx = lamp ? (wide ? 0.7 + (lamp.x - 0.6) : lamp.x) : wide ? 0.7 : 0.6;
  const fy = lamp ? (wide ? 0.08 + (lamp.y - 0.09) * 0.55 : lamp.y * 0.72) : wide ? 0.08 : 0.065;
  const [x, y] = [Math.round(w * fx), Math.round(h * fy)];
  const k = lamp ? 0.5 + 0.5 * lamp.strength : 1;
  if (lamp) art = { ...art, glow: lamp.glow };
  const grainOpacity = style === 'paper' ? (light ? 0.07 : 0.1) : light ? 0.035 : 0.06;
  const poolOpacity = (light ? 0.22 : 0.12) * k;
  const washOpacity = light ? 0.18 : 0.16;
  // Materials keep their own character, while these tints inherit the room and the lamp instead of painting a
  // fixed beige or brown layer over every palette. Mixing the room into the neutral first keeps the result calm.
  const pageHex = page as Hex;
  const glowHex = art.glow as Hex;
  const paperBase = light ? mixHex('#f5eee1', art.b1 as Hex, 0.18) : mixHex(pageHex, art.b1 as Hex, 0.16);
  const paperFiber = light ? mixHex(paperBase, glowHex, 0.28) : mixHex(paperBase, glowHex, 0.2);
  const paperShadow = mixHex(paperBase, pageHex, light ? 0.5 : 0.62);
  const woodBase = light ? mixHex('#b98559', art.b2 as Hex, 0.2) : mixHex('#5b3b2a', mixHex(pageHex, art.b2 as Hex, 0.3), 0.42);
  const woodGlow = mixHex(woodBase, glowHex, light ? 0.32 : 0.22);
  const woodShadow = mixHex(woodBase, pageHex, light ? 0.52 : 0.62);
  const styleLayer = style === 'ink'
    ? `${inkPools(w, h, light)}<rect width="${w}" height="${h}" fill="${art.b2}" opacity="${light ? 0.035 : 0.05}" filter="url(#ink-texture)"/>`
    : style === 'wood'
      ? `<rect width="${w}" height="${h}" fill="${woodBase}" opacity="${light ? 0.27 : 0.38}" filter="url(#wood-texture)"/><g filter="url(#wood-soft)">${woodGrain(w, h, woodShadow, woodGlow)}</g>`
      : `<rect width="${w}" height="${h}" fill="${paperBase}" opacity="${light ? 0.2 : 0.34}"/><g filter="url(#paper-soft)">${paperFibers(w, h, paperFiber, paperShadow)}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin slice">
<defs>
<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${art.sky}"/><stop offset=".58" stop-color="${page}" stop-opacity=".86"/><stop offset="1" stop-color="${page}"/></linearGradient>
<linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${art.b1}" stop-opacity="${washOpacity}"/><stop offset=".52" stop-color="${art.b2}" stop-opacity="${(washOpacity * 0.55).toFixed(3)}"/><stop offset="1" stop-color="${art.b3}" stop-opacity="${(washOpacity * 0.25).toFixed(3)}"/></linearGradient>
${style === 'ink' ? '<filter id="ink-texture" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".018 .07" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .7 0"/></filter><filter id="ink-bleed" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".012 .024" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="28"/><feGaussianBlur stdDeviation="2.5"/></filter>' : ''}
${style === 'wood' ? '<filter id="wood-texture" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".025 .22" numOctaves="2" stitchTiles="stitch" result="noise"/><feColorMatrix in="noise" result="grain" values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .5 0"/><feBlend in="SourceGraphic" in2="grain" mode="multiply"/></filter><filter id="wood-soft" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="1.5"/></filter>' : ''}
${style === 'paper' ? '<filter id="paper-soft" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="0.35"/></filter>' : ''}
<radialGradient id="pool" cx="${x}" cy="${y}" r="${Math.round(Math.max(w, h) * 0.68)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${art.glow}" stop-opacity="${poolOpacity.toFixed(3)}"/><stop offset=".45" stop-color="${art.glow}" stop-opacity="${(poolOpacity * 0.42).toFixed(3)}"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="${wide ? 34 : 22}"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .75 0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#base)"/>
<rect width="${w}" height="${h}" fill="url(#wash)"/>
<rect width="${w}" height="${h}" fill="url(#pool)"/>
${styleLayer}
<rect width="${w}" height="${h}" filter="url(#grain)" opacity="${grainOpacity}"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
}

/** Backwards-compatible name for callers that want the default paper treatment. */
export function materialWallpaperSvg(art: WallArt, page: string, light: boolean, wide = false, lamp?: WallLamp): string {
  return wallpaperStyleSvg(art, page, light, wide, lamp, 'paper');
}

/** The matching foot for the selected material wall, fading softly into the page. */
export function materialFootSvg(art: WallArt, page: string, light: boolean, wide = false, style: WallStyle = 'paper'): string {
  const w = wide ? 2400 : 1200;
  const h = 1000;
  const styleLayer = style === 'ink'
    ? `<ellipse cx="${Math.round(w * 0.42)}" cy="${Math.round(h * 0.48)}" rx="${Math.round(w * 0.6)}" ry="${Math.round(h * 0.42)}" fill="${art.b1}" opacity="${light ? 0.12 : 0.16}" filter="url(#soft)"/>`
    : style === 'wood'
      ? `<ellipse cx="${Math.round(w * 0.62)}" cy="${Math.round(h * 0.64)}" rx="${Math.round(w * 0.7)}" ry="${Math.round(h * 0.4)}" fill="${light ? '#bca27f' : '#8f6e4d'}" opacity="${light ? 0.12 : 0.16}" filter="url(#soft)"/>`
      : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice">
<defs>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${page}" stop-opacity="0"/><stop offset=".45" stop-color="${page}" stop-opacity="${light ? 0.28 : 0.5}"/><stop offset="1" stop-color="${page}"/></linearGradient>
<radialGradient id="pool" cx="${Math.round(w * 0.78)}" cy="${h}" r="${Math.round(w * 0.72)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${art.b2}" stop-opacity="${light ? 0.24 : 0.32}"/><stop offset="1" stop-color="${art.b2}" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="${wide ? 34 : 22}"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#pool)"/>
<rect width="${w}" height="${h}" fill="url(#fade)"/>
${styleLayer}
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
