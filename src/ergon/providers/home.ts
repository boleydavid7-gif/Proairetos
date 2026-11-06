import { watchLocal } from '../../app/family/localChanges';
import { homeDayText, sinceText, type Provider } from '../../core/providers';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { workDates } from '../../core/scheduling/workDays';
import { allChores, homes, myName, putChore, settings } from '../app/state';
import { markDone, nextDay, shownDay, type Chore, type DaysOff } from '../core/chores';

/*
 * Chores whose day has come: the name and since when, and who has it. Never the note, steps or history (manifest,
 * ergon.home). A chore that comes round on a work day shows on the next day off when the person chose that. A pull
 * marks it done in Ergon, with an undo.
 */
export const ergonHome: Provider<'home'> = {
  app: 'ergon',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ergon:chore:', 'shared:ergon', 'setting:ergon:settings', 'schedulePatterns', 'scheduleExceptions'],
  async read(ctx) {
    const current = settings.load();
    let off: DaysOff | undefined;
    if (current.daysOff && ctx.schedule) {
      const calendar = toLocalDate(ctx.now);
      const dates = workDates(await ctx.schedule(atTime(addDays(calendar, -31), '00:00'), atTime(addDays(calendar, 62), '00:00')));
      off = { isWork: (date) => dates.has(date), me: myName(current) || undefined };
    }
    return allChores()
      .map((chore) => {
        const day = nextDay(chore, off);
        return { chore, day: day && shownDay(chore, day, ctx.today) };
      })
      .filter((each): each is { chore: Chore; day: string } => Boolean(each.day && each.day <= ctx.today))
      .sort((a, b) => a.day.localeCompare(b.day) || a.chore.name.localeCompare(b.chore.name))
      .map(({ chore, day }) => ({
        ref: { app: 'ergon' as const, kind: 'chore', id: chore.id },
        group: 'attention' as const,
        title: chore.name,
        detail: [sinceText(homeDayText(day, ctx.today)), chore.who].filter(Boolean).join(' · '),
        open: `/ergon/?open=${encodeURIComponent(`chore:${chore.id}`)}`,
        swipe: { id: `chore:${chore.id}`, word: 'Done', marks: true },
      }));
  },
  act(ref, today) {
    const before = allChores().find((chore) => chore.id === ref.id);
    if (!before) return () => undefined;
    putChore(markDone(before, today, myName() || before.who));
    return () => putChore(before);
  },
  subscribe(listener) {
    const offShared = homes.subscribeShared(listener);
    const offOwn = watchLocal('ergon:chore:', listener);
    const offSettings = watchLocal('ergon:settings', listener);
    return () => {
      offShared();
      offOwn();
      offSettings();
    };
  },
};
