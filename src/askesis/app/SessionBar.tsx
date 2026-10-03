import { flatten, type Part } from '../core/workouts';

/** The session at a glance: one block per stretch, as long as it lasts, coloured by effort. */
export default function SessionBar({ parts, small }: { parts: readonly Part[]; small?: boolean }) {
  return (
    <div className={`session-bar${small ? ' session-bar--small' : ''}`} aria-hidden="true">
      {flatten(parts).map((item, i) => (
        <span key={i} className={`session-bar__seg session-bar__seg--${item.effort}`} style={{ flexGrow: item.minutes }} />
      ))}
    </div>
  );
}

/** What the colours mean, for the efforts in this session. */
export function SessionKey({ parts }: { parts: readonly Part[] }) {
  const present = new Set(flatten(parts).map((item) => item.effort));
  const keys: [string, string][] = [];
  if (present.has('walk')) keys.push(['walk', 'Walk']);
  if (present.has('easy') || present.has('recovery')) keys.push(['easy', 'Run easy']);
  if (present.has('steady')) keys.push(['steady', 'Steady']);
  if (present.has('tempo')) keys.push(['tempo', 'Comfortably hard']);
  if (present.has('hard')) keys.push(['hard', 'Hard']);
  if (present.has('stride')) keys.push(['stride', 'Strides']);
  if (keys.length < 2) return null;
  return (
    <ul className="session-key" aria-hidden="true">
      {keys.map(([effort, name]) => (
        <li key={effort}>
          <span className={`session-key__dot session-bar__seg--${effort}`} />
          {name}
        </li>
      ))}
    </ul>
  );
}
