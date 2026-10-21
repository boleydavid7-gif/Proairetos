import { useId } from 'react';

/*
 * Each app's mark inside the app: the icon's symbol without its tile, in one color that follows the surface (light
 * over pictures, ink on pages, the app's own color where it stands alone). The icon's tinted second layer becomes a
 * lighter shade of the same color, and where shapes overlap a thin gap is cut so they read apart at small sizes.
 * Drawn on the icons' 1024 canvas from the shapes in scripts/icons/glyphs.mjs, so a change there belongs here too.
 */

export type FamilyApp =
  | 'proairetos'
  | 'askesis'
  | 'soma'
  | 'oikonomia'
  | 'hydros'
  | 'praxis'
  | 'theoria'
  | 'diaita'
  | 'philia'
  | 'ergon'
  | 'therapeia'
  | 'dynamis'
  | 'ktema'
  | 'phyton'
  | 'poreia';

type Shape = {
  tag: 'path' | 'circle' | 'ellipse' | 'rect';
  attrs: Record<string, string | number>;
  /** How strong: 1 the main shape, lower for the icon's second layer. */
  level?: number;
  /** Cut this far around the shape from everything drawn before it. */
  gap?: number;
  /** Only cuts (a highlight or a fold), never drawn. */
  cut?: boolean;
};

const SECOND = 0.45;
const path = (d: string, extra: Shape['attrs'] = {}): Shape['attrs'] => ({
  d,
  ...extra,
});
const line = (d: string, width: number): Shape['attrs'] => ({
  d,
  fill: 'none',
  strokeWidth: width,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

function compass(): Shape[] {
  // Corners turned here rather than by a transform, since a cut is measured inside the shape's own transform.
  const turn = (angle: number, x: number, y: number) => {
    const r = (angle * Math.PI) / 180;
    const [dx, dy] = [x - 512, y - 512];
    return `${(512 + dx * Math.cos(r) - dy * Math.sin(r)).toFixed(1)} ${(512 + dx * Math.sin(r) + dy * Math.cos(r)).toFixed(1)}`;
  };
  const point = (angle: number, length: number, width: number, a: number, b: number): Shape[] => {
    const tip = turn(angle, 512, 512 - length);
    return [
      { tag: 'path', attrs: path(`M${tip} L512 512 L${turn(angle, 512 - width, 512 - width)}Z`), level: a },
      { tag: 'path', attrs: path(`M${tip} L${turn(angle, 512 + width, 512 - width)} L512 512Z`), level: b },
    ];
  };
  return [
    {
      tag: 'circle',
      attrs: { cx: 512, cy: 512, r: 318, fill: 'none', strokeWidth: 26 },
      level: SECOND,
    },
    ...[45, 135, 225, 315].flatMap((a) => point(a, 200, 44, SECOND, 0.6)),
    ...[0, 90, 180, 270].flatMap((a) => point(a, 330, 62, 0.72, 1)).map((shape) => ({ ...shape, gap: 8 })),
    { tag: 'circle', attrs: { cx: 512, cy: 512, r: 26 }, gap: 12 },
  ];
}

function coins(): Shape[] {
  return [620, 510, 400].flatMap((y): Shape[] => [
    {
      tag: 'path',
      attrs: path(`M292 ${y} v70 a220 70 0 0 0 440 0 v-70Z`),
      level: SECOND,
      gap: 22,
    },
    { tag: 'ellipse', attrs: { cx: 512, cy: y, rx: 220, ry: 70 } },
    {
      tag: 'ellipse',
      attrs: { cx: 512, cy: y, rx: 150, ry: 44, fill: 'none', strokeWidth: 14 },
      cut: true,
    },
  ]);
}

/** Turned or scaled as a whole (never per shape: a cut is measured inside the shape's own turn). */
const WHOLE: Partial<Record<FamilyApp, string>> = {
  therapeia: 'rotate(-45 512 512) translate(512 512) scale(1.3) translate(-512 -512)',
  poreia: 'rotate(45 512 512)',
};

const MARKS: Record<FamilyApp, Shape[]> = {
  proairetos: compass(),
  askesis: [
    { tag: 'circle', attrs: { cx: 636, cy: 356, r: 92 }, level: SECOND },
    {
      tag: 'path',
      attrs: path('M200 740 L430 330 L536 500 L600 404 L824 740Z'),
      gap: 26,
    },
    {
      tag: 'path',
      attrs: path('M430 330 L488 424 L458 410 L430 444 L404 410 L374 428Z'),
      cut: true,
    },
    {
      tag: 'path',
      attrs: path('M600 404 L640 466 L616 456 L598 476 L582 458 L566 456Z'),
      cut: true,
    },
  ],
  soma: [
    { tag: 'path', attrs: line('M572 520 C572 450 580 380 572 300', 22) },
    {
      tag: 'path',
      attrs: path('M572 440 C490 440 432 394 422 324 C490 324 556 358 572 440Z'),
      level: SECOND,
      gap: 0,
    },
    {
      tag: 'path',
      attrs: path('M574 382 C652 382 710 336 720 264 C648 264 588 298 574 382Z'),
    },
    {
      tag: 'path',
      attrs: path('M268 540 H756 C756 664 650 772 512 772 C374 772 268 664 268 540Z'),
      gap: 22,
    },
    {
      tag: 'rect',
      attrs: { x: 236, y: 486, width: 552, height: 46, rx: 23 },
      gap: 18,
    },
  ],
  oikonomia: coins(),
  hydros: [
    {
      tag: 'path',
      attrs: path('M512 230 C512 230 300 470 300 610 A212 212 0 0 0 724 610 C724 470 512 230 512 230Z'),
    },
    {
      tag: 'path',
      attrs: line('M396 600 C396 660 430 712 486 734', 34),
      cut: true,
    },
  ],
  praxis: [
    {
      tag: 'path',
      attrs: path('M352 292 H672 C672 400 560 450 540 512 C560 574 672 624 672 732 H352 C352 624 464 574 484 512 C464 450 352 400 352 292Z'),
      level: 0.32,
    },
    {
      tag: 'path',
      attrs: path('M410 360 H614 C600 420 540 450 512 490 C484 450 424 420 410 360Z'),
      gap: 0,
    },
    {
      tag: 'path',
      attrs: path('M512 520 C540 600 640 640 652 712 H372 C384 640 484 600 512 520Z'),
      level: 0.7,
      gap: 0,
    },
    {
      tag: 'rect',
      attrs: { x: 312, y: 236, width: 400, height: 56, rx: 28 },
      gap: 16,
    },
    {
      tag: 'rect',
      attrs: { x: 312, y: 732, width: 400, height: 56, rx: 28 },
      gap: 16,
    },
  ],
  theoria: [
    {
      tag: 'path',
      attrs: path('M512 330 C584 280 694 268 788 290 V716 C694 694 584 706 512 756Z'),
      level: SECOND,
    },
    {
      tag: 'path',
      attrs: path('M512 330 C440 280 330 268 236 290 V716 C330 694 440 706 512 756Z'),
      gap: 14,
    },
    {
      tag: 'path',
      attrs: path('M640 278 V430 L672 404 L704 430 V270Z'),
      gap: 18,
    },
  ],
  diaita: [
    {
      tag: 'path',
      attrs: path('M600 248 A272 272 0 1 0 760 640 A220 220 0 1 1 600 248Z'),
    },
    {
      tag: 'path',
      attrs: path('M700 300 l16 44 44 16 -44 16 -16 44 -16 -44 -44 -16 44 -16Z'),
    },
    {
      tag: 'path',
      attrs: path('M760 470 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10Z'),
      level: 0.7,
    },
  ],
  philia: [
    { tag: 'circle', attrs: { cx: 604, cy: 512, r: 196 }, level: SECOND },
    { tag: 'circle', attrs: { cx: 420, cy: 512, r: 196 }, gap: 24 },
  ],
  ergon: [
    {
      tag: 'path',
      attrs: path('M512 236 L792 486 H732 V770 H292 V486 H232Z', {
        strokeWidth: 20,
        strokeLinejoin: 'round',
      }),
    },
    { tag: 'path', attrs: line('M404 584 L486 664 L630 504', 58), cut: true },
  ],
  therapeia: [
    {
      tag: 'path',
      attrs: path('M512 404 H622 A108 108 0 0 1 622 620 H512Z'),
      level: SECOND,
    },
    {
      tag: 'path',
      attrs: path('M512 404 H402 A108 108 0 0 0 402 620 H512Z'),
      gap: 12,
    },
    {
      tag: 'rect',
      attrs: { x: 360, y: 440, width: 120, height: 24, rx: 12 },
      cut: true,
    },
  ],
  dynamis: [
    {
      tag: 'path',
      attrs: line('M392 470 V380 A120 120 0 0 1 632 380 V470', 64),
      level: 0.7,
    },
    { tag: 'circle', attrs: { cx: 512, cy: 596, r: 200 }, gap: 18 },
    {
      tag: 'rect',
      attrs: { x: 370, y: 760, width: 284, height: 36, rx: 18 },
      gap: 16,
    },
    {
      tag: 'path',
      attrs: line('M418 560 A110 110 0 0 1 512 486', 30),
      cut: true,
    },
  ],
  ktema: [
    { tag: 'path', attrs: path('M512 262 L756 384 L512 506 L268 384Z') },
    {
      tag: 'path',
      attrs: path('M268 384 L512 506 V778 L268 656Z'),
      level: SECOND,
      gap: 14,
    },
    {
      tag: 'path',
      attrs: path('M756 384 L512 506 V778 L756 656Z'),
      level: 0.7,
      gap: 14,
    },
    {
      tag: 'path',
      attrs: path('M390 323 L634 445 L592 466 L348 344Z'),
      cut: true,
    },
  ],
  phyton: [
    { tag: 'path', attrs: line('M512 560 C512 500 506 440 512 380', 26) },
    {
      tag: 'path',
      attrs: path('M510 470 C420 474 336 420 320 330 C410 326 494 380 510 470Z'),
      level: SECOND,
      gap: 0,
    },
    {
      tag: 'path',
      attrs: path('M514 420 C606 420 690 370 708 270 C612 270 528 330 514 420Z'),
    },
    { tag: 'path', attrs: path('M318 560 H706 L664 790 H360Z') },
    {
      tag: 'rect',
      attrs: { x: 296, y: 528, width: 432, height: 64, rx: 22 },
      gap: 18,
    },
  ],
  poreia: [
    { tag: 'circle', attrs: { cx: 512, cy: 512, r: 262, fill: 'none', strokeWidth: 40 }, level: SECOND },
    {
      tag: 'path',
      attrs: path('M512 214 C542 214 556 250 556 284 V440 L800 572 V630 L556 566 V680 L660 742 V786 L512 750 L364 786 V742 L468 680 V566 L224 630 V572 L468 440 V284 C468 250 482 214 512 214Z'),
      gap: 16,
    },
  ],
};

/** The app's own color, the same as its icon's tile, for a mark standing alone on a plain page. */
export const MARK_COLOR: Record<FamilyApp, string> = {
  proairetos: '#c9a274',
  askesis: '#167a64',
  soma: '#c4643c',
  oikonomia: '#b9821f',
  hydros: '#1f86cf',
  praxis: '#b3343f',
  theoria: '#6a2c59',
  diaita: '#3b3080',
  philia: '#d8644f',
  ergon: '#647f5c',
  therapeia: '#4c6cc0',
  dynamis: '#de762a',
  ktema: '#7b5236',
  phyton: '#3a934b',
  poreia: '#0f6f78',
};

export const MARK_LIGHT = '#fbf6ec';

/** Shapes with a gap (even 0, so a lighter shape never shows through) or a cut take their place from those below. */
const cuts = (shape: Shape) => shape.gap !== undefined || Boolean(shape.cut);

function draw(shape: Shape, key: string, extra: Record<string, unknown> = {}) {
  const Tag = shape.tag;
  return <Tag key={key} {...(shape.attrs as object)} {...extra} />;
}

/** One app's mark. `color` defaults to the text color around it. */
export function FamilyMark({ app, size = 30, color = 'currentColor', label }: { app: FamilyApp; size?: number; color?: string; label?: string }) {
  const id = `mark-${app}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const shapes = MARKS[app];
  return (
    <svg
      width={size}
      height={size}
      viewBox="176 176 672 672"
      className={`family-mark family-mark--${app}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ color, flex: 'none' }}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0}
    >
      <defs>
        {shapes.map((shape, index) => {
          const later = shapes.slice(index + 1).filter(cuts);
          if (!later.length || shape.cut) return null;
          return (
            <mask key={index} id={`${id}-${index}`} maskUnits="userSpaceOnUse" x="-512" y="-512" width="2048" height="2048">
              <rect x="-512" y="-512" width="2048" height="2048" fill="#fff" />
              {later.map((each, j) => {
                const own = Number(each.attrs.strokeWidth ?? 0);
                const filled = each.attrs.fill !== 'none';
                return draw(each, String(j), {
                  fill: filled ? '#000' : 'none',
                  stroke: '#000',
                  strokeWidth: own + 2 * (each.gap ?? 0),
                  opacity: 1,
                });
              })}
            </mask>
          );
        })}
      </defs>
      <g transform={WHOLE[app]}>
        {shapes.map((shape, index) => {
          if (shape.cut) return null;
          const masked = shapes.slice(index + 1).some(cuts);
          return draw(shape, String(index), {
            opacity: shape.level ?? 1,
            mask: masked ? `url(#${id}-${index})` : undefined,
          });
        })}
      </g>
    </svg>
  );
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const attrText = (attrs: Record<string, unknown>) =>
  Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${kebab(name)}="${String(value)}"`)
    .join(' ');

/** The same mark as SVG text, for places drawn without React (the top bar). Ids carry `key` so copies never clash. */
export function familyMarkSvg(app: FamilyApp, size = 22, key = 'bar'): string {
  const shapes = MARKS[app];
  const id = `mark-${app}-${key}`;
  const tag = (shape: Shape, extra: Record<string, unknown>) =>
    `<${shape.tag} ${attrText({ ...shape.attrs, ...extra })}/>`;
  const masks = shapes
    .map((shape, index) => {
      const later = shapes.slice(index + 1).filter(cuts);
      if (!later.length || shape.cut) return '';
      const parts = later
        .map((each) =>
          tag(each, {
            fill: each.attrs.fill !== 'none' ? '#000' : 'none',
            stroke: '#000',
            strokeWidth: Number(each.attrs.strokeWidth ?? 0) + 2 * (each.gap ?? 0),
            opacity: 1,
          }),
        )
        .join('');
      return `<mask id="${id}-${index}" maskUnits="userSpaceOnUse" x="-512" y="-512" width="2048" height="2048"><rect x="-512" y="-512" width="2048" height="2048" fill="#fff"/>${parts}</mask>`;
    })
    .join('');
  const body = shapes
    .map((shape, index) => {
      if (shape.cut) return '';
      const masked = shapes.slice(index + 1).some(cuts);
      return tag(shape, { opacity: shape.level ?? 1, mask: masked ? `url(#${id}-${index})` : undefined });
    })
    .join('');
  const whole = WHOLE[app] ? ` transform="${WHOLE[app]}"` : '';
  return `<svg width="${size}" height="${size}" viewBox="176 176 672 672" class="family-mark family-mark--${app}" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="0"><defs>${masks}</defs><g${whole}>${body}</g></svg>`;
}

export const isFamilyApp = (name: string | undefined): name is FamilyApp => Boolean(name && name in MARKS);
