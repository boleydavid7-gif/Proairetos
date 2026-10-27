import { useRef, useState } from 'react';
import { archiveName, downloadZip } from '../../app/family/downloadZip';
import { offerUndo, say } from '../../app/family/shell';
import { BackIcon, CheckIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { PhiliaNav } from '../app/App';
import { newId, people } from '../app/state';
import { AddLine, Initials } from '../app/ui';
import { CONTACTS, RHYTHMS, logContact, timeline, timelineText, dateText, nextOccurrence, shortDate, sinceText, turningText, whenText, yearOf, type Person, timeText } from '../core/people';
import { importPhoto, photoFor, putPhoto, removePhoto, squarePhoto, usePhoto } from '../data/photos';
import { Sym } from '../../lamplight/icons';
import { Waiting } from '../../lamplight/Waiting';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="card__title card__title--small">{title}</h2>
      {children}
    </section>
  );
}

export default function PersonPage({ nav, id }: { nav: PhiliaNav; id: string }) {
  const person = people.use().find((each) => each.id === id);
  const today = toLocalDate(new Date());
  const [timeDate, setTimeDate] = useState(today);
  const photo = usePhoto(person?.id);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [restoringPhoto, setRestoringPhoto] = useState(false);
  const restorePhotoInput = useRef<HTMLInputElement>(null);
  const [justLogged, setJustLogged] = useState<string>();
  const [showAll, setShowAll] = useState(false);

  if (!person) {
    return (
      <div className="page philia-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button></div>
        <p className="muted">Not found on this device.</p>
      </div>
    );
  }

  const history = timeline(person);
  const change = (patch: Partial<Person>, message?: string) => {
    const before = person;
    people.put({ ...person, ...patch });
    if (message) offerUndo(message, () => people.put(before));
  };
  const at = () => new Date().toISOString();

  const birthdayNext = person.birthday ? nextOccurrence(person.birthday, today) : undefined;

  return (
    <div className="page philia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'edit', id: person.id })}>Edit</button>
      </div>

      <div className="person-head">
        <label className="person-photo" aria-label={photo ? 'Change photo' : 'Add a photo'}>
          <Initials name={person.name} id={person.id} large />
          <input type="file" accept="image/*" className="visually-hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            void (async () => {
              const before = await photoFor(person.id);
              try {
                await putPhoto({ personId: person.id, ...(await squarePhoto(file)), at: new Date().toISOString() });
              } catch {
                say('Couldn’t read that photo');
                return;
              }
              offerUndo('Photo saved', () => void (before ? putPhoto(before) : removePhoto(person.id)));
            })();
          }} />
        </label>
        <div>
          <h1 className="title">{person.name}</h1>
          {person.relation && <p className="muted">{person.relation}</p>}
          {photo && (
            <div className="chip-row">
              <button type="button" className="text-link" disabled={savingPhoto} onClick={async () => {
                setSavingPhoto(true);
                try {
                  const saved = await photoFor(person.id);
                  if (saved) downloadZip(`philia-${archiveName(person.name)}-photo-${new Date().toISOString().slice(0, 10)}`, [
                    { path: 'manifest.json', data: JSON.stringify({ app: 'philia', personId: person.id, person: person.name, exportedAt: new Date().toISOString(), photo: { type: saved.type, at: saved.at } }) },
                    { path: `photo.${saved.type.split('/')[1] || 'jpg'}`, data: saved.data },
                  ]);
                } finally {
                  setSavingPhoto(false);
                }
              }}>{savingPhoto ? <Waiting>Saving…</Waiting> : 'Save a copy'}</button>
              <button type="button" className="text-link" disabled={restoringPhoto} onClick={() => restorePhotoInput.current?.click()}>{restoringPhoto ? 'Restoring…' : 'Restore a copy'}</button>
              <button type="button" className="text-link person-photo__remove" onClick={() => void photoFor(person.id).then((before) => {
                void removePhoto(person.id);
                if (before) offerUndo('Photo removed', () => void putPhoto(before));
              })}>Remove photo</button>
            </div>
          )}
          {!photo && <button type="button" className="text-link" disabled={restoringPhoto} onClick={() => restorePhotoInput.current?.click()}>{restoringPhoto ? 'Restoring…' : 'Restore a copy'}</button>}
        </div>
      </div>
      <input ref={restorePhotoInput} type="file" accept=".zip,application/zip" hidden onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setRestoringPhoto(true);
        try {
          const restored = await importPhoto(file, person.id);
          say(restored ? 'Photo restored' : 'No photo was found in that archive');
        } catch {
          say('Couldn’t open that archive');
        } finally {
          setRestoringPhoto(false);
        }
      }} />

      {(person.phone || person.email) && (
        <div className="chip-row philia-contact">
          {person.phone && <a className="chip" href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>Call</a>}
          {person.phone && <a className="chip" href={`sms:${person.phone.replace(/[^\d+]/g, '')}`}>Message</a>}
          {person.email && <a className="chip" href={`mailto:${person.email.trim()}`}>Email</a>}
        </div>
      )}

      <div className="section-head">
        <h2>Dates</h2>
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'date', personId: person.id })}>Add a date</button>
      </div>
      {(person.birthday || (person.dates ?? []).length > 0) && (
        <section className="card">
          {person.birthday && birthdayNext && (
            <div className="list-row philia-date">
              <span className="list-row__text"><span>Birthday</span><small>{dateText(person.birthday)}{yearOf(person.birthday) ? ` · ${turningText({ label: 'Birthday', turning: Number(birthdayNext.slice(0, 4)) - yearOf(person.birthday)! })}` : ''}</small></span>
              <span className="list-row__aside">{whenText(birthdayNext, today)}</span>
            </div>
          )}
          {(person.dates ?? [])
            .filter((each) => !each.once || each.date >= today)
            .map((each) => {
              const next = each.once ? each.date : nextOccurrence(each.date, today);
              return (
                <div key={each.id} className="list-row philia-date">
                  <span className="list-row__text"><span>{each.label}</span><small>{[dateText(each.date), each.once ? timeText(each.time) : 'Every year'].filter(Boolean).join(' · ')}</small></span>
                  <span className="list-row__aside">{whenText(next, today)}</span>
                </div>
              );
            })}
        </section>
      )}

      <Section title="Keep in touch">
        <select className="input" aria-label="Keep in touch" value={person.keepInTouch ?? ''} onChange={(event) => change({ keepInTouch: event.target.value ? Number(event.target.value) : undefined })}>
          <option value="">No reminder</option>
          {RHYTHMS.map((rhythm) => <option key={rhythm.days} value={rhythm.days}>{rhythm.label}</option>)}
        </select>
        <span className="muted">{sinceText(person.lastInTouch, today)}</span>
        <div className="chip-row" role="group" aria-label="In touch today">
          {CONTACTS.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="chip"
              onClick={() => {
                const before = person;
                const entry = newId();
                people.put(logContact(person, contact.id, today, entry));
                setJustLogged(entry);
                offerUndo(contact.id === 'visit' ? `Saw ${person.name}` : `${contact.done} ${person.name}`, () => {
                  people.put(before);
                  setJustLogged(undefined);
                });
              }}
            >
              {contact.label}
            </button>
          ))}
        </div>
        {justLogged && person.times.some((time) => time.id === justLogged && !time.text) && (
          <AddLine
            label="A line about it (optional)"
            onAdd={(text) => {
              change({ times: person.times.map((time) => (time.id === justLogged ? { ...time, text } : time)) });
              setJustLogged(undefined);
            }}
          />
        )}
      </Section>

      <Section title="Remember">
        {person.notes.length > 0 && (
          <ul className="notes-list">
            {person.notes.map((note) => (
              <li key={note.id} className="note-line">
                <span>{note.text}</span>
                <button type="button" aria-label={`Remove ${note.text}`} onClick={() => change({ notes: person.notes.filter((each) => each.id !== note.id) }, 'Removed')}><Sym name="close" /></button>
              </li>
            ))}
          </ul>
        )}
        <AddLine label="Something to remember" onAdd={(text) => change({ notes: [...person.notes, { id: newId(), text, at: at() }] })} />
      </Section>

      <Section title="Gift ideas">
        {person.gifts.length > 0 && (
          <ul className="notes-list">
            {person.gifts.map((gift) => (
              <li key={gift.id} className="note-line philia-gift">
                <span>
                  {gift.text}
                  {gift.given && <small>Given {shortDate(gift.given)}</small>}
                </span>
                <span>
                  <button
                    type="button"
                    className="tick philia-gift__tick"
                    aria-pressed={Boolean(gift.given)}
                    aria-label={gift.given ? `${gift.text}: given` : `Mark ${gift.text} given`}
                    onClick={() => change({ gifts: person.gifts.map((each) => (each.id === gift.id ? { ...each, given: each.given ? undefined : today } : each)) })}
                  >
                    <CheckIcon size={18} />
                  </button>
                  <button type="button" aria-label={`Remove ${gift.text}`} onClick={() => change({ gifts: person.gifts.filter((each) => each.id !== gift.id) }, 'Removed')}><Sym name="close" /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <AddLine label="A gift idea" onAdd={(text) => change({ gifts: [...person.gifts, { id: newId(), text, at: at() }] })} />
      </Section>

      <Section title="Together and in touch">
        {history.length > 0 && (
          <ul className="notes-list">
            {history.slice(0, showAll ? undefined : 8).map((entry) => (
              <li key={`${entry.kind}-${entry.id}`} className="note-line">
                <span>
                  {timelineText(entry)}
                  <small>{shortDate(entry.date)}</small>
                </span>
                {entry.kind !== 'gift' && (
                  <button type="button" aria-label={`Remove ${timelineText(entry)}`} onClick={() => change({ times: person.times.filter((each) => each.id !== entry.id) }, 'Removed')}><Sym name="close" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
        {history.length > 8 && !showAll && (
          <button type="button" className="text-link" onClick={() => setShowAll(true)}>
            All {history.length}
          </button>
        )}
        <input className="input" type="date" aria-label="Day" value={timeDate} max={today} onChange={(event) => setTimeDate(event.target.value || today)} />
        <AddLine
          label="What you did"
          onAdd={(text) => {
            const latest = [person.lastInTouch?.slice(0, 10), timeDate].filter(Boolean).sort().pop();
            change({ times: [...person.times, { id: newId(), date: timeDate, text }], lastInTouch: latest });
          }}
        />
      </Section>

      <button
        type="button"
        className="text-link remove-link"
        onClick={() => {
          people.remove(person.id);
          void photoFor(person.id).then((kept) => {
            if (kept) void removePhoto(person.id);
            offerUndo(`${person.name} removed`, () => {
              people.put(person);
              if (kept) void putPhoto(kept);
            });
          });
          nav.back();
        }}
      >
        Remove {person.name}
      </button>
    </div>
  );
}
