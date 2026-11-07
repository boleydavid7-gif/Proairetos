import { watchLocal } from '../../app/family/localChanges';
import type { Provider } from '../../core/providers';
import { hoursText, sleptMinutes, type SleepRecord } from '../core/rhythm';

/*
 * One line on sleep: whether it is set up and the hours slept last night. Hours only; never how it was, notes or
 * the signs the person recorded (manifest, diaita.home).
 */
export const diaitaHome: Provider<'home'> = {
  app: 'diaita',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:diaita:sleep:', 'setting:diaita:settings'],
  async read(ctx) {
    let started = false;
    try {
      started = Boolean((JSON.parse(ctx.setting('diaita:settings') ?? '{}') as { started?: boolean }).started);
    } catch {
      started = false;
    }
    const records = (await ctx.records<SleepRecord & { id: string }>('local:diaita:sleep:')).filter((record) => typeof record.id === 'string');
    const last = records.filter((record) => record.date === ctx.today).slice(-1)[0];
    const detail = !started ? 'Set up sleep tracking' : last ? `${hoursText(sleptMinutes(last))} slept` : 'Log last night’s sleep';
    return [{ ref: { app: 'diaita', kind: 'practice', id: 'today' }, group: 'practice', detail, open: '/diaita/' }];
  },
  subscribe(listener) {
    const offs = ['diaita:sleep:', 'diaita:settings'].map((prefix) => watchLocal(prefix, listener));
    return () => offs.forEach((off) => off());
  },
};
