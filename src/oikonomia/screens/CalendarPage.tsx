import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon } from '../app/icons';
import { formatDate, formatMonth, monthBounds, monthCells, nextMonth, occurrencesBetween, localDate } from '../core/bills';
import { useBills } from '../app/state';
import { PageTop } from '../app/ui';

function ArrowRightIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 5 7 7-7 7" /></svg>;
}

export default function CalendarPage({ nav }: { nav: Nav }) {
  const bills = useBills() ?? [];
  const today = localDate();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const cells = monthCells(month);
  const bounds = monthBounds(month);
  const occurrences = bills.flatMap((bill) => occurrencesBetween(bill, bounds.from, bounds.until));
  const byDate = useMemo(() => {
    const map = new Map<string, typeof occurrences>();
    occurrences.forEach((occurrence) => map.set(occurrence.date, [...(map.get(occurrence.date) ?? []), occurrence]));
    return map;
  }, [occurrences]);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="page oiko-page">
      <PageTop>
        <div>
          <h1 className="title">Calendar</h1>
        </div>
      </PageTop>

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
                  {entries.slice(0, 3).map((entry) => <button type="button" key={entry.bill.id + entry.date} title={entry.bill.name + ' · ' + formatDate(entry.date)} onClick={() => nav.go({ name: 'bill', id: entry.bill.id })}>{entry.bill.name.slice(0, 9)}</button>)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="oiko-calendar-list">
        <div className="oiko-section-head"><h2>Due this month</h2><span className="muted">{occurrences.length} {occurrences.length === 1 ? 'bill' : 'bills'}</span></div>
        {occurrences.length === 0 ? <p className="muted">Nothing is scheduled for this month.</p> : occurrences.map((occurrence) => (
          <button type="button" className="oiko-calendar-entry" key={occurrence.bill.id + occurrence.date} onClick={() => nav.go({ name: 'bill', id: occurrence.bill.id })}>
            <span className="oiko-calendar-entry__date">{formatDate(occurrence.date)}</span>
            <span><strong>{occurrence.bill.name}</strong><small>{occurrence.bill.frequency}</small></span>
            <span className="oiko-calendar-entry__amount">{new Intl.NumberFormat(undefined, { style: 'currency', currency: occurrence.bill.currency }).format(occurrence.bill.amountCents / 100)}</span>
          </button>
        ))}
      </section>

    </div>
  );
}
