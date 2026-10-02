import { addDays, parseLocalDate } from '../scheduling/dates';

/**
 * A brain dump: everything on the person's mind in one go, split into
 * separate lines with a guess at what each one is. Plain rules on the
 * device; nothing leaves it. Every guess is shown for the person to keep
 * or change before anything is saved, and a line with no clear guess
 * stays something to remember.
 */
import type { ItemKind } from '../life-items/kinds';

export type DumpKind = ItemKind;

export type DumpLine = {
  text: string;
  kind: DumpKind;
  /** Local date the words named ("tomorrow", "on Friday"), if any. */
  plannedFor?: string;
};

const BULLET = /^\s*(?:[-*•·–—]|\d+[.)])\s*/;

/** Splits on new lines, bullets, semicolons, and sentence ends; a short comma list becomes separate lines too. */
export function splitDump(text: string): string[] {
  const pieces = text
    .split(/\r?\n|;|(?<=[.!?])\s+(?=\S)/)
    .map((piece) => piece.replace(BULLET, '').trim())
    .filter(Boolean);
  return pieces.flatMap(splitCommaList).map(tidy).filter((piece) => piece.length > 0);
}

/** "call garage, buy milk, email Sam": three or more short parts read as a list. */
function splitCommaList(piece: string): string[] {
  const parts = piece
    .split(/,\s*(?:and\s+|then\s+)?|\s+and then\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return [piece];
  const short = parts.every((part) => part.replace(LEAD_IN, '').split(/\s+/).length <= 6);
  return short ? parts : [piece];
}

function tidy(piece: string): string {
  return piece.replace(/^(?:and|also|oh|plus)\s+/i, '').replace(/[.;,]+$/, '').trim();
}

const FEELING = /^(?:i\s*(?:'m|’m|am)\s+(?:(?:feeling|so|really|very|quite|a bit)\s+)*(?:sad|tired|exhausted|angry|anxious|happy|low|overwhelmed|lonely|frustrated|grateful|calm|stressed|upset|hurt|drained|excited|nervous|scared|content|restless|flat|fed up)\b|i\s+feel\b|feeling\b)/i;
const CONCERN = /\b(?:worr(?:y|ied|ying)|concern(?:ed)?|anxious about|nervous about|scared|afraid|what if|stress(?:ed)? about|dread(?:ing)?|not sure if|unsure whether)\b/i;
const IDEA = /^(?:idea\b|maybe\b|what about\b|what if we\b|how about\b|could\b|one day\b|someday\b|some day\b)|\b(?:would be (?:nice|good|great|fun)|might be (?:nice|good|fun)|idea for|idea:)/i;
const LEAD_IN = /^(?:i\s+(?:really\s+)?(?:need|have|must|ought|got)\s+to|i\s+must|need\s+to|have\s+to|got\s+to|gotta|must|remember\s+to|don['’]t\s+forget\s+to|to\s*do:?|todo:?)\s+/i;
const VERBS = new Set(
  (
    'add apply arrange ask book bring buy call cancel change check clean clear collect confirm cook drop email fill finish fix follow ' +
    'get give go hand make meet move order organise organize pack paint pay phone pick plan post prepare print put read register ' +
    'renew repair reply return ring schedule send set sign sort start submit take talk tell text tidy top transfer update visit ' +
    'wash water write'
  ).split(' '),
);

/** A first guess at what a line is. Feelings and worries come first, so "call mum, worried about her" is not read as a task. */
export function guessKind(text: string): DumpKind {
  if (FEELING.test(text)) return 'FEELING';
  if (CONCERN.test(text)) return 'CONCERN';
  if (IDEA.test(text)) return 'IDEA';
  if (LEAD_IN.test(text)) return 'TODO';
  const first = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  return VERBS.has(first) ? 'TODO' : 'REMEMBER';
}

/** "I need to call the garage" becomes "Call the garage"; other lines keep the person's words. */
export function cleanTitle(text: string, kind: DumpKind): string {
  const words = kind === 'TODO' ? text.replace(LEAD_IN, '') : text;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_WORDS = new RegExp(`\\b(?:(today|tonight)|(tomorrow)|(?:on |this |next )?(${WEEKDAYS.join('|')}))\\b`, 'i');

/** The day a line names, counted from `today` (a weekday means the next one, never today). */
export function namedDay(text: string, today: string): string | undefined {
  const match = DAY_WORDS.exec(text);
  if (!match) return undefined;
  if (match[1]) return today;
  if (match[2]) return addDays(today, 1);
  const target = WEEKDAYS.indexOf(match[3].toLowerCase());
  const current = parseLocalDate(today).getDay();
  const ahead = (target - current + 7) % 7 || 7;
  return addDays(today, ahead);
}

export function readDump(text: string, today: string): DumpLine[] {
  return splitDump(text).map((piece) => {
    const kind = guessKind(piece);
    const plannedFor = kind === 'TODO' || kind === 'REMEMBER' ? namedDay(piece, today) : undefined;
    return { text: cleanTitle(piece, kind), kind, ...(plannedFor ? { plannedFor } : {}) };
  });
}
