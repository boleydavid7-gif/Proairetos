import { describe, expect, it } from 'vitest';
import { appOf, groupSummary, groupTimeline } from '../../features/reflect/appGroups';

const own = (at: string, promptKey?: string) => ({ at, reflection: { promptKey } });

describe("Reflect's entries from the apps", () => {
  it('knows each entry by what it is or the line it was kept after', () => {
    expect(appOf({ at: '', run: {} })).toBe('askesis');
    expect(appOf({ at: '', meal: {} })).toBe('soma');
    expect(appOf({ at: '', study: {} })).toBe('theoria');
    expect(appOf(own('', 'after-reading'))).toBe('theoria');
    expect(appOf(own('', 'after-strength'))).toBe('dynamis');
    expect(appOf(own('', 'after-trip'))).toBe('poreia');
    expect(appOf(own('', 'gratitude'))).toBeNull();
    expect(appOf(own(''))).toBeNull();
  });

  it('keeps own reflections as they are and folds each app into one row at its newest entry', () => {
    const rows = groupTimeline([
      own('2026-10-29T08:00:00Z'),
      { at: '2026-10-29T07:00:00Z', run: {} },
      own('2026-10-29T07:30:00Z', 'after-run'),
      { at: '2026-10-28T19:00:00Z', meal: {} },
      { at: '2026-10-27T07:00:00Z', run: {} },
      own('2026-10-26T21:00:00Z', 'three-good-things'),
    ]);
    expect(rows.map((row) => (row.kind === 'own' ? 'own' : `${row.app}:${row.entries.length}`))).toEqual([
      'own',
      'askesis:3',
      'soma:1',
      'own',
    ]);
    const askesis = rows[1];
    expect(askesis.kind === 'app' && askesis.at).toBe('2026-10-29T07:30:00Z');
    expect(askesis.kind === 'app' && askesis.entries.map((entry) => entry.at)).toEqual([
      '2026-10-29T07:30:00Z',
      '2026-10-29T07:00:00Z',
      '2026-10-27T07:00:00Z',
    ]);
  });

  it('says what a row holds in plain words', () => {
    expect(groupSummary([{ at: '', run: {} }, { at: '', run: {} }, own('', 'after-run')])).toBe('2 runs, 1 note');
    expect(groupSummary([{ at: '', study: {} }])).toBe('1 session');
  });
});
