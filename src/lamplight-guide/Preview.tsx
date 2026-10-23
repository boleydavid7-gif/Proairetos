import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { triple } from '../lamplight/color';
import { LIT_STRENGTH, VELLUM_LIFT, dayLight, dayPosition, poolColor, vellumReads, warmedLamp } from '../lamplight/daylight';
import { makeScheme, schemeVars, type LampSeed, type Mode, type RoomSeed } from '../lamplight/scheme';
import { Sym } from '../lamplight/icons';

/*
 * Lamplight 2.0, the preview on the guide: a phone-sized room whose lamp follows a day. The five ideas, together:
 * day light, three levels of light in place of color and badges, vellum surfaces, motion as light, and the person's
 * own words lit while the app's words sit in shade. Nothing here is used by the apps yet.
 */

const DAYS = {
  usual: { label: 'Usual day', wake: '07:00', sleep: '23:00' },
  night: { label: 'Night work', wake: '15:00', sleep: '07:00' },
} as const;
type DayKind = keyof typeof DAYS;

const CLOCK = (position: number, kind: DayKind) => {
  const { wake, sleep } = DAYS[kind];
  const [wh, wm] = wake.split(':').map(Number);
  const [sh, sm] = sleep.split(':').map(Number);
  let length = sh * 60 + sm - (wh * 60 + wm);
  if (length <= 0) length += 24 * 60;
  const at = (wh * 60 + wm + Math.round(position * length)) % (24 * 60);
  return new Date(2026, 0, 1, Math.floor(at / 60), at % 60).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

type Todo = { id: string; title: string; done?: boolean };
const FIRST_TODOS: Todo[] = [
  { id: 'a', title: 'Call the pharmacy' },
  { id: 'b', title: 'Pack the gym bag' },
  { id: 'c', title: 'Reply to Sam' },
];

export default function Preview({ room, lamp, mode }: { room: RoomSeed; lamp: LampSeed; mode: Mode }) {
  const [kind, setKind] = useState<DayKind>('usual');
  const [position, setPosition] = useState(() => dayPosition(new Date(), DAYS.usual.wake, DAYS.usual.sleep));
  const [page, setPage] = useState<'today' | 'reflect'>('today');
  const [typing, setTyping] = useState(false);
  const [todos, setTodos] = useState(FIRST_TODOS);
  const [settling, setSettling] = useState<string>();
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const light = dayLight(position);
  const warm = warmedLamp(lamp, light.warmth);
  const s = useMemo(() => makeScheme(room, warm, mode), [room, warm.hue, warm.chroma, mode]);
  const pool = poolColor(lamp, light.warmth, mode);
  const reads = vellumReads(s, pool, light.pool * LIT_STRENGTH);
  const style = {
    ...schemeVars(s),
    colorScheme: mode,
    '--p2-x': `${(light.x * 100).toFixed(1)}%`,
    '--p2-y': `${(light.y * 100).toFixed(1)}%`,
    '--p2-pool-rgb': triple(pool),
    '--p2-pool': light.pool.toFixed(3),
    '--p2-lift': (VELLUM_LIFT * light.pool).toFixed(3),
    '--p2-lit': (VELLUM_LIFT * light.pool * LIT_STRENGTH).toFixed(3),
    '--p2-shade': light.shade.toFixed(3),
  } as CSSProperties;

  const tick = (todo: Todo) => {
    if (todo.done) {
      setTodos((list) => list.map((each) => (each.id === todo.id ? { ...each, done: false } : each)));
      return;
    }
    // The light settles on it, then it goes into the shade with what is done: no line through it, no color.
    setSettling(todo.id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setTodos((list) => list.map((each) => (each.id === todo.id ? { ...each, done: true } : each)));
      setSettling(undefined);
    }, 1100);
  };
  const open = todos.filter((todo) => !todo.done);
  const done = todos.filter((todo) => todo.done);
  const nextLit = !typing;

  return (
    <div className="p2">
      <div className="p2-controls ll-card">
        <label className="p2-day">
          <span className="g-label">
            {light.name} · {CLOCK(position, kind)}
          </span>
          <input type="range" min={0} max={1000} value={Math.round(position * 1000)} aria-label="Where in the day" onChange={(event) => setPosition(Number(event.target.value) / 1000)} />
          <span className="p2-day__ends" aria-hidden="true">
            <span>Waking</span>
            <span>Sleep</span>
          </span>
        </label>
        <div className="p2-kinds" role="group" aria-label="Whose day">
          {(Object.keys(DAYS) as DayKind[]).map((each) => (
            <button key={each} type="button" className="ll-chip" aria-pressed={kind === each} onClick={() => setKind(each)}>
              {DAYS[each].label} ({DAYS[each].wake}–{DAYS[each].sleep})
            </button>
          ))}
          <button type="button" className="ll-button ll-button--tonal" onClick={() => setPosition(dayPosition(new Date(), DAYS[kind].wake, DAYS[kind].sleep))}>
            Now
          </button>
        </div>
        <dl className="p2-facts">
          <dt>Lamp height</dt>
          <dd>{Math.round((1 - light.y) * 100)}%</dd>
          <dt>Warmth</dt>
          <dd>{Math.round(light.warmth * 100)}%</dd>
          <dt>Pool</dt>
          <dd>{Math.round(light.pool * 100)}%</dd>
          <dt>Text on the lit corner</dt>
          <dd>
            {reads.ink.toFixed(1)}:1 · {reads.ink2.toFixed(1)}:1 · lamp {reads.lamp.toFixed(1)}:1 {reads.ok ? '' : '(below the line)'}
          </dd>
        </dl>
        <ul className="p2-notes">
          <li><strong>Day light.</strong> The lamp follows the person’s day, not the clock: Night work’s morning is at 3 PM.</li>
          <li><strong>One lit thing.</strong> What comes next is lit. Type in the box and the light moves to it.</li>
          <li><strong>Vellum.</strong> Matte paper, brightest at the lamp’s corner. No glass, no outlines.</li>
          <li><strong>Motion as light.</strong> Tick a to-do: the light settles, then it goes into the shade. Pages brighten into place.</li>
          <li><strong>Your words lit.</strong> What the person wrote is in the light; the app’s labels sit in shade.</li>
        </ul>
      </div>

      <div className="p2-phone" style={style} data-mode={mode}>
        <div className="p2-room" aria-hidden="true" />
        <div key={page} className="p2-page">
          <header className="p2-head">
            <span className="p2-shade-text">{page === 'today' ? 'Thursday, Oct 23' : 'Your words'}</span>
            <h3 className="p2-title">{page === 'today' ? 'Today' : 'Reflect'}</h3>
          </header>

          {page === 'today' ? (
            <>
              <label className="p2-vellum p2-capture" data-level={typing ? 'lit' : 'near'}>
                <Sym name="plus" size={20} />
                <input placeholder="Write it down" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} aria-label="Write it down" />
              </label>

              <div className="p2-vellum p2-next" data-level={nextLit ? 'lit' : 'near'}>
                <span className="p2-shade-text">Next · in 40 min</span>
                <span className="p2-next__title">Dentist</span>
                <span className="p2-shade-text">3:00 PM · Elm Street</span>
              </div>

              <p className="p2-label">To do</p>
              <ul className="p2-vellum p2-list" data-level="near">
                {open.map((todo) => (
                  <li key={todo.id} className="p2-row" data-settling={settling === todo.id || undefined}>
                    <button type="button" role="checkbox" aria-checked={false} aria-label={todo.title} className="p2-box" onClick={() => tick(todo)} />
                    <span>{todo.title}</span>
                  </li>
                ))}
              </ul>
              {done.length > 0 && (
                <ul className="p2-list" data-level="rest" aria-label="Done">
                  {done.map((todo) => (
                    <li key={todo.id} className="p2-row">
                      <button type="button" role="checkbox" aria-checked aria-label={todo.title} className="p2-box p2-box--done" onClick={() => tick(todo)}>
                        <Sym name="check" size={16} />
                      </button>
                      <span>{todo.title}</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="p2-label">From your apps</p>
              <ul className="p2-list" data-level="rest">
                <li className="p2-row p2-row--app">
                  <Sym name="pill" size={20} />
                  <span>Vitamin D · 9:00 AM</span>
                </li>
                <li className="p2-row p2-row--app">
                  <Sym name="leaf" size={20} />
                  <span>Check the fern</span>
                </li>
              </ul>
            </>
          ) : (
            <>
              <div className="p2-vellum p2-words" data-level="lit">
                <span className="p2-shade-text">Tonight</span>
                <p className="p2-own">The walk home was quiet. I want more evenings like that one.</p>
              </div>
              <p className="p2-label">Earlier</p>
              <div className="p2-vellum p2-words" data-level="near">
                <span className="p2-shade-text">Tuesday</span>
                <p className="p2-own p2-own--near">Three good things: the soup, Mia’s drawing, an early night.</p>
              </div>
              <div className="p2-words" data-level="rest">
                <span className="p2-shade-text">Last week</span>
                <p className="p2-own p2-own--rest">Started the book Sam lent me.</p>
              </div>
            </>
          )}
        </div>

        <nav className="p2-dock" aria-label="Preview pages">
          {(['today', 'reflect'] as const).map((each) => (
            <button key={each} type="button" aria-current={page === each ? 'page' : undefined} onClick={() => setPage(each)}>
              <Sym name={each === 'today' ? 'today' : 'book'} size={22} />
              <span>{each === 'today' ? 'Today' : 'Reflect'}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
