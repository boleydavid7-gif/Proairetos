import { useEffect, useState } from 'react';
import { tap } from '../../app/feel';
import { stored } from '../../app/family/shell';
import { cancelBell, scheduleBell } from '../../praxis/bell';
import type { DiaitaNav } from '../app/App';
import { SOURCES } from '../core/rhythm';

/*
 * A nap timer: a length, then a bell on the audio clock so it rings with the screen locked. Lengths come with what
 * the research found; the person chooses. The end is kept on this device, so leaving and coming back keeps the timer.
 */
const LENGTHS = [
  { minutes: 10, line: 'Short: alert soon after waking.', source: 'short-nap' as const },
  { minutes: 20, line: 'Short, with a little more grogginess on waking.', source: 'short-nap' as const },
  { minutes: 30, line: 'Longer: may take a while to feel awake.', source: 'short-nap' as const },
  { minutes: 90, line: 'A full cycle, as before a first night shift.', source: 'nap' as const },
];

const nap = stored<{ endsAt?: number; minutes?: number }>('diaitaNap', () => ({}));
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;

export default function NapPage({ nav }: { nav: DiaitaNav }) {
  const current = nap.use();
  const [now, setNow] = useState(Date.now());
  const [shown, setShown] = useState<string>();
  useEffect(() => {
    if (!current.endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [current.endsAt]);

  const left = current.endsAt ? Math.ceil((current.endsAt - now) / 1000) : 0;
  const start = (minutes: number) => {
    tap();
    // A few minutes to fall asleep are left to the person: the bell rings at the length chosen.
    void scheduleBell(minutes * 60, 3);
    nap.save({ endsAt: Date.now() + minutes * 60_000, minutes });
    setNow(Date.now());
  };
  const stop = () => {
    cancelBell();
    nap.save({});
  };

  return (
    <div className="page diaita-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Nap</p>
        <span />
      </div>

      {current.endsAt && left > 0 ? (
        <section className="diaita-nap">
          <p className="card__eyebrow">{current.minutes} min</p>
          <p className="diaita-nap__time">{clock(left)}</p>
          <button type="button" className="button-quiet" onClick={stop}>Stop</button>
        </section>
      ) : current.endsAt ? (
        <section className="card">
          <h2 className="card__title">Nap over</h2>
          <button type="button" className="button-main" onClick={stop}>Done</button>
        </section>
      ) : (
        <ul className="chore-list">
          {LENGTHS.map((each) => (
            <li key={each.minutes} className="chore">
              <button type="button" className="chore__open" onClick={() => setShown(shown === each.source + each.minutes ? undefined : each.source + each.minutes)}>
                <span>{each.minutes} minutes</span>
                <small>{shown === each.source + each.minutes ? SOURCES[each.source] : each.line}</small>
              </button>
              <button type="button" className="button-quiet" onClick={() => start(each.minutes)}>Start</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
