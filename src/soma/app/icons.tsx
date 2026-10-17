import { glyphIcon } from '../../lamplight/icons';

type IconProps = { size?: number; className?: string };


/** The Soma mark: a sprig of leaves, as on the welcome screen. */
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

export const HomeIcon = glyphIcon('home', 22);
export const BookIcon = glyphIcon('book', 22);
export const BasketIcon = glyphIcon('basket', 22);
export const SproutIcon = glyphIcon('sprout', 22);
export const MoreIcon = glyphIcon('more', 22);
export const LinkIcon = glyphIcon('link', 22);
export const PlusIcon = glyphIcon('plus', 22);
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
export const ClockIcon = glyphIcon('clock', 22);
export const ServesIcon = glyphIcon('serves', 22);
export const SearchIcon = glyphIcon('search', 22);
export const ShareIcon = glyphIcon('share', 22);
export const PotIcon = glyphIcon('pot', 22);
export const GearIcon = glyphIcon('gear', 22);
export const BoxIcon = glyphIcon('box', 22);
export const InfoIcon = glyphIcon('info', 22);
export const JarIcon = glyphIcon('jar', 22);
