import { endsWith, useLaunchedFile } from '../../app/family/launchFiles';
import { useEffect, useRef, useState } from 'react';
import { ColumnChart } from '../../app/family/charts';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, ArrowRightIcon, WalletIcon } from '../app/icons';
import { offerUndo } from '../app/undo';
import { newId, useBudget, useSettings } from '../app/state';
import { PageTop } from '../app/ui';
import { formatMoney, localDate } from '../core/bills';
import { budgetCategories, formatMonthKey, monthDate, monthKey, type BudgetCategory } from '../core/budget';
import { byArea, cents, guessArea, newLines, readStatement, type Spent } from '../core/statements';
import { areaChoices, rememberArea, saveSpent, spentIn, useSpent } from '../data/spent';
import Empty from '../../app/family/Empty';
import IconButton from '../../components/ui/IconButton';

const areaName = (area: BudgetCategory) => budgetCategories.find((each) => each.id === area)?.label ?? 'Other';
const shiftMonth = (month: string, by: number) => {
  const date = monthDate(month);
  return monthKey(new Date(date.getFullYear(), date.getMonth() + by, 1, 12));
};
const dayOf = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** What went out in a month, from statements, by area: plain totals beside the month's plan, and every line. */
export default function SpentPage({ nav, quick = false }: { nav: Nav; quick?: boolean }) {
  const settings = useSettings();
  const [month, setMonth] = useState(() => monthKey());
  const lines = useSpent(month);
  const plan = useBudget(month);
  const [review, setReview] = useState<Spent[]>();
  const [problem, setProblem] = useState('');
  const [open, setOpen] = useState<BudgetCategory>();
  const [moving, setMoving] = useState<Spent>();
  const [entryOpen, setEntryOpen] = useState(quick);
  const [entryDate, setEntryDate] = useState(() => (month === monthKey() ? localDate() : `${month}-01`));
  const [entryDescription, setEntryDescription] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryArea, setEntryArea] = useState<BudgetCategory>('other');
  const file = useRef<HTMLInputElement>(null);
  const currency = plan?.currency ?? settings.currency;
  const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const planned = (area: BudgetCategory) => plan?.categoryLimits?.[area] ?? 0;

  // A bank CSV opened with Oikonomia on a computer comes here.
  useLaunchedFile(endsWith('.csv'), (chosen) => void bringIn(chosen));
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

  useEffect(() => {
    setEntryDate(month === monthKey() ? localDate() : `${month}-01`);
  }, [month]);

  const addExpense = () => {
    const description = entryDescription.trim();
    const amountCents = cents(entryAmount);
    if (!description) return setProblem('Name the expense first.');
    if (amountCents === undefined || amountCents <= 0) return setProblem('Use an amount greater than zero.');
    if (!entryDate.startsWith(`${month}-`)) return setProblem('Choose a date in this month.');
    const line: Spent = { id: newId(), date: entryDate, description, amountCents, area: entryArea };
    const before = lines;
    saveSpent(month, [...before, line]);
    setEntryDescription('');
    setEntryAmount('');
    setEntryOpen(false);
    setProblem('');
    offerUndo('Expense removed', () => saveSpent(month, before));
    if (quick) nav.back();
  };

  if (review) {
    return (
      <div className="page oiko-page">
        <PageTop><button type="button" className="back-link" onClick={() => setReview(undefined)}><ArrowLeftIcon size={20} /> Back</button></PageTop>
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
      <PageTop><button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={20} /> Back</button></PageTop>
      <div className="oiko-budget__heading">
        <div>
          <p className="label">Spent</p>
          <h1 className="title">{quick ? 'Record an expense' : formatMonthKey(month)}</h1>
        </div>
        {!quick && <div className="oiko-budget__switch">
          <IconButton size="md" className="round-button" label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ArrowLeftIcon size={18} /></IconButton>
          <IconButton size="md" className="round-button" label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ArrowRightIcon size={18} /></IconButton>
        </div>}
      </div>

      {!quick && <>
        <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(event) => { void bringIn(event.target.files?.[0]); event.target.value = ''; }} />
        <div className="button-row oiko-spent-actions">
          <button type="button" className="button-main" onClick={() => file.current?.click()}>Bring in a statement</button>
          <button type="button" className="button-quiet" onClick={() => { setEntryOpen(!entryOpen); setProblem(''); }}>{entryOpen ? 'Cancel' : 'Add expense'}</button>
        </div>
      </>}
      {problem && <p className="form-error" role="alert">{problem}</p>}

      {entryOpen && (
        <section className="card oiko-manual-expense" aria-label="Add an expense">
          <div className="oiko-section-head"><h2>Add an expense</h2><span className="muted">For this month</span></div>
          <label className="field"><span className="field__label">What was it?</span><input className="input" value={entryDescription} onChange={(event) => setEntryDescription(event.target.value)} placeholder="Groceries, parking, gift" autoFocus /></label>
          <div className="oiko-form__pair">
            <label className="field"><span className="field__label">Amount</span><input className="input" type="text" inputMode="decimal" value={entryAmount} onChange={(event) => setEntryAmount(event.target.value)} placeholder="0.00" /></label>
            <label className="field"><span className="field__label">Date</span><input className="input" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          </div>
          <label className="field"><span className="field__label">Area</span><select className="input" value={entryArea} onChange={(event) => setEntryArea(event.target.value as BudgetCategory)}>{budgetCategories.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>
          <button type="button" className="button-main" onClick={addExpense}>Save expense</button>
        </section>
      )}

      {lines.length === 0 ? (
        <Empty icon={<WalletIcon size={28} />} title={`Nothing for ${formatMonthKey(month)} yet`} line="Bring in a CSV from your bank or card, or add expenses by hand; only money out is kept." />
      ) : (
        <>
          <section className="card oiko-budget-summary">
            <strong className="oiko-budget-summary__amount">{formatMoney(total, currency)}</strong>
            <p className="muted">went out in {lines.length} {lines.length === 1 ? 'line' : 'lines'}</p>
          </section>
          <ColumnChart
            title={`Spent each month (${currency})`}
            days={[-5, -4, -3, -2, -1, 0].map((by) => {
              const key = shiftMonth(month, by);
              const kept = by === 0 ? lines : spentIn(key);
              const date = monthDate(key);
              return {
                label: date.toLocaleDateString(undefined, { month: 'short' }),
                long: formatMonthKey(key),
                value: kept.length ? Math.round(kept.reduce((sum, line) => sum + line.amountCents, 0) / 100) : undefined,
              };
            })}
          />
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
