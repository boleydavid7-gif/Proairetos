import type { ReactNode } from 'react';

/* Line icons shared by the newer apps (24 grid, 1.7 stroke, like the family's others). */

export type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z" />
  </Icon>
);

export const WeekIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h2M14 14h2M8 17h2" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18" cy="12" r="1.2" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </Icon>
);

export const CupIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
    <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M9 3.5c0 1.2 1 1.3 1 2.5M12.5 3.5c0 1.2 1 1.3 1 2.5" />
  </Icon>
);

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

export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" />
    <path d="M5 16.5a3 3 0 0 1 3-3h10" />
  </Icon>
);

export const PersonIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
  </Icon>
);

export const PeopleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5M15.5 6.2a3 3 0 0 1 0 5.6M17 14.6c2 .5 3.2 2.2 3.5 4.9" />
  </Icon>
);

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

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const PrintIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 9V3.5h10V9M7 17.5H5.5A1.5 1.5 0 0 1 4 16v-5.5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 1-1.5 1.5H17" />
    <rect x="7" y="14" width="10" height="6.5" rx="0.5" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4M8 7.5 12 3.5l4 4M6 11v8a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19v-8" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
  </Icon>
);

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

export const HistoryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4.5v4h4M12 8v4.5l3 2" />
  </Icon>
);

export const KeyIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="12" r="3.5" />
    <path d="M11.5 12H21M18 12v3M15 12v2" />
  </Icon>
);

export const BoxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3.5 8 4v9l-8 4-8-4v-9z" />
    <path d="m4 7.5 8 4 8-4M12 11.5v9" />
  </Icon>
);

export const PulseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
  </Icon>
);

export const TimerIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9v4l2.5 1.5M10 3h4" />
  </Icon>
);

/** Each app's mark: a simple drawn sign in a round. */
export function AppMark({ app, size = 30, light = false }: { app: 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema'; size?: number; light?: boolean }) {
  const color = light ? '#f3eee4' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ color }} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {app === 'diaita' && (
        <>
          <circle cx="24" cy="24" r="15" />
          <path d="M24 9a15 15 0 0 0 0 30" fill="currentColor" stroke="none" opacity="0.9" />
          <path d="M24 15v9l6 4" />
        </>
      )}
      {app === 'philia' && (
        <>
          <circle cx="18" cy="24" r="10" />
          <circle cx="30" cy="24" r="10" />
        </>
      )}
      {app === 'therapeia' && (
        <g transform="rotate(-45 24 24)">
          <rect x="11" y="18" width="26" height="12" rx="6" />
          <path d="M24 18v12h7a6 6 0 0 0 0-12z" fill="currentColor" stroke="none" opacity="0.9" />
        </g>
      )}
      {app === 'dynamis' && (
        <>
          <path d="M16.5 24.5 15 17q-.6-4.5 4-4.5h10q4.6 0 4 4.5l-1.5 7.5" />
          <path d="M24 19a10 10 0 0 1 7.7 16.5H16.3A10 10 0 0 1 24 19z" fill="currentColor" stroke="none" opacity="0.9" />
          <path d="M14 37.5h20" />
        </>
      )}
      {app === 'ktema' && (
        <>
          <circle cx="17" cy="24" r="7" />
          <path d="M24 24h15M34 24v5M29.5 24v3.5" />
        </>
      )}
      {app === 'ergon' && (
        <>
          <path d="M9 22 24 10l15 12" />
          <path d="M13 19v17h22V19" />
          <path d="m19 27 4 4 7-8" />
        </>
      )}
    </svg>
  );
}
