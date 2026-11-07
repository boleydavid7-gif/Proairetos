import { daysBetween, parseLocalDate } from '../../core/scheduling/dates';
import { Sym } from '../../lamplight/icons';

/** "Tue, Nov 10", or "May 12, 2027" in another year. */
function shown(date: string): string {
  const day = parseLocalDate(date);
  // Another year: the year in place of the weekday, so it still fits half the width of a phone.
  return day.getFullYear() !== new Date().getFullYear()
    ? day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** One date as a tile: its name, the date written out (or the empty word), and the phone's own picker on a tap. */
function DateTile({ label, value, empty, min, onChange }: { label: string; value?: string; empty: string; min?: string; onChange: (value: string | undefined) => void }) {
  return (
    <label className={`poreia-date${value ? ' is-set' : ''}`}>
      <span className="poreia-date__label">{label}</span>
      <span className="poreia-date__value">
        <Sym name="calendar" size={18} />
        {value ? shown(value) : empty}
      </span>
      {/* The native picker sits over the whole tile, unseen, so every phone opens its own calendar. */}
      <input className="poreia-date__input" type="date" value={value ?? ''} min={min} aria-label={label} onChange={(event) => onChange(event.target.value || undefined)} />
    </label>
  );
}

/**
 * From and until as two tiles side by side, the nights between them, and Clear. An end before the start moves with it.
 */
export default function DateRange({
  start,
  end,
  onChange,
  startLabel = 'From',
  endLabel = 'Until',
  empty = 'Any day',
  clearable = true,
  count = 'nights',
}: {
  start?: string;
  end?: string;
  onChange: (dates: { start?: string; end?: string }) => void;
  startLabel?: string;
  endLabel?: string;
  empty?: string;
  clearable?: boolean;
  /** Nights between for a stay; days for time off, where both ends are days off. */
  count?: 'nights' | 'days';
}) {
  const between = start && end && end >= start ? daysBetween(start, end) : -1;
  const amount = count === 'days' ? between + 1 : between;
  const word = count === 'days' ? (amount === 1 ? 'day' : 'days') : amount === 1 ? 'night' : 'nights';
  return (
    <div className="poreia-dates">
      <div className="poreia-dates__tiles">
        <DateTile label={startLabel} value={start} empty={empty} onChange={(next) => onChange({ start: next, end: next && end && end < next ? next : end })} />
        <span className="poreia-dates__arrow" aria-hidden="true">
          <Sym name="arrowRight" size={18} />
        </span>
        <DateTile label={endLabel} value={end} empty={empty} min={start} onChange={(next) => onChange({ start, end: next })} />
      </div>
      {(amount > 0 || (clearable && (start || end))) && (
        <div className="poreia-dates__foot">
          {amount > 0 && <span>{`${amount} ${word}`}</span>}
          {clearable && (start || end) && (
            <button type="button" className="text-link" onClick={() => onChange({ start: undefined, end: undefined })}>
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
