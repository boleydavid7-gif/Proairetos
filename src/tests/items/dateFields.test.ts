import { fromDateInput, fromDateTimeInput, toDateInput, toDateTimeInput } from '../../features/items/dateFields';

describe('date fields', () => {
  it('round-trips a local date and time', () => {
    const iso = fromDateTimeInput('2026-10-02T09:30')!;
    expect(new Date(iso).getHours()).toBe(9);
    expect(toDateTimeInput(iso)).toBe('2026-10-02T09:30');
  });

  it('stores a chosen day as local midnight so it never shows as the day before', () => {
    const iso = fromDateInput('2026-10-05')!;
    const date = new Date(iso);
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 5, 0]);
    expect(toDateInput(iso)).toBe('2026-10-05');
  });

  it('treats empty inputs as cleared', () => {
    expect(fromDateInput('')).toBeUndefined();
    expect(fromDateTimeInput('')).toBeUndefined();
    expect(toDateInput(undefined)).toBe('');
  });
});
