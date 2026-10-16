import type { ReactNode, SVGProps } from 'react';

/*
 * Lamplight's icons. One drawing rule for the whole family: a 24 grid with a 2-unit margin, one 1.7 stroke, round
 * ends and joins, corners rounded about 2, nothing thinner than the stroke. Each icon is a line drawing with an
 * inner shape that shows when it is lit: the icon of the page you are on fills softly with the lamp from inside,
 * the icon-sized version of "one light" (icons.css). An icon with no inner shape of its own is lit by filling its
 * own lines, which is right for closed shapes and harmless for open ones.
 */

export type LampIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

export type Glyph = { line: ReactNode; lit?: ReactNode };

export function LampIcon({ glyph, size = 24, className, ...props }: LampIconProps & { glyph: Glyph }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ? `ll-icon ${className}` : 'll-icon'}
      {...props}
    >
      <g className="ll-icon__lit" fill="currentColor" stroke="none">
        {glyph.lit ?? glyph.line}
      </g>
      {glyph.line}
    </svg>
  );
}

/** Wraps a module's own drawing in the Lamplight base, keeping its default size. */
export const lampIcon =
  (line: ReactNode, lit?: ReactNode, defaultSize = 24) =>
  ({ size = defaultSize, ...props }: LampIconProps) => <LampIcon glyph={{ line, lit }} size={size} {...props} />;

// ---------- The family's shared glyphs, drawn once ----------

const dot = (cx: number, cy = 12) => <circle cx={cx} cy={cy} r={1.4} fill="currentColor" stroke="none" />;

export const GLYPHS = {
  home: {
    line: <path d="M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  },
  today: {
    line: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="4" />,
  },
  moon: { line: <path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z" /> },
  book: {
    line: (
      <>
        <path d="M12 6.6C10.3 5.1 7.8 4.6 4 4.6v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2z" />
        <path d="M12 6.6v13" />
      </>
    ),
  },
  calendar: {
    line: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
        <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      </>
    ),
    lit: <path d="M4 10h16v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />,
  },
  capture: {
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="8.5" />,
  },
  plus: { line: <path d="M12 5v14M5 12h14" />, lit: <></> },
  minus: { line: <path d="M5 12h14" />, lit: <></> },
  more: { line: <>{dot(6)}{dot(12)}{dot(18)}</>, lit: <></> },
  back: { line: <path d="M14.5 5.5 8 12l6.5 6.5" />, lit: <></> },
  chevron: { line: <path d="M9.5 5.5 16 12l-6.5 6.5" />, lit: <></> },
  arrowLeft: { line: <path d="M19 12H5M11 6l-6 6 6 6" />, lit: <></> },
  close: { line: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />, lit: <></> },
  check: { line: <path d="M5.5 12.5l4 4 9-9" />, lit: <></> },
  search: {
    line: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    lit: <circle cx="11" cy="11" r="6.5" />,
  },
  gear: {
    line: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M10.3 3.6h3.4l.5 2.3 1.6.9 2.2-.8 1.7 2.9-1.7 1.6v1.9l1.7 1.6-1.7 2.9-2.2-.8-1.6.9-.5 2.3h-3.4l-.5-2.3-1.6-.9-2.2.8-1.7-2.9 1.7-1.6v-1.9L4.3 8.9 6 6l2.2.8 1.6-.9z" />
      </>
    ),
  },
  clock: {
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="8.5" />,
  },
  bell: {
    line: (
      <>
        <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
        <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
      </>
    ),
  },
  leaf: {
    line: (
      <>
        <path d="M5 19c0-8 5-13.5 14.5-14-.5 9.5-6 14.5-14 14z" />
        <path d="M5 19 13.5 10.5" />
      </>
    ),
  },
  sprout: {
    line: (
      <path d="M12 20.5V11M12 13c0-4-2.5-6.5-7-6.5 0 4 2.5 6.5 7 6.5zM12 11c0-3.5 2.2-5.5 6.5-5.5 0 3.5-2.2 5.5-6.5 5.5z" />
    ),
  },
  drop: { line: <path d="M12 3.5s6 6.3 6 10.8a6 6 0 1 1-12 0C6 9.8 12 3.5 12 3.5z" /> },
  heart: { line: <path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" /> },
  person: {
    line: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.6-3.6 3.4-6 7-6s6.4 2.4 7 6z" />
      </>
    ),
  },
  people: {
    line: (
      <>
        <circle cx="9" cy="8.5" r="3.2" />
        <path d="M3 19.5c.5-3.3 2.9-5.5 6-5.5s5.5 2.2 6 5.5z" />
        <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17 14.2c2.3.5 3.7 2.4 4 5.3h-2.5" />
      </>
    ),
  },
  pencil: {
    line: (
      <>
        <path d="M15.5 4.5l4 4L9 19H5v-4z" />
        <path d="M13.5 6.5l4 4" />
      </>
    ),
  },
  trash: { line: <path d="M5 7h14M9 7V4.5h6V7M7 7l.8 13h8.4L17 7M10 10.5v6M14 10.5v6" />, lit: <path d="M7 7l.8 13h8.4L17 7z" /> },
  share: {
    line: (
      <>
        <path d="M12 3.5v11M8 7.5l4-4 4 4" />
        <path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1" />
      </>
    ),
    lit: <></>,
  },
  play: { line: <path d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.6-6.2a.6.6 0 0 0 0-1L9.4 5.3a.6.6 0 0 0-.9.5z" /> },
  pause: { line: <path d="M8.5 5.5v13M15.5 5.5v13" />, lit: <></> },
  list: { line: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />, lit: <></> },
  info: {
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5.5M12 7.8h.01" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="8.5" />,
  },
  lock: {
    line: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </>
    ),
    lit: <rect x="5" y="10.5" width="14" height="10" rx="2.5" />,
  },
  key: {
    line: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2" />
      </>
    ),
    lit: <circle cx="8" cy="15" r="4" />,
  },
  box: {
    line: (
      <>
        <path d="M4 8l8-4 8 4v8.5l-8 4-8-4z" />
        <path d="M4 8l8 4 8-4M12 12v8.5" />
      </>
    ),
  },
  camera: {
    line: (
      <>
        <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
        <circle cx="12" cy="13" r="3.3" />
      </>
    ),
  },
  pulse: { line: <path d="M3 12.5h4l2-5 4 10 2-5h6" />, lit: <></> },
  cup: {
    line: (
      <>
        <path d="M5 7.5h11v5.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
        <path d="M16 9.5h1.5a2 2 0 0 1 0 4H16M4 20.5h13" />
      </>
    ),
    lit: <path d="M5 7.5h11v5.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />,
  },
  print: {
    line: (
      <>
        <path d="M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
        <rect x="7" y="14" width="10" height="6" rx="1" />
      </>
    ),
    lit: <></>,
  },
  shield: { line: <path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z" /> },
  target: {
    line: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.7" fill="currentColor" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="4" />,
  },
  download: { line: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />, lit: <></> },
  link: { line: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />, lit: <></> },
  chart: { line: <path d="M5.5 19.5v-7M12 19.5v-14M18.5 19.5v-9" />, lit: <></> },
  history: {
    line: (
      <>
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
        <path d="M4.5 4.5V9H9M12 8v4l2.5 2" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="7.5" />,
  },
} satisfies Record<string, Glyph>;

export type GlyphName = keyof typeof GLYPHS;

/** A shared glyph as a component, with a module's own default size. */
export const glyphIcon =
  (name: GlyphName, defaultSize = 24) =>
  ({ size = defaultSize, ...props }: LampIconProps) => <LampIcon glyph={GLYPHS[name]} size={size} {...props} />;
