import { useEffect, useMemo, useState } from 'react';
import { ChevronIcon, PlusIcon } from '../../app/family/icons';
import { decisionService } from '../../app/services';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { useServiceData } from '../../app/hooks/useServiceData';
import {
  DEFAULT_PURSUIT_REMINDER_DAYS,
  newPursuitCheckInId,
  newPursuitId,
  needsPursuitCheckIn,
  PURSUIT_FEELINGS,
  PURSUIT_KINDS,
  PURSUIT_REMINDER_CHOICES,
  pursuitCheckIns,
  pursuits,
  reminderDaysFor,
  type Pursuit,
  type PursuitCheckIn,
  type PursuitFeeling,
  type PursuitKind,
  type PursuitStatus,
} from '../../app/pursuits';
import type { Decision } from '../../core/decisions/types';

const nowStamp = () => new Date().toISOString();
const todayDate = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const kindText = (kind: PursuitKind) => PURSUIT_KINDS.find((item) => item.id === kind)?.label ?? 'Pursuit';
const statusText = (status: PursuitStatus) => status === 'complete' ? 'Complete' : status === 'paused' ? 'Paused' : status === 'archived' ? 'Archived' : 'Active';

export default function PursuitsSection() {
  const all = pursuits.use();
  const decisions = useServiceData(decisionService.subscribe, () => decisionService.list(), []) ?? [];
  const { startDecision, openDecision } = useOverlays();
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const active = useMemo(() => all.filter((item) => item.status === 'active' || item.status === 'paused').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [all]);
  const done = useMemo(() => all.filter((item) => item.status === 'complete').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [all]);
  const archived = useMemo(() => all.filter((item) => item.status === 'archived').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [all]);
  const current = all.find((item) => item.id === selected);

  if (creating) return <PursuitForm onCancel={() => setCreating(false)} onSaved={(id) => { setCreating(false); setSelected(id); }} />;
  if (current) {
    return (
      <PursuitEditor
        pursuit={current}
        decisions={decisions.filter((decision) => decision.pursuitId === current.id)}
        onBack={() => setSelected(undefined)}
        onDecision={() => startDecision({ title: current.nextMove || current.title, pursuitId: current.id })}
        onOpenDecision={openDecision}
      />
    );
  }

  return (
    <section className="pursuits" aria-label="Pursuits">
      <div className="pursuits__intro">
        <div>
          <p className="eyebrow">Make room to work it out</p>
          <h2 className="pursuits__title">Pursuits</h2>
          <p className="pursuits__lead">A calm place for projects, changes, responsibilities, and questions. Keep the next move visible, then notice what happens.</p>
        </div>
        <button type="button" className="button-main pursuits__new" onClick={() => setCreating(true)}><PlusIcon size={18} /> New pursuit</button>
      </div>
      {active.length === 0 ? (
        <div className="pursuits__empty">
          <p className="pursuits__empty-title">Nothing is in motion yet.</p>
          <p className="muted">Start with something you want to build, change, understand, or care for.</p>
        </div>
      ) : (
        <ul className="pursuits__list">{active.map((pursuit) => <PursuitCard key={pursuit.id} pursuit={pursuit} onOpen={() => setSelected(pursuit.id)} />)}</ul>
      )}
      {done.length > 0 && <details className="pursuits__completed"><summary>Completed · {done.length}</summary><ul className="pursuits__list">{done.map((pursuit) => <PursuitCard key={pursuit.id} pursuit={pursuit} onOpen={() => setSelected(pursuit.id)} />)}</ul></details>}
      {archived.length > 0 && <details className="pursuits__completed"><summary>Archived · {archived.length}</summary><ul className="pursuits__list">{archived.map((pursuit) => <PursuitCard key={pursuit.id} pursuit={pursuit} onOpen={() => setSelected(pursuit.id)} />)}</ul></details>}
    </section>
  );
}

function PursuitCard({ pursuit, onOpen }: { pursuit: Pursuit; onOpen: () => void }) {
  const due = needsPursuitCheckIn(pursuit);
  const status = due ? 'Check-in due' : statusText(pursuit.status);
  return (
    <li>
      <button type="button" className="pursuit-card" onClick={onOpen}>
        <span className="pursuit-card__main">
          <span className="pursuit-card__kind">{kindText(pursuit.kind)}{pursuit.area ? ` · ${pursuit.area}` : ''}</span>
          <strong>{pursuit.title}</strong>
          <span className="pursuit-card__detail">{pursuit.nextMove || pursuit.outcome || 'Add a next move when you are ready.'}</span>
        </span>
        <span className={`pursuit-card__status${due ? ' pursuit-card__status--due' : ''}`}>{status}<ChevronIcon size={18} /></span>
      </button>
    </li>
  );
}

function PursuitForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PursuitKind>('build');
  const [area, setArea] = useState('');
  const selectedKind = PURSUIT_KINDS.find((item) => item.id === kind);
  const save = () => {
    if (!title.trim()) return;
    const stamp = nowStamp();
    const pursuit: Pursuit = {
      id: newPursuitId(),
      title: title.trim(),
      kind,
      status: 'active',
      reminderAfterDays: DEFAULT_PURSUIT_REMINDER_DAYS,
      ...(area.trim() ? { area: area.trim() } : {}),
      createdAt: stamp,
      updatedAt: stamp,
    };
    pursuits.put(pursuit);
    onSaved(pursuit.id);
  };
  return (
    <section className="card pursuit-form">
      <div className="section-head"><div><p className="eyebrow">Start with a direction</p><h2 className="card__title">New pursuit</h2></div><button type="button" className="text-link" onClick={onCancel}>Cancel</button></div>
      <label className="field"><span className="field__label">What are you trying to change, build, or understand?</span><input autoFocus className="input" value={title} placeholder="Make the house calmer" onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="field"><span className="field__label">Kind</span><select className="input pursuit-form__select" value={kind} onChange={(event) => setKind(event.target.value as PursuitKind)}>{PURSUIT_KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{selectedKind && <span className="pursuit-form__hint">{selectedKind.detail}</span>}</label>
      <label className="field"><span className="field__label">Area <span className="muted">(optional)</span></span><input className="input" value={area} placeholder="Home, health, work, creative" onChange={(event) => setArea(event.target.value)} /></label>
      <button type="button" className="button-main" disabled={!title.trim()} onClick={save}>Begin pursuit</button>
    </section>
  );
}

type PursuitEditorProps = {
  pursuit: Pursuit;
  decisions: readonly Decision[];
  onBack: () => void;
  onDecision: () => void;
  onOpenDecision: (id: string) => void;
};

function PursuitEditor({ pursuit, decisions, onBack, onDecision, onOpenDecision }: PursuitEditorProps) {
  const checkIns = pursuitCheckIns.use().filter((checkIn) => checkIn.pursuitId === pursuit.id).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const [draft, setDraft] = useState(pursuit);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const existingCheckIn = checkIns.find((checkIn) => checkIn.date === selectedDate);
  const [accomplishment, setAccomplishment] = useState(existingCheckIn?.accomplishment ?? '');
  const [feeling, setFeeling] = useState<PursuitFeeling | undefined>(existingCheckIn?.feeling);
  const [note, setNote] = useState(existingCheckIn?.note ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAccomplishment(existingCheckIn?.accomplishment ?? '');
    setFeeling(existingCheckIn?.feeling);
    setNote(existingCheckIn?.note ?? '');
    setSaved(false);
  }, [selectedDate, existingCheckIn?.id]);

  const update = (patch: Partial<Pursuit>) => {
    const next = { ...draft, ...patch, updatedAt: nowStamp() };
    setDraft(next);
    pursuits.put(next);
  };

  const saveCheckIn = () => {
    if (!accomplishment.trim() && !feeling) return;
    const stamp = nowStamp();
    const record: PursuitCheckIn = existingCheckIn
      ? { ...existingCheckIn, accomplishment: accomplishment.trim() || undefined, feeling, note: note.trim() || undefined, updatedAt: stamp }
      : { id: newPursuitCheckInId(), pursuitId: draft.id, date: selectedDate, accomplishment: accomplishment.trim() || undefined, feeling, note: note.trim() || undefined, createdAt: stamp, updatedAt: stamp };
    pursuitCheckIns.put(record);
    update({ lastCheckInAt: stamp });
    setSaved(true);
  };

  const deletePursuit = async () => {
    if (!window.confirm(`Delete “${draft.title}” and everything recorded inside it?`)) return;
    await Promise.all(decisions.map((decision) => decisionService.remove(decision.id)));
    checkIns.forEach((checkIn) => pursuitCheckIns.remove(checkIn.id));
    pursuits.remove(draft.id);
    onBack();
  };

  return (
    <section className="pursuit-editor">
      <button type="button" className="back-link" onClick={onBack}>‹ Pursuits</button>
      <div className="pursuit-editor__head">
        <div><p className="eyebrow">{kindText(draft.kind)}{draft.area ? ` · ${draft.area}` : ''}</p><h2>{draft.title}</h2></div>
        <select className="input pursuit-editor__status" value={draft.status} onChange={(event) => update({ status: event.target.value as PursuitStatus })} aria-label="Pursuit status">
          <option value="active">Active</option><option value="paused">Paused</option><option value="complete">Complete</option><option value="archived">Archived</option>
        </select>
      </div>

      <section className="card pursuit-work">
        <p className="eyebrow">Shape the work</p>
        <TextField label="What would better look like?" value={draft.outcome} placeholder="A clear result I would recognize" onChange={(value) => update({ outcome: value })} />
        <TextField label="Why does this matter?" value={draft.why} placeholder="What this makes possible" onChange={(value) => update({ why: value })} />
        <TextField label="Where are things now?" value={draft.current} placeholder="What is true today" onChange={(value) => update({ current: value })} />
        <TextField label="What could help?" value={draft.approach} placeholder="An approach worth trying" onChange={(value) => update({ approach: value })} />
        <TextField label="Next move" value={draft.nextMove} placeholder="One visible action" onChange={(value) => update({ nextMove: value })} />
        <div className="input-row"><label className="field"><span className="field__label">Next move due</span><input className="input" type="date" value={draft.nextMoveDue ?? ''} onChange={(event) => update({ nextMoveDue: event.target.value || undefined })} /></label><label className="field"><span className="field__label">Review on</span><input className="input" type="date" value={draft.reviewAt ?? ''} onChange={(event) => update({ reviewAt: event.target.value || undefined })} /></label></div>
      </section>

      <section className="card pursuit-checkin">
        <div className="section-head"><div><p className="eyebrow">Daily check-in</p><h3>What happened today?</h3></div>{saved && <span className="pursuit-checkin__saved">Saved</span>}</div>
        <label className="field"><span className="field__label">Day</span><input className="input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
        <TextField label="What did you accomplish?" value={accomplishment} placeholder="Even a small step counts" onChange={(value) => { setAccomplishment(value); setSaved(false); }} />
        <div className="field"><span className="field__label">How did the day feel?</span><div className="pursuit-feelings" role="group" aria-label="How the day felt">{PURSUIT_FEELINGS.map((option) => <button key={option.id} type="button" className="chip" aria-pressed={feeling === option.id} onClick={() => { setFeeling(feeling === option.id ? undefined : option.id); setSaved(false); }}>{option.label}</button>)}</div></div>
        <TextField label="Anything to carry forward?" value={note} placeholder="A thought, obstacle, or small observation" onChange={(value) => { setNote(value); setSaved(false); }} />
        <button type="button" className="button-main" disabled={!accomplishment.trim() && !feeling} onClick={saveCheckIn}>{existingCheckIn ? 'Update check-in' : 'Save check-in'}</button>
        <div className="field"><span className="field__label">Remind me after no check-in</span><select className="input" value={reminderDaysFor(draft)} onChange={(event) => update({ reminderAfterDays: Number(event.target.value) })}>{PURSUIT_REMINDER_CHOICES.map((choice) => <option key={choice.days} value={choice.days}>{choice.label}</option>)}</select></div>
        {checkIns.length > 0 && <div className="pursuit-checkin__history"><p className="field__label">Recent check-ins</p><ul>{checkIns.slice(0, 7).map((checkIn) => <li key={checkIn.id}><strong>{formatDate(checkIn.date)}</strong><span>{checkIn.feeling ? PURSUIT_FEELINGS.find((item) => item.id === checkIn.feeling)?.label : ''}{checkIn.accomplishment ? `${checkIn.feeling ? ' · ' : ''}${checkIn.accomplishment}` : ''}</span></li>)}</ul></div>}
      </section>

      <section className="card pursuit-decisions"><div className="section-head"><div><p className="eyebrow">Decisions</p><h3>Work through a choice</h3></div><button type="button" className="button-quiet" onClick={onDecision}>Make a decision</button></div>{decisions.length === 0 ? <p className="muted">Decisions you make here stay with this pursuit.</p> : <ul className="pursuit-decisions__list">{decisions.map((decision) => <li key={decision.id}><button type="button" className="text-link" onClick={() => onOpenDecision(decision.id)}>{decision.question}</button><span>{decision.choice}</span></li>)}</ul>}</section>

      <div className="pursuit-actions" aria-label="Pursuit actions">
        {draft.status === 'active' && <button type="button" className="button-quiet" onClick={() => update({ status: 'paused' })}>Pause pursuit</button>}
        {draft.status === 'paused' && <button type="button" className="button-quiet" onClick={() => update({ status: 'active' })}>Resume pursuit</button>}
        {draft.status !== 'archived' ? <button type="button" className="button-quiet" onClick={() => update({ status: 'archived' })}>Archive pursuit</button> : <button type="button" className="button-quiet" onClick={() => update({ status: 'active' })}>Restore pursuit</button>}
        <button type="button" className="text-link pursuit-actions__delete" onClick={() => void deletePursuit()}>Delete permanently</button>
      </div>
    </section>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder: string; onChange: (value: string) => void }) {
  return <label className="field pursuit-field"><span className="field__label">{label}</span><textarea className="input area" rows={3} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}
