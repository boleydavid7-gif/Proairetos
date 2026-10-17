import { glyphIcon } from '../../lamplight/icons';
import { FamilyMark, MARK_LIGHT, type FamilyApp } from './marks';

/* Line icons shared by the newer apps (24 grid, 1.7 stroke, like the family's others). */

export type IconProps = { size?: number; className?: string };


export const HomeIcon = glyphIcon('home', 22);

export const WeekIcon = glyphIcon('calendar', 22);

export const MoreIcon = glyphIcon('more', 22);

export const PlusIcon = glyphIcon('plus', 22);

export const ChevronIcon = glyphIcon('chevron', 22);

export const BackIcon = glyphIcon('back', 22);

export const MoonIcon = glyphIcon('moon', 22);

export const SunIcon = glyphIcon('today', 22);

export const CupIcon = glyphIcon('cup', 22);

export const PlateIcon = glyphIcon('plate', 22);

export const WorkIcon = glyphIcon('work', 22);

export const GlassesIcon = glyphIcon('glasses', 22);

export const BookIcon = glyphIcon('book', 22);

export const PersonIcon = glyphIcon('person', 22);

export const PeopleIcon = glyphIcon('people', 22);

export const GiftIcon = glyphIcon('gift', 22);

export const CakeIcon = glyphIcon('cake', 22);

export const BroomIcon = glyphIcon('broom', 22);

export const RoomIcon = glyphIcon('room', 22);

export const CheckIcon = glyphIcon('check', 22);

export const TrashIcon = glyphIcon('trash', 22);

export const PrintIcon = glyphIcon('print', 22);

export const ShareIcon = glyphIcon('share', 22);

export const SettingsIcon = glyphIcon('gear', 22);

export const PillIcon = glyphIcon('pill', 22);

export const VisitIcon = glyphIcon('visit', 22);

export const WeightIcon = glyphIcon('weight', 22);

export const StretchIcon = glyphIcon('stretch', 22);

export const HistoryIcon = glyphIcon('history', 22);

export const KeyIcon = glyphIcon('key', 22);

export const BoxIcon = glyphIcon('box', 22);

export const PulseIcon = glyphIcon('pulse', 22);

export const TimerIcon = glyphIcon('timer', 22);

export const LeafIcon = glyphIcon('leaf', 22);

export const DropIcon = glyphIcon('drop', 22);

export const CameraIcon = glyphIcon('camera', 22);

/** Each app's mark: its icon's symbol without the tile (`marks.tsx`), light over pictures, else the text color. */
export function AppMark({ app, size = 30, light = false }: { app: FamilyApp; size?: number; light?: boolean }) {
  return <FamilyMark app={app} size={size} color={light ? MARK_LIGHT : 'currentColor'} />;
}
