import { LampIcon, glyphIcon } from '../../lamplight/icons';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const icon = (children: React.ReactNode, { size = 24, ...props }: IconProps = {}) => <LampIcon glyph={{ line: children }} size={size} {...props} />;

export const DropIcon = glyphIcon('drop', 24);
export const CupIcon = glyphIcon('cup', 24);
export const LeafIcon = glyphIcon('leaf', 24);
export const BoltIcon = (props: IconProps) => icon(<path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />, props);
export const BubblesIcon = (props: IconProps) => icon(<><circle cx="9" cy="12" r="3" /><circle cx="16" cy="7" r="2" /><circle cx="17" cy="17" r="2" /><circle cx="5" cy="5" r="1.5" /></>, props);
export const MoreIcon = glyphIcon('more', 24);
export const BackIcon = glyphIcon('back', 24);
export const CloseIcon = glyphIcon('close', 24);
export const PlusIcon = glyphIcon('plus', 24);
export const MinusIcon = glyphIcon('minus', 24);
export const PencilIcon = glyphIcon('pencil', 24);
export const ClockIcon = glyphIcon('clock', 24);
export const ChartIcon = glyphIcon('chart', 24);
export const SunIcon = glyphIcon('today', 24);
export const MoonIcon = glyphIcon('moon', 24);
export const WaveIcon = (props: IconProps) => icon(<><path d="M3 9c3-2 5-2 8 0s5 2 10 0M3 15c3-2 5-2 8 0s5 2 10 0" /></>, props);
export const ScaleIcon = (props: IconProps) => icon(<><path d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7ZM17 7l-3 6a3 3 0 0 0 6 0l-3-6ZM8 21h8" /></>, props);
export const GearIcon = glyphIcon('gear', 24);

export const iconForKind = (kind: string, props: IconProps = {}) => {
  if (kind === 'coffee') return <CupIcon {...props} />;
  if (kind === 'tea') return <LeafIcon {...props} />;
  if (kind === 'electrolyte') return <BoltIcon {...props} />;
  if (kind === 'sparkling') return <BubblesIcon {...props} />;
  if (kind === 'other') return <MoreIcon {...props} />;
  return <DropIcon {...props} />;
};
