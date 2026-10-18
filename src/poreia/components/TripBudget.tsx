import { useState } from 'react';
import { PlusIcon, PtoIcon } from '../app/icons';
import type { Booking, Trip, TripExpense } from '../core/trips';
import { newId } from '../core/id';
import { putTrip } from '../data/store';
import { formatMoney } from '../../oikonomia/core/bills';

const categories: TripExpense['category'][] = ['transportation', 'accommodation', 'food', 'activities', 'shopping', 'other'];
const label = (value: string) => value[0].toUpperCase() + value.slice(1);
const cents = (value: string) => { const amount = Number(value); return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0; };

export default function TripBudget({ trip, bookings }: { trip: Trip; bookings: Booking[] }) {
  const [target, setTarget] = useState(trip.budgetCents ? (trip.budgetCents / 100).toFixed(2) : '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TripExpense['category']>('other');
  const expenses = trip.expenses ?? [];
  const actual = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const committed = bookings.reduce((sum, booking) => sum + (booking.totalCents ?? 0), 0);
  const saveTarget = async () => putTrip({ ...trip, budgetCents: cents(target), budgetCurrency: trip.budgetCurrency || 'USD', updatedAt: new Date().toISOString() });
  const saveExpense = async () => { if (!description.trim() || cents(amount) <= 0) return; const now = new Date().toISOString(); await putTrip({ ...trip, expenses: [...expenses, { id: newId(), description: description.trim(), category, amountCents: cents(amount), currency: trip.budgetCurrency || 'USD', createdAt: now, updatedAt: now }], updatedAt: now }); setDescription(''); setAmount(''); };
  return <section className="poreia-section poreia-trip-budget"><div className="poreia-section-head"><div><p className="label">Trip budget</p><h2>{trip.budgetCents ? formatMoney(trip.budgetCents, trip.budgetCurrency || 'USD') : 'Set a spending target'}</h2></div><PtoIcon size={22} /></div>{trip.budgetCents ? <><div className="poreia-budget-facts"><div><small>Actual</small><strong>{formatMoney(actual, trip.budgetCurrency || 'USD')}</strong></div><div><small>Committed</small><strong>{formatMoney(committed, trip.budgetCurrency || 'USD')}</strong></div><div><small>Remaining</small><strong>{formatMoney(Math.max(0, trip.budgetCents - actual), trip.budgetCurrency || 'USD')}</strong></div></div><div className="poreia-progress"><span style={{ width: `${Math.min(100, actual / trip.budgetCents * 100)}%` }} /></div></> : <p className="muted">Set a target if you would like to keep track of vacation costs. Budgeting is optional.</p>}<div className="poreia-form__pair"><label className="field"><span className="field__label">Budget target (USD)</span><input className="input" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="3,500" /></label><button type="button" className="button-main poreia-budget-save" onClick={() => void saveTarget()}>Save target</button></div><form className="poreia-form poreia-budget-expense" onSubmit={(event) => { event.preventDefault(); void saveExpense(); }}><div className="poreia-section-head"><h3>Recent expenses</h3><span className="label">{expenses.length}</span></div><label className="field"><span className="field__label">Description</span><input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Hotel deposit" /></label><div className="poreia-form__pair"><label className="field"><span className="field__label">Amount (USD)</span><input className="input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="400" /></label><label className="field"><span className="field__label">Category</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value as TripExpense['category'])}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label></div><button type="submit" className="button-main"><PlusIcon size={18} /> Add expense</button></form>{expenses.length > 0 && <div className="poreia-list">{expenses.slice().reverse().map((expense) => <div className="poreia-row" key={expense.id}><span className="poreia-row__text"><strong>{expense.description}</strong><small>{label(expense.category)}</small></span><span className="poreia-balance">{formatMoney(expense.amountCents, expense.currency)}</span></div>)}</div>}</section>;
}
