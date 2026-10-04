import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const icon = (children: React.ReactNode, { size = 24, ...props }: IconProps = {}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const DropIcon = (props: IconProps) => icon(<path d="M12 3s6 6.3 6 11a6 6 0 1 1-12 0c0-4.7 6-11 6-11Z" />, props);
export const CupIcon = (props: IconProps) => icon(<><path d="M5 7h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V7Z" /><path d="M16 9h2a2 2 0 0 1 0 4h-2M3 20h15" /></>, props);
export const LeafIcon = (props: IconProps) => icon(<><path d="M19 4C10 4 5 8 5 14c0 3 2 5 5 5 6 0 9-6 9-15Z" /><path d="M5 19c2-4 5-7 10-9" /></>, props);
export const BoltIcon = (props: IconProps) => icon(<path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />, props);
export const BubblesIcon = (props: IconProps) => icon(<><circle cx="9" cy="12" r="3" /><circle cx="16" cy="7" r="2" /><circle cx="17" cy="17" r="2" /><circle cx="5" cy="5" r="1.5" /></>, props);
export const MoreIcon = (props: IconProps) => icon(<><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>, props);
export const BackIcon = (props: IconProps) => icon(<path d="m15 18-6-6 6-6" />, props);
export const CloseIcon = (props: IconProps) => icon(<><path d="m6 6 12 12M18 6 6 18" /></>, props);
export const PlusIcon = (props: IconProps) => icon(<><path d="M12 5v14M5 12h14" /></>, props);
export const MinusIcon = (props: IconProps) => icon(<path d="M5 12h14" />, props);
export const ClockIcon = (props: IconProps) => icon(<><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>, props);
export const ChartIcon = (props: IconProps) => icon(<><path d="M5 20V10M12 20V4M19 20v-7" /></>, props);
export const SunIcon = (props: IconProps) => icon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>, props);
export const MoonIcon = (props: IconProps) => icon(<path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 7.5 7.5 0 1 0 19 15.5Z" />, props);
export const WaveIcon = (props: IconProps) => icon(<><path d="M3 9c3-2 5-2 8 0s5 2 10 0M3 15c3-2 5-2 8 0s5 2 10 0" /></>, props);
export const BalanceIcon = (props: IconProps) => icon(<><path d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7ZM17 7l-3 6a3 3 0 0 0 6 0l-3-6ZM8 21h8" /></>, props);

export const iconForKind = (kind: string, props: IconProps = {}) => {
  if (kind === 'coffee') return <CupIcon {...props} />;
  if (kind === 'tea') return <LeafIcon {...props} />;
  if (kind === 'electrolyte') return <BoltIcon {...props} />;
  if (kind === 'sparkling') return <BubblesIcon {...props} />;
  if (kind === 'other') return <MoreIcon {...props} />;
  return <DropIcon {...props} />;
};
