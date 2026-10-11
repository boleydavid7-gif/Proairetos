import type { Notice } from '../../core/notify/notices';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { planBetween } from '../../diaita/core/rhythm';
import { rhythmNotices } from '../../diaita/core/notices';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { peopleNotices } from '../../philia/core/notices';
import { people, settings as philiaSettings } from '../../philia/app/state';
import { choreNotices } from '../../ergon/core/notices';
import { allChores, settings as ergonSettings } from '../../ergon/app/state';
import { otherCalendars } from '../calendars/otherCalendars';
import { scheduleService } from '../services';

/** Diaita, Philia and Ergon's notices, from what they keep on this device (Proairetos sends them all). */
export async function familyNotices(now: Date, until: Date): Promise<Notice[]> {
  const today = toLocalDate(now);
  const horizon = Math.ceil((until.getTime() - now.getTime()) / 86_400_000);
  const notices: Notice[] = [];

  const diaita = diaitaSettings.load();
  if (diaita.started) {
    const from = new Date(now.getTime() - 2 * 86_400_000);
    const blocks = [...(await scheduleService.occurrencesBetween(from, until)), ...otherCalendars.blocksBetween(from, until)].map((block) => ({
      start: block.start,
      end: block.end,
      kind: block.kind,
      label: block.label || block.patternName,
    }));
    const entries = planBetween(addDays(today, -1), addDays(today, horizon), blocks, diaita);
    notices.push(...rhythmNotices(entries, diaita.notices, now, until));
  }

  const everyone = people.list();
  if (everyone.length) notices.push(...peopleNotices(everyone, philiaSettings.load().notices, today, horizon));

  const chores = allChores();
  if (chores.length) {
    const ergon = ergonSettings.load();
    notices.push(...choreNotices(chores, ergon.notices, ergon.me || undefined, today, horizon));
  }
  return notices;
}
