type Props = {
  size?: number;
  tone?: 'light' | 'dark';
};

/** The Proairetos mark: an eight-point compass rose in a thin ring. */
export default function CompassRose({ size = 72, tone = 'light' }: Props) {
  const ring = tone === 'light' ? '#a07d55' : '#c9a274';
  const major = tone === 'light' ? '#3a2f24' : '#e3c89f';
  const majorShade = tone === 'light' ? '#8a6a46' : '#a9845a';
  const minor = tone === 'light' ? '#a98a64' : '#7d6a52';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Proairetos compass">
      <circle cx="50" cy="50" r="46" fill="none" stroke={ring} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={ring} strokeWidth="0.5" opacity="0.6" />
      {[45, 135, 225, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path d="M50 22 L53.5 50 L46.5 50 Z" fill={minor} />
        </g>
      ))}
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path d="M50 8 L50 50 L44.5 44.5 Z" fill={majorShade} />
          <path d="M50 8 L55.5 44.5 L50 50 Z" fill={major} />
        </g>
      ))}
      <circle cx="50" cy="50" r="2.4" fill={ring} />
    </svg>
  );
}
