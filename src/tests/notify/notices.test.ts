import { describe, expect, it } from 'vitest';
import type { LifeItem } from '../../core/life-items/types';
import { defaultNoticeSettings, noticesBetween, privateNotice, remindLabel } from '../../core/notify/notices';
import { defaultQuietHours } from '../../core/rhythm/quietHours';
import { containsJudgmentLanguage } from '../../core/rules/languageRules';

const now = new Date(2026, 9, 1, 12, 0);
const until = new Date(2026, 9, 15);
const time = (date: Date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
const item = (id: string, fields: Partial<LifeItem>): LifeItem => ({
  id,
  userId: 'u',
  type: 'DO',
  title: id,
  status: 'OPEN',
  important: false,
  source: 'MANUAL',
  carried: false,
  createdAt: '',
  updatedAt: '',
  ...fields,
});
const base = { decisions: [], events: [], blocks: [], now, until, time };

describe('notices', () => {
  it('says plainly what and when, at the time and before it as the person chose', () => {
    const dentist = item('Dentist', {
      scheduledAt: new Date(2026, 9, 1, 16).toISOString(),
      location: 'Main Street',
      remind: [15, 0],
    });
    const notices = noticesBetween({ ...base, items: [dentist], settings: defaultNoticeSettings });
    expect(notices.map((n) => [time(n.at), n.title, n.body])).toEqual([
      ['15:45', 'Dentist', 'In 15 minutes · 16:00 · Main Street'],
      ['16:00', 'Dentist', 'At 16:00 · Main Street'],
    ]);
    expect(notices[0].open).toBe('item:Dentist');
  });

  it('reminds of run days at the runner’s own time, and opens Askesis', () => {
    const runs = [{ key: '2026-10-02:06:30', at: new Date(2026, 9, 2, 6, 30), title: 'Easy run · 40 min', place: 'River path' }];
    const notices = noticesBetween({ ...base, items: [], runs, settings: defaultNoticeSettings });
    expect(notices.map((n) => [time(n.at), n.title, n.body, n.open])).toEqual([['6:30', 'Easy run · 40 min', 'At 6:30 · River path', 'askesis']]);
    expect(noticesBetween({ ...base, items: [], runs, settings: { ...defaultNoticeSettings, runs: false } })).toEqual([]);
  });

  it('reminds at the time by default, and not at all when the person said none', () => {
    const at = new Date(2026, 9, 2, 10).toISOString();
    const notices = noticesBetween({
      ...base,
      items: [
        item('a', { scheduledAt: at }),
        item('b', { scheduledAt: at, remind: [] }),
        item('c', { scheduledAt: at, status: 'DONE' }),
      ],
      settings: defaultNoticeSettings,
    });
    expect(notices.map((n) => n.title)).toEqual(['a']);
  });

  it('tells about calendar events by the lead chosen, and skips all-day ones', () => {
    const events = [
      { key: 'e1', title: 'Team call', start: new Date(2026, 9, 1, 14), end: new Date(2026, 9, 1, 15) },
      {
        key: 'e2',
        title: 'Holiday',
        start: new Date(2026, 9, 2),
        end: new Date(2026, 9, 3),
        allDay: { from: '2026-10-02', until: '2026-10-03' },
      },
    ];
    const notices = noticesBetween({
      ...base,
      items: [],
      events,
      settings: { ...defaultNoticeSettings, calendarLead: 10 },
    });
    expect(notices.map((n) => [time(n.at), n.title, n.body])).toEqual([
      ['13:50', 'Team call', 'In 10 minutes · 14:00'],
    ]);
  });

  it('holds a notice in quiet hours and words it for when it arrives', () => {
    const late = item('Late', { scheduledAt: new Date(2026, 9, 2, 7, 10).toISOString(), remind: [30] });
    const [notice] = noticesBetween({
      ...base,
      items: [late],
      settings: defaultNoticeSettings,
      quiet: defaultQuietHours,
    });
    expect(time(notice.at)).toBe('7:00');
    expect(notice.body).toBe('In 10 minutes · 7:10');
  });

  it('can keep the lock screen private, and every word stays calm', () => {
    const dentist = item('Dentist', { scheduledAt: new Date(2026, 9, 1, 16).toISOString() });
    const settings = { ...defaultNoticeSettings, day: true, dayAt: '08:00' };
    const notices = noticesBetween({
      ...base,
      items: [dentist, item('w', { status: 'WAITING', checkBackAt: new Date(2026, 9, 3).toISOString() })],
      settings,
    });
    expect(privateNotice(notices[0], time).title).toBe('Proairetos');
    expect(privateNotice(notices[0], time).body).not.toMatch(/Dentist/);
    for (const notice of notices) expect(containsJudgmentLanguage(`${notice.title} ${notice.body}`)).toBe(false);
    expect(notices.find((n) => n.kind === 'day')?.body).toMatch(/^Nothing with a time today|Dentist/);
    expect(remindLabel(1440)).toBe('1 day before');
  });
});
