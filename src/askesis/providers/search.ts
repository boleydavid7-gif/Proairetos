import { present, type Provider } from '../../core/providers';
import { dayWords } from '../../core/search/dayWords';
import type { LogEntry } from '../core/log';

/*
 * Log entries that have words: a title and the person's notes, what went well, what to do next time and the intention.
 * Not heart rate, health data brought in, or distance by GPS (manifest, askesis.search). The day in a title is the
 * entry's own calendar day, the same in every time zone.
 */
export const askesisSearch: Provider<'search'> = {
  app: 'askesis',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['askesisWorkouts'],
  async read(ctx) {
    const out = [];
    for (const entry of await ctx.records<LogEntry>('askesisWorkouts')) {
      const words = [entry.notes, entry.wentWell, entry.nextTime, entry.intention].filter(Boolean);
      if (!words.length) continue;
      const activity = `${entry.activity[0].toUpperCase()}${entry.activity.slice(1)}`;
      out.push({
        ref: { app: 'askesis' as const, kind: 'entry', id: entry.id },
        title: entry.workoutTitle || `${activity}, ${dayWords(entry.date, ctx.today)}`,
        titleField: 'workout title',
        fields: present(
          { name: 'workout notes', text: entry.notes },
          { name: 'went well', text: entry.wentWell },
          { name: 'next time', text: entry.nextTime },
          { name: 'intention', text: entry.intention },
        ),
        at: `${entry.date}T00:00`,
        label: `${entry.activity === 'other' ? 'Workout' : activity} in Askesis`,
        open: `/askesis/?open=${encodeURIComponent(`entry:${entry.id}`)}`,
      });
    }
    return out;
  },
};
