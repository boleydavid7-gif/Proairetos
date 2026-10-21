/*
 * The family's icons as one system: a 1024 canvas, a tile in the app's own color lit by Lamplight's lamp from the upper right, and one solid
 * glyph in warm white with a tinted second layer. Every glyph keeps inside the central circle a maskable crop keeps
 * (radius 410) and sits on the same keylines: about 560 across for round shapes, 500 for square ones.
 */

export const WHITE = '#fbf6ec';

const hex = (c) => c.match(/\w\w/g).map((h) => parseInt(h, 16));
const out = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** Mix color a toward b by t (0..1). */
export const mix = (a, b, t) => out(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));

const sprig = (x, y, s, leaf, stem) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C0 -60 6 -120 0 -190" stroke="${stem}" stroke-width="16" stroke-linecap="round" fill="none"/>
    <path d="M0 -70 C-70 -70 -120 -110 -130 -170 C-70 -170 -14 -140 0 -70Z" fill="${leaf}"/>
    <path d="M2 -120 C70 -120 120 -160 128 -222 C66 -222 14 -192 2 -120Z" fill="${leaf}"/>
  </g>`;

/** Each app: tile color, and its glyph drawn from (white, tint, deep). */
export const APPS = {
  proairetos: {
    tile: '#18202b',
    glyph: () => {
      const light = '#f2d7a5', mid = '#d2a868', dark = '#a77c45';
      const point = (angle, length, width, a, b) => `
        <g transform="rotate(${angle} 512 512)">
          <path d="M512 ${512 - length} L512 512 L${512 - width} ${512 - width}Z" fill="${a}"/>
          <path d="M512 ${512 - length} L${512 + width} ${512 - width} L512 512Z" fill="${b}"/>
        </g>`;
      return `
        <circle cx="512" cy="512" r="318" fill="none" stroke="${mid}" stroke-width="14" opacity=".55"/>
        ${[45, 135, 225, 315].map((a) => point(a, 200, 44, dark, mid)).join('')}
        ${[0, 90, 180, 270].map((a) => point(a, 330, 62, mid, light)).join('')}
        <circle cx="512" cy="512" r="22" fill="${light}"/>`;
    },
  },
  askesis: {
    tile: '#167a64',
    glyph: (w, tint) => `
      <circle cx="636" cy="356" r="92" fill="#ffe0a0"/>
      <path d="M200 740 L430 330 L536 500 L600 404 L824 740Z" fill="${w}"/>
      <path d="M430 330 L488 424 L458 410 L430 444 L404 410 L374 428Z" fill="${tint}"/>
      <path d="M600 404 L640 466 L616 456 L598 476 L582 458 L566 456Z" fill="${tint}"/>`,
  },
  soma: {
    tile: '#f1e7d6',
    scale: 1.08,
    light: true,
    glyph: () => `
      ${sprig(560, 520, 1.15, '#5d8a55', '#4a7244')}
      <path d="M268 520 H756 C756 650 650 760 512 760 C374 760 268 650 268 520Z" fill="#c4643c"/>
      <path d="M268 520 H756 C756 548 750 574 740 598 H284 C274 574 268 548 268 520Z" fill="#a8502d"/>
      <rect x="248" y="500" width="528" height="40" rx="20" fill="#d9784e"/>`,
  },
  oikonomia: {
    tile: '#b9821f',
    glyph: (w, tint, deep) => {
      const coin = (y) => `
        <path d="M292 ${y} v70 a220 70 0 0 0 440 0 v-70Z" fill="${tint}"/>
        <ellipse cx="512" cy="${y}" rx="220" ry="70" fill="${w}"/>
        <ellipse cx="512" cy="${y}" rx="150" ry="44" fill="none" stroke="${deep}" stroke-width="12" opacity=".35"/>`;
      return coin(620) + coin(510) + coin(400);
    },
  },
  hydros: {
    tile: '#1f86cf',
    glyph: (w, tint) => `
      <path d="M512 230 C512 230 300 470 300 610 A212 212 0 0 0 724 610 C724 470 512 230 512 230Z" fill="${w}"/>
      <path d="M396 600 C396 660 430 712 486 734" stroke="${tint}" stroke-width="34" stroke-linecap="round" fill="none"/>`,
  },
  praxis: {
    tile: '#b3343f',
    glyph: (w, tint) => `
      <rect x="312" y="236" width="400" height="56" rx="28" fill="${w}"/>
      <rect x="312" y="732" width="400" height="56" rx="28" fill="${w}"/>
      <path d="M352 292 H672 C672 400 560 450 540 512 C560 574 672 624 672 732 H352 C352 624 464 574 484 512 C464 450 352 400 352 292Z" fill="${w}" opacity=".32"/>
      <path d="M410 360 H614 C600 420 540 450 512 490 C484 450 424 420 410 360Z" fill="${w}"/>
      <path d="M512 520 C540 600 640 640 652 712 H372 C384 640 484 600 512 520Z" fill="${tint}"/>`,
  },
  theoria: {
    tile: '#6a2c59',
    glyph: (w, tint) => `
      <path d="M512 330 C440 280 330 268 236 290 V716 C330 694 440 706 512 756Z" fill="${w}"/>
      <path d="M512 330 C584 280 694 268 788 290 V716 C694 694 584 706 512 756Z" fill="${tint}"/>
      <path d="M640 286 V430 L672 404 L704 430 V278Z" fill="#f0c36e"/>`,
  },
  diaita: {
    tile: '#3b3080',
    glyph: (w) => `
      <path d="M600 248 A272 272 0 1 0 760 640 A220 220 0 1 1 600 248Z" fill="#f2cf86"/>
      <path d="M700 300 l16 44 44 16 -44 16 -16 44 -16 -44 -44 -16 44 -16Z" fill="${w}"/>
      <path d="M760 470 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10Z" fill="${w}" opacity=".8"/>`,
  },
  philia: {
    tile: '#d8644f',
    glyph: (w, tint, deep) => `
      <defs><clipPath id="left"><circle cx="420" cy="512" r="196"/></clipPath></defs>
      <circle cx="420" cy="512" r="196" fill="${w}"/>
      <circle cx="604" cy="512" r="196" fill="${tint}"/>
      <circle cx="604" cy="512" r="196" fill="${mix(deep, '#ffffff', 0.25)}" clip-path="url(#left)"/>`,
  },
  ergon: {
    tile: '#647f5c',
    glyph: (w, tint, deep) => `
      <path d="M512 236 L792 486 H732 V770 H292 V486 H232Z" fill="${w}" stroke="${w}" stroke-width="20" stroke-linejoin="round"/>
      <path d="M404 584 L486 664 L630 504" stroke="${deep}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  therapeia: {
    tile: '#4c6cc0',
    scale: 1.3,
    glyph: (w, tint) => `
      <g transform="rotate(-45 512 512)">
        <path d="M512 404 H402 A108 108 0 0 0 402 620 H512Z" fill="${w}"/>
        <path d="M512 404 H622 A108 108 0 0 1 622 620 H512Z" fill="${tint}"/>
        <rect x="360" y="440" width="120" height="24" rx="12" fill="#ffffff" opacity=".9"/>
      </g>`,
  },
  dynamis: {
    tile: '#de762a',
    glyph: (w, tint) => `
      <path d="M392 470 V380 A120 120 0 0 1 632 380 V470" stroke="${w}" stroke-width="64" fill="none"/>
      <circle cx="512" cy="596" r="200" fill="${w}"/>
      <rect x="370" y="760" width="284" height="36" rx="18" fill="${w}"/>
      <path d="M418 560 A110 110 0 0 1 512 486" stroke="${tint}" stroke-width="30" stroke-linecap="round" fill="none"/>`,
  },
  ktema: {
    tile: '#7b5236',
    scale: 1.08,
    glyph: (w, tint, deep) => `
      <path d="M512 262 L756 384 L512 506 L268 384Z" fill="${w}"/>
      <path d="M268 384 L512 506 V778 L268 656Z" fill="${tint}"/>
      <path d="M756 384 L512 506 V778 L756 656Z" fill="${mix(tint, deep, 0.35)}"/>
      <path d="M390 323 L634 445 V520 L590 500 V466 L346 344Z" fill="${deep}" opacity=".35"/>`,
  },
  phyton: {
    tile: '#3a934b',
    glyph: (w, tint) => `
      <path d="M512 560 C512 500 506 440 512 380" stroke="${w}" stroke-width="26" stroke-linecap="round" fill="none"/>
      <path d="M510 470 C420 474 336 420 320 330 C410 326 494 380 510 470Z" fill="${tint}"/>
      <path d="M514 420 C606 420 690 370 708 270 C612 270 528 330 514 420Z" fill="${w}"/>
      <path d="M318 560 H706 L664 790 H360Z" fill="${w}"/>
      <rect x="296" y="540" width="432" height="64" rx="22" fill="${w}"/>
      <rect x="320" y="604" width="384" height="22" fill="${tint}" opacity=".6"/>`,
  },
  poreia: {
    tile: '#0f6f78',
    glyph: (w, tint, deep) => `
      <circle cx="512" cy="512" r="262" stroke="${tint}" stroke-width="40" fill="none"/>
      <g transform="rotate(45 512 512)">
        <path d="M512 214 C542 214 556 250 556 284 V440 L800 572 V630 L556 566 V680 L660 742 V786 L512 750 L364 786 V742 L468 680 V566 L224 630 V572 L468 440 V284 C468 250 482 214 512 214Z" fill="${w}" stroke="${deep}" stroke-width="22" paint-order="stroke"/>
      </g>`,
  },
};

const RADIUS = 229; // the iPhone corner (22.37 %), for the rounded versions

/** One icon as SVG. shape: 'square' (full bleed, iPhone and maskable) or 'rounded' (browser tab, computer). */
export function iconSvg(name, shape = 'square') {
  const app = APPS[name];
  const top = mix(app.tile, '#ffffff', app.light ? 0.25 : 0.1);
  const bottom = mix(app.tile, '#000000', app.light ? 0.04 : 0.14);
  const tint = mix(app.tile, '#ffffff', 0.55);
  const deep = mix(app.tile, '#000000', 0.25);
  const rx = shape === 'rounded' ? RADIUS : 0;
  // Lamplight: the tile is lit by one lamp toward the upper right, where the wallpaper keeps it, with one faint
  // ring of its light; the symbol's shadow falls away from it, down and to the left.
  const lamp = mix(app.tile, '#fff1d6', 0.8);
  const glow = app.light ? 0.5 : 0.42;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="tile" x1="1" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="light" cx="770" cy="170" r="720" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${lamp}" stop-opacity="${glow}"/><stop offset=".28" stop-color="${lamp}" stop-opacity="${glow * 0.38}"/><stop offset="1" stop-color="${lamp}" stop-opacity="0"/></radialGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="-10" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="${app.light ? 0.12 : 0.24}"/></filter>
    <clipPath id="clip"><rect width="1024" height="1024" rx="${rx}"/></clipPath>
  </defs>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#tile)"/>
  <g clip-path="url(#clip)">
    <rect width="1024" height="1024" fill="url(#light)"/>
    <circle cx="770" cy="170" r="250" fill="none" stroke="${lamp}" stroke-opacity="${app.light ? 0.16 : 0.1}" stroke-width="6"/>
  </g>
  <g filter="url(#lift)"><g transform="translate(512 512) scale(${app.scale ?? 1}) translate(-512 -512)">${app.glyph(WHITE, tint, deep)}</g></g>
</svg>`.replace(/id="(\w+)"/g, `id="${name}-$1"`).replace(/url\(#(\w+)\)/g, `url(#${name}-$1)`);
}
