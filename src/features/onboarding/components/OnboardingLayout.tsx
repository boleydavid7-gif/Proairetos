import { useEffect, useState, type CSSProperties, type ReactNode, type TouchEventHandler } from 'react';
import BackgroundScene from './BackgroundScene';
import { lampSeed, schemeOf, wallpaperOf, type ColorChoice, type Room } from '../../../app/lamplight';
import { triple } from '../../../lamplight/color';

type Props = {
  children: ReactNode;
  scene?: 'room' | 'sea';
  room: Room;
  color: ColorChoice;
  /** The lamp is lit (after the first step's hold). */
  lit: boolean;
  /** Leaving for Today: the words go and the room stays. */
  leaving?: boolean;
  onTouchStart?: TouchEventHandler;
  onTouchEnd?: TouchEventHandler;
};

const WIDE = '(min-width: 62rem)';

export default function OnboardingLayout({ children, scene = 'room', room, color, lit, leaving, onTouchStart, onTouchEnd }: Props) {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE).matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.(WIDE);
    if (!query) return;
    const change = () => setWide(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  // The welcome is always the dark room: its words are light over the wallpaper in either appearance.
  const s = schemeOf(room, lampSeed(room, color), 'dark');
  const style = {
    '--ob-wall': wallpaperOf(room, 'dark', wide),
    '--ob-page': s.page,
    '--ob-card': s.card,
    '--ob-inset': s.inset,
    '--ob-ink': s.ink,
    '--ob-ink-2': s.ink2,
    '--ob-ink-3': s.ink3,
    '--ob-hair': s.hair,
    '--ob-lamp': s.lamp,
    '--ob-lamp-fill': s.lampFill,
    '--ob-on-lamp': s.onLamp,
    '--ob-lamp-rgb': triple(s.lamp),
    '--ob-page-rgb': triple(s.page),
  } as CSSProperties;
  return (
    <main
      className="onboarding-layout"
      data-lit={lit || undefined}
      data-leaving={leaving || undefined}
      style={style}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <BackgroundScene scene={scene} />
      {children}
    </main>
  );
}
