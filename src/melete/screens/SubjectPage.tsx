import { useEffect, useState, type FormEvent } from 'react';
import { offerUndo } from '../../app/family/shell';
import MoreDetails from '../../app/family/MoreDetails';
import { PlusIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { MeleteNav } from '../app/App';
import { openByDay, nextDays } from '../app/gaps';
import { newId, removeSubject, sessions as sessionStore, subjects } from '../app/state';
import { DATE_KINDS, dateFact, formatMinutes, minutesByDay, newSubject, openHoursBefore, SESSION_KINDS, slotsThatFit, SUBJECT_COLORS, upcomingDates, weekOf, workFact, type DateKind, type SessionKind, type Subject } from '../core/subjects';

/** A subject: its name and color, its dates, the person's own rhythm and if-then line, and its materials. Every part but the name is optional. */
export default function SubjectPage({ nav, id }: { nav: MeleteNav; id?: string }) {
  const all = subjects.use();
  const subject = all.find((each) => each.id === id);
  const sessionList = sessionStore.use();
  const today = toLocalDate(new Date());
  const [name, setName] = useState(subject?.name ?? '');
  const [kind, setKind] = useState<DateKind>('exam');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [open, setOpen] = useState<number>();
  const [finding, setFinding] = useState(false);
  const [lengthMin, setLengthMin] = useState(subject?.rhythm?.minutes ?? 45);
  const [sitKind, setSitKind] = useState<SessionKind>('read');
  const [slots, setSlots] = useState<Date[]>();

  const put = (change: Partial<Subject>) => {
    if (subject) subjects.put({ ...subject, ...change });
  };

  // Open hours before the nearest date that has an estimate, read from the week (only then).
  const estimated = subject ? upcomingDates([subject], today).find(({ date: each }) => each.hours && each.hours > 0)?.date : undefined;
  useEffect(() => {
    let live = true;
    if (!estimated) {
      setOpen(undefined);
      return undefined;
    }
    const until = new Date(`${estimated.date}T00:00:00`);
    const span = Math.min(28, Math.max(1, Math.round((until.getTime() - Date.now()) / 86_400_000)));
    void openByDay(nextDays(today, span), sessionList).then((byDay) => {
      if (live) setOpen(openHoursBefore([...byDay.values()].flat(), new Date(), until));
    }).catch(() => undefined);
    return () => { live = false; };
  }, [estimated?.id, estimated?.date, estimated?.hours]);

  // The times that hold a sitting of the chosen length, from the week's open stretches (read only while the panel is open).
  useEffect(() => {
    if (!finding || !subject) return undefined;
    let live = true;
    setSlots(undefined);
    void openByDay(nextDays(today, 7), sessionList).then((byDay) => live && setSlots(slotsThatFit(byDay, lengthMin))).catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [finding, lengthMin, sessionList.length]);

  if (!subject) {
    return (
      <div className="page melete-page">
        <div className="page-top section-head">
          <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
          <p className="label">New subject</p>
          <button
            type="button"
            className="text-link"
            disabled={!name.trim()}
            onClick={() => {
              const created = newSubject(newId(), name);
              subjects.put(created);
              nav.swap({ name: 'subject', id: created.id });
            }}
          >
            Save
          </button>
        </div>
        <label className="field"><span className="field__label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
      </div>
    );
  }

  const addDate = (event: FormEvent) => {
    event.preventDefault();
    if (!date) return;
    const amount = Number(hours.replace(',', '.'));
    put({ dates: [...subject.dates, { id: newId('date'), title: title.trim(), date, kind, ...(amount > 0 ? { hours: amount } : {}) }].sort((a, b) => a.date.localeCompare(b.date)) });
    setTitle('');
    setDate('');
    setHours('');
  };

  const addMaterial = (event: FormEvent) => {
    event.preventDefault();
    if (!materialTitle.trim()) return;
    const url = materialUrl.trim();
    put({ materials: [...subject.materials, { id: newId('material'), title: materialTitle.trim(), ...(url ? { url: /^https?:\/\//i.test(url) ? url : `https://${url}` } : {}) }] });
    setMaterialTitle('');
    setMaterialUrl('');
  };

  const week = weekOf(today);
  const weekMinutes = minutesByDay(sessionList.filter((session) => session.subjectId === subject.id), week).reduce((a, b) => a + b, 0);

  return (
    <div className="page melete-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Subjects</button>
      </div>
      <label className="field"><span className="field__label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} onBlur={() => name.trim() && name.trim() !== subject.name && put({ name: name.trim() })} /></label>
      <div className="chip-row" role="group" aria-label="Color">
        {SUBJECT_COLORS.map((color) => (
          <button key={color} type="button" className="chip" aria-pressed={(subject.color ?? 'sage') === color} aria-label={color} onClick={() => put({ color })}><i className="melete-dot" style={{ background: `var(--tag-${color})` }} aria-hidden="true" /> {color[0].toUpperCase() + color.slice(1)}</button>
        ))}
      </div>
      <div className="button-row">
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'session', subjectId: subject.id })}>Start a sitting</button>
        <button type="button" className="button-quiet" aria-expanded={finding} onClick={() => setFinding(!finding)}>Set a time</button>
      </div>
      {finding && (
        <div className="card melete-place">
          <div className="chip-row" role="group" aria-label="Kind">
            {SESSION_KINDS.map((each) => <button key={each.id} type="button" className="chip" aria-pressed={sitKind === each.id} onClick={() => setSitKind(each.id)}>{each.label}</button>)}
          </div>
          <div className="chip-row" role="group" aria-label="Length">
            {[15, 25, 30, 45, 60, 90].map((each) => <button key={each} type="button" className="chip" aria-pressed={lengthMin === each} onClick={() => setLengthMin(each)}>{each} min</button>)}
          </div>
          {slots === undefined ? <p className="muted">Looking at your week</p> : slots.length === 0 ? <p className="muted">No open stretch that long this week.</p> : (
            <ul className="chore-list">
              {slots.map((at) => (
                <li key={at.toISOString()} className="chore">
                  <button
                    type="button"
                    className="chore__open"
                    onClick={() => {
                      const record = { id: newId('session'), subjectId: subject.id, kind: sitKind, start: at.toISOString(), minutes: lengthMin };
                      sessionStore.put(record);
                      setFinding(false);
                      offerUndo('Sitting set', () => sessionStore.remove(record.id));
                    }}
                  >
                    <span>{new Intl.DateTimeFormat(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(at)}</span>
                    <small>{formatMinutes(lengthMin)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="button-quiet" onClick={() => setFinding(false)}>Cancel</button>
        </div>
      )}
      {weekMinutes > 0 && <p className="muted">{formatMinutes(weekMinutes)} this week</p>}

      <section>
        <div className="section-head"><h2>Dates</h2></div>
        {subject.dates.length > 0 && (
          <ul className="chore-list">
            {subject.dates.map((entry) => {
              const fact = dateFact(entry, today);
              const work = estimated?.id === entry.id && open !== undefined ? workFact(entry, open) : undefined;
              return (
                <li key={entry.id} className="chore">
                  <div className="chore__open">
                    <span>{fact || `${entry.title.trim() || DATE_KINDS.find((each) => each.id === entry.kind)?.label} · ${entry.date}`}</span>
                    {(work || entry.hours) && <small>{work ?? `About ${entry.hours} h of work`}</small>}
                  </div>
                  <button type="button" className="text-link" aria-label={`Remove ${entry.title || 'date'}`} onClick={() => { const before = subject; put({ dates: subject.dates.filter((each) => each.id !== entry.id) }); offerUndo('Date removed', () => subjects.put(before)); }}>Remove</button>
                </li>
              );
            })}
          </ul>
        )}
        <form className="melete-form" onSubmit={addDate}>
          <div className="chip-row" role="group" aria-label="Kind">
            {DATE_KINDS.map((each) => <button key={each.id} type="button" className="chip" aria-pressed={kind === each.id} onClick={() => setKind(each.id)}>{each.label}</button>)}
          </div>
          <label className="field"><span className="field__label">Name (optional)</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="input-row">
            <label className="field"><span className="field__label">Day</span><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="field"><span className="field__label">Hours of work (optional)</span><input className="input" type="text" inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
          </div>
          <button type="submit" className="button-quiet" disabled={!date}><PlusIcon size={18} />Add date</button>
        </form>
      </section>

      <section>
        <div className="section-head"><h2>Materials</h2></div>
        {subject.materials.length > 0 && (
          <ul className="chore-list">
            {subject.materials.map((material) => (
              <li key={material.id} className="chore">
                {material.url ? <a className="chore__open" href={material.url} target="_blank" rel="noreferrer"><span>{material.title}</span><small>{material.url.replace(/^https?:\/\//, '')}</small></a> : <div className="chore__open"><span>{material.title}</span></div>}
                <button type="button" className="text-link" aria-label={`Remove ${material.title}`} onClick={() => { const before = subject; put({ materials: subject.materials.filter((each) => each.id !== material.id) }); offerUndo('Material removed', () => subjects.put(before)); }}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <form className="melete-form" onSubmit={addMaterial}>
          <label className="field"><span className="field__label">Name</span><input className="input" value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} /></label>
          <label className="field"><span className="field__label">Link (optional)</span><input className="input" type="url" value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} /></label>
          <button type="submit" className="button-quiet" disabled={!materialTitle.trim()}><PlusIcon size={18} />Add material</button>
        </form>
      </section>

      <MoreDetails open={Boolean(subject.rhythm || subject.ifThen)}>
        <div className="input-row">
          <label className="field">
            <span className="field__label">Sittings a week</span>
            <select className="input" value={subject.rhythm?.times ?? 0} onChange={(event) => { const times = Number(event.target.value); put({ rhythm: times ? { times, minutes: subject.rhythm?.minutes ?? 45 } : undefined }); }}>
              <option value={0}>None</option>
              {[1, 2, 3, 4, 5, 6, 7].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Minutes each</span>
            <select className="input" value={subject.rhythm?.minutes ?? 45} disabled={!subject.rhythm} onChange={(event) => put({ rhythm: { times: subject.rhythm?.times ?? 1, minutes: Number(event.target.value) } })}>
              {[15, 25, 30, 45, 60, 90, 120].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
        </div>
        <label className="field"><span className="field__label">When I … I’ll … (optional)</span><input className="input" defaultValue={subject.ifThen ?? ''} onBlur={(event) => put({ ifThen: event.target.value.trim() || undefined })} /></label>
      </MoreDetails>

      <button
        type="button"
        className="button-quiet"
        onClick={() => {
          const undo = removeSubject(subject);
          nav.back();
          offerUndo(`“${subject.name}” removed`, undo);
        }}
      >
        Remove this subject
      </button>
    </div>
  );
}
