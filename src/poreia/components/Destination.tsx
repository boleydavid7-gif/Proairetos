import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PlusIcon } from '../../app/family/icons';
import { addDays, daysBetween } from '../../core/scheduling/dates';
import { Waiting } from '../../lamplight/Waiting';
import { settings } from '../app/state';
import { datesText, dayText, Outbound, timeText } from '../app/ui';
import { airportFor, type Airport, travelReady, countryFacts, degrees, eventsNear, eventsReady, forecast, guideFor, holidays, lastYear, ratesInto, sightsNear, skyWord, type Country, type DayWeather, type Guide, type Holiday, type LiveEvent, type Sight } from '../app/world';
import { SEARCH_KINDS, SITE_ABOUT, searchLinks, type SearchKind } from '../core/links';
import type { Place } from '../core/model';
import type { PoreiaNav } from '../app/App';
import { FlightSearch, StayResults } from './Searches';

/*
 * The parts of a place Poreia shows on a trip and in Explore: weather for the dates, booking searches, the guide,
 * country facts with holidays, sights nearby and live events. Each loads on its own and says plainly when it cannot.
 */

export type Target = { place: Place; from?: Place; start?: string; end?: string; travelers: number };

export function useLoad<T>(key: string | undefined, load: () => Promise<T>): { value?: T; unreached: boolean; loading: boolean } {
  // `done` marks an answer, even an empty one: a place with no guide is finished, not still loading.
  const [state, setState] = useState<{ key?: string; value?: T; unreached: boolean; done: boolean }>({ unreached: false, done: false });
  useEffect(() => {
    if (!key) return;
    let live = true;
    setState({ key, unreached: false, done: false });
    load()
      .then((value) => live && setState({ key, value, unreached: false, done: true }))
      .catch(() => live && setState({ key, unreached: true, done: true }));
    return () => {
      live = false;
    };
  }, [key]);
  const current = state.key === key;
  return { value: current ? state.value : undefined, unreached: current && state.unreached, loading: Boolean(key) && !(current && state.done) };
}

/** The forecast for the trip's days when they are near, else the same days last year as recorded. */
export function Weather({ target, today }: { target: Target; today: string }) {
  const unit = settings.use().temperature;
  const { lat, lon } = target.place;
  const start = target.start ?? today;
  const end = target.end ?? (target.start ? target.start : addDays(today, 6));
  const near = daysBetween(today, start) <= 14;
  const key = lat !== undefined && lon !== undefined ? `${lat},${lon},${start},${end},${near}` : undefined;
  const { value, unreached, loading } = useLoad<DayWeather[]>(key, () => (near ? forecast(lat!, lon!) : lastYear(lat!, lon!, start, end)));
  if (!key) return null;
  const shift = (date: string) => (near ? date : `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`);
  const days = (value ?? []).filter((day) => shift(day.date) >= start && shift(day.date) <= end).slice(0, 16);
  return (
    <section className="card">
      <h2 className="card__title">{near ? 'Weather' : 'Weather a year ago'}</h2>
      {loading && <p className="muted"><Waiting>Looking…</Waiting></p>}
      {unreached && <p className="muted">Couldn’t get the weather. Check the connection.</p>}
      {!near && days.length > 0 && <p className="fine">Last year on these dates. Forecasts start two weeks out.</p>}
      {days.length > 0 && (
        <ul className="poreia-weather">
          {days.map((day) => (
            <li key={day.date}>
              <span>{dayText(shift(day.date))}</span>
              <span className="muted">{near ? skyWord(day.code) : day.rain ? `${Math.round(day.rain)} mm rain` : 'Dry'}</span>
              <span className="poreia-weather__temps">
                {degrees(day.high, unit)} <span className="muted">{degrees(day.low, unit)}</span>
              </span>
              {near && day.rain !== undefined && <span className="poreia-weather__rain">{day.rain}%</span>}
            </li>
          ))}
        </ul>
      )}
      {!loading && !unreached && days.length === 0 && <p className="muted">No weather for these dates yet.</p>}
      <p className="fine">
        Weather from <Outbound href="https://open-meteo.com/">Open-Meteo</Outbound>.
      </p>
    </section>
  );
}

/** The airport a place flies from, once it has a map point; undefined until found or when none is near. */
function useAirport(place?: Place): Airport | undefined {
  const lat = place?.lat;
  const lon = place?.lon;
  const { value } = useLoad<Airport | undefined>(lat !== undefined && lon !== undefined ? `airport.${lat.toFixed(2)},${lon.toFixed(2)}` : undefined, () => airportFor(lat!, lon!));
  return value;
}

/** Searches on the booking sites, filled in from the trip. */
export function BookLinks({ target, initial, nav, tripId }: { target: Target; initial?: SearchKind; nav?: PoreiaNav; tripId?: string }) {
  const [kind, setKind] = useState<SearchKind>(initial ?? 'stays');
  const ready = useLoad('travel-ready', travelReady);
  const home = settings.use().home;
  const origin = target.from ?? home;
  // Airports only matter to flights and cars; looked up when one of those is chosen, kept half a year.
  const wantsCodes = kind === 'flights' || kind === 'cars';
  const toAirport = useAirport(wantsCodes ? target.place : undefined);
  const fromAirport = useAirport(kind === 'flights' ? origin : undefined);
  const links = searchLinks(kind, {
    to: target.place.label ?? target.place.name,
    from: origin?.label ?? origin?.name,
    start: target.start,
    end: target.end,
    travelers: target.travelers,
    fromCode: fromAirport?.code,
    toCode: toAirport?.code,
    country: target.place.countryCode,
  });
  const nights = target.start && target.end && target.end > target.start ? daysBetween(target.start, target.end) : 0;
  const filled = [kind === 'flights' && fromAirport && toAirport ? 'airports' : 'place', target.start ? 'dates' : undefined, target.travelers > 1 ? 'travelers' : undefined].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1');
  return (
    <section className="card">
      <h2 className="card__title">Find and book</h2>
      <div className="chip-row poreia-scroll-chips" role="group" aria-label="What to look for">
        {SEARCH_KINDS.map((each) => (
          <button key={each.id} type="button" className="chip" aria-pressed={kind === each.id} onClick={() => setKind(each.id)}>
            {each.label}
          </button>
        ))}
      </div>
      {kind === 'stays' && ready.value?.stays && nav && <StayResults target={target} nav={nav} tripId={tripId} />}
      {kind === 'flights' && ready.value?.flights && <FlightSearch target={target} />}
      {((kind === 'stays' && ready.value?.stays && nav) || (kind === 'flights' && ready.value?.flights)) && <p className="label">Also on</p>}
      <dl className="detail-list poreia-search-for">
        {kind === 'flights' || kind === 'trains' || kind === 'ferries' ? (
          <>
            <dt>From</dt>
            <dd>{fromAirport && kind === 'flights' ? `${fromAirport.name} (${fromAirport.code})` : (origin?.label ?? origin?.name ?? 'Not set')}</dd>
            <dt>To</dt>
            <dd>{toAirport && kind === 'flights' ? `${toAirport.name} (${toAirport.code})` : (target.place.label ?? target.place.name)}</dd>
          </>
        ) : (
          <>
            <dt>Where</dt>
            <dd>{toAirport && kind === 'cars' ? `${target.place.label ?? target.place.name}, from ${toAirport.code}` : (target.place.label ?? target.place.name)}</dd>
          </>
        )}
        <dt>When</dt>
        <dd>{target.start ? `${datesText(target.start, target.end)}${nights > 0 ? ` · ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}` : 'No dates yet'}</dd>
        <dt>Travelers</dt>
        <dd>{target.travelers}</dd>
      </dl>
      <ul className="poreia-links">
        {links.map((link) => (
          <li key={link.site + link.url}>
            <Outbound href={link.url}>
              <span>{link.site}</span>
              {SITE_ABOUT[link.site] && <span className="muted">{SITE_ABOUT[link.site]}</span>}
              <span className="fine">{link.front ? 'Opens the site' : `Opens with your ${filled}`}</span>
            </Outbound>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Wikivoyage's (else Wikipedia's) opening about the place, credited. */
export function GuideCard({ place }: { place: Place }) {
  const { value, loading } = useLoad<Guide | undefined>(place.label ?? place.name, () => guideFor(place));
  if (loading) return <section className="card"><p className="muted"><Waiting>Reading the guide…</Waiting></p></section>;
  if (!value) return null;
  return (
    <section className="card poreia-guide">
      {value.image && <img className="poreia-guide__image" src={value.image} alt="" />}
      <h2 className="card__title">About {value.title}</h2>
      <p>{value.text}</p>
      <p className="fine">
        From <Outbound href={value.url}>{value.source}</Outbound>, CC BY-SA.
      </p>
    </section>
  );
}

/** Currency, language, driving side and public holidays in the trip's dates, for a trip abroad. */
export function CountryCard({ target, children }: { target: Target; children?: ReactNode }) {
  const prefs = settings.use();
  const code = target.place.countryCode;
  const facts = useLoad<Country | undefined>(code, () => countryFacts(code!));
  const years = target.start ? [...new Set([target.start.slice(0, 4), (target.end ?? target.start).slice(0, 4)])] : [];
  const days = useLoad<Holiday[]>(code && years.length ? `${code}.${years.join(',')}` : undefined, async () => (await Promise.all(years.map((year) => holidays(code!, Number(year))))).flat());
  const currency = facts.value?.currencies[0];
  const rates = useLoad<Record<string, number>>(currency && currency.code !== prefs.currency ? prefs.currency : undefined, () => ratesInto(prefs.currency));
  if (!code || !facts.value) return children ? <section className="card">{children}</section> : null;
  const during = (days.value ?? []).filter((day) => target.start && day.date >= target.start && day.date <= (target.end ?? target.start));
  const rate = currency && rates.value?.[currency.code];
  return (
    <section className="card">
      <h2 className="card__title">
        {facts.value.flag} {facts.value.name}
      </h2>
      <dl className="detail-list">
        {currency && (
          <>
            <dt>Money</dt>
            <dd>
              {currency.name} ({currency.code})
              {rate ? ` · 1 ${currency.code} ≈ ${rate.toLocaleString(undefined, { maximumFractionDigits: rate < 0.1 ? 4 : 2 })} ${prefs.currency}` : ''}
            </dd>
          </>
        )}
        {facts.value.languages.length > 0 && (
          <>
            <dt>Languages</dt>
            <dd>{facts.value.languages.slice(0, 4).join(', ')}</dd>
          </>
        )}
        {facts.value.drives && (
          <>
            <dt>Driving</dt>
            <dd>On the {facts.value.drives}</dd>
          </>
        )}
        {facts.value.callingCode && (
          <>
            <dt>Calling code</dt>
            <dd>{facts.value.callingCode}</dd>
          </>
        )}
      </dl>
      {during.length > 0 && (
        <>
          <p className="label">Public holidays in your dates</p>
          <ul className="poreia-plain-list">
            {during.map((day) => (
              <li key={day.date + day.name}>
                {dayText(day.date)}: {day.name}
              </li>
            ))}
          </ul>
        </>
      )}
      {children}
      <p className="fine">
        From <Outbound href="https://restcountries.com/">REST Countries</Outbound>, <Outbound href="https://date.nager.at/">Nager.Date</Outbound> and the European Central Bank’s rates.
      </p>
    </section>
  );
}

const distance = (meters: number) => (meters < 950 ? `${Math.round(meters / 50) * 50} m` : `${(meters / 1000).toFixed(1)} km`);

/** Notable places nearby, from Wikipedia's map of articles. */
export function SightsCard({ place, onAdd }: { place: Place; onAdd?: (sight: Sight) => void }) {
  const [all, setAll] = useState(false);
  const key = place.lat !== undefined && place.lon !== undefined ? `${place.lat},${place.lon}` : undefined;
  const { value, unreached, loading } = useLoad<Sight[]>(key, () => sightsNear(place.lat!, place.lon!));
  if (!key) return null;
  const shown = (value ?? []).slice(0, all ? 40 : 8);
  return (
    <section className="card">
      <h2 className="card__title">Nearby</h2>
      {loading && <p className="muted"><Waiting>Looking…</Waiting></p>}
      {unreached && <p className="muted">Couldn’t look nearby. Check the connection.</p>}
      <ul className="poreia-sights">
        {shown.map((sight) => (
          <li key={sight.title}>
            {sight.image ? <img src={sight.image} alt="" /> : <span className="poreia-sights__blank" aria-hidden="true" />}
            <Outbound href={sight.url} className="poreia-sights__text">
              <span>{sight.title}</span>
              <span className="muted">{[sight.description, distance(sight.meters)].filter(Boolean).join(' · ')}</span>
            </Outbound>
            {onAdd && (
              <button type="button" className="icon-button" aria-label={`Add ${sight.title} to the days`} onClick={() => onAdd(sight)}>
                <PlusIcon size={20} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {(value?.length ?? 0) > 8 && !all && (
        <button type="button" className="text-link" onClick={() => setAll(true)}>
          Show all {value!.length}
        </button>
      )}
      <p className="fine">
        From <Outbound href="https://www.wikipedia.org/">Wikipedia</Outbound>.
      </p>
    </section>
  );
}

/** Events in the trip's dates: live from Ticketmaster when the site has its key, else searches. */
export function EventsCard({ target, onAdd }: { target: Target; onAdd?: (event: LiveEvent) => void }) {
  const ready = useLoad<boolean>('events-ready', eventsReady);
  const { lat, lon } = target.place;
  const key = ready.value && lat !== undefined && lon !== undefined && target.start ? `${lat},${lon},${target.start},${target.end}` : undefined;
  const events = useLoad<LiveEvent[]>(key, () => eventsNear(lat!, lon!, target.start!, target.end ?? target.start!));
  if (!target.start) return null;
  const links = searchLinks('events', { to: target.place.label ?? target.place.name, start: target.start, end: target.end });
  return (
    <section className="card">
      <h2 className="card__title">Events in your dates</h2>
      {events.loading && <p className="muted"><Waiting>Looking…</Waiting></p>}
      {events.value && events.value.length === 0 && <p className="muted">No ticketed events found nearby for these dates.</p>}
      {events.value && events.value.length > 0 && (
        <ul className="poreia-sights">
          {events.value.slice(0, 20).map((event) => (
            <li key={event.id}>
              {event.image ? <img src={event.image} alt="" /> : <span className="poreia-sights__blank" aria-hidden="true" />}
              <Outbound href={event.url} className="poreia-sights__text">
                <span>{event.name}</span>
                <span className="muted">{[event.date && dayText(event.date), timeText(event.time), event.venue, event.price].filter(Boolean).join(' · ')}</span>
              </Outbound>
              {onAdd && (
                <button type="button" className="icon-button" aria-label={`Add ${event.name} to the days`} onClick={() => onAdd(event)}>
                  <PlusIcon size={20} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {(!ready.value || events.unreached) && (
        <ul className="poreia-links">
          {links.map((link) => (
            <li key={link.url}>
              <Outbound href={link.url}>
                <span>{link.site}</span>
              </Outbound>
            </li>
          ))}
        </ul>
      )}
      {ready.value && events.value && (
        <p className="fine">
          From <Outbound href="https://www.ticketmaster.com/">Ticketmaster</Outbound>.
        </p>
      )}
    </section>
  );
}
