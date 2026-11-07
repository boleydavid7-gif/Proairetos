import { useEffect, useState } from 'react';
import { isAdded } from '../../app/family/added';
import { settings } from '../app/state';
import { dayText, timeText } from '../app/ui';
import { phaseOf, type Place, type Trip } from '../core/model';
import { apartText, clockIn, hoursApart, SHIFT_SOURCE, sleepShift } from '../core/timeZones';

const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Diaita's usual bedtime and hours of sleep when it is added, read from its own setting; else a plain night. */
function usualNight(): { bedtime: string; sleepHours: number } {
  try {
    if (isAdded('diaita')) {
      const saved = JSON.parse(localStorage.getItem('diaita:settings') ?? '{}') as { bedtime?: string; sleepHours?: number };
      if (saved.bedtime && saved.sleepHours) return { bedtime: saved.bedtime, sleepHours: saved.sleepHours };
    }
  } catch {
    // Unreadable: the plain night below.
  }
  return { bedtime: '22:30', sleepHours: 8 };
}

/**
 * The clock at the place (or at home, while away) and how far apart they are; for three hours or more, an optional
 * sleep shift for the days before leaving.
 */
export default function TimeThere({ trip, place = trip.place, today }: { trip: Trip; place?: Place; today: string }) {
  const home = settings.use().home?.timezone ?? deviceZone();
  const there = place?.timezone;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!there || !trip.start) return null;
  const apart = hoursApart(home, there, new Date(`${trip.start}T12:00:00`));
  if (apart === 0) return null;
  const away = phaseOf(trip, today).kind === 'now';
  const before = trip.start > today;
  const night = usualNight();
  const shift = before ? sleepShift(apart, trip.start, night.bedtime, night.sleepHours).filter((day) => day.date >= today) : [];
  return (
    <section className="card poreia-time">
      <div className="poreia-time__row">
        <div>
          <p className="label">{away ? 'At home' : `In ${place?.name}`}</p>
          <p className="poreia-time__clock">{clockIn(away ? home : there, now)}</p>
        </div>
        <p className="muted">{apartText(apart)}</p>
      </div>
      {shift.length > 0 && (
        <details className="poreia-fold">
          <summary>Shift your sleep before you go</summary>
          <ul className="poreia-agenda">
            {shift.map((day) => (
              <li key={day.date} className="poreia-shift">
                <span className="poreia-agenda__time">{dayText(day.date)}</span>
                <span>
                  Bed {timeText(day.bed)}, up {timeText(day.wake)}
                  <span className="muted"> · bright light {day.light === 'morning' ? 'soon after waking' : 'in the evening'}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="fine">An hour a day toward the clock there, from your usual {timeText(night.bedtime)} bedtime. {SHIFT_SOURCE}</p>
        </details>
      )}
    </section>
  );
}
