import { describe, expect, it } from 'vitest';
import { atTime } from '../../core/scheduling/dates';
import { defaultRhythmNotices, rhythmNotices } from './notices';

describe('Diaita notices', () => {
  it('offers worry time with a next-step prompt', () => {
    const at = atTime('2026-10-14', '18:00');
    const notices = rhythmNotices(
      [{ key: 'worry:1', kind: 'worry', start: at, title: 'Worry time', detail: 'Write down worries and one next step', source: 'hygiene' }],
      defaultRhythmNotices,
      atTime('2026-10-14', '12:00'),
      atTime('2026-10-15', '00:00'),
    );
    expect(notices).toEqual([{ key: 'diaita:worry:1', kind: 'rhythm', at, title: 'Worry time', body: 'Write down worries and one next step.', open: 'diaita:worry' }]);
  });

  it('can turn worry time off without changing the other choices', () => {
    const at = atTime('2026-10-14', '18:00');
    expect(rhythmNotices(
      [{ key: 'worry:1', kind: 'worry', start: at, title: 'Worry time' }],
      { ...defaultRhythmNotices, worry: false },
      atTime('2026-10-14', '12:00'),
      atTime('2026-10-15', '00:00'),
    )).toEqual([]);
  });
});
