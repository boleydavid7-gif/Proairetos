import { DurationWheel } from '../../app/family/TimeWheel';
import { useEffect, useRef, useState } from 'react';
import { Waiting } from '../../lamplight/Waiting';
import { offerUndo, say } from '../../app/family/shell';
import type { MeleteNav } from '../app/App';
import { loadRunning, newId, saveRunning, sessions as sessionStore, settings, subjects, type Running } from '../app/state';
import { formatMinutes, type SessionKind, type StudySession } from '../core/subjects';

const clockDown = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** One sitting: set it up (subject, kind, length), keep time with a bell at the end, and keep the minutes. */
export default function SessionPage({ nav, id, subjectId }: { nav: MeleteNav; id?: string; subjectId?: string }) {
  const list = subjects.use();
  const planned = id ? sessionStore.use().find((session) => session.id === id) : undefined;
  const [running, setRunning] = useState<Running | null>(() => loadRunning());
  const [subject, setSubject] = useState<string | undefined>(planned?.subjectId ?? running?.subjectId ?? subjectId ?? list[0]?.id);
  const kind: SessionKind = planned?.kind ?? running?.kind ?? 'read';
  const [minutes, setMinutes] = useState(planned?.minutes ?? running?.minutes ?? settings.load().minutes);
  const [now, setNow] = useState(Date.now());
  const [kept, setKept] = useState<{ minutes: number; id: string }>();
  const [line, setLine] = useState('');
  const [lineKept, setLineKept] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [running]);

  const left = running ? running.startedAt + running.minutes * 60_000 - now : 0;
  const rungOut = Boolean(running) && left <= 0;

  const start = async () => {
    const next: Running = { sessionId: planned?.id, subjectId: subject, kind, startedAt: Date.now(), minutes };
    saveRunning(next);
    setRunning(next);
    setNow(Date.now());
    void import('../../praxis/bell').then(({ scheduleBell }) => scheduleBell(minutes * 60)).catch(() => undefined);
  };

  const finish = () => {
    if (!running || finishing.current) return;
    finishing.current = true;
    const spent = Math.max(1, Math.min(running.minutes, Math.round((Date.now() - running.startedAt) / 60_000)));
    const record: StudySession = {
      id: running.sessionId ?? newId('session'),
      subjectId: running.subjectId,
      kind: running.kind,
      start: new Date(running.startedAt).toISOString(),
      minutes: spent,
      doneAt: new Date().toISOString(),
    };
    sessionStore.put(record);
    saveRunning(null);
    setRunning(null);
    void import('../../praxis/bell').then(({ cancelBell }) => cancelBell()).catch(() => undefined);
    setKept({ minutes: spent, id: record.id });
    offerUndo(`${formatMinutes(spent)} kept`, () => sessionStore.remove(record.id));
  };

  const keepLine = async () => {
    const text = line.trim();
    if (!text || !kept) return;
    const found = sessionStore.get(kept.id);
    if (found) sessionStore.put({ ...found, line: text });
    try {
      const { reflectionService } = await import('../../app/services');
      await reflectionService.write({ body: `${list.find((each) => each.id === found?.subjectId)?.name ?? 'Study'}: ${text}`, kind: 'FREE', promptKey: 'after-study' });
      setLineKept(true);
    } catch {
      say('Couldn’t keep that. Try again.');
    }
  };

  const name = list.find((each) => each.id === (running?.subjectId ?? subject))?.name ?? 'Study';

  if (kept) {
    return (
      <div className="page melete-page">
        <div className="page-top"><h1 className="title">{formatMinutes(kept.minutes)} kept</h1></div>
        <p className="muted">{name}</p>
        {lineKept ? <a className="text-link" href="/?open=reflect">Kept in Reflect, in Proairetos</a> : (
          <form className="melete-form" onSubmit={(event) => { event.preventDefault(); void keepLine(); }}>
            <label className="field"><span className="field__label">What did you take from this? (optional)</span><input className="input" value={line} onChange={(event) => setLine(event.target.value)} /></label>
            <button type="submit" className="button-quiet" disabled={!line.trim()}>Keep this line</button>
          </form>
        )}
        <button type="button" className="button-main" onClick={() => nav.swap({ name: 'today' })}>Done</button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="page melete-page melete-timer">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="label">{name}</p>
        <p className="melete-clock" role="timer" aria-live="off">{rungOut ? 'Time' : clockDown(left)}</p>
        {!rungOut && <Waiting>{formatMinutes(running.minutes)}</Waiting>}
        <button type="button" className="button-main" onClick={finish}>{rungOut ? 'Keep it' : 'Stop here'}</button>
      </div>
    );
  }

  return (
    <div className="page melete-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <h1 className="title">Sitting</h1>
      </div>
      {list.length > 0 && (
        <div className="chip-row" role="group" aria-label="Subject">
          {list.map((each) => <button key={each.id} type="button" className="chip" aria-pressed={subject === each.id} onClick={() => { setSubject(each.id); if (each.rhythm) setMinutes(each.rhythm.minutes); }}>{each.name}</button>)}
        </div>
      )}
      <DurationWheel label="Length" minutes={minutes} onChange={setMinutes} />
      <button type="button" className="button-main" onClick={() => void start()}>Start</button>
    </div>
  );
}
