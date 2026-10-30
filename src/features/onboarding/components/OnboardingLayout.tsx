import type { CSSProperties, ReactNode, TouchEventHandler } from 'react';
import BackgroundScene from './BackgroundScene';

type Props = {
  children: ReactNode;
  /** Where the person is: the scene travels and its light changes with the steps (dusk, the lamp, morning). */
  step?: number;
  count?: number;
  scene?: 'valley' | 'sea';
  onTouchStart?: TouchEventHandler;
  onTouchEnd?: TouchEventHandler;
};

export default function OnboardingLayout({ children, step = 0, count = 1, scene = 'valley', onTouchStart, onTouchEnd }: Props) {
  const t = count > 1 ? step / (count - 1) : 0;
  const light = {
    '--pan': `${Math.round(18 + t * 64)}%`,
    '--dusk': (0.74 - t * 0.3).toFixed(3),
    '--lamp': (0.15 + Math.sin(Math.PI * Math.min(1, t * 1.25)) * 0.85).toFixed(3),
    '--morning': Math.max(0, (t - 0.55) / 0.45).toFixed(3),
  } as CSSProperties;
  return (
    <main className="onboarding-layout" style={light} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <BackgroundScene scene={scene} />
      {children}
    </main>
  );
}
