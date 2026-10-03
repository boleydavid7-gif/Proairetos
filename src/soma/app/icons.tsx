import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children }: IconProps & { children: ReactNode }) {
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
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** The SOMA mark: a sprig of leaves, as on the welcome screen. */
export function Leaf({ size = 30, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" fill={color}>
      <path d="M24 45 C24.6 36 24.6 24 24 10" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24 3 C19.6 8.5 19.6 14.6 24 19 C28.4 14.6 28.4 8.5 24 3 Z" />
      <path d="M23.4 21.5 C17.2 20.8 12.6 16.8 11 11 C17.2 11.2 22 15.2 23.4 21.5 Z" />
      <path d="M24.6 21.5 C30.8 20.8 35.4 16.8 37 11 C30.8 11.2 26 15.2 24.6 21.5 Z" />
      <path d="M23.6 31 C15.8 30.6 9.6 25.6 7.4 18.6 C15.4 18.8 21.8 23.6 23.6 31 Z" />
      <path d="M24.4 31 C32.2 30.6 38.4 25.6 40.6 18.6 C32.6 18.8 26.2 23.6 24.4 31 Z" />
      <path d="M23.8 39.5 C17.4 39.4 12.2 35.6 10.2 30.2 C16.6 30.2 21.8 33.8 23.8 39.5 Z" />
      <path d="M24.2 39.5 C30.6 39.4 35.8 35.6 37.8 30.2 C31.4 30.2 26.2 33.8 24.2 39.5 Z" />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z" />
  </Icon>
);
export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5z" />
    <path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H18" />
    <path d="M9 8.5h5" />
  </Icon>
);
export const BasketIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9.5h17l-1.8 9.2a1.5 1.5 0 0 1-1.5 1.3H6.8a1.5 1.5 0 0 1-1.5-1.3z" />
    <path d="M8 9.5 11 4M16 9.5 13 4M9 13v3.5M12 13v3.5M15 13v3.5" />
  </Icon>
);
export const SproutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20v-8" />
    <path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5Z" />
    <path d="M12 14c0-3.4-2.6-5.5-6-5.5 0 3.4 2.6 5.5 6 5.5Z" />
  </Icon>
);
export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5.5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18.5" cy="12" r="1.2" />
  </Icon>
);
export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg
    width={p.size ?? 22}
    height={p.size ?? 22}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.5l3 1.8" />
  </Icon>
);
export const ServesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 15h16M5.5 15a6.5 6.5 0 0 1 13 0M12 6.5V8.5M3 18h18" />
  </Icon>
);
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
);
export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
  </Icon>
);
export const PotIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
    <path d="M2.5 10H4M20 10h1.5M9 6.5c0-1 1-1.5 1-2.5M13 6.5c0-1 1-1.5 1-2.5" />
  </Icon>
);
export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
  </Icon>
);
export const BoxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8 12 4l8 4v8l-8 4-8-4z" />
    <path d="M4 8l8 4 8-4M12 12v8" />
  </Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);
export const JarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 4h8v2.5H8zM7 6.5h10a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z" />
    <path d="M6 11h12" />
  </Icon>
);
