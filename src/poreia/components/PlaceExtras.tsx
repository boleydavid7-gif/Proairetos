import { useEffect, useState } from 'react';
import { settings } from '../app/state';
import { Outbound } from '../app/ui';
import { countryFacts, missionsIn, phrasesFor, ratesInto } from '../app/world';
import { directionsTo } from '../core/links';
import type { Mission } from '../core/embassy';
import type { Phrase } from '../core/phrases';
import type { Place } from '../core/model';
import { moneyText } from '../core/model';
import { readAmount } from '../../core/money/readAmount';
import { Sym } from '../../lamplight/icons';

const regionHere = () => {
  try {
    return new Intl.Locale(navigator.language).maximize().region;
  } catch {
    return undefined;
  }
};
const homeCountry = () => (settings.load().home?.countryCode ?? regionHere())?.toUpperCase();

/** Everyday phrases in the place's first language, from Wikivoyage's phrasebook; none when it is home's language. */
export function PhrasesCard({ place }: { place: Place }) {
  const [found, setFound] = useState<{ language: string; phrases: Phrase[]; url: string }>();
  useEffect(() => {
    setFound(undefined);
    const there = place.countryCode?.toUpperCase();
    if (!there) return;
    let live = true;
    void (async () => {
      const facts = await countryFacts(there);
      const language = facts?.languages[0];
      const homeFacts = homeCountry() ? await countryFacts(homeCountry()!) : undefined;
      if (!language || language === 'English' || homeFacts?.languages.includes(language)) return;
      const book = await phrasesFor(language);
      if (live && book) setFound({ language, ...book });
    })().catch(() => undefined);
    return () => {
      live = false;
    };
  }, [place.countryCode]);
  if (!found) return null;
  return (
    <details className="poreia-fold poreia-phrases">
      <summary>Phrases in {found.language}</summary>
      <dl className="detail-list">
        {found.phrases.map((phrase) => (
          <div key={phrase.english} className="poreia-phrase">
            <dt>{phrase.english}</dt>
            <dd>
              <span lang="" className="poreia-phrase__local">
                {phrase.local}
              </span>
              {phrase.say && <span className="muted"> · {phrase.say}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="fine">
        From <Outbound href={found.url}>Wikivoyage’s {found.language} phrasebook</Outbound>, CC BY-SA. Kept for offline.
      </p>
    </details>
  );
}

/** Home's embassies and consulates in the country (Wikidata), with call, website and directions. */
export function EmbassyCard({ place }: { place: Place }) {
  const [missions, setMissions] = useState<Mission[]>();
  const home = homeCountry();
  const there = place.countryCode?.toUpperCase();
  useEffect(() => {
    setMissions(undefined);
    if (!home || !there || home === there) return;
    let live = true;
    missionsIn(home, there)
      .then((found) => live && setMissions(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [home, there]);
  if (!missions?.length) return null;
  // The one in the place's own city first, else the embassy.
  const sorted = [...missions].sort((a, b) => Number((b.city ?? '').toLowerCase() === place.name.toLowerCase()) - Number((a.city ?? '').toLowerCase() === place.name.toLowerCase()));
  return (
    <details className="poreia-fold">
      <summary>Your embassy and consulates</summary>
      <ul className="rows">
        {sorted.slice(0, 4).map((mission) => (
          <li key={mission.name} className="poreia-mission">
            <span>{mission.name}</span>
            <span className="row__detail">{[mission.address, mission.city].filter(Boolean).join(' · ')}</span>
            <span className="button-row">
              {mission.phone && (
                <a className="text-link" href={`tel:${mission.phone.replace(/[^\d+]/g, '')}`}>
                  {mission.phone}
                </a>
              )}
              {mission.site && <Outbound href={mission.site}>Website</Outbound>}
              {(mission.lat !== undefined || mission.address) && <Outbound href={directionsTo(mission.address ?? mission.name, mission.lat, mission.lon)}>Directions</Outbound>}
            </span>
          </li>
        ))}
      </ul>
      <p className="fine">From Wikidata. Confirm on the government’s site.</p>
    </details>
  );
}

/** Amounts between the place's currency and home's, both ways, at today's rate. */
export function ConverterCard({ place }: { place: Place }) {
  const homeCurrency = settings.use().currency;
  const [there, setThere] = useState<string>();
  const [rates, setRates] = useState<Record<string, number>>();
  const [text, setText] = useState('');
  const [fromHome, setFromHome] = useState(false);
  useEffect(() => {
    if (!place.countryCode) return;
    let live = true;
    countryFacts(place.countryCode.toUpperCase())
      .then((facts) => live && setThere(facts?.currencies[0]?.code))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [place.countryCode]);
  useEffect(() => {
    if (!there || there === homeCurrency) return;
    let live = true;
    ratesInto(homeCurrency)
      .then((found) => live && setRates(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [there, homeCurrency]);
  if (!there || there === homeCurrency || !rates?.[there]) return null;
  const rate = rates[there]; // one unit of `there` in home's currency
  const [source, target] = fromHome ? [homeCurrency, there] : [there, homeCurrency];
  const cents = readAmount(text) ?? 0;
  const converted = Math.round(fromHome ? cents / rate : cents * rate);
  return (
    <section className="card poreia-convert">
      <h2 className="card__title">Convert</h2>
      <div className="input-row">
        <label className="field">
          <span className="field__label">{source}</span>
          <input className="input" inputMode="decimal" value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="button" className="button-quiet poreia-convert__swap" aria-label={`Convert from ${target} instead`} onClick={() => setFromHome(!fromHome)}>
          <Sym name="repeat" size={20} />
        </button>
      </div>
      <p className="poreia-money-card__total">{moneyText({ cents: converted, currency: target })}</p>
      <p className="fine">
        1 {there} = {moneyText({ cents: Math.round(rate * 100), currency: homeCurrency })}. Rates from Frankfurter (European Central Bank), today’s.
      </p>
    </section>
  );
}
