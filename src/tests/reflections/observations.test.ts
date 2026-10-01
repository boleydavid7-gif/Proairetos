import type { Decision } from '../../core/decisions/types';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import { observePeriod } from '../../core/reflections/observations';
import { periodRange } from '../../core/reflections/periods';
import { containsJudgmentLanguage } from '../../core/rules/languageRules';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import type { ChosenValue } from '../../core/values/types';

const now = new Date(2026, 9, 10, 18, 0); // Saturday
const week = periodRange('week', now); // Mon 5 Oct to Mon 12 Oct
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).toISOString();

const item = (id: string, fields: Partial<LifeItem> = {}): LifeItem => ({
  id,
  userId: 'u',
  type: 'DO',
  title: id,
  status: 'OPEN',
  important: false,
  source: 'CAPTURE',
  carried: false,
  createdAt: '',
  updatedAt: '',
  ...fields,
});
let n = 0;
const ev = (itemId: string, kind: ItemEvent['kind'], timestamp: string, extra: Partial<ItemEvent> = {}): ItemEvent => ({
  id: `e${++n}`,
  itemId,
  kind,
  timestamp,
  ...extra,
});

const courage: ChosenValue = { id: 'courage', userId: 'u', name: 'Courage', source: 'PRESET', chosenAt: '' };

const items = [
  item('Call the clinic', { valueIds: ['courage'], status: 'DONE' }),
  item('Renew passport', { valueIds: ['courage'] }),
  item('Hear back about the quote', { status: 'WAITING' }),
  item('Old thing'),
];

const events: ItemEvent[] = [
  ev('Call the clinic', 'CREATED', at(6)),
  ev('Renew passport', 'CREATED', at(7)),
  ev('Old thing', 'CREATED', at(1)), // last week
  ev('Call the clinic', 'COMPLETED', at(8)),
  ev('Old thing', 'LET_GO', at(9)),
  ev('Call the clinic', 'FOCUSED', at(8), { metadata: { minutes: 25 } }),
  ev('Renew passport', 'FOCUSED', at(9), { metadata: { minutes: 60 } }),
  ev('Renew passport', 'RESCHEDULED', at(6)),
  ev('Renew passport', 'RESCHEDULED', at(7)),
  ev('Renew passport', 'RESCHEDULED', at(9)),
  ev('Hear back about the quote', 'WAITING_STARTED', at(1)),
];

const decisions: Decision[] = [
  { id: 'd', userId: 'u', question: 'Change teams', options: [], choice: 'Stay', decidedAt: at(9) },
  { id: 'old', userId: 'u', question: 'Earlier', options: [], choice: 'x', decidedAt: at(1) },
];

const shift = (day: number, startHour: number, hours: number, kind: ScheduleOccurrence['kind']): ScheduleOccurrence => ({
  patternId: kind,
  patternName: kind,
  kind,
  date: '',
  start: new Date(2026, 9, day, startHour),
  end: new Date(2026, 9, day, startHour + hours),
  changed: false,
});

describe('observations for a week', () => {
  const observations = observePeriod({
    range: week,
    now,
    items,
    events,
    decisions,
    values: [courage],
    occurrences: [shift(5, 6, 8, 'COMMITTED'), shift(6, 6, 8, 'COMMITTED'), shift(6, 18, 1, 'PROTECTED')],
  });
  const byKind = Object.fromEntries(observations.map((o) => [o.kind, o]));

  it('counts only what happened in the period', () => {
    expect(byKind.CAPTURED.text).toBe('2 things added');
    expect(byKind.CLOSED.text).toBe('1 done · 1 let go');
    expect(byKind.DECISIONS).toMatchObject({ text: '1 decision made', detail: 'Change teams: Stay' });
  });

  it('adds up focus and scheduled time', () => {
    expect(byKind.FOCUS.text).toBe('Focused 1 h 25 min across 2 items');
    expect(byKind.TIME.detail).toBe('Work and commitments: 16 h\nProtected time: 1 h');
  });

  it('shows values only through items the person connected', () => {
    expect(byKind.VALUES.detail).toBe('Courage: 2 items connected, 1 done');
  });

  it('notes items moved more than once and long waits, without judging', () => {
    expect(byKind.MOVED.detail).toBe('Renew passport (3 times)');
    expect(byKind.WAITING).toMatchObject({ text: 'Waiting since Oct 1', detail: 'Hear back about the quote' });
  });

  it('keeps a fixed order and never uses judgment language', () => {
    expect(observations.map((o) => o.kind)).toEqual([
      'CAPTURED', 'CLOSED', 'FOCUS', 'VALUES', 'MOVED', 'WAITING', 'DECISIONS', 'TIME',
    ]);
    for (const o of observations) {
      expect(containsJudgmentLanguage(`${o.text} ${o.detail ?? ''}`)).toBe(false);
    }
  });

  it('says nothing about an empty period', () => {
    expect(
      observePeriod({ range: week, now, items: [], events: [], decisions: [], values: [], occurrences: [] }),
    ).toEqual([]);
  });
});
