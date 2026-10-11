import { useState, type ReactNode } from 'react';
import { BookIcon, CupIcon, GlassesIcon, MoonIcon, PlateIcon, SunIcon, WorkIcon } from '../../app/family/icons';
import { addDays, parseLocalDate } from '../../core/scheduling/dates';
import { SOURCES, timeText, type Entry, type EntryKind } from '../core/rhythm';

const ICONS: Record<EntryKind, (props: { size?: number }) => ReactNode> = {
  work: WorkIcon,
  sleep: MoonIcon,
  wake: SunIcon,
  nap: MoonIcon,
  'wind-down': BookIcon,
  caffeine: CupIcon,
  light: SunIcon,
  dark: GlassesIcon,
  meal: PlateIcon,
  'light-food': PlateIcon,
};

export function span(entry: Entry): string {
  return entry.end ? `${timeText(entry.start)}–${timeText(entry.end)}` : timeText(entry.start);
}

/** A day's plan as rows; a row with a source opens to show it. */
export function Timeline({ entries, now }: { entries: readonly Entry[]; now?: Date }) {
  const [open, setOpen] = useState<string>();
  if (entries.length === 0) return <p className="muted">Nothing planned.</p>;
  const nowAt = now ? entries.findIndex((entry) => (entry.end ?? entry.start) > now) : -1;
  return (
    <ol className="diaita-timeline">
      {entries.map((entry, index) => {
        const Icon = ICONS[entry.kind];
        const isOpen = open === entry.key;
        const past = now && (entry.end ?? entry.start) <= now;
        return (
          <li key={entry.key} className={`diaita-entry diaita-entry--${entry.kind}${past ? ' diaita-entry--past' : ''}${index === nowAt ? ' diaita-entry--next' : ''}`}>
            <button type="button" className="diaita-entry__main" aria-expanded={entry.source ? isOpen : undefined} disabled={!entry.source} onClick={() => setOpen(isOpen ? undefined : entry.key)}>
              <span className="diaita-entry__time">{span(entry)}</span>
              <span className="diaita-entry__icon"><Icon size={19} /></span>
              <span className="diaita-entry__text">
                <strong>{entry.title}</strong>
                {entry.detail && <small>{entry.detail}</small>}
              </span>
            </button>
            {isOpen && entry.source && <p className="diaita-entry__source">{SOURCES[entry.source]}</p>}
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
