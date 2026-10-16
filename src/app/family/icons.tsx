import { LampIcon, glyphIcon } from '../../lamplight/icons';
import { FamilyMark, MARK_LIGHT, type FamilyApp } from './marks';
import type { ReactNode } from 'react';

/* Line icons shared by the newer apps (24 grid, 1.7 stroke, like the family's others). */

export type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children }: IconProps & { children: ReactNode }) {
  return <LampIcon glyph={{ line: children }} size={size} className={className} />;
}

export const HomeIcon = glyphIcon('home', 22);

export const WeekIcon = glyphIcon('calendar', 22);

export const MoreIcon = glyphIcon('more', 22);

export const PlusIcon = glyphIcon('plus', 22);

export const ChevronIcon = glyphIcon('chevron', 22);

export const BackIcon = glyphIcon('back', 22);

export const MoonIcon = glyphIcon('moon', 22);

export const SunIcon = glyphIcon('today', 22);

export const CupIcon = glyphIcon('cup', 22);

export const PlateIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="4" />
  </Icon>
);

export const WorkIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" />
  </Icon>
);

export const GlassesIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="14" r="3.5" />
    <circle cx="17" cy="14" r="3.5" />
    <path d="M10.5 14h3M3.5 13 5 7.5M20.5 13 19 7.5" />
  </Icon>
);

export const BookIcon = glyphIcon('book', 22);

export const PersonIcon = glyphIcon('person', 22);

export const PeopleIcon = glyphIcon('people', 22);

export const GiftIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="9" width="16" height="11" rx="1.5" />
    <path d="M3.5 9h17M12 9v11M12 9c-1.5-3.5-5-4-5-1.8C7 8.5 9 9 12 9zM12 9c1.5-3.5 5-4 5-1.8 0 1.3-2 1.8-5 1.8z" />
  </Icon>
);

export const CakeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 20h15v-6.5a1.5 1.5 0 0 0-1.5-1.5H6a1.5 1.5 0 0 0-1.5 1.5z" />
    <path d="M4.5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 12V9M12 6.5c-.8-.8-.8-1.7 0-3 .8 1.3.8 2.2 0 3z" />
  </Icon>
);

export const BroomIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 3.5 11 11M7.5 11.5h7l1.5 9H6z" />
    <path d="M9 15.5v5M12.5 15.5v5" />
  </Icon>
);

export const RoomIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 20V5.5A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.5 1.5V20M3 20h18" />
    <circle cx="15" cy="12.5" r=".6" fill="currentColor" />
  </Icon>
);

export const CheckIcon = glyphIcon('check', 22);

export const PrintIcon = glyphIcon('print', 22);

export const ShareIcon = glyphIcon('share', 22);

export const SettingsIcon = glyphIcon('gear', 22);

export const PillIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)" />
    <path d="m9.5 9.5 5 5" />
  </Icon>
);

export const VisitIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M8 3.5v4M16 3.5v4M4 10h16M12 12.5v5M9.5 15h5" />
  </Icon>
);

export const WeightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h18M6.5 8v8M17.5 8v8M4 9.5v5M20 9.5v5" />
  </Icon>
);

export const StretchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="4.8" r="1.8" />
    <path d="M5 9.5 12 8l7 1.5M12 8v6l-4 6M12 14l4 6" />
  </Icon>
);

export const HistoryIcon = glyphIcon('history', 22);

export const KeyIcon = glyphIcon('key', 22);

export const BoxIcon = glyphIcon('box', 22);

export const PulseIcon = glyphIcon('pulse', 22);

export const TimerIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9v4l2.5 1.5M10 3h4" />
  </Icon>
);

export const LeafIcon = glyphIcon('leaf', 22);

export const DropIcon = glyphIcon('drop', 22);

export const CameraIcon = glyphIcon('camera', 22);

/** Each app's mark: its icon's symbol without the tile (`marks.tsx`), light over pictures, else the text color. */
export function AppMark({ app, size = 30, light = false }: { app: FamilyApp; size?: number; light?: boolean }) {
  return <FamilyMark app={app} size={size} color={light ? MARK_LIGHT : 'currentColor'} />;
}
