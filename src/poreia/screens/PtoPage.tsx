import { useState } from 'react';
import type { Nav } from '../app/App';
import { PtoIcon, WorkIcon } from '../app/icons';
import { useLeaveRequests, usePtoAccounts, usePtoLedger, useWorkProfiles } from '../app/state';
import { addDays, balanceAt, dateText, findVacationWindows, requestAmount, type AccrualFrequency, type LeaveCategory, type LeaveRequest, type LeaveRequestStatus, type PtoAccount, type WorkDay, type WorkProfile } from '../core/pto';
import { newId } from '../core/id';
import { putLeaveRequest, putPtoAccount, putWorkProfile } from '../data/store';
import { PageTop, PoreiaHeader } from '../app/ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = () => dateText(new Date());

function WorkProfileForm({ onDone }: { onDone: (profile: WorkProfile) => void }) {
  const [name, setName] = useState('My work schedule');
  const [hours, setHours] = useState('8');
  const [selected, setSelected] = useState<number[]>([1, 2, 3, 4, 5]);
  const save = () => {
    const workDay: WorkDay = { hours: Math.max(0, Number(hours) || 0) };
    onDone({ id: newId(), name: name.trim() || 'My work schedule', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', week: Object.fromEntries(selected.map((day) => [day, workDay])), holidays: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  };
  return <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); save(); }}><div className="poreia-section-head"><h2>Work schedule</h2><WorkIcon size={22} /></div><label className="field"><span className="field__label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span className="field__label">Hours on a working day</span><input className="input" inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} /></label><div className="field"><span className="field__label">Working days</span><div className="chip-row">{DAYS.map((day, index) => <button key={day} type="button" className="chip" aria-pressed={selected.includes(index)} onClick={() => setSelected(selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index])}>{day.slice(0, 3)}</button>)}</div></div><button type="submit" className="button-main">Save schedule</button></form>;
}

function AccountForm({ profile, onDone }: { profile: WorkProfile; onDone: (account: PtoAccount) => void }) {
  const [name, setName] = useState('Vacation');
  const [category, setCategory] = useState<LeaveCategory>('vacation');
  const [opening, setOpening] = useState('0');
  const [amount, setAmount] = useState('4');
  const [frequency, setFrequency] = useState<AccrualFrequency>('biweekly');
  const save = () => onDone({ id: newId(), name: name.trim() || 'Leave', category, unit: 'hours', openingBalance: Math.max(0, Number(opening) || 0), openingDate: today(), policy: { frequency, amount: Math.max(0, Number(amount) || 0), startDate: today() }, workProfileId: profile.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); save(); }}><div className="poreia-section-head"><h2>Leave account</h2><PtoIcon size={22} /></div><label className="field"><span className="field__label">Account name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Vacation" /></label><div className="poreia-form__pair"><label className="field"><span className="field__label">Category</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value as LeaveCategory)}>{(['vacation', 'personal', 'sick', 'floating', 'comp', 'unpaid', 'custom'] as LeaveCategory[]).map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label><label className="field"><span className="field__label">Opening hours</span><input className="input" inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} /></label></div><div className="poreia-form__pair"><label className="field"><span className="field__label">Accrual</span><input className="input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="field"><span className="field__label">Every</span><select className="input" value={frequency} onChange={(event) => setFrequency(event.target.value as AccrualFrequency)}><option value="weekly">Week</option><option value="biweekly">Two weeks</option><option value="semimonthly">Half month</option><option value="monthly">Month</option><option value="annual">Year</option><option value="none">No accrual</option></select></label></div><button type="submit" className="button-main">Save leave account</button></form>;
}

function RequestForm({ account, profile, onDone }: { account: PtoAccount; profile: WorkProfile; onDone: (request: LeaveRequest) => void }) {
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const save = () => onDone({ id: newId(), accountId: account.id, startDate, endDate, requestedAmount: requestAmount({ startDate, endDate }, profile), status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); save(); }}><h2>Plan leave</h2><div className="poreia-form__pair"><label className="field"><span className="field__label">First day</span><input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span className="field__label">Last day</span><input className="input" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><p className="muted">{requestAmount({ startDate, endDate }, profile)} working hours from {account.name}.</p><button type="submit" className="button-main" disabled={endDate < startDate}>Save draft</button></form>;
}

function WindowFinder({ account, profile, ledger, requests }: { account: PtoAccount; profile: WorkProfile; ledger: ReturnType<typeof usePtoLedger>; requests: LeaveRequest[] }) {
  const [duration, setDuration] = useState('7');
  const [maximum, setMaximum] = useState('');
  const from = today();
  const until = addDays(from, 120);
  const windows = findVacationWindows(account, profile, ledger, requests, { from, until, durationDays: Number(duration) || 7, maximumPto: maximum ? Number(maximum) : undefined });
  return <section className="card poreia-card poreia-section"><div className="poreia-section-head"><h2>Find a vacation window</h2><span className="label">Next 120 days</span></div><p className="muted">Poreia compares your scheduled work hours with your projected balance. Choosing a window never submits leave.</p><div className="poreia-form__pair"><label className="field"><span className="field__label">Trip length</span><select className="input" value={duration} onChange={(event) => setDuration(event.target.value)}><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option><option value="10">10 days</option><option value="14">14 days</option></select></label><label className="field"><span className="field__label">Maximum PTO (hours)</span><input className="input" inputMode="decimal" value={maximum} onChange={(event) => setMaximum(event.target.value)} placeholder="Any amount" /></label></div>{windows.length === 0 ? <p className="muted">No window fits these settings yet. Try a shorter trip or a higher PTO limit.</p> : <div className="poreia-list">{windows.slice(0, 5).map((window) => <div className="poreia-row" key={`${window.startDate}-${window.endDate}`}><span className="poreia-row__text"><strong>{window.startDate} – {window.endDate}</strong><small>{window.ptoRequired} PTO hours · {window.reason}</small></span><span className="poreia-balance">{window.balanceAfter} left</span></div>)}</div>}</section>;
}

export default function PtoPage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const accounts = usePtoAccounts();
  const ledger = usePtoLedger();
  const requests = useLeaveRequests();
  const profile = profiles[0];
  const account = accounts[0];
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [statusError, setStatusError] = useState('');
  const updateStatus = async (request: LeaveRequest, status: LeaveRequestStatus) => {
    setStatusError('');
    try {
      await putLeaveRequest({ ...request, status, updatedAt: new Date().toISOString() });
    } catch {
      setStatusError('That leave update could not be saved. Try again.');
    }
  };
  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader eyebrow="Work leave" title="Vacation Time" />
    {!profile ? <WorkProfileForm onDone={(next) => void putWorkProfile(next)} /> : <section className="card poreia-card poreia-section"><div className="poreia-section-head"><h2>{profile.name}</h2><span className="label">{profile.timezone}</span></div><p className="muted">{Object.keys(profile.week).length} working days in the week.</p></section>}
    {profile && accounts.map((item) => <section className="card poreia-card poreia-section" key={item.id}><div className="poreia-section-head"><h2>{item.name}</h2><strong className="poreia-balance">{balanceAt(item, ledger, profile, today(), requests)} {item.unit}</strong></div><p className="muted">{item.category} · accrues {item.policy.amount} {item.unit} {item.policy.frequency === 'biweekly' ? 'every two weeks' : item.policy.frequency}.</p></section>)}
    {profile && (accounts.length === 0 || showAccountForm) && <AccountForm profile={profile} onDone={(next) => { void putPtoAccount(next); setShowAccountForm(false); }} />}
    {profile && accounts.length > 0 && <button type="button" className="text-link" onClick={() => setShowAccountForm((shown) => !shown)}>{showAccountForm ? 'Close account form' : 'Add another leave account'}</button>}
    {profile && account && <><RequestForm account={account} profile={profile} onDone={(next) => void putLeaveRequest(next)} /><WindowFinder account={account} profile={profile} ledger={ledger} requests={requests} /></>}
    {requests.length > 0 && <section className="poreia-section"><div className="poreia-section-head"><h2>Leave requests</h2><span className="label">Manual status</span></div>{statusError && <p className="form-error">{statusError}</p>}<div className="poreia-list">{requests.map((request) => <div className="poreia-row" key={request.id}><span className="poreia-row__text"><strong>{request.startDate} – {request.endDate}</strong><small>{request.requestedAmount} hours</small></span><select className="input poreia-status" aria-label={`Status for leave ${request.startDate}`} value={request.status} onChange={(event) => void updateStatus(request, event.target.value as LeaveRequestStatus)}>{(['draft', 'requested', 'pending', 'approved', 'denied', 'canceled', 'taken', 'reconciled'] as LeaveRequestStatus[]).map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></div>)}</div></section>}
    <button type="button" className="text-link" onClick={() => nav.swap({ name: 'calendar' })}>Open the leave calendar</button>
  </div>;
}
