import { glyphIcon } from '../../lamplight/icons';
import { FamilyMark, MARK_LIGHT } from '../../app/family/marks';

export function ArchMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return <FamilyMark app="oikonomia" size={size} color={light ? MARK_LIGHT : 'currentColor'} />;
}

export const HomeIcon = glyphIcon('home', 22);

export const BillsIcon = glyphIcon('bills', 22);

export const CalendarIcon = glyphIcon('calendar', 22);

export const PlusIcon = glyphIcon('plus', 22);

export const MoreIcon = glyphIcon('more', 22);

export const ArrowLeftIcon = glyphIcon('arrowLeft', 22);

export const ArrowRightIcon = glyphIcon('arrowRight', 22);

export const ChevronIcon = glyphIcon('chevron', 22);

export const CheckIcon = glyphIcon('check', 22);

export const RepeatIcon = glyphIcon('repeat', 22);

export const BellIcon = glyphIcon('bell', 22);

export const WalletIcon = glyphIcon('wallet', 22);

export const DownloadIcon = glyphIcon('download', 22);

export const PaperclipIcon = glyphIcon('paperclip', 22);

export const SettingsIcon = glyphIcon('gear', 22);
