type Props = { size?: number; tone?: 'light' | 'dark' };

/** The Proairetos lantern-compass: a flame held inside a lantern, guided by a broken compass ring. */
export default function CompassRose({ size = 72, tone = 'light' }: Props) {
  const ink = tone === 'light' ? '#3a2f24' : '#f2d7a5';
  const tint = tone === 'light' ? '#a07d55' : '#c9a274';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Proairetos lantern compass">
      <circle cx="50" cy="50" r="39" fill="none" stroke={tint} strokeWidth="2.2" strokeDasharray="52 9" transform="rotate(-45 50 50)" />
      <path d="M50 12 V25 M50 75 V88 M12 50 H25 M75 50 H88" stroke={tint} strokeWidth="3" strokeLinecap="round" />
      <path d="M50 23 L39 34 V65 Q39 69 43 69 H57 Q61 69 61 65 V34Z" fill="none" stroke={ink} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M36 36 H64 M43 72 H57" stroke={tint} strokeWidth="3" strokeLinecap="round" />
      <path d="M50 42 C50 42 43 51 43 56 A7 7 0 0 0 57 56 C57 51 50 42 50 42Z" fill={ink} />
      <path d="M50 12 L47 20 H53Z M50 88 L47 80 H53Z M12 50 L20 47 V53Z M88 50 L80 47 V53Z" fill={tint} />
    </svg>
  );
}
