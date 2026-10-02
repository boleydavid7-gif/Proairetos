import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Icon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2z" />
      <path d="M12 6.5v13" />
    </Icon>
  );
}

export function CaptureIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </Icon>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 5.5l1.6 4.9 4.9 1.6-4.9 1.6-1.6 4.9-1.6-4.9-4.9-1.6 4.9-1.6z" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 8 4.5 8 8.5s-8 4-8 8.5M16 3.5c0 4.5-8 4.5-8 8.5s8 4 8 8.5" />
    </Icon>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 13.5l2.5-8h11l2.5 8v5H4z" />
      <path d="M4 13.5h4.5l1 2h5l1-2H20" />
    </Icon>
  );
}

export function PenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.5 4.5l4 4L9 19H5v-4z" />
    </Icon>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
      <circle cx="12" cy="12" r="6.6" />
    </Icon>
  );
}

export function BreatheIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 9c2.8-2.4 5.7-2.4 8.5 0s5.7 2.4 8.5 0M3.5 15c2.8-2.4 5.7-2.4 8.5 0s5.7 2.4 8.5 0" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </Icon>
  );
}

export function FeatherIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 19 14.5 9.5M6.5 17.5C5.5 11 9 5 19 4.5c-.5 10-6.5 13.5-12.5 13z" />
    </Icon>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.5V11M12 13c0-4-2.5-6.5-7-6.5 0 4 2.5 6.5 7 6.5zM12 11c0-3.5 2.2-5.5 6.5-5.5 0 3.5-2.2 5.5-6.5 5.5z" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z" />
      <path d="M12 3.5v17" />
    </Icon>
  );
}

export function MountainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 19.5l7-11 4 6 2.5-3.5 5.5 8.5z" />
      <path d="M7.6 11.5l1.9 1.5 1.6-1.4" />
    </Icon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" />
    </Icon>
  );
}

export function ScalesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v16M8 20h8M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z" />
    </Icon>
  );
}

export function ChecklistIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4.5" width="5" height="5" rx="1" />
      <rect x="4" y="14.5" width="5" height="5" rx="1" />
      <path d="M12.5 7h7.5M12.5 17h7.5" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={2.6} />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 12.5l4 4 9-9" />
    </Icon>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V10" />
      <path d="M8 10h4.5M8 13.5h7M8 17h5M17.5 3.5l3 3-5 5H12.5v-3z" />
    </Icon>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 18.5h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 10 4.3 4.3 0 0 0 7 18.5z" />
    </Icon>
  );
}

export function PartlyCloudyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4v1.5M4.2 6.2l1 1M3 11h1.5M13.8 6.2l-1 1" />
      <path d="M6.3 12.3A3.6 3.6 0 0 1 12.6 9" />
      <path d="M9 19.5h8.5a3 3 0 0 0 .3-6 4.6 4.6 0 0 0-8.8-1.2A3.6 3.6 0 0 0 9 19.5z" />
    </Icon>
  );
}

export function RainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 6.5 4.3 4.3 0 0 0 7 15z" />
      <path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" />
    </Icon>
  );
}

export function StormIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 6.5 4.3 4.3 0 0 0 7 15z" />
      <path d="M12.5 15.5l-2 3h3l-2 3" />
    </Icon>
  );
}

export function BulbIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v2h6v-2c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3.5z" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12.5V4.5h8l9 9-8 8z" />
      <circle cx="8" cy="9" r="1.3" />
    </Icon>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v16l-5-3.5L7 20z" />
    </Icon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </Icon>
  );
}

export function SnowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 13h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 4.5 4.3 4.3 0 0 0 7 13z" />
      <path d="M8.5 16.5v.01M12 18v.01M15.5 16.5v.01M10 20.5v.01M14 20.5v.01" strokeWidth={2.4} />
    </Icon>
  );
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="7" width="17" height="12.5" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17M10.5 12.5v1.5h3v-1.5" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Icon>
  );
}
