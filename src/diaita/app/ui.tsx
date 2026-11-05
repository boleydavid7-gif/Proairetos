import type { ReactNode } from 'react';
import { BookIcon, CupIcon, GlassesIcon, MoonIcon, PlateIcon, SunIcon, WorkIcon } from '../../app/family/icons';
import { addDays, parseLocalDate } from '../../core/scheduling/dates';
import { shiftTo, timeText, type Entry, type EntryKind } from '../core/rhythm';
import { timelineHref } from './timelineLinks';

const ICONS: Record<EntryKind, (props: { size?: number }) => ReactNode> = {
  work: WorkIcon,
  sleep: MoonIcon,
  wake: SunIcon,
  nap: MoonIcon,
  'wind-down': BookIcon,
  worry: BookIcon,
  caffeine: CupIcon,
  light: SunIcon,
  dark: GlassesIcon,
  meal: PlateIcon,
  'light-food': PlateIcon,
};

export function span(entry: Entry): string {
  return entry.end ? `${timeText(entry.start)}–${timeText(entry.end)}` : timeText(entry.start);
}

/** A day's plan as rows; only the four practical actions link to their companion apps. */
export function Timeline({ entries, now }: { entries: readonly Entry[]; now?: Date }) {
  if (entries.length === 0) return <p className="muted">Nothing planned.</p>;
  const nowAt = now ? entries.findIndex((entry) => (entry.end ?? entry.start) > now) : -1;
  return (
    <ol className="diaita-timeline">
      {entries.map((entry, index) => {
        const Icon = ICONS[entry.kind];
        const past = now && (entry.end ?? entry.start) <= now;
        const href = timelineHref(entry);
        const content = (
          <>
            <span className="diaita-entry__time">{span(entry)}</span>
            <span className="diaita-entry__icon"><Icon size={20} /></span>
            <span className="diaita-entry__text">
              <strong>{entry.title}</strong>
              {entry.detail && <small>{entry.detail}</small>}
            </span>
          </>
        );
        return (
          <li
            key={entry.key}
            className={'diaita-entry diaita-entry--' + entry.kind + (past ? ' diaita-entry--past' : '') + (index === nowAt ? ' diaita-entry--next' : '')}
          >
            {href ? (
              <a className="diaita-entry__main diaita-entry__main--link" href={href}>{content}</a>
            ) : (
              <div className="diaita-entry__main">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function weekdayText(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function NumberField({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="family-unit">
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
          }}
        />
        <span>{unit}</span>
      </span>
    </label>
  );
}

const QUARTERS = Array.from({ length: 96 }, (_, index) => index * 15);
const clockOf = (date: Date) => date.getHours() * 60 + date.getMinutes();
const textOf = (minutes: number) => timeText(new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60));

function TimeSelect({ label, value, onPick }: { label: string; value: number; onPick: (minutes: number) => void }) {
  const options = QUARTERS.includes(value) ? QUARTERS : [...QUARTERS, value].sort((a, b) => a - b);
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="input" value={value} onChange={(event) => onPick(Number(event.target.value))}>
        {options.map((minutes) => <option key={minutes} value={minutes}>{textOf(minutes)}</option>)}
      </select>
    </label>
  );
}

/** Sleep and wake as clock times, starting from the planned ones, a menu in quarter hours; picking one stores the move from the planned time. */
export function AdjustTimes({ base, shift, onChange }: { base: { start: Date; end: Date }; shift: { sleep: number; wake: number }; onChange: (next: { sleep: number; wake: number }) => void }) {
  const sleep = (clockOf(base.start) + shift.sleep + 1440 * 2) % 1440;
  const wake = (clockOf(base.end) + shift.wake + 1440 * 2) % 1440;
  return (
    <div className="input-row">
      <TimeSelect label="Adjust sleep time" value={sleep} onPick={(minutes) => onChange({ ...shift, sleep: shiftTo(base.start, minutes) })} />
      <TimeSelect label="Adjust wake time" value={wake} onPick={(minutes) => onChange({ ...shift, wake: shiftTo(base.end, minutes) })} />
    </div>
  );
}
