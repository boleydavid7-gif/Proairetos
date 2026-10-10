type Props = {
  size?: number;
  tone?: 'light' | 'dark';
};

/** Praxis mark: an open book beneath a small rising sun. */
export default function PraxisMark({ size = 64, tone = 'dark' }: Props) {
  const background = tone === 'dark' ? '#0b201a' : '#f3ede2';
  const page = tone === 'dark' ? '#e3c89f' : '#2f5a3e';
  const pageShade = tone === 'dark' ? '#a9845a' : '#71906f';
  const accent = tone === 'dark' ? '#c9a274' : '#b08657';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Praxis mark">
      <rect x="1" y="1" width="62" height="62" rx="15" fill={background} />
      <circle cx="32" cy="16" r="4" fill={accent} />
      <path d="M32 8v3M32 21v3M24 16h3M37 16h3M26.3 10.3l2.1 2.1M35.6 19.6l2.1 2.1M37.7 10.3l-2.1 2.1M28.4 19.6l-2.1 2.1" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity=".82" />
      <path d="M9 31.5c7.1-3.9 14.7-3.4 23 2.1v20c-7.6-4.8-15.3-5.1-23-1.1z" fill={pageShade} />
      <path d="M55 31.5c-7.1-3.9-14.7-3.4-23 2.1v20c7.6-4.8 15.3-5.1 23-1.1z" fill={page} />
      <path d="M32 33.6v20M12 36c5.8-2.2 11.6-1.5 17.5 2M52 36c-5.8-2.2-11.6-1.5-17.5 2" fill="none" stroke={tone === 'dark' ? '#f4e9d2' : '#e8dfcf'} strokeWidth="1.35" strokeLinecap="round" opacity=".78" />
      <path d="M10 52.5c7.7-4 15.4-3.7 22 1.1 6.6-4.8 14.3-5.1 22-1.1" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
