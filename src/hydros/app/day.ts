import { useEffect, useMemo, useState } from 'react';
import { useDays as usePersonalDays } from '../../app/family/personalDays';
import type { Drink } from '../core/drinks';

/** The clock, a minute at a time and again when the app comes back into view. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 60_000);
    const onShow = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return now;
}

/** The person's days (see `useDays` in the family), with the day a drink belongs to. */
export function useDays(from: string, until: string) {
  const days = usePersonalDays(from, until);
  return useMemo(() => ({ ...days, dayOf: (drink: Drink) => days.dayAt(new Date(drink.loggedAt)) }), [days]);
}
