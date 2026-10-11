import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { isTrainingDay, type Setup } from './plan';

/** One notice on each planned training day, at the person's time, if they chose it. */
export function trainingNotices(setup: Setup, on: boolean, sessionName: string, today: string, horizon: number, now: Date): Notice[] {
  if (!on) return [];
  const notices: Notice[] = [];
  for (let day = today; day <= addDays(today, horizon); day = addDays(day, 1)) {
    if (!isTrainingDay(setup, day)) continue;
    const at = atTime(day, setup.at ?? '17:30');
    if (at < now) continue;
    notices.push({ key: `dynamis:${day}`, kind: 'training', at, title: sessionName, body: 'A training day.', open: 'dynamis:session' });
  }
  return notices;
}
