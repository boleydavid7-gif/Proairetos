import { useRef, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, ArrowRightIcon } from '../app/icons';
import { offerUndo } from '../app/undo';
import { newId, useBudget, useSettings } from '../app/state';
import { PageTop } from '../app/ui';
import { formatMoney } from '../core/bills';
import { budgetCategories, formatMonthKey, monthDate, monthKey, type BudgetCategory } from '../core/budget';
import { byArea, guessArea, newLines, readStatement, type Spent } from '../core/statements';
import { areaChoices, rememberArea, saveSpent, spentIn, useSpent } from '../data/spent';

const areaName = (area: BudgetCategory) => budgetCategories.find((each) => each.id === area)?.label ?? 'Other';
const shiftMonth = (month: string, by: number) => {
  const date = monthDate(month);
  return monthKey(new Date(date.getFullYear(), date.getMonth() + by, 1, 12));
};
const dayOf = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** What went out in a month, from statements, by area: plain totals beside the month's plan, and every line. */
export default function SpentPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const [month, setMonth] = useState(() => monthKey());
  const lines = useSpent(month);
  const plan = useBudget(month);
  const [review, setReview] = useState<Spent[]>();
  const [problem, setProblem] = useState('');
  const [open, setOpen] = useState<BudgetCategory>();
  const [moving, setMoving] = useState<Spent>();
  const file = useRef<HTMLInputElement>(null);
  const currency = plan?.currency ?? settings.currency;
  const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const planned = (area: BudgetCategory) => plan?.categoryLimits?.[area] ?? 0;

  const bringIn = async (chosen?: File) => {
    if (!chosen) return;
    const read = readStatement(await chosen.text());
    if (!read) return setProblem('That file does not look like a statement. A CSV from your bank or card, with a date and an amount, works.');
    const choices = areaChoices();
    const months = new Set(read.map((line) => line.date.slice(0, 7)));
    const fresh = read.filter((line) => newLines(spentIn(line.date.slice(0, 7)), [line]).length > 0);
    if (!fresh.length) return setProblem(months.size ? 'Everything in that file is already here.' : 'Nothing went out in that file.');
    setProblem('');
    setReview(fresh.map((line) => ({ ...line, id: newId(), area: guessArea(line.description, choices) })));
  };
  const keep = () => {
    if (!review) return;
    const byMonth = new Map<string, Spent[]>();
    for (const line of review) byMonth.set(line.date.slice(0, 7), [...(byMonth.get(line.date.slice(0, 7)) ?? []), line]);
    const before = new Map([...byMonth.keys()].map((key) => [key, spentIn(key)]));
    for (const [key, added] of byMonth) saveSpent(key, [...spentIn(key), ...added]);
    const latest = [...byMonth.keys()].sort().pop();
    if (latest) setMonth(latest);
    setReview(undefined);
    offerUndo(`${review.length} ${review.length === 1 ? 'line' : 'lines'} brought in`, () => before.forEach((kept, key) => saveSpent(key, kept)));
  };
  const move = (line: Spent, area: BudgetCategory) => {
    rememberArea(line.description, area);
    saveSpent(month, lines.map((each) => (each.id === line.id ? { ...each, area } : each)));
    setMoving(undefined);
  };
  const remove = (line: Spent) => {
    saveSpent(month, lines.filter((each) => each.id !== line.id));
    offerUndo('Line removed', () => saveSpent(month, lines));
    setMoving(undefined);
  };

  if (review) {
    return (
      <div className="page oiko-page">
        <PageTop><button type="button" className="back-link" onClick={() => setReview(undefined)}><ArrowLeftIcon size={19} /> Back</button></PageTop>
        <h1 className="title">From the statement</h1>
        <p className="muted">{review.length} {review.length === 1 ? 'line' : 'lines'} of money out. Change an area if it’s wrong.</p>
        <ul className="oiko-spent-list">
          {review.map((line) => (
            <li key={line.id} className="oiko-spent-line">
              <span className="oiko-spent-line__text"><strong>{line.description}</strong><small>{dayOf(line.date)}</small></span>
              <span className="oiko-spent-line__end">
                <strong>{formatMoney(line.amountCents, currency)}</strong>
                <select aria-label={`Area for ${line.description}`} value={line.area} onChange={(event) => setReview(review.map((each) => (each.id === line.id ? { ...each, area: event.target.value as BudgetCategory } : each)))}>
                  {budgetCategories.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
                </select>
              </span>
            </li>
          ))}
        </ul>
        <div className="button-row">
          <button type="button" className="button-main" onClick={() => { review.forEach((line) => line.area !== guessArea(line.description) && rememberArea(line.description, line.area)); keep(); }}>Keep them</button>
          <button type="button" className="button-quiet" onClick={() => setReview(undefined)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page oiko-page">
      <PageTop><button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Back</button></PageTop>
      <div className="oiko-budget__heading">
        <div>
          <p className="label">Spent</p>
          <h1 className="title">{formatMonthKey(month)}</h1>
        </div>
        <div className="oiko-budget__switch">
          <button type="button" className="round-button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ArrowLeftIcon size={18} /></button>
          <button type="button" className="round-button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ArrowRightIcon size={18} /></button>
        </div>
      </div>

      <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(event) => { void bringIn(event.target.files?.[0]); event.target.value = ''; }} />
      <button type="button" className="button-main" onClick={() => file.current?.click()}>Bring in a statement</button>
      {problem && <p className="form-error" role="alert">{problem}</p>}

      {lines.length === 0 ? (
        <p className="muted">Nothing for {formatMonthKey(month)} yet. Bring in a CSV from your bank or card; only money out is kept.</p>
      ) : (
        <>
          <section className="card oiko-budget-summary">
            <strong className="oiko-budget-summary__amount">{formatMoney(total, currency)}</strong>
            <p className="muted">went out in {lines.length} {lines.length === 1 ? 'line' : 'lines'}</p>
          </section>
          <section className="oiko-budget-breakdown" aria-label="By area">
            <div className="oiko-section-head"><h2>By area</h2></div>
            {byArea(lines).map(({ area, cents }) => (
              <div key={area}>
                <button type="button" className="oiko-budget-breakdown__row oiko-spent-area" aria-expanded={open === area} onClick={() => setOpen(open === area ? undefined : area)}>
                  <span>{areaName(area)}</span>
                  <span className="oiko-spent-area__amounts">
                    <strong>{formatMoney(cents, currency)}</strong>
                    {planned(area) > 0 && <small>Planned {formatMoney(planned(area), currency)}</small>}
                  </span>
                </button>
                {open === area && (
                  <ul className="oiko-spent-list">
                    {lines.filter((line) => line.area === area).map((line) => (
                      <li key={line.id} className="oiko-spent-line">
                        <button type="button" className="oiko-spent-line__text" onClick={() => setMoving(line)}><strong>{line.description}</strong><small>{dayOf(line.date)}</small></button>
                        <strong>{formatMoney(line.amountCents, currency)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      {moving && (
        <div className="sheet-back" onClick={() => setMoving(undefined)}>
          <div className="sheet" role="dialog" aria-label={moving.description} onClick={(event) => event.stopPropagation()}>
            <h2 className="sheet__title">{moving.description}</h2>
            <p className="muted">{dayOf(moving.date)} · {formatMoney(moving.amountCents, currency)}</p>
            <span className="label">Area</span>
            <div className="chip-grid" role="group" aria-label="Area">
              {budgetCategories.map((area) => (
                <button key={area.id} type="button" className="chip" aria-pressed={moving.area === area.id} onClick={() => move(moving, area.id)}>{area.label}</button>
              ))}
            </div>
            <div className="button-row">
              <button type="button" className="button-quiet" onClick={() => remove(moving)}>Remove</button>
              <button type="button" className="button-quiet" onClick={() => setMoving(undefined)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
