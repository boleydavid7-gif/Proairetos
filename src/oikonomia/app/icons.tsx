import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function Icon({ size = 22, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function ArchMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  const color = light ? '#f3eee4' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ color }}>
      <path d="M9 27V21c0-6.6 5.4-12 12-12h6c6.6 0 12 5.4 12 12v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 29h34M11 35h26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="35" cy="16" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z" />
  </Icon>
);

export const BillsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth="2.4" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5.5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18.5" cy="12" r="1.2" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m14 5-7 7 7 7M8 12h12" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m10 5 7 7-7 7M4 12h12" />
  </Icon>
);

export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const RepeatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 4h3v3M7 20H4v-3M20 7a7.5 7.5 0 0 0-12.5-1.8L5 8M4 17a7.5 7.5 0 0 0 12.5 1.8L19 16" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8M10 21h4" />
  </Icon>
);

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5V5.8A1.8 1.8 0 0 1 5.8 4H19a1 1 0 0 1 1 1v3" />
    <path d="M4 7.5h16v11.7A.8.8 0 0 1 19.2 20H4.8a.8.8 0 0 1-.8-.8z" />
    <path d="M16 13h5M17.5 13h.01" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
  </Icon>
);

export const PaperclipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 12 5.5-5.5a3.2 3.2 0 0 1 4.5 4.5l-7.5 7.5a4.8 4.8 0 0 1-6.8-6.8l7-7" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 15a2 2 0 0 0 .4 2.2l.1.1-2.2 2.2-.1-.1A2 2 0 0 0 15 19a2 2 0 0 0-1.3 1.9v.1h-3v-.1A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.2-2.2.1-.1A2 2 0 0 0 5 15a2 2 0 0 0-1.9-1.3h-.1v-3h.1A2 2 0 0 0 5 9a2 2 0 0 0-.4-2.2l-.1-.1 2.2-2.2.1.1A2 2 0 0 0 9 5a2 2 0 0 0 1.3-1.9V3h3v.1A2 2 0 0 0 15 5a2 2 0 0 0 2.2-.4l.1-.1 2.2 2.2-.1.1A2 2 0 0 0 19 9a2 2 0 0 0 1.9 1.3h.1v3h-.1A2 2 0 0 0 19 15Z" />
  </Icon>
);
