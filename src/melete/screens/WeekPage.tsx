import { useEffect, useMemo, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { addDays, mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import type { Span } from '../../core/rhythm/openTime';
import IconButton from '../../components/ui/IconButton';
import { Sym } from '../../lamplight/icons';
import type { MeleteNav } from '../app/App';
import { openByDay } from '../app/gaps';
import { DurationWheel, TimeWheel } from '../../app/family/TimeWheel';
import { trainingOnDays, type TrainingDay } from '../../app/family/trainingDays';
import { newId, sessions as sessionStore, settings, subjects } from '../app/state';
import { formatMinutes, kindLabel, rhythmLeft, sessionsOnDay, weekOf } from '../core/subjects';

const clock = (date: Date) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
const dayName = (day: string) => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00`));
const hm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const two = (value: number) => String(value).padStart(2, '0');
const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return (h || 0) * 60 + (m || 0); };

/**
 * The real week: work, sleep and events take what they hold, and what is left shows as open stretches. Tap one to set a
 * sitting in it. Nothing is placed for the person; the loose chips are their own rhythm, and they go with the week.
 */
export default function WeekPage({ nav }: { nav: MeleteNav }) {
  const list = subjects.use();
  const all = sessionStore.use();
  const today = toLocalDate(new Date());
  const [monday, setMonday] = useState(() => mondayOnOrBefore(today));
  const days = useMemo(() => weekOf(monday), [monday]);
  const [open, setOpen] = useState<Map<string, Span[]>>();
  const [training, setTraining] = useState<Map<string, TrainingDay>>(new Map());
  const [newName, setNewName] = useState('');
  const [picking, setPicking] = useState<{ day: string; span: Span }>();
  const [subjectId, setSubjectId] = useState<string>();
  const [minutes, setMinutes] = useState(settings.load().minutes);
  const [start, setStart] = useState('');
  const planned = all.filter((session) => !session.doneAt);

  useEffect(() => {
    let live = true;
    void openByDay(days, planned).then((result) => live && setOpen(result)).catch(() => live && setOpen(new Map()));
    return () => { live = false; };
  }, [days, all.length]);

  // Runs and strength sessions set for the week, from Askesis and Dynamis when added; they show beside the day and take nothing.
  useEffect(() => {
    let live = true;
    void trainingOnDays(days).then((result) => live && setTraining(result)).catch(() => undefined);
    return () => { live = false; };
  }, [days]);

  const loose = list.map((subject) => ({ subject, left: rhythmLeft(subject, all, monday) })).filter((each) => each.left > 0);

  const choose = (day: string, span: Span, forSubject?: string) => {
    const first = list.find((subject) => subject.id === forSubject) ?? list[0];
    setPicking({ day, span });
    setSubjectId(first?.id);
    setMinutes(first?.rhythm?.minutes ?? settings.load().minutes);
    setStart(hm(span.start));
  };

  const place = () => {
    if (!picking) return;
    let chosen = subjectId;
    if (!chosen) {
      const name = newName.trim();
      if (!name) return;
      chosen = newId();
      subjects.put({ id: chosen, name, dates: [], materials: [], createdAt: new Date().toISOString() });
      setNewName('');
    }
    const [h, m] = start.split(':').map(Number);
    const at = new Date(`${picking.day}T00:00:00`);
    at.setHours(h, m, 0, 0);
    const room = Math.max(15, Math.floor((picking.span.end.getTime() - at.getTime()) / 60_000));
    const record = { id: newId('session'), subjectId: chosen, kind: 'read' as const, start: at.toISOString(), minutes: Math.min(minutes, room) };
    sessionStore.put(record);
    setPicking(undefined);
    offerUndo('Sitting set', () => sessionStore.remove(record.id));
  };

  const stepWeek = (by: number) => setMonday(addDays(monday, by * 7));
  const title = `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${days[0]}T12:00:00`))} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${days[6]}T12:00:00`))}`;

  return (
    <div className="page melete-page">
      <div className="page-top section-head">
        <h1 className="title">Week</h1>
        <div className="melete-weeknav">
          <IconButton size="md" className="round-button" label="Earlier week" onClick={() => stepWeek(-1)}><Sym name="back" size={18} /></IconButton>
          <IconButton size="md" className="round-button" label="Later week" onClick={() => stepWeek(1)}><Sym name="chevron" size={18} /></IconButton>
        </div>
      </div>
      <p className="muted">{title}</p>
      {loose.length > 0 && (
        <div className="chip-row" role="group" aria-label="Your rhythm this week">
          {loose.map(({ subject, left }) => (
            <button key={subject.id} type="button" className="chip" onClick={() => { const day = days.find((each) => (open?.get(each) ?? []).length > 0); const span = day ? open?.get(day)?.[0] : undefined; if (day && span) choose(day, span, subject.id); }}>
              <i className="melete-dot" style={{ background: `var(--tag-${subject.color ?? 'sage'})` }} aria-hidden="true" /> {subject.name}{left > 1 ? ` × ${left}` : ''}
            </button>
          ))}
        </div>
      )}
      {days.map((day) => {
        const sittings = sessionsOnDay(all, day);
        const gaps = open?.get(day) ?? [];
        const entries = list.flatMap((subject) => subject.dates.filter((entry) => entry.date === day).map((entry) => ({ subject, entry })));
        const here = picking?.day === day;
        return (
          <section key={day} className="melete-day">
            <div className="section-head">
              <h2>{day === today ? `Today · ${dayName(day)}` : dayName(day)}</h2>
              {(training.get(day)?.run || training.get(day)?.lift) && (
                <span className="melete-train">
                  {training.get(day)?.run && <span role="img" aria-label="Run"><Sym name="run" size={18} /></span>}
                  {training.get(day)?.lift && <span role="img" aria-label="Strength session"><Sym name="barbell" size={18} /></span>}
                </span>
              )}
            </div>
            {entries.map(({ subject, entry }) => <p key={entry.id} className="melete-date">{`${entry.title.trim() || kindLabel(entry.kind)} · ${subject.name}`}</p>)}
            <ul className="chore-list">
              {sittings.map((session) => {
                const subject = list.find((each) => each.id === session.subjectId);
                return (
                  <li key={session.id} className="chore">
                    <button type="button" className="chore__open" onClick={() => nav.go({ name: 'session', id: session.id })}>
                      <span className="melete-name"><i className="melete-dot" style={{ background: `var(--tag-${subject?.color ?? 'sage'})` }} aria-hidden="true" />{subject?.name ?? 'Study'}</span>
                      <small>{[clock(new Date(session.start)), formatMinutes(session.minutes), session.doneAt ? 'Done' : undefined].filter(Boolean).join(' · ')}</small>
                    </button>
                  </li>
                );
              })}
              {gaps.map((span) => (
                <li key={span.start.toISOString()} className="chore melete-gap">
                  <button type="button" className="chore__open" onClick={() => choose(day, span)}>
                    <span className="melete-gap__text">
                      <span>{clock(span.start)} – {clock(span.end)}</span>
                      <small>{formatMinutes(Math.round((span.end.getTime() - span.start.getTime()) / 60_000))} open</small>
                    </span>
                    <Sym name="plus" size={18} className="melete-gap__add" />
                  </button>
                </li>
              ))}
            </ul>
            {here && picking && (
              <div className="card melete-place">
                {list.length === 0 ? (
                  <label className="field"><span className="field__label">Subject</span><input className="input" value={newName} onChange={(event) => setNewName(event.target.value)} aria-label="Subject name" /></label>
                ) : (
                <div className="chip-row" role="group" aria-label="Subject">
                  {list.map((subject) => <button key={subject.id} type="button" className="chip" aria-pressed={subjectId === subject.id} onClick={() => { setSubjectId(subject.id); if (subject.rhythm) setMinutes(subject.rhythm.minutes); }}>{subject.name}</button>)}
                </div>
                )}
                <DurationWheel label="Length" minutes={minutes} onChange={setMinutes} />
                <TimeWheel label="Starts" minutes={toMinutes(start)} step={5} onChange={(value) => setStart(`${two(Math.floor(value / 60))}:${two(value % 60)}`)} />
                <div className="button-row">
                  <button type="button" className="button-main" disabled={!subjectId && !newName.trim()} onClick={place}>Set it</button>
                  <button type="button" className="button-quiet" onClick={() => setPicking(undefined)}>Cancel</button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
