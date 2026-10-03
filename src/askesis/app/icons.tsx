import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children, fill }: IconProps & { children: ReactNode; fill?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
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

/** The Askesis mark: a peak with a lighter ridge. */
export function Mark({ size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 40 L19 10 L27 23 L32 16 L46 40 Z" fill="var(--mark, #e8ece9)" />
      <path d="M19 10 L22.3 15.3 L21 14.5 L19.5 16.2 L18 14.3 L16 15.3 Z" fill="#86d9b0" />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" />
  </Icon>
);
export const LearnIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" />
    <path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
  </Icon>
);
export const TrainIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="14" cy="4.5" r="1.8" />
    <path d="M9 21l3-6 3 2v5M7 12l3-4 4 1 2 4 3 1M12 15l-2-4" />
  </Icon>
);
export const LogIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
);
export const MoreIcon = (p: IconProps) => (
  <Icon {...p} fill>
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </Icon>
);
export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);
export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const PulseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </Icon>
);
export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const PlayIcon = (p: IconProps) => (
  <Icon {...p} fill>
    <path d="M8 5l11 7-11 7z" />
  </Icon>
);
export const PauseIcon = (p: IconProps) => (
  <Icon {...p} fill>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
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
export const KeyIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9M17 6l3 3" />
  </Icon>
);
export const TargetIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Icon>
);
export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Icon>
);
export const GaugeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4-6" />
  </Icon>
);
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
  </Icon>
);
export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);
export const BoxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4M12 11v10" />
  </Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);
export const LeafIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" />
    <path d="M5 19l7-7" />
  </Icon>
);
export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

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
