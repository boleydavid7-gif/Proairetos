import type { ReactNode } from 'react';
import { BookIcon, CupIcon, GlassesIcon, MoonIcon, PlateIcon, SunIcon, WorkIcon } from '../../app/family/icons';
import { addDays, parseLocalDate } from '../../core/scheduling/dates';
import { timeText, type Entry, type EntryKind } from '../core/rhythm';
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
