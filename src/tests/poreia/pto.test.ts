import { accrualDates, balanceAt, findVacationWindows, requestAmount, workHoursBetween, type LeaveRequest, type PtoAccount, type PtoLedgerTransaction, type WorkProfile } from '../../poreia/core/pto';

const profile: WorkProfile = {
  id: 'work',
  name: 'Weekdays',
  timezone: 'America/New_York',
  week: { 1: { hours: 8 }, 2: { hours: 8 }, 3: { hours: 8 }, 4: { hours: 8 }, 5: { hours: 8 } },
  holidays: ['2026-07-03'],
  createdAt: '',
  updatedAt: '',
};

const account: PtoAccount = {
  id: 'vacation',
  name: 'Vacation',
  category: 'vacation',
  unit: 'hours',
  openingBalance: 40,
  openingDate: '2026-01-01',
  policy: { frequency: 'biweekly', amount: 4, startDate: '2026-01-09' },
  workProfileId: 'work',
  createdAt: '',
  updatedAt: '',
};

describe('Poreia PTO engine', () => {
  it('counts custom work hours and skips employer holidays', () => {
    expect(workHoursBetween('2026-07-02', '2026-07-06', profile)).toBe(16);
    expect(requestAmount({ startDate: '2026-07-02', endDate: '2026-07-06' }, profile)).toBe(16);
  });

  it('counts an overnight shift on its scheduled start date', () => {
    const overnight: WorkProfile = { ...profile, week: { 5: { hours: 8, start: '22:00', end: '06:00' } } };
    expect(workHoursBetween('2026-07-03', '2026-07-03', overnight)).toBe(0);
    expect(workHoursBetween('2026-07-10', '2026-07-10', overnight)).toBe(8);
  });

  it('generates anchored biweekly and semimonthly accrual dates', () => {
    expect(accrualDates(account.policy, '2026-01-01', '2026-02-01')).toEqual(['2026-01-09', '2026-01-23']);
    expect(accrualDates({ ...account.policy, frequency: 'semimonthly', startDate: '2026-01-10' }, '2026-01-01', '2026-02-15')).toEqual(['2026-01-10', '2026-01-15', '2026-02-10', '2026-02-15']);
  });

  it('projects the ledger and approved leave without overwriting history', () => {
    const ledger: PtoLedgerTransaction[] = [{ id: 'adjustment', accountId: 'vacation', date: '2026-01-01', amount: 2, kind: 'adjustment', note: 'Correction' }];
    const requests: LeaveRequest[] = [{ id: 'leave', accountId: 'vacation', startDate: '2026-01-12', endDate: '2026-01-13', requestedAmount: 16, status: 'approved', createdAt: '', updatedAt: '' }];
    expect(balanceAt(account, ledger, profile, '2026-01-23', requests)).toBe(34);
    expect(ledger).toHaveLength(1);
  });

  it('does not deduct leave before approval and applies a balance cap', () => {
    const capped = { ...account, openingBalance: 40, policy: { ...account.policy, maximumBalance: 42 } };
    const requests: LeaveRequest[] = [{ id: 'draft', accountId: 'vacation', startDate: '2026-01-12', endDate: '2026-01-13', requestedAmount: 16, status: 'draft', createdAt: '', updatedAt: '' }];
    expect(balanceAt(capped, [], profile, '2026-01-23', requests)).toBe(42);
  });

  it('finds windows that fit the real workweek and available leave', () => {
    const windows = findVacationWindows(account, profile, [], [], { from: '2026-07-01', until: '2026-07-15', durationDays: 5, maximumPto: 40 });
    expect(windows.length).toBeGreaterThan(0);
    expect(windows[0]).toMatchObject({ calendarDays: 5, ptoRequired: 16 });
    expect(windows[0].startDate).not.toBe('2026-07-03');
  });
});
