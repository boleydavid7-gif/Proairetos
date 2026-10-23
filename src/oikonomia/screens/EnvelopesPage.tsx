import { useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, PlusIcon, WalletIcon } from '../app/icons';
import { newId, useEnvelopes, useSettings } from '../app/state';
import { formatDate, formatMoney, localDate } from '../core/bills';
import { addEnvelopeEntry, envelopeProgress, envelopeRemaining, newEnvelope, type Envelope } from '../core/envelopes';
import { moneyInputCents } from '../core/budget';
import { deleteEnvelope, putEnvelope } from '../data/store';
import { offerUndo } from '../app/undo';
import { PageTop } from '../app/ui';
import IconButton from '../../components/ui/IconButton';

const amountText = (value: number) => (value ? (value / 100).toFixed(2) : '');

function EnvelopeForm({ start, currency, onDone, onCancel }: { start: Envelope; currency: string; onDone: (envelope: Envelope) => void; onCancel: () => void }) {
  const [name, setName] = useState(start.name);
  const [target, setTarget] = useState(amountText(start.targetCents));
  const [monthly, setMonthly] = useState(amountText(start.monthlyCents));
  const [targetDate, setTargetDate] = useState(start.targetDate ?? '');
  const [error, setError] = useState('');

  function save() {
    const trimmed = name.trim();
    const targetCents = moneyInputCents(target);
    const monthlyCents = moneyInputCents(monthly);
    if (!trimmed) return setError('Give this envelope a name.');
    if (targetCents === undefined || monthlyCents === undefined) return setError('Use amounts with up to two decimal places.');
    onDone({ ...start, name: trimmed, currency, targetCents, monthlyCents, ...(targetDate ? { targetDate } : { targetDate: undefined }), updatedAt: new Date().toISOString() });
  }

  return (
    <form
      className="card oiko-envelope-form"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="oiko-section-head"><h2>{start.name ? 'Edit envelope' : 'New envelope'}</h2><WalletIcon size={20} /></div>
      <label className="field"><span className="field__label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Vacation" autoFocus /></label>
      <div className="oiko-form__pair">
        <label className="field"><span className="field__label">Target (optional)</span><input className="input" type="text" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="2,000.00" /></label>
        <label className="field"><span className="field__label">Monthly contribution</span><input className="input" type="text" inputMode="decimal" value={monthly} onChange={(event) => setMonthly(event.target.value)} placeholder="100.00" /></label>
      </div>
      <label className="field"><span className="field__label">Target date (optional)</span><input className="input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
      {error && <p className="oiko-error" role="alert">{error}</p>}
      <div className="button-row"><button type="button" className="button-quiet" onClick={onCancel}>Cancel</button><button type="submit" className="button-main">Save envelope</button></div>
    </form>
  );
}

function EntryForm({ envelope, onDone, onCancel }: { envelope: Envelope; onDone: (envelope: Envelope) => void; onCancel: () => void }) {
  const [action, setAction] = useState<'add' | 'use'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function save() {
    const cents = moneyInputCents(amount);
    if (cents === undefined || cents <= 0) return setError('Use an amount greater than zero.');
    if (action === 'use' && cents > envelope.balanceCents) return setError('That is more than this envelope holds.');
    onDone(addEnvelopeEntry(envelope, action === 'add' ? cents : -cents, note, localDate(), newId()));
  }

  return (
    <form className="oiko-envelope-entry" onSubmit={(event) => { event.preventDefault(); save(); }}>
      <div className="segmented" role="group" aria-label="Envelope action">
        <button type="button" className="segmented__option" aria-pressed={action === 'add'} onClick={() => setAction('add')}>Add money</button>
        <button type="button" className="segmented__option" aria-pressed={action === 'use'} onClick={() => setAction('use')}>Use money</button>
      </div>
      <label className="field"><span className="field__label">Amount</span><input className="input" type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100.00" autoFocus /></label>
      <label className="field"><span className="field__label">Note (optional)</span><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="April transfer" /></label>
      {error && <p className="oiko-error" role="alert">{error}</p>}
      <div className="button-row"><button type="button" className="button-quiet" onClick={onCancel}>Cancel</button><button type="submit" className="button-main">Save</button></div>
    </form>
  );
}

export default function EnvelopesPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const envelopes = useEnvelopes();
  const [editing, setEditing] = useState<Envelope>();
  const [entryFor, setEntryFor] = useState<string>();

  const save = async (envelope: Envelope) => {
    await putEnvelope(envelope);
    setEditing(undefined);
  };

  const remove = async (envelope: Envelope) => {
    await deleteEnvelope(envelope.id);
    setEditing(undefined);
    setEntryFor(undefined);
    offerUndo(`${envelope.name} removed`, () => putEnvelope(envelope));
  };

  return (
    <div className="page oiko-page oiko-envelopes">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={20} /> Back</button>
        <IconButton className="round-button" label="New envelope" onClick={() => { setEntryFor(undefined); setEditing(newEnvelope('', settings.currency, new Date().toISOString(), newId())); }}><PlusIcon size={22} /></IconButton>
      </PageTop>
      <div className="oiko-budget__heading"><div><p className="label">Savings</p><h1 className="title">Envelopes</h1></div></div>

      {editing && <EnvelopeForm start={editing} currency={settings.currency} onDone={(envelope) => void save(envelope)} onCancel={() => setEditing(undefined)} />}

      {envelopes.length === 0 && !editing ? (
        <section className="card first-run">
          <WalletIcon size={28} />
          <h2 className="card__title">No envelopes yet</h2>
          <p className="muted">Create one for a vacation or another goal, then add money as you set it aside.</p>
          <button type="button" className="button-main" onClick={() => setEditing(newEnvelope('', settings.currency, new Date().toISOString(), newId()))}>Create an envelope</button>
        </section>
      ) : (
        <div className="oiko-envelope-list">
          {envelopes.map((envelope) => {
            const progress = envelopeProgress(envelope);
            const remaining = envelopeRemaining(envelope);
            return (
              <article className="card oiko-envelope-card" key={envelope.id}>
                <div className="oiko-envelope-card__head"><div><h2>{envelope.name}</h2><p className="muted">{envelope.targetDate ? `Target ${formatDate(envelope.targetDate, 'long')}` : envelope.monthlyCents ? `${formatMoney(envelope.monthlyCents, envelope.currency)} each month` : 'No date or monthly amount set'}</p></div><strong>{formatMoney(envelope.balanceCents, envelope.currency)}</strong></div>
                {envelope.targetCents > 0 ? <><div className="oiko-envelope-card__bar" role="progressbar" aria-label={`${envelope.name} progress`} aria-valuemin={0} aria-valuemax={envelope.targetCents} aria-valuenow={envelope.balanceCents}><span style={{ width: `${progress}%` }} /></div><div className="oiko-envelope-card__facts"><span>{Math.round(progress)}% saved</span><span>{remaining ? `${formatMoney(remaining, envelope.currency)} to go` : 'Target reached'}</span></div></> : <p className="hint">No target set. The balance stays yours to direct.</p>}
                <div className="button-row oiko-envelope-card__actions"><button type="button" className="button-main" onClick={() => { setEditing(undefined); setEntryFor(entryFor === envelope.id ? undefined : envelope.id); }}>Add or use money</button><button type="button" className="button-quiet" onClick={() => { setEntryFor(undefined); setEditing(envelope); }}>Edit</button><button type="button" className="text-link" onClick={() => void remove(envelope)}>Remove</button></div>
                {entryFor === envelope.id && <EntryForm envelope={envelope} onDone={(next) => { setEntryFor(undefined); void putEnvelope(next); }} onCancel={() => setEntryFor(undefined)} />}
                {envelope.entries.length > 0 && <details className="oiko-envelope-card__history"><summary>Recent activity ({envelope.entries.length})</summary><ul>{[...envelope.entries].reverse().slice(0, 6).map((entry) => <li key={entry.id}><span>{entry.note || (entry.amountCents >= 0 ? 'Added' : 'Used')}<small>{formatDate(entry.date)}</small></span><strong>{entry.amountCents >= 0 ? '+' : '−'}{formatMoney(Math.abs(entry.amountCents), envelope.currency)}</strong></li>)}</ul></details>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
