import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, ArrowRightIcon } from '../app/icons';
import { amountFor, formatDate, formatMoney, formatMonth, monthBounds, monthCells, nextMonth, occurrencesBetween, paidForOccurrence, remainingSummary, weekBounds, weekdayLabels, type BillOccurrence } from '../core/bills';
import { useBills, useSettings, useToday } from '../app/state';
import { formatFrequency, PageTop } from '../app/ui';

const byDay = (a: BillOccurrence, b: BillOccurrence) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name);

export default function CalendarPage({ nav }: { nav: Nav }) {
  const bills = useBills() ?? [];
  const settings = useSettings();
  const today = useToday();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [range, setRange] = useState<'month' | 'week'>('month');
  const cells = monthCells(month, settings.planWeekStart);
  const bounds = monthBounds(month);
  const monthOccurrences = bills.flatMap((bill) => occurrencesBetween(bill, bounds.from, bounds.until)).sort(byDay);
  const week = weekBounds(today, settings.planWeekStart);
  const weekOccurrences = bills.flatMap((bill) => occurrencesBetween(bill, week.from, week.until)).sort(byDay);
  const occurrences = range === 'month' ? monthOccurrences : weekOccurrences;
  const byDate = useMemo(() => {
    const map = new Map<string, typeof monthOccurrences>();
    monthOccurrences.forEach((occurrence) => map.set(occurrence.date, [...(map.get(occurrence.date) ?? []), occurrence]));
    return map;
  }, [monthOccurrences]);
  const labels = weekdayLabels(settings.planWeekStart);
  const summary = remainingSummary(occurrences, today);

  return (
    <div className="page oiko-page">
      <PageTop>
        <div>
          <h1 className="title">Calendar</h1>
        </div>
      </PageTop>

      <div className="oiko-calendar-switch" role="group" aria-label="Calendar range">
        <button type="button" className={range === 'month' ? 'is-active' : ''} aria-pressed={range === 'month'} onClick={() => setRange('month')}>Due this month</button>
        <button type="button" className={range === 'week' ? 'is-active' : ''} aria-pressed={range === 'week'} onClick={() => setRange('week')}>Due this week</button>
      </div>

      <section className="card oiko-calendar-card" aria-label={formatMonth(month)}>
        <div className="oiko-calendar-head">
          <button type="button" className="icon-button" aria-label="Previous month" onClick={() => setMonth((current) => nextMonth(current, -1))}><ArrowLeftIcon size={20} /></button>
          <h2>{formatMonth(month)}</h2>
          <button type="button" className="icon-button" aria-label="Next month" onClick={() => setMonth((current) => nextMonth(current, 1))}><ArrowRightIcon size={20} /></button>
        </div>
        <div className="oiko-calendar-weekdays">{labels.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="oiko-calendar-grid">
          {cells.map((date) => {
            const inMonth = date.slice(0, 7) === bounds.from.slice(0, 7);
            const entries = byDate.get(date) ?? [];
            return (
              <div key={date} className={'oiko-calendar-day' + (!inMonth ? ' oiko-calendar-day--outside' : '') + (date === today ? ' oiko-calendar-day--today' : '')}>
                <span className="oiko-calendar-day__number">{Number(date.slice(-2))}</span>
                <span className="oiko-calendar-day__events">
                  {entries.slice(0, 3).map((entry) => <button type="button" key={entry.bill.id + entry.date} title={entry.bill.name + ' · ' + formatDate(entry.date)} className={paidForOccurrence(entry.bill, entry.date, today) ? 'is-paid' : undefined} onClick={() => nav.go({ name: 'bill', id: entry.bill.id })}>{entry.bill.name}</button>)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="oiko-calendar-list">
        <div className="oiko-section-head"><h2>{range === 'month' ? 'Due this month' : 'Due this week'}</h2><span className="muted">{occurrences.length} {occurrences.length === 1 ? 'bill' : 'bills'}</span></div>
        {occurrences.length > 0 && (
          <p className="oiko-total">
            <strong>{summary.main}</strong>
            <span>{summary.note}</span>
          </p>
        )}
        {occurrences.length === 0 ? <p className="muted">Nothing is scheduled for this {range}.</p> : occurrences.map((occurrence) => (
          <button type="button" className="oiko-calendar-entry" key={occurrence.bill.id + occurrence.date} onClick={() => nav.go({ name: 'bill', id: occurrence.bill.id })}>
            <span className="oiko-calendar-entry__date">{formatDate(occurrence.date)}</span>
            <span><strong>{occurrence.bill.name}</strong><small>{formatFrequency(occurrence.bill.frequency)}{paidForOccurrence(occurrence.bill, occurrence.date, today) ? ' · paid' : ''}</small></span>
            <span className="oiko-calendar-entry__amount">{formatMoney(amountFor(occurrence.bill, occurrence.date, today), occurrence.bill.currency)}</span>
          </button>
        ))}
      </section>

    </div>
  );
}
