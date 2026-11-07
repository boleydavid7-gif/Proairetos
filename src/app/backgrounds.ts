import type { BackgroundId } from '../core/look/lamplight';
import dawnDarkMobile from '../assets/backgrounds/dawn-dark-mobile.avif';
import dawnLightMobile from '../assets/backgrounds/dawn-light-mobile.avif';
import dawnDarkDesktop from '../assets/backgrounds/dawn-dark-desktop.avif';
import dawnLightDesktop from '../assets/backgrounds/dawn-light-desktop.avif';
import twilightDarkMobile from '../assets/backgrounds/twilight-dark-mobile.avif';
import twilightLightMobile from '../assets/backgrounds/twilight-light-mobile.avif';
import twilightDarkDesktop from '../assets/backgrounds/twilight-dark-desktop.avif';
import twilightLightDesktop from '../assets/backgrounds/twilight-light-desktop.avif';
import nightDarkMobile from '../assets/backgrounds/night-dark-mobile.avif';
import nightLightMobile from '../assets/backgrounds/night-light-mobile.avif';
import nightDarkDesktop from '../assets/backgrounds/night-dark-desktop.avif';
import nightLightDesktop from '../assets/backgrounds/night-light-desktop.avif';

type SceneId = Exclude<BackgroundId, 'lamplight'>;
type Mode = 'dark' | 'light';

const dawnMobileAssets: Record<Mode, string> = {
  dark: dawnDarkMobile,
  light: dawnLightMobile,
};
const dawnDesktopAssets: Record<Mode, string> = {
  dark: dawnDarkDesktop,
  light: dawnLightDesktop,
};
const twilightMobileAssets: Record<Mode, string> = {
  dark: twilightDarkMobile,
  light: twilightLightMobile,
};
const twilightDesktopAssets: Record<Mode, string> = {
  dark: twilightDarkDesktop,
  light: twilightLightDesktop,
};
const nightMobileAssets: Record<Mode, string> = {
  dark: nightDarkMobile,
  light: nightLightMobile,
};
const nightDesktopAssets: Record<Mode, string> = {
  dark: nightDarkDesktop,
  light: nightLightDesktop,
};

/** Raster wallpaper files must retain their native proportions; vector scenes use the full viewport. */
export function backgroundSizeOf(background: SceneId): 'cover' | '100% 100%' {
  return background === 'dawn' || background === 'twilight' || background === 'night'
    ? 'cover'
    : '100% 100%';
}

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
    dark: { sky: '#081832', horizon: '#C9828D', base: '#10243A', glow: '#F6A58F', far: '#53677E', near: '#263F5B', accent: '#FFD09D', detail: '#655875' },
    light: { sky: '#E2E8F0', horizon: '#E9B8AA', base: '#E6D8D0', glow: '#F5C3A1', far: '#B6B6C5', near: '#8996AA', accent: '#F6D0A6', detail: '#B7A3B6' },
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

const fir = (x: number, y: number, scale: number, fill: string, opacity = 1) =>
  '<path d="M0 -205 C-12 -177 -37 -135 -70 -96 C-48 -101 -31 -91 -22 -77 C-45 -45 -72 -16 -94 19 C-63 9 -39 14 -24 29 C-53 63 -77 95 -99 124 H99 C77 95 53 63 24 29 C39 14 63 9 94 19 C72 -16 45 -45 22 -77 C31 -91 48 -101 70 -96 C37 -135 12 -177 0 -205Z" fill="' + fill + '" opacity="' + opacity + '" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"/>';

function sceneDefs(p: Palette): string {
  return '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + p.sky + '"/><stop offset=".58" stop-color="' + p.horizon + '"/><stop offset="1" stop-color="' + p.base + '"/>' +
    '</linearGradient>' +
    '<linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + p.sky + '"/><stop offset=".34" stop-color="' + p.detail + '"/><stop offset=".58" stop-color="' + p.horizon + '"/><stop offset=".68" stop-color="' + p.glow + '"/><stop offset="1" stop-color="' + p.base + '"/>' +
    '</linearGradient>' +
    '<radialGradient id="glow" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0" stop-color="' + p.glow + '" stop-opacity=".72"/><stop offset=".5" stop-color="' + p.glow + '" stop-opacity=".22"/><stop offset="1" stop-color="' + p.glow + '" stop-opacity="0"/>' +
    '</radialGradient>' +
    '<linearGradient id="ridgeFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.far + '"/><stop offset="1" stop-color="' + p.near + '"/></linearGradient>' +
    '<linearGradient id="ridgeMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.near + '"/><stop offset="1" stop-color="' + p.base + '"/></linearGradient>' +
    '<linearGradient id="ridgeFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.near + '"/><stop offset="1" stop-color="' + p.base + '"/></linearGradient>' +
    '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.horizon + '"/><stop offset=".22" stop-color="' + p.near + '"/><stop offset="1" stop-color="' + p.base + '"/></linearGradient>' +
    '<linearGradient id="reflection" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.accent + '" stop-opacity=".52"/><stop offset=".45" stop-color="' + p.accent + '" stop-opacity=".12"/><stop offset="1" stop-color="' + p.accent + '" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p.far + '"/><stop offset=".52" stop-color="' + p.near + '"/><stop offset="1" stop-color="' + p.base + '"/></linearGradient>';
}

function sceneShapes(id: SceneId, p: Palette): string {
  switch (id) {
    case 'dawn':
      return '<ellipse cx="970" cy="790" rx="500" ry="365" fill="url(#glow)"/>' +
        '<circle cx="970" cy="780" r="168" fill="' + p.accent + '" opacity=".96"/>' +
        '<path d="M0 900 C145 880 210 850 330 875 C445 900 520 935 640 920 C760 905 840 865 940 880 C1055 900 1120 870 1200 860 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1050 C190 980 340 995 500 1040 C650 1085 760 1050 900 1000 C1040 950 1120 980 1200 1010 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1260 C200 1190 390 1195 570 1245 C760 1295 910 1235 1200 1160 V1600 H0Z" fill="url(#ridgeFront)"/>';
    case 'twilight':
      return '<ellipse cx="840" cy="680" rx="490" ry="310" fill="url(#glow)" opacity=".8"/><circle cx="840" cy="690" r="78" fill="' + p.accent + '" opacity=".54"/>' +
        '<path d="M0 900 C210 820 390 860 555 910 C735 965 940 820 1200 855 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1080 C205 970 410 1000 610 1060 C820 1125 1000 980 1200 1015 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1280 C245 1175 455 1195 650 1255 C850 1315 1040 1190 1200 1215 V1600 H0Z" fill="url(#ridgeFront)"/>';
    case 'night':
      return '<g fill="' + p.detail + '" opacity=".78">' +
        '<circle cx="82" cy="155" r="2"/><circle cx="168" cy="285" r="1.6"/><circle cx="250" cy="105" r="2.4"/><circle cx="330" cy="220" r="1.5"/><circle cx="418" cy="145" r="2"/><circle cx="495" cy="330" r="1.6"/>' +
        '<circle cx="575" cy="185" r="2.2"/><circle cx="660" cy="95" r="1.5"/><circle cx="742" cy="270" r="1.8"/><circle cx="825" cy="150" r="2.4"/><circle cx="910" cy="315" r="1.5"/><circle cx="1000" cy="175" r="2"/>' +
        '<circle cx="1090" cy="260" r="1.6"/><circle cx="1150" cy="115" r="2.2"/><circle cx="125" cy="470" r="1.4"/><circle cx="285" cy="405" r="1.8"/><circle cx="455" cy="485" r="1.4"/><circle cx="620" cy="390" r="1.7"/>' +
        '<circle cx="785" cy="485" r="1.4"/><circle cx="955" cy="430" r="1.8"/><circle cx="1115" cy="510" r="1.4"/>' +
        '<circle cx="45" cy="325" r="1.4"/><circle cx="220" cy="230" r="1.5"/><circle cx="365" cy="315" r="1.3"/>' +
        '<circle cx="520" cy="80" r="1.4"/><circle cx="705" cy="175" r="1.3"/><circle cx="875" cy="75" r="1.5"/>' +
        '<circle cx="1045" cy="390" r="1.3"/><circle cx="1170" cy="455" r="1.5"/><circle cx="145" cy="565" r="1.2"/>' +
        '<circle cx="385" cy="555" r="1.3"/><circle cx="565" cy="540" r="1.2"/><circle cx="865" cy="555" r="1.3"/></g>' +
        '<circle cx="930" cy="610" r="44" fill="' + p.detail + '" opacity=".12"/>' +
        '<path d="M0 990 C210 900 390 925 560 970 C760 1025 965 890 1200 930 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1190 C220 1085 420 1110 620 1175 C825 1240 1020 1100 1200 1135 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1390 C245 1285 465 1310 680 1370 C870 1420 1040 1310 1200 1335 V1600 H0Z" fill="url(#ridgeFront)"/>';
    case 'forest':
      return '<path d="M0 900 C190 805 390 825 570 900 C760 980 980 815 1200 875 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1110 C190 1000 400 1035 600 1100 C810 1165 1010 1010 1200 1050 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        fir(38, 1280, .76, p.far, .86) + fir(150, 1250, .9, p.far, .9) + fir(275, 1300, .8, p.far, .84) + fir(410, 1260, .96, p.far, .92) + fir(555, 1305, .78, p.far, .88) + fir(700, 1265, .94, p.far, .92) + fir(850, 1300, .82, p.far, .86) + fir(1000, 1255, .98, p.far, .92) + fir(1155, 1295, .82, p.far, .88) +
        '<path d="M0 1430 C210 1345 420 1370 620 1430 C820 1490 1020 1350 1200 1390 V1600 H0Z" fill="url(#ridgeFront)"/>' +
        fir(82, 1445, 1.12, p.base) + fir(245, 1405, 1.18, p.base) + fir(420, 1450, 1.08, p.base) + fir(600, 1410, 1.2, p.base) + fir(780, 1450, 1.1, p.base) + fir(960, 1405, 1.18, p.base) + fir(1130, 1445, 1.08, p.base);
    case 'mountains':
      return '<ellipse cx="900" cy="600" rx="500" ry="350" fill="url(#glow)" opacity=".9"/>' +
        '<path d="M0 1000 L170 810 C245 730 285 700 350 635 C415 565 460 520 520 570 C610 650 675 820 770 850 C880 885 950 735 1030 720 C1100 705 1150 765 1200 805 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M350 635 C415 565 460 520 520 570 C575 620 625 760 690 815 C620 780 590 720 550 685 C515 655 475 655 440 695 C405 730 380 765 350 790Z" fill="' + p.detail + '" opacity=".82"/>' +
        '<path d="M0 1120 C180 960 310 910 430 925 C560 940 620 1080 770 1070 C930 1060 1000 900 1100 900 C1140 900 1170 925 1200 950 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1335 C235 1200 425 1220 610 1285 C800 1350 990 1195 1200 1245 V1600 H0Z" fill="url(#ridgeFront)"/>';
    case 'ocean':
      return '<path d="M0 880 C180 830 340 850 500 890 C720 945 930 835 1200 870 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 965 C190 905 360 930 540 980 C750 1035 980 920 1200 950 V1600 H0Z" fill="url(#water)"/>' +
        '<path d="M0 1070 C180 1005 370 1040 555 1095 C770 1160 1000 1030 1200 1060 V1600 H0Z" fill="url(#ridgeMid)" opacity=".72"/>' +
        '<path d="M0 1205 C200 1135 390 1170 575 1230 C790 1290 1000 1160 1200 1190 V1600 H0Z" fill="url(#water)"/>' +
        '<path d="M-30 1020 C220 955 370 985 550 1035 C760 1090 990 975 1230 1005" fill="none" stroke="' + p.accent + '" stroke-opacity=".52" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M0 1370 C250 1300 450 1335 650 1390 C850 1445 1040 1325 1200 1350" fill="none" stroke="' + p.detail + '" stroke-opacity=".2" stroke-width="5" stroke-linecap="round"/>';
    case 'lake':
      return '<ellipse cx="870" cy="700" rx="430" ry="260" fill="url(#glow)" opacity=".78"/>' +
        '<path d="M0 960 L155 815 C250 730 330 670 400 690 C475 710 520 820 590 850 C660 880 720 785 800 710 C870 645 930 650 1000 730 C1080 820 1130 875 1200 900 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1030 C210 955 400 965 580 1020 C780 1080 1000 960 1200 1000 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1050 C220 1010 420 1020 600 1050 C790 1080 1000 1010 1200 1035 V1600 H0Z" fill="url(#water)"/>' +
        '<path d="M0 1070 C180 1050 360 1065 520 1080 C720 1100 960 1060 1200 1075 V1600 H0Z" fill="url(#reflection)" opacity=".52"/>' +
        '<path d="M0 1090 C200 1110 380 1125 570 1100 C760 1075 990 1100 1200 1090 V1600 H0Z" fill="url(#water)" opacity=".72"/>' +
        '<path d="M500 1035 C590 1050 660 1050 750 1035 C830 1020 920 1025 1010 1035" fill="none" stroke="' + p.detail + '" stroke-opacity=".52" stroke-width="5" stroke-linecap="round"/>' +
        '<g fill="none" stroke="' + p.detail + '" stroke-linecap="round"><path d="M390 1160 Q600 1175 810 1160" stroke-opacity=".28" stroke-width="5"/><path d="M280 1250 Q600 1270 920 1250" stroke-opacity=".2" stroke-width="4"/><path d="M180 1360 Q600 1380 1020 1360" stroke-opacity=".14" stroke-width="3"/></g>';
    case 'desert':
      return '<ellipse cx="875" cy="690" rx="470" ry="340" fill="url(#glow)"/><circle cx="875" cy="700" r="105" fill="' + p.accent + '" opacity=".76"/>' +
        '<path d="M0 1020 C170 900 350 855 525 900 C690 940 810 1055 970 1015 C1080 990 1140 930 1200 890 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1160 C190 1030 360 1010 530 1050 C720 1095 845 1210 1010 1160 C1090 1135 1150 1080 1200 1050 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1390 C205 1250 390 1250 570 1300 C770 1355 925 1470 1200 1320 V1600 H0Z" fill="url(#ridgeFront)"/>' +
        '<path d="M120 1160 C310 1055 440 1060 600 1110" fill="none" stroke="' + p.accent + '" stroke-opacity=".22" stroke-width="5" stroke-linecap="round"/>';
    case 'stone':
      return '<path d="M-80 760 C110 620 260 555 410 610 C570 670 690 820 850 780 C1010 740 1130 590 1280 560 V1600 H-80Z" fill="url(#stone)"/>' +
        '<path d="M-80 950 C120 820 285 760 440 820 C600 885 735 1030 890 980 C1050 930 1150 800 1280 780 V1600 H-80Z" fill="url(#ridgeFar)"/>' +
        '<path d="M-80 1170 C120 1050 300 1010 470 1065 C640 1120 770 1250 930 1210 C1080 1170 1180 1060 1280 1030 V1600 H-80Z" fill="url(#ridgeMid)"/>' +
        '<path d="M-80 1380 C140 1260 330 1250 510 1300 C710 1355 850 1470 1030 1415 C1140 1380 1210 1320 1280 1300 V1600 H-80Z" fill="url(#ridgeFront)"/>' +
        '<path d="M-20 760 C150 635 290 590 410 640 C565 705 690 845 850 805 C1010 765 1130 620 1220 600" fill="none" stroke="' + p.detail + '" stroke-opacity=".22" stroke-width="5"/>';
    case 'aurora':
      return '<path d="M-100 510 C120 330 320 290 500 405 C690 525 835 565 1010 420 C1100 345 1170 285 1300 270" fill="none" stroke="' + p.accent + '" stroke-opacity=".2" stroke-width="190" stroke-linecap="round"/>' +
        '<path d="M-100 500 C120 320 320 280 500 395 C690 515 835 555 1010 410 C1100 335 1170 275 1300 260" fill="none" stroke="' + p.detail + '" stroke-opacity=".3" stroke-width="42" stroke-linecap="round"/>' +
        '<path d="M-100 690 C130 520 340 470 520 580 C700 690 860 740 1030 610 C1140 530 1200 490 1300 470" fill="none" stroke="' + p.accent + '" stroke-opacity=".16" stroke-width="105" stroke-linecap="round"/>' +
        '<path d="M0 1040 C210 935 420 955 610 1015 C810 1075 1000 940 1200 980 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1280 C230 1165 440 1190 640 1250 C840 1310 1030 1180 1200 1210 V1600 H0Z" fill="url(#ridgeFront)"/>';
    case 'ember':
      return '<ellipse cx="880" cy="730" rx="450" ry="330" fill="url(#glow)"/><circle cx="880" cy="735" r="100" fill="' + p.accent + '" opacity=".68"/>' +
        '<path d="M0 960 C180 850 350 850 520 900 C710 955 890 850 1040 835 C1110 830 1160 850 1200 875 V1600 H0Z" fill="url(#ridgeFar)"/>' +
        '<path d="M0 1140 C190 1015 390 1025 570 1080 C770 1140 980 1030 1200 1065 V1600 H0Z" fill="url(#ridgeMid)"/>' +
        '<path d="M0 1370 C220 1240 420 1265 620 1325 C820 1385 1010 1260 1200 1300 V1600 H0Z" fill="url(#ridgeFront)"/>' +
        '<g fill="' + p.accent + '" opacity=".48"><circle cx="210" cy="760" r="3"/><circle cx="390" cy="680" r="2"/><circle cx="1040" cy="780" r="3"/><circle cx="760" cy="720" r="2"/></g>';
  }
  return '';
}

const previewCache = new Map<string, string>();

// Landscape crops keep the defining parts of each scene inside the 16:9 settings tiles.
const previewTop: Record<SceneId, number> = {
  dawn: 560, twilight: 500, night: 220, forest: 760, mountains: 420,
  ocean: 700, lake: 520, desert: 560, stone: 500, aurora: 180, ember: 540,
};

/** Raster Appearance tiles use their matching mode-specific landscape artwork; vector scenes use a landscape crop. */
export function backgroundPreviewOf(background: SceneId, mode: Mode): string {
  if (background === 'dawn') return 'url("' + dawnDesktopAssets[mode] + '")';
  if (background === 'twilight') return 'url("' + twilightDesktopAssets[mode] + '")';
  if (background === 'night') return 'url("' + nightDesktopAssets[mode] + '")';
  const key = background + ':' + mode;
  const existing = previewCache.get(key);
  if (existing) return existing;

  const p = palettes[background][mode];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ' + previewTop[background] + ' 1200 675" preserveAspectRatio="xMidYMid slice">' +
    '<defs>' + sceneDefs(p) +
    '</defs>' +
    '<rect width="1200" height="1600" fill="url(#sky)"/>' +
    sceneShapes(background, p) +
    '</svg>';
  const value = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  if (previewCache.size >= 24) previewCache.delete(previewCache.keys().next().value as string);
  previewCache.set(key, value);
  return value;
}

const cache = new Map<string, string>();

/** Static local wallpapers: Dawn, Twilight, Night, and Forest use bundled mode- and viewport-specific AVIF artwork. */
export function backgroundOf(background: SceneId, mode: Mode, pageColor?: string): string {
  if (background === 'dawn') {
    const dawnPage = pageColor ?? palettes.dawn[mode].base;
    return 'linear-gradient(180deg, transparent 86%, ' + dawnPage + ' 100%), url("' + dawnMobileAssets[mode] + '")';
  }
  if (background === 'twilight') {
    const twilightPage = pageColor ?? palettes.twilight[mode].base;
    return 'linear-gradient(180deg, transparent 86%, ' + twilightPage + ' 100%), url("' + twilightMobileAssets[mode] + '")';
  }
  if (background === 'night') {
    const nightPage = pageColor ?? palettes.night[mode].base;
    return 'linear-gradient(180deg, transparent 86%, ' + nightPage + ' 100%), url("' + nightMobileAssets[mode] + '")';
  }
  const p = palettes[background][mode];
  const page = pageColor ?? p.base;
  const key = background + ':' + mode + ':' + page;
  const existing = cache.get(key);
  if (existing) return existing;

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" preserveAspectRatio="xMidYMin slice">' +
    '<defs>' + sceneDefs(p) +
    '<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".86" stop-color="' + page + '" stop-opacity="0"/><stop offset="1" stop-color="' + page + '" stop-opacity="1"/></linearGradient>' +
    '</defs>' +
    '<rect width="1200" height="1600" fill="url(#sky)"/>' +
    sceneShapes(background, p) +
    '<rect width="1200" height="1600" fill="url(#fade)"/>' +
    '</svg>';

  const value = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  if (cache.size >= 32) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

/** Wide viewports use dedicated landscape artwork for Dawn, Twilight, Night, and Forest. */
export function backgroundWideOf(background: SceneId, mode: Mode, pageColor?: string): string {
  if (background === 'dawn') {
    const dawnPage = pageColor ?? palettes.dawn[mode].base;
    return 'linear-gradient(180deg, transparent 86%, ' + dawnPage + ' 100%), url("' + dawnDesktopAssets[mode] + '")';
  }
  if (background === 'twilight') {
    const twilightPage = pageColor ?? palettes.twilight[mode].base;
    return 'linear-gradient(180deg, transparent 86%, ' + twilightPage + ' 100%), url("' + twilightDesktopAssets[mode] + '")';
  }
  if (background === 'night') {
    const nightPage = pageColor ?? palettes.night[mode].base;
    return 'linear-gradient(180deg, transparent 86%, ' + nightPage + ' 100%), url("' + nightDesktopAssets[mode] + '")';
  }
  return backgroundOf(background, mode, pageColor);
}

/** The Today hero fades into the solid page surface while the selected scene continues across the shell. */
export function backgroundFootOf(): string {
  return 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)';
}
