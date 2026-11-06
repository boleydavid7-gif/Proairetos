import type { BackgroundId } from '../core/look/lamplight';

type SceneId = Exclude<BackgroundId, 'lamplight'>;
type Mode = 'dark' | 'light';

type Palette = {
  sky: string;
  horizon: string;
  base: string;
  glow: string;
  far: string;
  near: string;
  accent: string;
  detail: string;
};

const palettes: Record<SceneId, Record<Mode, Palette>> = {
  dawn: {
    dark: { sky: '#26394B', horizon: '#B77F73', base: '#122131', glow: '#E7A98C', far: '#354B5B', near: '#182D3D', accent: '#F0BD9B', detail: '#A5B8C0' },
    light: { sky: '#DCE8EB', horizon: '#F0D0BC', base: '#F3F0EA', glow: '#F3C6A8', far: '#A9C1C5', near: '#78959E', accent: '#D79C82', detail: '#F8E7D9' },
  },
  twilight: {
    dark: { sky: '#171D39', horizon: '#62577E', base: '#10192B', glow: '#A27EAA', far: '#343957', near: '#1B2942', accent: '#D0A1B4', detail: '#8991B6' },
    light: { sky: '#E4E5F0', horizon: '#D5C8E1', base: '#F1F0F5', glow: '#C7A9D0', far: '#B5B5D0', near: '#858CA9', accent: '#A88CB7', detail: '#F4DCE1' },
  },
  night: {
    dark: { sky: '#071321', horizon: '#152B43', base: '#091522', glow: '#294B68', far: '#1A3047', near: '#0D2032', accent: '#8AB9C9', detail: '#B7D1D9' },
    light: { sky: '#E4EBF0', horizon: '#C9D8E2', base: '#F1F4F5', glow: '#B6CDD9', far: '#B5C7D0', near: '#8299A8', accent: '#6E9CAD', detail: '#FFFFFF' },
  },
  forest: {
    dark: { sky: '#0C252D', horizon: '#37616A', base: '#0B1B25', glow: '#5F9292', far: '#31565D', near: '#102D36', accent: '#80B0A8', detail: '#A4C2B8' },
    light: { sky: '#DDEAE7', horizon: '#BBD4CE', base: '#F0F4F0', glow: '#A9CFC4', far: '#9BBEB6', near: '#688F88', accent: '#4F8D83', detail: '#EAF3EC' },
  },
  mountains: {
    dark: { sky: '#17283D', horizon: '#71899A', base: '#0E1B2B', glow: '#E0AD91', far: '#415B72', near: '#1A3046', accent: '#E8C5AE', detail: '#D6E1E2' },
    light: { sky: '#E5EDF0', horizon: '#D7DDE0', base: '#F2F4F2', glow: '#F0C6A9', far: '#AFC2CB', near: '#7D99A8', accent: '#D49B82', detail: '#FFFFFF' },
  },
  ocean: {
    dark: { sky: '#071C31', horizon: '#07516A', base: '#071A2B', glow: '#1387A0', far: '#0A4059', near: '#08283F', accent: '#45B8C5', detail: '#82D1D4' },
    light: { sky: '#E1EEF0', horizon: '#B9DCE0', base: '#F0F5F3', glow: '#A5D7DA', far: '#8FC6CE', near: '#4E98A9', accent: '#248F9E', detail: '#D7EFF0' },
  },
  lake: {
    dark: { sky: '#14283B', horizon: '#6B8793', base: '#0B1B2A', glow: '#D9B49A', far: '#415E70', near: '#17354A', accent: '#85B5BD', detail: '#B7D1D5' },
    light: { sky: '#E4EEF0', horizon: '#D8E4E4', base: '#F2F5F1', glow: '#F0D0B8', far: '#9FBCC5', near: '#6E9CAA', accent: '#478F9D', detail: '#FFFFFF' },
  },
  desert: {
    dark: { sky: '#332721', horizon: '#A16C53', base: '#1B1B20', glow: '#E4A875', far: '#8A5A47', near: '#3A2B2A', accent: '#D99B6E', detail: '#E7C19C' },
    light: { sky: '#F2E6D8', horizon: '#EBC9A9', base: '#F4F0E9', glow: '#E9B88D', far: '#D6A985', near: '#B77F61', accent: '#A96C50', detail: '#F8E4CD' },
  },
  stone: {
    dark: { sky: '#17212D', horizon: '#3C4C5C', base: '#101821', glow: '#71808B', far: '#344452', near: '#202D39', accent: '#899AA4', detail: '#B6C0C4' },
    light: { sky: '#E9EDEF', horizon: '#D1D9DC', base: '#F2F4F3', glow: '#CBD4D7', far: '#B6C2C6', near: '#87979E', accent: '#758890', detail: '#FFFFFF' },
  },
  aurora: {
    dark: { sky: '#071824', horizon: '#0D3944', base: '#081925', glow: '#138C7B', far: '#123D49', near: '#0B2835', accent: '#53C7A8', detail: '#9BDAC7' },
    light: { sky: '#E4EFED', horizon: '#C2DCD5', base: '#F1F5F1', glow: '#A5D8C5', far: '#9BC5B9', near: '#5E9C91', accent: '#278E78', detail: '#E8F5EB' },
  },
  ember: {
    dark: { sky: '#281C1D', horizon: '#8B493D', base: '#17191F', glow: '#D77D50', far: '#6E3C38', near: '#32262A', accent: '#E69A65', detail: '#EBC2A0' },
    light: { sky: '#F1E5DF', horizon: '#E7C4B4', base: '#F4F0EB', glow: '#E9B08F', far: '#C99179', near: '#9E6859', accent: '#B96E51', detail: '#F8E5D7' },
  },
};

const fir = (x: number, y: number, scale: number, fill: string) =>
  '<path d="M0 -190 L-58 -84 H-29 L-82 0 H-42 L-101 88 H101 L42 0 H82 L29 -84 H58 Z" fill="' + fill + '" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"/>';

function sceneShapes(id: SceneId, p: Palette): string {
  switch (id) {
    case 'dawn':
      return '<circle cx="880" cy="600" r="300" fill="url(#glow)" opacity=".9"/>' +
        '<path d="M0 910 C220 800 390 830 590 760 S960 690 1200 790 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1100 C240 930 430 1010 640 910 S980 850 1200 960 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 1290 C250 1160 490 1210 710 1100 S1030 1060 1200 1130 V1600 H0Z" fill="' + p.base + '"/>';
    case 'twilight':
      return '<ellipse cx="870" cy="610" rx="430" ry="250" fill="url(#glow)" opacity=".72"/>' +
        '<path d="M0 860 C250 800 390 900 620 830 S980 740 1200 830 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1040 C220 950 430 1030 670 950 S1000 900 1200 980 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 1280 C270 1170 470 1230 710 1140 S1010 1110 1200 1180 V1600 H0Z" fill="' + p.base + '"/>' +
        '<path d="M160 540 C330 500 420 520 570 490" fill="none" stroke="' + p.detail + '" stroke-opacity=".14" stroke-width="7" stroke-linecap="round"/>';
    case 'night':
      return '<g fill="' + p.detail + '" opacity=".62"><circle cx="150" cy="270" r="3"/><circle cx="350" cy="190" r="2"/><circle cx="540" cy="330" r="2.5"/><circle cx="760" cy="210" r="2"/><circle cx="1010" cy="300" r="3"/><circle cx="890" cy="470" r="2"/><circle cx="240" cy="500" r="2"/><circle cx="620" cy="120" r="2.5"/><circle cx="1080" cy="150" r="2"/></g>' +
        '<path d="M0 1010 C230 910 420 950 620 900 S970 840 1200 930 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1210 C220 1120 430 1160 670 1080 S1000 1060 1200 1120 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 1390 C280 1290 470 1340 720 1260 S1000 1250 1200 1310 V1600 H0Z" fill="' + p.base + '"/>';
    case 'forest':
      return '<path d="M0 880 C220 720 420 820 620 700 S980 650 1200 760 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1060 C210 900 420 960 650 850 S1000 850 1200 940 V1600 H0Z" fill="' + p.near + '"/>' +
        fir(85, 1230, .9, p.base) + fir(230, 1290, 1.1, p.base) + fir(395, 1260, .82, p.base) +
        fir(850, 1280, .95, p.base) + fir(1030, 1310, 1.15, p.base) + fir(1160, 1250, .78, p.base) +
        '<path d="M0 1430 C270 1340 490 1400 720 1330 S1030 1350 1200 1390 V1600 H0Z" fill="' + p.base + '"/>';
    case 'mountains':
      return '<path d="M0 1010 L190 770 L310 900 L520 560 L760 910 L900 700 L1200 1030 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M410 690 L520 560 L650 720 L585 680 L540 700 L510 650 L480 700Z" fill="' + p.detail + '" opacity=".9"/>' +
        '<path d="M0 1120 L250 850 L420 1040 L690 690 L900 1010 L1040 820 L1200 1050 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M575 830 L690 690 L790 840 L730 800 L690 815 L660 775 L635 820Z" fill="' + p.detail + '" opacity=".8"/>' +
        '<path d="M0 1330 C280 1240 480 1300 720 1210 S1030 1220 1200 1280 V1600 H0Z" fill="' + p.base + '"/>';
    case 'ocean':
      return '<path d="M0 850 C180 790 340 820 520 870 S900 950 1200 850 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1000 C180 900 340 940 520 1010 S920 1100 1200 960 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 1180 C210 1080 380 1110 570 1180 S960 1260 1200 1120 V1600 H0Z" fill="' + p.far + '" opacity=".7"/>' +
        '<path d="M-20 1010 C220 930 360 980 560 1030 S930 1100 1220 1000" fill="none" stroke="' + p.accent + '" stroke-opacity=".55" stroke-width="8"/>' +
        '<path d="M0 1320 C250 1240 430 1280 650 1340 S980 1380 1200 1300" fill="none" stroke="' + p.detail + '" stroke-opacity=".22" stroke-width="5"/>';
    case 'lake':
      return '<path d="M0 850 L210 670 L360 800 L540 590 L760 820 L920 690 L1200 870 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M430 700 L540 590 L650 720 L590 685 L550 690 L520 650 L495 690Z" fill="' + p.detail + '" opacity=".85"/>' +
        '<path d="M0 920 C250 900 440 930 620 910 S980 900 1200 920 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 930 C220 970 420 960 600 950 S990 970 1200 930 V1600 H0Z" fill="' + p.far + '" opacity=".38"/>' +
        '<g stroke="' + p.detail + '" stroke-opacity=".24" stroke-width="5"><path d="M180 1050 H1020"/><path d="M310 1130 H900"/><path d="M120 1230 H1080"/><path d="M400 1330 H830"/></g>';
    case 'desert':
      return '<circle cx="850" cy="630" r="290" fill="url(#glow)" opacity=".9"/>' +
        '<path d="M0 1010 C220 830 460 850 640 970 S990 1080 1200 900 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1120 C250 980 430 1000 650 1110 S1010 1200 1200 1060 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 1370 C260 1200 460 1230 700 1350 S1010 1400 1200 1280 V1600 H0Z" fill="' + p.base + '"/>' +
        '<path d="M220 1100 C390 1010 510 1030 650 1100" fill="none" stroke="' + p.accent + '" stroke-opacity=".25" stroke-width="6"/>';
    case 'stone':
      return '<path d="M-80 500 L360 250 L690 430 L1280 120 L1280 700 L760 880 L310 760 L-80 1040Z" fill="' + p.far + '"/>' +
        '<path d="M-80 830 L300 620 L650 780 L1280 520 L1280 1110 L790 1240 L330 1110 L-80 1360Z" fill="' + p.near + '"/>' +
        '<path d="M-80 1180 L360 1000 L700 1130 L1280 900 L1280 1600 L-80 1600Z" fill="' + p.base + '"/>' +
        '<path d="M-40 510 L360 270 L690 450" fill="none" stroke="' + p.detail + '" stroke-opacity=".24" stroke-width="7"/>' +
        '<path d="M-20 850 L300 650 L650 800 L1220 560" fill="none" stroke="' + p.detail + '" stroke-opacity=".16" stroke-width="6"/>';
    case 'aurora':
      return '<path d="M-80 500 C180 220 420 280 610 500 S960 770 1280 350" fill="none" stroke="' + p.accent + '" stroke-opacity=".26" stroke-width="150" stroke-linecap="round"/>' +
        '<path d="M-80 540 C180 260 420 320 610 540 S960 810 1280 390" fill="none" stroke="' + p.detail + '" stroke-opacity=".25" stroke-width="42" stroke-linecap="round"/>' +
        '<path d="M-80 700 C180 440 430 450 630 650 S990 900 1280 610" fill="none" stroke="' + p.accent + '" stroke-opacity=".18" stroke-width="90" stroke-linecap="round"/>' +
        '<path d="M0 1040 C240 950 420 990 640 920 S1000 930 1200 1000 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1260 C260 1150 450 1200 700 1120 S1020 1140 1200 1190 V1600 H0Z" fill="' + p.base + '"/>';
    case 'ember':
      return '<circle cx="900" cy="610" r="320" fill="url(#glow)" opacity=".88"/>' +
        '<path d="M0 930 C210 810 410 840 620 900 S990 940 1200 820 V1600 H0Z" fill="' + p.far + '"/>' +
        '<path d="M0 1110 C230 970 430 1000 660 1080 S1000 1130 1200 1000 V1600 H0Z" fill="' + p.near + '"/>' +
        '<path d="M0 1360 C240 1230 470 1260 700 1340 S1010 1370 1200 1270 V1600 H0Z" fill="' + p.base + '"/>' +
        '<g fill="' + p.accent + '" opacity=".52"><circle cx="210" cy="760" r="4"/><circle cx="390" cy="680" r="3"/><circle cx="1040" cy="780" r="4"/><circle cx="760" cy="720" r="2.5"/></g>';
  }
  return '';
}

const cache = new Map<string, string>();

/** A quiet, locally drawn scene. No remote request, animation, canvas, filter or external image asset. */
export function backgroundOf(background: SceneId, mode: Mode, pageColor?: string): string {
  const p = palettes[background][mode];
  const page = pageColor ?? p.base;
  const key = background + ':' + mode + ':' + page;
  const existing = cache.get(key);
  if (existing) return existing;

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" preserveAspectRatio="xMidYMin slice">' +
    '<defs>' +
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.sky + '"/><stop offset=".58" stop-color="' + p.horizon + '"/><stop offset="1" stop-color="' + p.base + '"/></linearGradient>' +
    '<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + p.glow + '" stop-opacity=".66"/><stop offset=".48" stop-color="' + p.glow + '" stop-opacity=".2"/><stop offset="1" stop-color="' + p.glow + '" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".42" stop-color="' + page + '" stop-opacity="0"/><stop offset="1" stop-color="' + page + '" stop-opacity="1"/></linearGradient>' +
    '</defs>' +
    '<rect width="1200" height="1600" fill="url(#sky)"/>' +
    '<ellipse cx="850" cy="520" rx="540" ry="430" fill="url(#glow)"/>' +
    sceneShapes(background, p) +
    '<rect width="1200" height="1600" fill="url(#fade)"/>' +
    '</svg>';

  const value = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  if (cache.size >= 32) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

/** The Today hero fades into the same solid page surface; the wallpaper itself remains behind it. */
export function backgroundFootOf(): string {
  return 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)';
}
