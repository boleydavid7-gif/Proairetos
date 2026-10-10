import { addDays, parseLocalDate } from '../scheduling/dates';
import { cleanTitle, guessKind } from './brainDump';
import type { ItemKind } from '../life-items/kinds';

/**
 * One line, typed quickly: "dentist friday 3pm 45 min". Plain rules on the device. The day, time and
 * length it names are read out of the words so the title stays clean; whatever it understood is shown
 * before anything is saved.
 */
export type QuickAdd = {
  title: string;
  kind: ItemKind;
  /** Local date named, if any. */
  day?: string;
  /** "HH:MM", 24 hour. */
  time?: string;
  minutes?: number;
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY = new RegExp(`\\b(?:on\\s+|this\\s+|next\\s+)?(today|tonight|tomorrow|${WEEKDAYS.join('|')})\\b`, 'i');
const CLOCK = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const CLOCK_24 = /\bat\s+(\d{1,2}):(\d{2})\b/i;
const NOON = /\b(?:at\s+)?(noon|midday)\b/i;
const LENGTH = /\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i;

function dayFor(word: string, today: string): string {
  const lower = word.toLowerCase();
  if (lower === 'today' || lower === 'tonight') return today;
  if (lower === 'tomorrow') return addDays(today, 1);
  const target = WEEKDAYS.indexOf(lower);
  const ahead = (target - parseLocalDate(today).getDay() + 7) % 7 || 7;
  return addDays(today, ahead);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** What a typed line means as an item, or null when it is empty. */
export function parseQuickAdd(input: string, today: string): QuickAdd | null {
  let rest = input.trim();
  if (!rest) return null;
  let day: string | undefined;
  let time: string | undefined;
  let minutes: number | undefined;

  const take = (pattern: RegExp, read: (match: RegExpExecArray) => boolean) => {
    const match = pattern.exec(rest);
    if (!match || !read(match)) return;
    rest = `${rest.slice(0, match.index)} ${rest.slice(match.index + match[0].length)}`;
  };

  take(LENGTH, (m) => {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const value = unit.startsWith('h') ? n * 60 : n;
    if (!(value >= 1 && value <= 12 * 60)) return false;
    minutes = Math.round(value);
    return true;
  });
  take(CLOCK, (m) => {
    let hour = Number(m[1]);
    const minute = Number(m[2] ?? 0);
    if (hour < 1 || hour > 12 || minute > 59) return false;
    if (m[3].toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (m[3].toLowerCase() === 'am' && hour === 12) hour = 0;
    time = `${pad(hour)}:${pad(minute)}`;
    return true;
  });
  if (!time) {
    take(CLOCK_24, (m) => {
      const hour = Number(m[1]);
      const minute = Number(m[2]);
      if (hour > 23 || minute > 59) return false;
      time = `${pad(hour)}:${pad(minute)}`;
      return true;
    });
  }
  if (!time) {
    take(NOON, () => {
      time = '12:00';
      return true;
    });
  }
  take(DAY, (m) => {
    day = dayFor(m[1], today);
    return true;
  });

  // A length with no time is just a length on the item; a stray "for" left over is dropped.
  const words = rest
    .replace(/\s+/g, ' ')
    .replace(/\b(?:on|at|for|this|next)\s*$/i, '')
    .replace(/^\s*(?:on|at|for)\s+/i, '')
    .trim();
  const text = words || input.trim();
  const kind = guessKind(text);
  const title = cleanTitle(text, kind);
  return { title, kind, ...(day ? { day } : {}), ...(time ? { time } : {}), ...(minutes ? { minutes } : {}) };
}

/** The line the person sees before saving: what it will be and when. */
export function describeQuickAdd(parsed: QuickAdd, today: string): string {
  const parts: string[] = [];
  const when = parsed.day ?? (parsed.time ? today : undefined);
  if (when) {
    const date = parseLocalDate(when);
    parts.push(
      when === today
        ? 'today'
        : when === addDays(today, 1)
          ? 'tomorrow'
          : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    );
  }
  if (parsed.time) {
    const [h, m] = parsed.time.split(':').map(Number);
    const at = new Date(2000, 0, 1, h, m);
    parts.push(at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
  }
  if (parsed.minutes) parts.push(parsed.minutes >= 60 && parsed.minutes % 60 === 0 ? `${parsed.minutes / 60} h` : `${parsed.minutes} min`);
  return parts.join(' · ');
}
