export type DateString = string;
export type PtoUnit = 'hours' | 'days';
export type LeaveCategory = 'vacation' | 'personal' | 'sick' | 'floating' | 'comp' | 'unpaid' | 'custom';
export type AccrualFrequency = 'none' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annual';

export type WorkDay = {
  hours: number;
  start?: string;
  end?: string;
};

export type WorkProfile = {
  id: string;
  name: string;
  timezone: string;
  /** JavaScript weekday keys: 0 Sunday through 6 Saturday. */
  week: Partial<Record<number, WorkDay>>;
  holidays: DateString[];
  createdAt: string;
  updatedAt: string;
};

export type AccrualPolicy = {
  frequency: AccrualFrequency;
  amount: number;
  startDate: DateString;
  carryoverLimit?: number;
  maximumBalance?: number;
  expirationMonths?: number;
};

export type PtoAccount = {
  id: string;
  name: string;
  category: LeaveCategory;
  unit: PtoUnit;
  openingBalance: number;
  openingDate: DateString;
  policy: AccrualPolicy;
  workProfileId: string;
  createdAt: string;
  updatedAt: string;
};

export type PtoLedgerKind = 'opening' | 'accrual' | 'requested' | 'taken' | 'reversal' | 'adjustment' | 'expiration';

export type PtoLedgerTransaction = {
  id: string;
  accountId: string;
  date: DateString;
  amount: number;
  kind: PtoLedgerKind;
  note?: string;
  requestId?: string;
};

export type LeaveRequestStatus = 'draft' | 'requested' | 'pending' | 'approved' | 'denied' | 'canceled' | 'taken' | 'reconciled';

export type LeaveRequest = {
  id: string;
  accountId: string;
  vacationId?: string;
  startDate: DateString;
  endDate: DateString;
  requestedAmount: number;
  status: LeaveRequestStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type VacationStatus = 'planned' | 'requested' | 'approved' | 'taken' | 'canceled';
export type CalendarSyncStatus = 'pending' | 'synced' | 'error';

/** A confirmed or tentative absence plan, separate from employer approval and PTO transactions. */
export type VacationPlan = {
  id: string;
  name: string;
  startDate: DateString;
  endDate: DateString;
  status: VacationStatus;
  ptoRequired: number;
  ptoAccountId?: string;
  leaveRequestId?: string;
  tripId?: string;
  calendarSync: CalendarSyncStatus;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
};

export type VacationWindow = {
  startDate: DateString;
  endDate: DateString;
  calendarDays: number;
  ptoRequired: number;
  balanceAfter: number;
  conflicts: DateString[];
  reason: string;
};

const DAY = 86_400_000;

export function parseDate(value: DateString): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateText(value: Date): DateString {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function addDays(value: DateString, amount: number): DateString {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return dateText(date);
}

export function dateDistance(from: DateString, until: DateString): number {
  return Math.round((parseDate(until).getTime() - parseDate(from).getTime()) / DAY);
}

export function dateRange(from: DateString, until: DateString): DateString[] {
  const days = dateDistance(from, until);
  if (days < 0 || days > 3660) return [];
  return Array.from({ length: days + 1 }, (_, index) => addDays(from, index));
}

function monthLastDay(year: number, month: number): number {
  return new Date(year, month + 1, 0, 12).getDate();
}

function monthDate(year: number, month: number, day: number): DateString {
  return dateText(new Date(year, month, Math.min(day, monthLastDay(year, month)), 12));
}

function clockHours(start: string | undefined, end: string | undefined, fallback: number): number {
  if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return fallback;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return fallback;
  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, Math.min(24, (endMinutes - startMinutes) / 60));
}

export function workHoursOn(date: DateString, profile: WorkProfile): number {
  if (profile.holidays.includes(date)) return 0;
  const day = profile.week[parseDate(date).getDay()];
  if (!day) return 0;
  return clockHours(day.start, day.end, Math.max(0, day.hours));
}

export function workHoursBetween(from: DateString, until: DateString, profile: WorkProfile): number {
  return dateRange(from, until).reduce((total, date) => total + workHoursOn(date, profile), 0);
}

export function requestAmount(request: Pick<LeaveRequest, 'startDate' | 'endDate'>, profile: WorkProfile): number {
  return workHoursBetween(request.startDate, request.endDate, profile);
}

export function accrualDates(policy: AccrualPolicy, from: DateString, until: DateString): DateString[] {
  if (policy.frequency === 'none' || policy.amount <= 0 || policy.startDate > until) return [];
  const start = policy.startDate > from ? policy.startDate : from;
  if (policy.frequency === 'weekly' || policy.frequency === 'biweekly') {
    const step = policy.frequency === 'weekly' ? 7 : 14;
    const offset = Math.max(0, Math.ceil(dateDistance(policy.startDate, start) / step));
    const first = addDays(policy.startDate, offset * step);
    return dateRange(first, until).filter((date) => dateDistance(first, date) % step === 0);
  }
  const result: DateString[] = [];
  const first = parseDate(start);
  const last = parseDate(until);
  const firstMonth = first.getFullYear() * 12 + first.getMonth();
  const lastMonth = last.getFullYear() * 12 + last.getMonth();
  if (policy.frequency === 'monthly' || policy.frequency === 'semimonthly') {
    for (let month = firstMonth; month <= lastMonth; month += 1) {
      const year = Math.floor(month / 12);
      const monthIndex = month % 12;
      const dates = policy.frequency === 'monthly' ? [monthDate(year, monthIndex, parseDate(policy.startDate).getDate())] : [monthDate(year, monthIndex, parseDate(policy.startDate).getDate()), monthDate(year, monthIndex, 15)];
      for (const date of dates) if (date >= start && date <= until && !result.includes(date)) result.push(date);
    }
    return result.sort();
  }
  const startDate = parseDate(policy.startDate);
  const targetMonth = startDate.getMonth();
  const targetDay = startDate.getDate();
  for (let year = first.getFullYear(); year <= last.getFullYear(); year += 1) {
    const date = monthDate(year, targetMonth, targetDay);
    if (date >= start && date <= until) result.push(date);
  }
  return result;
}

export function generatedAccruals(account: PtoAccount, from: DateString, until: DateString): PtoLedgerTransaction[] {
  return accrualDates(account.policy, from, until).map((date) => ({
    id: `accrual:${account.id}:${date}`,
    accountId: account.id,
    date,
    amount: account.policy.amount,
    kind: 'accrual',
  }));
}

function requestTransactions(requests: readonly LeaveRequest[], accountId: string, through: DateString): PtoLedgerTransaction[] {
  return requests
    .filter((request) => request.accountId === accountId && request.endDate <= through && ['approved', 'taken', 'reconciled'].includes(request.status))
    .map((request) => ({ id: `request:${request.id}`, accountId, date: request.startDate, amount: -request.requestedAmount, kind: request.status === 'taken' || request.status === 'reconciled' ? 'taken' : 'requested', requestId: request.id }));
}

export function balanceAt(
  account: PtoAccount,
  ledger: readonly PtoLedgerTransaction[],
  profile: WorkProfile,
  through: DateString,
  requests: readonly LeaveRequest[] = [],
): number {
  void profile;
  const opening = account.openingBalance;
  const manual = ledger.filter((entry) => entry.accountId === account.id && entry.date <= through && entry.kind !== 'accrual');
  const recordedAccruals = new Map(ledger.filter((entry) => entry.accountId === account.id && entry.kind === 'accrual' && entry.date <= through).map((entry) => [entry.date, entry]));
  const accruals = generatedAccruals(account, account.openingDate, through).map((entry) => recordedAccruals.get(entry.date) ?? entry);
  const requested = requestTransactions(requests, account.id, through).filter((entry) => !manual.some((other) => other.requestId === entry.requestId));
  let balance = opening + [...manual, ...accruals, ...requested].reduce((total, entry) => total + entry.amount, 0);
  if (account.policy.maximumBalance !== undefined) balance = Math.min(balance, account.policy.maximumBalance);
  if (account.policy.carryoverLimit !== undefined) balance = Math.min(balance, account.policy.carryoverLimit);
  return Math.max(0, balance);
}

export function projectedBalance(account: PtoAccount, ledger: readonly PtoLedgerTransaction[], profile: WorkProfile, through: DateString, requests: readonly LeaveRequest[] = []): number {
  return balanceAt(account, ledger, profile, through, requests);
}

export function findVacationWindows(
  account: PtoAccount,
  profile: WorkProfile,
  ledger: readonly PtoLedgerTransaction[],
  requests: readonly LeaveRequest[],
  options: { from: DateString; until: DateString; durationDays: number; maximumPto?: number; minimumPto?: number },
): VacationWindow[] {
  const result: VacationWindow[] = [];
  if (options.durationDays < 1 || options.durationDays > 90) return result;
  const dates = dateRange(options.from, addDays(options.until, -options.durationDays + 1));
  for (const startDate of dates) {
    const endDate = addDays(startDate, options.durationDays - 1);
    const ptoRequired = workHoursBetween(startDate, endDate, profile);
    const conflicts = requests.filter((request) => request.status !== 'denied' && request.status !== 'canceled' && request.startDate <= endDate && request.endDate >= startDate).flatMap((request) => dateRange(request.startDate > startDate ? request.startDate : startDate, request.endDate < endDate ? request.endDate : endDate));
    if (conflicts.length || ptoRequired < (options.minimumPto ?? 0) || (options.maximumPto !== undefined && ptoRequired > options.maximumPto)) continue;
    const balanceAfter = projectedBalance(account, ledger, profile, endDate, requests) - ptoRequired;
    if (balanceAfter < 0) continue;
    const weekends = dateRange(startDate, endDate).filter((date) => [0, 6].includes(parseDate(date).getDay())).length;
    result.push({ startDate, endDate, calendarDays: options.durationDays, ptoRequired, balanceAfter, conflicts, reason: weekends ? `${weekends} weekend ${weekends === 1 ? 'day' : 'days'} extend the break.` : 'Uses scheduled workdays only.' });
  }
  return result.sort((a, b) => a.ptoRequired - b.ptoRequired || a.startDate.localeCompare(b.startDate)).slice(0, 20);
}
