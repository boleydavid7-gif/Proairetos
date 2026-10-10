import { FormEvent, useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon } from '../app/icons';
import { localDate, type BillFrequency } from '../core/bills';
import { useBills, useSettings, newId } from '../app/state';
import { putBill } from '../data/store';
import { PageTop, formatFrequency } from '../app/ui';
import { budgetCategories, moneyInputCents } from '../core/budget';

export default function CapturePage({ nav, id }: { nav: Nav; id?: string }) {
  const settings = useSettings();
  const bills = useBills();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return localDate(date);
  });
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [category, setCategory] = useState('');
  const [autopay, setAutopay] = useState(false);
  const [reminderDays, setReminderDays] = useState('3');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const existing = bills?.find((bill) => bill.id === id);
  // The same few areas as the monthly plan, so each bill counts in the right one; an older free-text one stays.
  const areas = budgetCategories.map(({ label }) => label);
  if (category && !areas.includes(category)) areas.push(category);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setAmount((existing.amountCents / 100).toFixed(2));
    setDueDate(existing.dueDate);
    setFrequency(existing.frequency);
    setCategory(existing.category ?? '');
    setAutopay(existing.autopay);
    setReminderDays(String(existing.reminderDays));
    setNotes(existing.notes ?? '');
  }, [existing]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const cents = moneyInputCents(amount.replace(/[^\d.,]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, ''));
    if (!name.trim()) {
      setError('Give this bill a name.');
      return;
    }
    if (cents === undefined) {
      setError('Use an amount with up to two decimal places, like 86.40.');
      return;
    }
    const now = new Date().toISOString();
    const bill = {
      ...existing,
      id: existing?.id ?? newId(),
      name: name.trim(),
      amountCents: cents,
      currency: existing?.currency ?? settings.currency,
      dueDate,
      frequency,
      category: category.trim() || undefined,
      autopay,
      reminderDays: Number(reminderDays),
      notes: notes.trim() || undefined,
      payments: existing?.payments ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await putBill(bill);
    nav.go({ name: 'bill', id: bill.id });
  }

  return (
    <div className="page oiko-page">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Back</button>
      </PageTop>
      <h1 className="title">{id ? 'Edit bill' : 'Add a bill'}</h1>

      <form className="oiko-form" onSubmit={(event) => void save(event)}>
        <label className="field"><span className="field__label">Bill name</span><input className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Electric, rent, insurance" /></label>
        <label className="field"><span className="field__label">Amount</span><input className="input" type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
        <div className="oiko-form__pair">
          <label className="field"><span className="field__label">Next due</span><input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label className="field"><span className="field__label">Repeats</span><select className="input" value={frequency} onChange={(event) => setFrequency(event.target.value as BillFrequency)}>{(['once', 'weekly', 'monthly', 'quarterly', 'yearly'] as BillFrequency[]).map((value) => <option key={value} value={value}>{formatFrequency(value)}</option>)}</select></label>
        </div>
        <label className="field"><span className="field__label">Area</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">None</option>{areas.map((area) => <option key={area} value={area}>{area}</option>)}</select></label>

        <div className="oiko-form-card">
          <label className="oiko-check-row"><span><strong>Autopay</strong><small>Paid automatically</small></span><input type="checkbox" checked={autopay} onChange={(event) => setAutopay(event.target.checked)} /></label>
          <label className="oiko-check-row"><span><strong>Remind me</strong><small>Before the due date</small></span><select className="oiko-select" value={reminderDays} onChange={(event) => setReminderDays(event.target.value)}><option value="0">On the day</option><option value="1">1 day before</option><option value="3">3 days before</option><option value="7">1 week before</option><option value="14">2 weeks before</option></select></label>
        </div>

        <label className="field"><span className="field__label">Note</span><textarea className="input oiko-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Account number, where you pay it" /></label>

        {error && <p className="oiko-error" role="alert">{error}</p>}
        <button type="submit" className="button-main">{id ? 'Save changes' : 'Add bill'}</button>
      </form>
    </div>
  );
}
