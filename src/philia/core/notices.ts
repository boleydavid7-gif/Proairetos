import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { comingUp, sinceText, touchDate, turningText, type Person } from './people';

export type PeopleNoticeChoices = {
  /** Days before a birthday or date: 0 on the day. */
  dateLead: number;
  dates: boolean;
  inTouch: boolean;
  at: string;
};

export const defaultPeopleNotices: PeopleNoticeChoices = { dateLead: 0, dates: true, inTouch: true, at: '09:00' };

/** Birthdays and dates (on the day or a few days before) and keep-in-touch days, at the chosen time. */
export function peopleNotices(people: readonly Person[], choices: PeopleNoticeChoices, today: string, horizon: number): Notice[] {
  const notices: Notice[] = [];
  if (choices.dates) {
    for (const entry of comingUp(people, today, horizon + choices.dateLead)) {
      const day = addDays(entry.date, -choices.dateLead);
      if (day < today) continue;
      const what = entry.label === 'Birthday' ? `${entry.person.name}’s birthday` : `${entry.person.name}: ${entry.label}`;
      const when = choices.dateLead === 0 ? 'Today' : choices.dateLead === 1 ? 'Tomorrow' : `In ${choices.dateLead} days`;
      const turning = turningText(entry);
      notices.push({ key: `philia:${entry.key}:${choices.dateLead}`, kind: 'person', at: atTime(day, choices.at), title: what, body: [when, turning].filter(Boolean).join(' · '), open: `philia:person:${entry.person.id}` });
    }
  }
  if (choices.inTouch) {
    for (const person of people) {
      const date = touchDate(person, today);
      if (!date || date > addDays(today, horizon)) continue;
      const day = date < today ? today : date;
      notices.push({ key: `philia:touch:${person.id}:${person.lastInTouch ?? ''}`, kind: 'person', at: atTime(day, choices.at), title: person.name, body: `${sinceText(person.lastInTouch, day)}.`, open: `philia:person:${person.id}` });
    }
  }
  return notices;
}
