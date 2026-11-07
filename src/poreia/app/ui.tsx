import { SceneTile } from '../components/TripScene';
import { useEffect, useState } from 'react';
import { ChevronIcon } from '../../app/family/icons';
import { parseLocalDate } from '../../core/scheduling/dates';
import { phaseOf, phaseText, placesOf, type Place, type Trip } from '../core/model';
import { readAmount } from '../../core/money/readAmount';

/** "Nov 2", "Nov 2 – 8", "Nov 30 – Dec 3", with the year when it is not this year. */
export function datesText(start?: string, end?: string, thisYear = new Date().getFullYear()): string {
  if (!start) return '';
  const a = parseLocalDate(start);
  const b = end && end > start ? parseLocalDate(end) : undefined;
  const year = (b ?? a).getFullYear() !== thisYear ? `, ${(b ?? a).getFullYear()}` : '';
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  if (!b) return `${month(a)} ${a.getDate()}${year}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${month(a)} ${a.getDate()} – ${b.getDate()}${year}`;
  return `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}${year}`;
}

/** "Mon, Nov 2". */
export const dayText = (date: string) => parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** "8:05 PM" or "20:05", as the phone shows times. */
export function timeText(time?: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** A trip as one row: name, where and when, and where it stands. */
export function TripRow({ trip, today, onOpen }: { trip: Trip; today: string; onOpen: () => void }) {
  const phase = phaseOf(trip, today);
  return (
    <li>
      <button type="button" className="row poreia-trip-row" onClick={onOpen}>
        <span className={`poreia-trip-row__badge poreia-trip-row__badge--${phase.kind}`} aria-hidden="true">
          <SceneTile trip={trip} />
        </span>
        <span className="row__text">
          <span>{trip.name}</span>
          {(() => {
            const places = placesOf(trip).length > 1 ? placesOf(trip).map((stop) => stop.place.name).join(' → ') : trip.place && trip.place.name !== trip.name ? trip.place.name : undefined;
            const when = [phaseText(phase), datesText(trip.start, trip.end)].filter(Boolean).join(' · ');
            return (
              <>
                {places && <span className="row__detail">{places}</span>}
                <span className="row__detail poreia-trip-row__dates">{when || 'No place or dates yet'}</span>
              </>
            );
          })()}
        </span>
        <ChevronIcon size={18} />
      </button>
    </li>
  );
}

/** A place entered by the person. Poreia keeps it local and never requires a place-search service. */
export function PlaceSearch({ label, value, onPick }: { label: string; value?: Place; onPick: (place: Place | undefined) => void }) {
  const [text, setText] = useState(value?.label ?? value?.name ?? '');

  useEffect(() => setText(value?.label ?? value?.name ?? ''), [value?.label, value?.name]);

  return (
    <div className="poreia-place">
      <label className="field">
        <span className="field__label">{label}</span>
        <input
          className="input"
          value={text}
         
          autoComplete="off"
          onChange={(event) => {
            setText(event.target.value);
            const typed = event.target.value.trim();
            onPick(typed ? { name: typed.split(',')[0].trim(), label: typed } : undefined);
          }}
          onBlur={() => {
            const typed = text.trim();
            onPick(typed ? { name: typed.split(',')[0].trim(), label: typed } : undefined);
          }}
        />
      </label>
    </div>
  );
}

/** An amount with its currency. */
export function MoneyField({ label, cents, currency, onChange }: { label: string; cents?: number; currency: string; onChange: (cents: number | undefined, currency: string) => void }) {
  const [text, setText] = useState(cents !== undefined ? String(cents / 100) : '');
  return (
    <div className="input-row poreia-money">
      <label className="field">
        <span className="field__label">{label}</span>
        <input
          className="input"
          inputMode="decimal"
          value={text}
         
          onChange={(event) => {
            setText(event.target.value);
            // "3,500" is three thousand five hundred, as Oikonomia reads it; blank or unreadable is no amount.
            onChange(readAmount(event.target.value.replace(/[^\d.,\s]/g, '')) ?? undefined, currency);
          }}
        />
      </label>
      <label className="field poreia-money__currency">
        <span className="field__label">Currency</span>
        <input className="input" value={currency} maxLength={3} autoCapitalize="characters" onChange={(event) => onChange(cents, event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} />
      </label>
    </div>
  );
}

/** A labeled fact row for detail lists. */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Opens outside links in the browser, away from the app. */
export function Outbound({ href, children, className = 'poreia-out' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
