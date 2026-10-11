import type { Notice } from '../../core/notify/notices';
import type { Entry } from './rhythm';
import { timeText } from './rhythm';

export type RhythmNoticeChoices = { windDown: boolean; nap: boolean; caffeine: boolean };

export const defaultRhythmNotices: RhythmNoticeChoices = { windDown: true, nap: true, caffeine: false };

/** Notices for the plan's wind-downs, naps and last caffeine, as the person chose; at the time itself. */
export function rhythmNotices(entries: readonly Entry[], choices: RhythmNoticeChoices, now: Date, until: Date): Notice[] {
  const notices: Notice[] = [];
  for (const entry of entries) {
    if (entry.start <= now || entry.start > until) continue;
    const sleep = entries.find((each) => each.kind === 'sleep' && each.start >= entry.start);
    if (entry.kind === 'wind-down' && choices.windDown) {
      notices.push({ key: `diaita:${entry.key}`, kind: 'rhythm', at: entry.start, title: 'Wind down', body: sleep ? `Sleep at ${timeText(sleep.start)}.` : '', open: 'diaita' });
    } else if (entry.kind === 'nap' && choices.nap) {
      notices.push({ key: `diaita:${entry.key}`, kind: 'rhythm', at: entry.start, title: 'Nap', body: entry.end ? `Until ${timeText(entry.end)}.` : '', open: 'diaita' });
    } else if (entry.kind === 'caffeine' && choices.caffeine) {
      notices.push({ key: `diaita:${entry.key}`, kind: 'rhythm', at: entry.start, title: 'Last caffeine', body: sleep ? `Sleep at ${timeText(sleep.start)}.` : '', open: 'diaita' });
    }
  }
  return notices;
}
