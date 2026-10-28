import type { ButtonHTMLAttributes, ReactNode, SVGProps } from 'react';

/*
 * Lamplight's icons. One drawing rule for the whole family: a 24 grid with a 2-unit margin, one weight of line at
 * every size (strokeFor: 1.66 in the grid at 24), round
 * ends and joins, corners rounded about 2, nothing thinner than the stroke. Each icon is a line drawing with an
 * inner shape that shows when it is lit: the icon of the page you are on fills softly with the lamp from inside,
 * the icon-sized version of "one light" (icons.css). An icon with no inner shape of its own is lit by filling its
 * own lines, which is right for closed shapes and harmless for open ones.
 */

export type LampIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export type Glyph = { line: ReactNode; lit?: ReactNode };

/** The icon sizes, a scale like the type scale: 16 inside text, 18 in controls, 20 in rows, 22 in bars, 24 in tabs,
 *  28 and 32 where an icon stands alone. */
export const ICON_SIZES = [16, 18, 20, 22, 24, 28, 32] as const;

/**
 * One weight at every size, as SF Symbols keeps it: a line reads about 1.5 px at 16 and grows only a little with the
 * icon (1.66 at 24, 1.82 at 32), rather than doubling as a fixed stroke in the 24 grid would. Returned in grid units.
 */
export function strokeFor(size: number): number {
  const px = 1.5 + 0.02 * (size - 16);
  return Math.round(((px * 24) / size) * 100) / 100;
}

export function LampIcon({ glyph, size = 24, className, ...props }: LampIconProps & { glyph: Glyph }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeFor(size)}
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

/** A labeled icon action with a reliable touch target. Keep the icon itself decorative; the button owns the name. */
export function IconButton({ label, size = 'md', className, type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      className={['ll-icon-button', `ll-icon-button--${size}`, className].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}

/** A shared glyph by name, for the small marks inside controls (close, back, steppers, ticks): never a typed
 *  character such as ×, ‹ or +, which take the font's weight and sit off the icon grid. */
export function Sym({ name, size = 18, className, ...props }: LampIconProps & { name: keyof typeof GLYPHS }) {
  // Marks that point the way you read turn round in a right-to-left language (icons.css).
  const flips = name === 'back' || name === 'chevron' || name === 'arrowLeft';
  return <LampIcon glyph={GLYPHS[name]} size={size} className={[flips ? 'll-icon--flip' : '', className].filter(Boolean).join(' ') || undefined} {...props} />;
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
  grip: { line: <>{dot(9, 6)}{dot(15, 6)}{dot(9)}{dot(15)}{dot(9, 18)}{dot(15, 18)}</>, lit: <></> },
  back: { line: <path d="M14.5 5.5 8 12l6.5 6.5" />, lit: <></> },
  chevron: { line: <path d="M9.5 5.5 16 12l-6.5 6.5" />, lit: <></> },
  arrowUp: { line: <path d="M12 19V5M6 11l6-6 6 6" />, lit: <></> },
  arrowDown: { line: <path d="M12 5v14M6 13l6 6 6-6" />, lit: <></> },
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
  bookmark: { line: <path d="M7 4.5h10a1 1 0 0 1 1 1v14.1a.5.5 0 0 1-.8.4L12 16.4l-5.2 3.6a.5.5 0 0 1-.8-.4V5.5a1 1 0 0 1 1-1z" /> },
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
  // ---------- Things the apps are about ----------
  bills: {
    line: (
      <>
        <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
        <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
      </>
    ),
    lit: <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />,
  },
  wallet: {
    line: (
      <>
        <path d="M4 7.5V6a2 2 0 0 1 2-2h12a1.5 1.5 0 0 1 1.5 1.5v2" />
        <rect x="4" y="7.5" width="16" height="12.5" rx="2" />
        <path d="M15.5 13.75h.01" strokeWidth={2.4} />
      </>
    ),
    lit: <rect x="4" y="7.5" width="16" height="12.5" rx="2" />,
  },
  repeat: { line: <path d="M17 4.5l2.5 2.5L17 9.5M19.5 7H8a3.5 3.5 0 0 0-3.5 3.5v1M7 19.5 4.5 17 7 14.5M4.5 17H16a3.5 3.5 0 0 0 3.5-3.5v-1" />, lit: <></> },
  paperclip: { line: <path d="m9 12.5 5.5-5.5a3.2 3.2 0 0 1 4.5 4.5l-7.5 7.5a4.8 4.8 0 0 1-6.8-6.8l7-7" />, lit: <></> },
  arrowRight: { line: <path d="M5 12h14M13 6l6 6-6 6" />, lit: <></> },
  basket: {
    line: (
      <>
        <path d="M3.5 9.5h17l-1.7 8.7a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" />
        <path d="M8 9.5 11 4M16 9.5 13 4M9.5 13v3.5M14.5 13v3.5" />
      </>
    ),
    lit: <path d="M3.5 9.5h17l-1.7 8.7a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" />,
  },
  pot: {
    line: (
      <>
        <path d="M4.5 10h15v5.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z" />
        <path d="M2.5 10.5h2M19.5 10.5h2M9.5 7c0-1 1-1.5 1-3M13.5 7c0-1 1-1.5 1-3" />
      </>
    ),
    lit: <path d="M4.5 10h15v5.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z" />,
  },
  jar: {
    line: (
      <>
        <rect x="8" y="3.5" width="8" height="3" rx="1" />
        <path d="M7.5 6.5h9a1.5 1.5 0 0 1 1.5 1.5v10.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a1.5 1.5 0 0 1 1.5-1.5zM6 11h12" />
      </>
    ),
    lit: <path d="M6 11h12v7.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />,
  },
  serves: {
    line: <path d="M4 15.5h16M5.5 15.5a6.5 6.5 0 0 1 13 0M12 7v2M3.5 19h17" />,
    lit: <path d="M5.5 15.5a6.5 6.5 0 0 1 13 0z" />,
  },
  broom: {
    line: (
      <>
        <path d="M15 3.5 11.5 11" />
        <path d="M7.5 11h8l1.2 8a1 1 0 0 1-1 1.1H7.3a1 1 0 0 1-1-1.1z" />
        <path d="M9.5 15v5M13 15v5" />
      </>
    ),
    lit: <path d="M7.5 11h8l1.2 8a1 1 0 0 1-1 1.1H7.3a1 1 0 0 1-1-1.1z" />,
  },
  pill: {
    line: (
      <>
        <path d="M4.9 12.4 12.4 4.9a3.9 3.9 0 0 1 5.5 0l1.2 1.2a3.9 3.9 0 0 1 0 5.5l-7.5 7.5a3.9 3.9 0 0 1-5.5 0l-1.2-1.2a3.9 3.9 0 0 1 0-5.5z" />
        <path d="m8.6 8.6 6.8 6.8" />
      </>
    ),
    lit: <path d="M4.9 12.4 8.6 8.6l6.8 6.8-3.8 3.7a3.9 3.9 0 0 1-5.5 0l-1.2-1.2a3.9 3.9 0 0 1 0-5.5z" />,
  },
  visit: {
    line: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
        <path d="M8.5 3.5v4M15.5 3.5v4M4 10h16M12 12.5v5M9.5 15h5" />
      </>
    ),
    lit: <path d="M4 10h16v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />,
  },
  stretch: {
    line: (
      <>
        <circle cx="12" cy="5" r="1.8" />
        <path d="M5 9.5 12 8l7 1.5M12 8v6l-4 6M12 14l4 6" />
      </>
    ),
    lit: <circle cx="12" cy="5" r="1.8" />,
  },
  run: {
    line: (
      <>
        <circle cx="14.5" cy="4.8" r="1.8" />
        <path d="M8.5 20.5l3-5.5 3.5 2.5v3M6.5 11.5 10 8l4 1 2.5 3.5 3 1M11.5 15l-2-4" />
      </>
    ),
    lit: <circle cx="14.5" cy="4.8" r="1.8" />,
  },
  log: {
    line: (
      <>
        <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
        <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
      </>
    ),
    lit: <rect x="5" y="3.5" width="14" height="17" rx="2.5" />,
  },
  cake: {
    line: (
      <>
        <path d="M4.5 20h15v-6.5a1.5 1.5 0 0 0-1.5-1.5H6a1.5 1.5 0 0 0-1.5 1.5z" />
        <path d="M4.5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 12V9.5M12 7c-.8-.8-.8-1.7 0-3 .8 1.3.8 2.2 0 3z" />
      </>
    ),
    lit: <path d="M4.5 20h15v-6.5a1.5 1.5 0 0 0-1.5-1.5H6a1.5 1.5 0 0 0-1.5 1.5z" />,
  },
  gift: {
    line: (
      <>
        <rect x="4.5" y="9" width="15" height="11" rx="2" />
        <path d="M3.5 9h17M12 9v11M12 9c-1.5-3.5-5-4-5-1.8C7 8.5 9 9 12 9zM12 9c1.5-3.5 5-4 5-1.8 0 1.3-2 1.8-5 1.8z" />
      </>
    ),
    lit: <rect x="4.5" y="9" width="15" height="11" rx="2" />,
  },
  room: {
    line: (
      <>
        <path d="M5 20V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14M3.5 20h17" />
        <path d="M15 12.5h.01" strokeWidth={2.4} />
      </>
    ),
    lit: <path d="M5 20V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14z" />,
  },
  weight: { line: <path d="M3.5 12h17M7 8v8M17 8v8M4.5 9.5v5M19.5 9.5v5" />, lit: <></> },
  timer: {
    line: (
      <>
        <circle cx="12" cy="13" r="7.5" />
        <path d="M12 9v4l2.5 1.5M10 3.5h4" />
      </>
    ),
    lit: <circle cx="12" cy="13" r="7.5" />,
  },
  work: {
    line: (
      <>
        <rect x="3.5" y="7.5" width="17" height="12.5" rx="2" />
        <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" />
      </>
    ),
    lit: <rect x="3.5" y="7.5" width="17" height="12.5" rx="2" />,
  },
  plate: {
    line: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4.2" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="4.2" />,
  },
  glasses: {
    line: (
      <>
        <circle cx="7" cy="14.5" r="3.5" />
        <circle cx="17" cy="14.5" r="3.5" />
        <path d="M10.5 14.5h3M3.5 13.5 5 8M20.5 13.5 19 8" />
      </>
    ),
    lit: (
      <>
        <circle cx="7" cy="14.5" r="3.5" />
        <circle cx="17" cy="14.5" r="3.5" />
      </>
    ),
  },
  plane: {
    line: <path d="M12 2.8c.9 0 1.5 1 1.5 2.2v5.2l7.5 4.3v2l-7.5-2.3v4.4l2.2 1.7v1.6L12 20.8l-3.7 1.1v-1.6l2.2-1.7v-4.4L3 16.5v-2l7.5-4.3V5c0-1.2.6-2.2 1.5-2.2z" />,
    lit: <path d="M12 2.8c.9 0 1.5 1 1.5 2.2v5.2l7.5 4.3v2l-7.5-2.3v4.4l2.2 1.7v1.6L12 20.8l-3.7 1.1v-1.6l2.2-1.7v-4.4L3 16.5v-2l7.5-4.3V5c0-1.2.6-2.2 1.5-2.2z" />,
  },
  suitcase: {
    line: (
      <>
        <rect x="4" y="7.5" width="16" height="12" rx="2.2" />
        <path d="M9 7.5V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6v1.9M8.5 7.5v12M15.5 7.5v12" />
      </>
    ),
    lit: <rect x="4" y="7.5" width="16" height="12" rx="2.2" />,
  },
  globe: {
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5z" />
      </>
    ),
    lit: <circle cx="12" cy="12" r="8.5" />,
  },
  bed: {
    line: (
      <>
        <path d="M3 18.5V6.5M3 15h18v3.5M21 15v-3.2a2.3 2.3 0 0 0-2.3-2.3H11V15" />
        <circle cx="7" cy="11.5" r="1.8" />
      </>
    ),
    lit: <path d="M11 9.5h7.7a2.3 2.3 0 0 1 2.3 2.3V15H11z" />,
  },
  car: {
    line: (
      <>
        <path d="M3.5 16.5v-3.8l1.9-4.6A2 2 0 0 1 7.3 7h9.4a2 2 0 0 1 1.9 1.1l1.9 4.6v3.8z" />
        <path d="M3.5 12.7h17" />
        <circle cx="7.5" cy="16.8" r="1.7" />
        <circle cx="16.5" cy="16.8" r="1.7" />
      </>
    ),
    lit: <path d="M3.5 16.5v-3.8l1.9-4.6A2 2 0 0 1 7.3 7h9.4a2 2 0 0 1 1.9 1.1l1.9 4.6v3.8z" />,
  },
  train: {
    line: (
      <>
        <rect x="6" y="3.5" width="12" height="13" rx="3" />
        <path d="M6 10.5h12M9 20.5l1.5-4M15 20.5l-1.5-4M9.3 13.5h.01M14.7 13.5h.01" />
      </>
    ),
    lit: <rect x="6" y="3.5" width="12" height="13" rx="3" />,
  },
  bus: {
    line: (
      <>
        <rect x="4.5" y="3.5" width="15" height="14" rx="2.5" />
        <path d="M4.5 11h15M7.5 17.5v2.5M16.5 17.5v2.5M8 14.5h.01M16 14.5h.01" />
      </>
    ),
    lit: <rect x="4.5" y="3.5" width="15" height="14" rx="2.5" />,
  },
  ship: {
    line: (
      <>
        <path d="M3 15.5l1.8 4h14.4l1.8-4z" />
        <path d="M6 15.5V10h12v5.5M10 10V6.5h4V10" />
      </>
    ),
    lit: <path d="M3 15.5l1.8 4h14.4l1.8-4z" />,
  },
  ticket: {
    line: (
      <>
        <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2.3a2.2 2.2 0 0 0 0 4.4v2.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2.3a2.2 2.2 0 0 0 0-4.4z" />
        <path d="M14 8v1.5M14 11.25v1.5M14 14.5V16" />
      </>
    ),
    lit: <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2.3a2.2 2.2 0 0 0 0 4.4v2.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2.3a2.2 2.2 0 0 0 0-4.4z" />,
  },
  pin: {
    line: (
      <>
        <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    lit: <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />,
  },
} satisfies Record<string, Glyph>;

export type GlyphName = keyof typeof GLYPHS;

/** A shared glyph as a component, with a module's own default size. */
export const glyphIcon =
  (name: GlyphName, defaultSize = 24) =>
  ({ size = defaultSize, ...props }: LampIconProps) => <LampIcon glyph={GLYPHS[name]} size={size} {...props} />;
