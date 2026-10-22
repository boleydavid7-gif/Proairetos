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

const PLANE = 'M512 196 C544 196 560 234 560 270 V436 L816 574 V638 L560 570 V690 L668 754 V800 L512 762 L356 800 V754 L464 690 V570 L208 638 V574 L464 436 V270 C464 234 480 196 512 196Z';

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
        <circle cx="512" cy="512" r="336" fill="none" stroke="${mid}" stroke-width="18" opacity=".6"/>
        ${[45, 135, 225, 315].map((a) => point(a, 230, 52, dark, mid)).join('')}
        ${[0, 90, 180, 270].map((a) => point(a, 372, 74, mid, light)).join('')}
        <circle cx="512" cy="512" r="26" fill="${light}"/>`;
    },
  },
  askesis: {
    tile: '#167a64',
    scale: 1.08,
    glyph: (w, tint) => `
      <circle cx="636" cy="356" r="92" fill="#ffe0a0"/>
      <path d="M200 740 L430 330 L536 500 L600 404 L824 740Z" fill="${w}"/>
      <path d="M430 330 L488 424 L458 410 L430 444 L404 410 L374 428Z" fill="${tint}"/>
      <path d="M600 404 L640 466 L616 456 L598 476 L582 458 L566 456Z" fill="${tint}"/>`,
  },
  soma: {
    tile: '#f1e7d6',
    light: true,
    glyph: () => `
      ${[404, 512, 620].map((x, i) => `<path d="M${x} ${i === 1 ? 190 : 230} c-52 60 52 110 0 170 s36 70 0 110" stroke="#d9a383" stroke-width="46" stroke-linecap="round" fill="none"/>`).join('')}
      <path d="M200 548 H824 C824 712 684 836 512 836 C340 836 200 712 200 548Z" fill="#c4643c"/>
      <path d="M200 548 H824 C824 584 818 616 806 646 H218 C206 616 200 584 200 548Z" fill="#a8502d"/>
      <rect x="176" y="518" width="672" height="56" rx="28" fill="#de8156"/>`,
  },
  oikonomia: {
    tile: '#b9821f',
    glyph: (w, tint, deep) => {
      const coin = (y) => `
        <path d="M256 ${y} v84 a256 84 0 0 0 512 0 v-84Z" fill="${tint}"/>
        <ellipse cx="512" cy="${y}" rx="256" ry="84" fill="${w}"/>
        <ellipse cx="512" cy="${y}" rx="176" ry="54" fill="none" stroke="${deep}" stroke-width="14" opacity=".3"/>`;
      return coin(668) + coin(530) + coin(392);
    },
  },
  hydros: {
    tile: '#1f86cf',
    glyph: (w, tint) => `
      <path d="M512 196 C512 196 278 456 278 614 A234 234 0 0 0 746 614 C746 456 512 196 512 196Z" fill="${w}"/>
      <path d="M380 612 C380 682 422 738 488 756" stroke="${tint}" stroke-width="44" stroke-linecap="round" fill="none"/>`,
  },
  praxis: {
    tile: '#b3343f',
    scale: 1.1,
    glyph: (w, tint) => `
      <rect x="312" y="236" width="400" height="56" rx="28" fill="${w}"/>
      <rect x="312" y="732" width="400" height="56" rx="28" fill="${w}"/>
      <path d="M352 292 H672 C672 400 560 450 540 512 C560 574 672 624 672 732 H352 C352 624 464 574 484 512 C464 450 352 400 352 292Z" fill="${w}" opacity=".32"/>
      <path d="M410 360 H614 C600 420 540 450 512 490 C484 450 424 420 410 360Z" fill="${w}"/>
      <rect x="502" y="486" width="20" height="120" rx="10" fill="${tint}"/>
      <path d="M512 590 C556 620 640 650 652 712 H372 C384 650 468 620 512 590Z" fill="${tint}"/>`,
  },
  theoria: {
    tile: '#6a2c59',
    scale: 1.1,
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
      <defs><clipPath id="left"><circle cx="404" cy="512" r="216"/></clipPath></defs>
      <circle cx="620" cy="512" r="216" fill="${tint}"/>
      <circle cx="404" cy="512" r="216" fill="${w}"/>
      <circle cx="620" cy="512" r="216" fill="${mix(tint, deep, 0.3)}" clip-path="url(#left)"/>`,
  },
  ergon: {
    tile: '#647f5c',
    glyph: (w, tint, deep) => `
      <path d="M512 236 L792 486 H732 V770 H292 V486 H232Z" fill="${w}" stroke="${w}" stroke-width="20" stroke-linejoin="round"/>
      <path d="M404 584 L486 664 L630 504" stroke="${deep}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  therapeia: {
    tile: '#4c6cc0',
    glyph: (w, tint) => `
      <g transform="rotate(-45 512 512)">
        <path d="M512 376 H364 A136 136 0 0 0 364 648 H512Z" fill="${w}"/>
        <path d="M512 376 H660 A136 136 0 0 1 660 648 H512Z" fill="${tint}"/>
      </g>`,
  },
  dynamis: {
    tile: '#de762a',
    glyph: (w, tint) => `
      <path d="M374 500 V372 A138 138 0 0 1 650 372 V500" stroke="${w}" stroke-width="76" stroke-linejoin="round" fill="none"/>
      <path d="M332 760 A228 228 0 1 1 692 760 Z" fill="${w}"/>
      <path d="M332 760 H692 A228 228 0 0 0 734 690 H290 A228 228 0 0 0 332 760Z" fill="${tint}"/>`,
  },
  ktema: {
    tile: '#7b5236',
    scale: 1.16,
    glyph: (w, tint, deep) => `
      <path d="M512 262 L756 384 L512 506 L268 384Z" fill="${w}" stroke="${w}" stroke-width="16" stroke-linejoin="round"/>
      <path d="M268 384 L512 506 V778 L268 656Z" fill="${mix(w, tint, 0.45)}" stroke="${mix(w, tint, 0.45)}" stroke-width="16" stroke-linejoin="round"/>
      <path d="M756 384 L512 506 V778 L756 656Z" fill="${tint}" stroke="${tint}" stroke-width="16" stroke-linejoin="round"/>
      <path d="M390 323 L634 445 V530 L590 508 V466 L346 344Z" fill="${deep}" opacity=".4"/>`,
  },
  phyton: {
    tile: '#3a934b',
    scale: 1.1,
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
      <defs><mask id="cut"><rect width="1024" height="1024" fill="white"/><g transform="rotate(45 512 512)"><path d="${PLANE}" fill="black" stroke="black" stroke-width="56" stroke-linejoin="round"/></g></mask></defs>
      <circle cx="512" cy="512" r="300" stroke="${tint}" stroke-width="30" fill="none" mask="url(#cut)"/>
      <g transform="rotate(45 512 512)"><path d="${PLANE}" fill="${w}" stroke="${w}" stroke-width="12" stroke-linejoin="round"/></g>`,
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
  // Lamplight: the tile is lit by one lamp toward the upper right, where the wallpaper keeps it, in one soft wash; the symbol's shadow falls away from it, down and to the left.
  const lamp = mix(app.tile, '#fff1d6', 0.8);
  const glow = app.light ? 0.4 : 0.32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="tile" x1="1" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="light" cx="800" cy="120" r="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${lamp}" stop-opacity="${glow}"/><stop offset=".45" stop-color="${lamp}" stop-opacity="${glow * 0.3}"/><stop offset="1" stop-color="${lamp}" stop-opacity="0"/></radialGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="-10" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="${app.light ? 0.12 : 0.24}"/></filter>
    <clipPath id="clip"><rect width="1024" height="1024" rx="${rx}"/></clipPath>
  </defs>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#tile)"/>
  <g clip-path="url(#clip)">
    <rect width="1024" height="1024" fill="url(#light)"/>
  </g>
  <g filter="url(#lift)"><g transform="translate(512 512) scale(${app.scale ?? 1}) translate(-512 -512)">${app.glyph(WHITE, tint, deep)}</g></g>
</svg>`.replace(/id="(\w+)"/g, `id="${name}-$1"`).replace(/url\(#(\w+)\)/g, `url(#${name}-$1)`);
}
