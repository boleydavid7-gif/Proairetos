import { useEffect } from 'react';
import { goBack } from './backStack';

const EDGE = 28;
const DISTANCE = 70;

/**
 * Swipe from the left edge to go back. Only in the installed app: iPhone
 * home-screen apps have no back gesture of their own, while browsers and
 * Android already send their own back.
 */
export default function EdgeSwipe() {
  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!standalone && !('__PROAIRETOS_EDGE_SWIPE__' in window)) return;

    let start: { x: number; y: number } | null = null;
    const down = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = touch && touch.clientX <= EDGE ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const up = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      start = null;
      if (dx > DISTANCE && dy < dx / 2) goBack();
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchend', up);
    };
  }, []);

  return null;
}
