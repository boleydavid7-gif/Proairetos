import { LampIcon, glyphIcon } from '../../lamplight/icons';
import { FamilyMark } from '../../app/family/marks';
import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children, fill }: IconProps & { children: ReactNode; fill?: boolean }) {
  return <LampIcon glyph={{ line: children }} size={size} className={className} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} />;
}

/** The Askesis mark: a peak with a lighter ridge. */
export function Mark({ size = 30 }: IconProps) {
  return <FamilyMark app="askesis" size={size} color="var(--mark, #e8ece9)" />;
}

export const HomeIcon = glyphIcon('home', 22);
export const LearnIcon = glyphIcon('book', 22);
export const TrainIcon = glyphIcon('run', 22);
export const LogIcon = glyphIcon('log', 22);
export const MoreIcon = glyphIcon('more', 22);
export const BackIcon = glyphIcon('back', 22);
export const ChevronIcon = glyphIcon('chevron', 22);
export const ClockIcon = glyphIcon('clock', 22);
export const PulseIcon = glyphIcon('pulse', 22);
export const ListIcon = glyphIcon('list', 22);
export const PlusIcon = glyphIcon('plus', 22);
export const PlayIcon = glyphIcon('play', 22);
export const PauseIcon = glyphIcon('pause', 22);
export const CheckIcon = glyphIcon('check', 22);
export const SoundIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </Icon>
);
export const MuteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M17 10l4 4M21 10l-4 4" />
  </Icon>
);
export const KeyIcon = glyphIcon('key', 22);
export const TargetIcon = glyphIcon('target', 22);
export const HeartIcon = glyphIcon('heart', 22);
export const GaugeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4-6" />
  </Icon>
);
export const ShieldIcon = glyphIcon('shield', 22);
export const GearIcon = glyphIcon('gear', 22);
export const BoxIcon = glyphIcon('box', 22);
export const InfoIcon = glyphIcon('info', 22);
export const LeafIcon = glyphIcon('leaf', 22);
export const LockIcon = glyphIcon('lock', 22);

/** Faces for how a workout felt, plain line drawings. */
export function FeltFace({ felt, size = 30 }: { felt: 'easy' | 'good' | 'challenging' | 'hard'; size?: number }) {
  const mouth = {
    easy: 'M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5',
    good: 'M8 14c1.1 1.6 2.4 2.4 4 2.4s2.9-.8 4-2.4',
    challenging: 'M8.5 15.5h7',
    hard: 'M8.5 16.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5',
  }[felt];
  return (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.4} />
      <path d={mouth} />
    </Icon>
  );
}
