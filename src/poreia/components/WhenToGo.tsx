import { useEffect, useState, type CSSProperties } from 'react';
import { Waiting } from '../../lamplight/Waiting';
import { settings, today } from '../app/state';
import { degrees, pastYear } from '../app/world';
import { monthsOf, monthsTouched, type MonthWeather } from '../core/climate';
import type { Place } from '../core/model';

const monthName = (month: number, style: 'long' | 'narrow' | 'short') => new Date(2026, month - 1, 15).toLocaleDateString(undefined, { month: style });

/**
 * When to go: last year at the place, month by month. One bar a month from the usual low to the usual high, all on one
 * scale; a tap shows that month in words. Months the trip's dates touch carry a dot. A table holds the same numbers.
 */
export default function WhenToGo({ place, start, end }: { place: Place; start?: string; end?: string }) {
  const unit = settings.use().temperature;
  const [months, setMonths] = useState<MonthWeather[]>();
  const [problem, setProblem] = useState(false);
  const touched = monthsTouched(start, end);
  const [chosen, setChosen] = useState<number>(() => (start ? Number(start.slice(5, 7)) : Number(today().slice(5, 7))));

  useEffect(() => {
    setMonths(undefined);
    setProblem(false);
    if (place.lat === undefined || place.lon === undefined) return;
    let live = true;
    pastYear(place.lat, place.lon, today())
      .then((days) => live && setMonths(monthsOf(days)))
      .catch(() => live && setProblem(true));
    return () => {
      live = false;
    };
  }, [place.lat, place.lon]);

  useEffect(() => {
    if (start) setChosen(Number(start.slice(5, 7)));
  }, [start]);

  if (place.lat === undefined) return null;
  const lowest = months?.length ? Math.floor(Math.min(...months.map((each) => each.low))) : 0;
  const highest = months?.length ? Math.ceil(Math.max(...months.map((each) => each.high))) : 1;
  const span = Math.max(1, highest - lowest);
  const picked = months?.find((each) => each.month === chosen) ?? months?.[0];

  return (
    <section className="card poreia-when">
      <h2 className="card__title">When to go</h2>
      {!months && !problem && (
        <p className="muted">
          <Waiting>Looking…</Waiting>
        </p>
      )}
      {problem && <p className="muted">Couldn’t get last year’s weather. Check the connection.</p>}
      {months && months.length > 0 && picked && (
        <>
          <p className="poreia-when__picked" aria-live="polite">
            <strong>{monthName(picked.month, 'long')}</strong> · highs about {degrees(picked.high, unit)}, lows {degrees(picked.low, unit)} · about {picked.rainyDays} rainy {picked.rainyDays === 1 ? 'day' : 'days'}
          </p>
          <div className="poreia-when__chart" role="group" aria-label="Last year's highs and lows by month">
            {months.map((each) => (
              <button
                key={each.month}
                type="button"
                className={`poreia-when__month${each.month === picked.month ? ' is-picked' : ''}`}
                aria-pressed={each.month === picked.month}
                aria-label={`${monthName(each.month, 'long')}: highs about ${degrees(each.high, unit)}, lows ${degrees(each.low, unit)}, about ${each.rainyDays} rainy days`}
                onClick={() => setChosen(each.month)}
              >
                <span className="poreia-when__track">
                  <span className="poreia-when__bar" style={{ '--top': `${((highest - each.high) / span) * 100}%`, '--height': `${((each.high - each.low) / span) * 100}%` } as CSSProperties} />
                </span>
                <span className="poreia-when__name">{monthName(each.month, 'narrow')}</span>
                <span className={`poreia-when__mark${touched.has(each.month) ? ' is-on' : ''}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="fine">
            The past twelve months as recorded{touched.size ? '; a dot marks your dates' : ''}. From Open-Meteo’s archive.
          </p>
          <details className="poreia-fold">
            <summary>As a table</summary>
            <table className="poreia-when__table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">High</th>
                  <th scope="col">Low</th>
                  <th scope="col">Rainy days</th>
                </tr>
              </thead>
              <tbody>
                {months.map((each) => (
                  <tr key={each.month}>
                    <th scope="row">{monthName(each.month, 'short')}</th>
                    <td>{degrees(each.high, unit)}</td>
                    <td>{degrees(each.low, unit)}</td>
                    <td>{each.rainyDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
