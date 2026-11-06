type Props = { size?: number; tone?: 'light' | 'dark' };

/** A minimal lantern and flame held inside a directional ring. */
export default function CompassRose({ size = 72, tone = 'light' }: Props) {
  const ink = tone === 'light' ? '#3a2f24' : '#f2d7a5';
  const tint = tone === 'light' ? '#a07d55' : '#c9a274';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Proairetos lantern compass">
      <circle cx="50" cy="50" r="34" fill="none" stroke={tint} strokeWidth="2.4" strokeDasharray="46 7.4" transform="rotate(-45 50 50)" />
      <path d="M50 9 V17 M50 83 V91 M9 50 H17 M83 50 H91" stroke={tint} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M50 23 L39.8 33 L43.8 69 Q44.2 72 47.2 72 H52.8 Q55.8 72 56.2 69 L60.2 33Z" fill="none" stroke={ink} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M38 34 H62 M44.5 75 H55.5" fill="none" stroke={tint} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M50 40 C46.8 45.2 44 49.8 44 55.8 A6 6 0 0 0 56 55.8 C56 50.2 53.2 45.2 50 40Z" fill={ink} />
      <path d="M50 47.6 C48.8 50.4 48.2 52.2 48.2 54.2 A1.8 1.8 0 0 0 51.8 54.2 C51.8 52.2 51.2 50.4 50 47.6Z" fill={tint} />
    </svg>
  );
}
