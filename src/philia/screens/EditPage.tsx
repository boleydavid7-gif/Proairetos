import { FromContacts } from '../../app/family/DeviceExtras';
import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import type { PhiliaNav } from '../app/App';
import { newId, people } from '../app/state';
import { DateFields } from '../app/ui';
import { dateParts, datePartsToText, newPerson, type PersonDate } from '../core/people';

type Parts = { month: number; day: number; year?: number };
const empty: Parts = { month: 0, day: 0 };

export default function EditPage({ nav, id }: { nav: PhiliaNav; id?: string }) {
  const existing = id ? people.get(id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [relation, setRelation] = useState(existing?.relation ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [birthday, setBirthday] = useState<Parts>(dateParts(existing?.birthday) ?? empty);
  const [dates, setDates] = useState<{ id: string; label: string; parts: Parts; once?: boolean; time?: string }[]>(
    (existing?.dates ?? []).map((each) => ({ id: each.id, label: each.label, parts: dateParts(each.date) ?? empty, once: each.once, time: each.time })),
  );
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!existing) nameField.current?.focus();
  }, []);

  const save = () => {
    const base = existing ?? newPerson(newId(), name, new Date());
    const next = {
      ...base,
      name: name.trim(),
      relation: relation.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      birthday: datePartsToText(birthday),
      dates: dates
        .map((each) => ({
          id: each.id,
          label: each.label.trim() || 'Date',
          date: each.once && !each.parts.year ? undefined : datePartsToText(each.parts),
          ...(each.once ? { once: true, ...(each.time ? { time: each.time } : {}) } : {}),
        }))
        .filter((each): each is PersonDate => Boolean(each.date)),
    };
    people.put(next);
    if (existing) offerUndo('Saved', () => people.put(existing));
    if (existing) nav.back();
    else nav.swap({ name: 'person', id: next.id });
  };

  return (
    <div className="page philia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">{existing ? 'Edit' : 'Add someone'}</p>
        <button type="button" className="text-link" disabled={!name.trim()} onClick={save}>Save</button>
      </div>

      <FromContacts
        onPick={(contact) => {
          if (contact.name && !name.trim()) setName(contact.name);
          if (contact.phone) setPhone(contact.phone);
          if (contact.email) setEmail(contact.email);
        }}
      />
      <label className="field">
        <span className="field__label">Name</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
      </label>
      <label className="field">
        <span className="field__label">Who they are (optional)</span>
        <input className="input" placeholder="Sister, friend, neighbor" value={relation} onChange={(event) => setRelation(event.target.value)} />
      </label>
      <div className="input-row">
        <label className="field">
          <span className="field__label">Phone (optional)</span>
          <input className="input" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Email (optional)</span>
          <input className="input" type="email" inputMode="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
      </div>
      <DateFields label="Birthday (optional)" value={birthday} onChange={setBirthday} />

      {dates.map((each, index) => (
        <div key={each.id} className="card">
          <label className="field">
            <span className="field__label">What</span>
            <input className="input" placeholder="Anniversary" value={each.label} onChange={(event) => setDates(dates.map((d, i) => (i === index ? { ...d, label: event.target.value } : d)))} />
          </label>
          <div className="chip-row" role="group" aria-label="How often">
            <button type="button" className="chip" aria-pressed={!each.once} onClick={() => setDates(dates.map((d, i) => (i === index ? { ...d, once: undefined } : d)))}>Every year</button>
            <button type="button" className="chip" aria-pressed={Boolean(each.once)} onClick={() => setDates(dates.map((d, i) => (i === index ? { ...d, once: true } : d)))}>Once</button>
          </div>
          <DateFields label={each.once ? 'Date (with the year)' : 'Date'} value={each.parts} onChange={(parts) => setDates(dates.map((d, i) => (i === index ? { ...d, parts } : d)))} />
          {each.once && (
            <label className="field">
              <span className="field__label">Time (optional)</span>
              <input className="input" type="time" value={each.time ?? ''} onChange={(event) => setDates(dates.map((d, i) => (i === index ? { ...d, time: event.target.value || undefined } : d)))} />
            </label>
          )}
          <button type="button" className="text-link remove-link" onClick={() => setDates(dates.filter((_, i) => i !== index))}>Remove date</button>
        </div>
      ))}
      <button type="button" className="button-quiet" onClick={() => setDates([...dates, { id: newId(), label: '', parts: empty }])}>Add a date</button>

      <button type="button" className="button-main" disabled={!name.trim()} onClick={save}>Save</button>
    </div>
  );
}
