import { LampIcon, glyphIcon } from '../../lamplight/icons';
import { FamilyMark, MARK_LIGHT } from '../../app/family/marks';
import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children }: IconProps & { children: ReactNode }) {
  return <LampIcon glyph={{ line: children }} size={size} className={className} />;
}

export function ArchMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return <FamilyMark app="oikonomia" size={size} color={light ? MARK_LIGHT : 'currentColor'} />;
}

export const HomeIcon = glyphIcon('home', 22);

export const BillsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
);

export const CalendarIcon = glyphIcon('calendar', 22);

export const PlusIcon = glyphIcon('plus', 22);

export const MoreIcon = glyphIcon('more', 22);

export const ArrowLeftIcon = glyphIcon('arrowLeft', 22);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m10 5 7 7-7 7M4 12h12" />
  </Icon>
);

export const ChevronIcon = glyphIcon('chevron', 22);

export const CheckIcon = glyphIcon('check', 22);

export const RepeatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 4h3v3M7 20H4v-3M20 7a7.5 7.5 0 0 0-12.5-1.8L5 8M4 17a7.5 7.5 0 0 0 12.5 1.8L19 16" />
  </Icon>
);

export const BellIcon = glyphIcon('bell', 22);

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5V5.8A1.8 1.8 0 0 1 5.8 4H19a1 1 0 0 1 1 1v3" />
    <path d="M4 7.5h16v11.7A.8.8 0 0 1 19.2 20H4.8a.8.8 0 0 1-.8-.8z" />
    <path d="M16 13h5M17.5 13h.01" />
  </Icon>
);

export const DownloadIcon = glyphIcon('download', 22);

export const PaperclipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 12 5.5-5.5a3.2 3.2 0 0 1 4.5 4.5l-7.5 7.5a4.8 4.8 0 0 1-6.8-6.8l7-7" />
  </Icon>
);

export const SettingsIcon = glyphIcon('gear', 22);
