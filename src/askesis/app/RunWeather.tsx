import { useState } from 'react';
import { weatherSettings } from '../../app/weather/weather';
import { hourLine, runHourFor, runNotes } from '../core/runWeather';
import { useSettings } from './state';
import { locate, setWeatherAside, useRunWeather, weatherSetAside } from './runWeather';

const clock = (hour: string) => new Date(`${hour}:00`).toLocaleTimeString(undefined, { hour: 'numeric' });

/** The weather at the hour of today's run, with what the sources say about it. `compact` is Home's single line. */
export default function RunWeather({ date, runAt, compact }: { date: string; runAt?: string; compact?: boolean }) {
  const settings = useSettings();
  const [aside, setAside] = useState(weatherSetAside);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string>();
  const hour = runHourFor(date, runAt, new Date());
  const weather = useRunWeather(aside ? undefined : hour);
  if (aside) return null;
  const fahrenheit = weatherSettings().unit === 'F';
  const degrees = (celsius: number) => `${Math.round(fahrenheit ? (celsius * 9) / 5 + 32 : celsius)}°`;
  const windUnit = settings.unit === 'mi' ? 'mph' : 'km/h';

  if (weather.none) {
    if (compact) return null;
    return (
      <section className="card run-weather" aria-label="Weather at your run">
        <h2 className="run-weather__head">Weather at your run</h2>
        <div className="button-row">
          <button
            type="button"
            className="button-quiet"
            disabled={asking}
            onClick={() => {
              setAsking(true);
              setProblem(undefined);
              locate()
                .then(() => weather.refresh())
                .catch((error: Error) => setProblem(error.message))
                .finally(() => setAsking(false));
            }}
          >
            Use where I am
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setWeatherAside(true);
              setAside(true);
            }}
          >
            Not for me
          </button>
        </div>
        {problem && <p className="hint">{problem}</p>}
      </section>
    );
  }
  if (!weather.hour) return null;
  const line = hourLine(weather.hour, clock(hour), degrees, windUnit);
  if (compact) return <p className="muted run-weather__line">{line}</p>;
  const { notes } = runNotes(weather.hour, degrees);
  return (
    <section className="card run-weather" aria-label="Weather at your run">
      <h2 className="run-weather__head">Weather at your run</h2>
      <p className="run-weather__line">{line}</p>
      {notes.length > 0 && (
        <ul className="run-weather__notes">
          {notes.map((note) => (
            <li key={note.text}>{note.text}</li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <details className="more-about">
          <summary>Sources</summary>
          <ol className="sources-list">
            {[...new Set(notes.map((note) => note.source))].map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
