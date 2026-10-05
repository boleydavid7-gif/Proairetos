type Props = { size?: number };

/** Theoria mark: a small lamp of attention above an open page. */
export default function TheoriaMark({ size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Theoria mark">
      <rect x="1" y="1" width="62" height="62" rx="15" fill="#121a2e" />
      <path d="M32 10c-4.8 3.9-7.2 8.5-7.2 13.7 0 4.8 2.4 8.3 7.2 10.5 4.8-2.2 7.2-5.7 7.2-10.5C39.2 18.5 36.8 13.9 32 10Z" fill="#d8c9ef" />
      <path d="M21 35c4.2-2.1 8-1.5 11 1.9v16.6c-3.3-3.1-7-3.8-11-2.2z" fill="#b6a3d4" />
      <path d="M43 35c-4.2-2.1-8-1.5-11 1.9v16.6c3.3-3.1 7-3.8 11-2.2z" fill="#f1e5cf" />
      <path d="M32 37v16.5M24 40c2.2-.5 4.2-.1 6 1.2M40 40c-2.2-.5-4.2-.1-6 1.2" fill="none" stroke="#8e7bb1" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M27.5 22.5h9M29 26h6" fill="none" stroke="#59698d" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
