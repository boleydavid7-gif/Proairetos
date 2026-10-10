import { useState, type FormEvent } from 'react';
import { findPlace, placeFromDevice, saveWeatherSettings, weatherSettings, type WeatherSettings } from '../../app/weather/weather';

/** Outdoor weather on Today and with new reflections. Off until turned on. */
export default function WeatherSection() {
  const [settings, setSettings] = useState(weatherSettings);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (next: WeatherSettings) => {
    setSettings(next);
    saveWeatherSettings(next);
  };

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    await run(async () => {
      const found = await findPlace(query);
      setMatches(found);
      if (found.length === 0) setError('No place by that name. Try a nearby town.');
    });
  }

  return (
    <section className="settings-card" aria-label="Weather">
      <p className="section-description">
        Shows the sky beside the date on Today and notes it with what you write in Reflect.
      </p>
      <button type="button" className="toggle-row" aria-pressed={settings.on} onClick={() => update({ ...settings, on: !settings.on })}>
        <span className={`toggle-switch${settings.on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span>Show the weather</span>
      </button>

      {settings.on && (
        <>
          <p className="sheet__label">Place</p>
          {settings.place && <p className="section-description">{settings.place.name}</p>}
          <button
            type="button"
            className="chip chip--wide"
            disabled={busy}
            onClick={() =>
              run(async () => {
                update({ ...settings, place: await placeFromDevice() });
                setMatches([]);
              })
            }
          >
            Use my location
          </button>
          <form className="inline-form" onSubmit={search}>
            <input
              className="field-input"
              aria-label="Town or city"
              placeholder="Or type a town"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="button-accent" disabled={busy || !query.trim()}>
              Find
            </button>
          </form>
          {matches.length > 0 && (
            <ul className="place-matches">
              {matches.map((match) => (
                <li key={`${match.lat},${match.lon}`}>
                  <button
                    type="button"
                    className="place-matches__option"
                    onClick={() => {
                      update({ ...settings, place: match });
                      setMatches([]);
                      setQuery('');
                    }}
                  >
                    {match.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="sheet__label">Temperature</p>
          <div className="chip-row" role="group" aria-label="Temperature unit">
            {(['C', 'F'] as const).map((unit) => (
              <button key={unit} type="button" className="chip" aria-pressed={settings.unit === unit} onClick={() => update({ ...settings, unit })}>
                °{unit}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="sheet__hint">
        From Open-Meteo, a free weather service with no account or tracking. Your place is kept on this device, rounded
        to about a kilometre, and only that is sent to ask for the weather.
      </p>
    </section>
  );
}
