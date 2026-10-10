import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '../../core/capture/quickAdd';

// 2026-10-09 is a Friday.
const today = '2026-10-09';

describe('parseQuickAdd', () => {
  it('reads a day, a time and a length out of the words', () => {
    expect(parseQuickAdd('dentist monday 3pm 45 min', today)).toMatchObject({
      title: 'Dentist',
      day: '2026-10-12',
      time: '15:00',
      minutes: 45,
    });
  });

  it('knows tomorrow, am times, half hours and hours', () => {
    expect(parseQuickAdd('call mum tomorrow at 9:30 am for 1 hour', today)).toMatchObject({
      title: 'Call mum',
      kind: 'TODO',
      day: '2026-10-10',
      time: '09:30',
      minutes: 60,
    });
  });

  it('reads 24-hour times and noon', () => {
    expect(parseQuickAdd('team lunch at noon', today)?.time).toBe('12:00');
    expect(parseQuickAdd('train at 17:45', today)?.time).toBe('17:45');
  });

  it('leaves plain words alone', () => {
    expect(parseQuickAdd('buy milk', today)).toEqual({ title: 'Buy milk', kind: 'TODO' });
    expect(parseQuickAdd('a note about the 2 of us', today)?.minutes).toBeUndefined();
  });

  it('does not take an impossible time', () => {
    expect(parseQuickAdd('meeting 13pm', today)?.time).toBeUndefined();
  });

  it('is nothing for nothing', () => {
    expect(parseQuickAdd('   ', today)).toBeNull();
  });

  it('keeps the original words when only a day was typed', () => {
    expect(parseQuickAdd('friday', today)?.title).toBe('Friday');
  });
});
