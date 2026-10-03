import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';
import { runTitle, useRuns } from '../../app/askesis/runs';
import { useTodayParts } from '../../app/hooks/useTodayParts';

const SHOWN = 6;

/** Titles of what was finished within a day's range, in order. */
export function useDoneIn(today: string, range: { start: Date; end: Date }) {
  return useServiceData(
    lifeService.subscribe,
    async () => {
      const [items, events] = await Promise.all([lifeService.list(), lifeService.historyForAll()]);
      const titles = new Map(items.map((item) => [item.id, item.title]));
      return events
        .filter((event) => {
          const at = new Date(event.timestamp).getTime();
          return event.kind === 'COMPLETED' && at >= range.start.getTime() && at < range.end.getTime();
        })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map((event) => ({ id: event.id, title: titles.get(event.itemId) ?? 'An item' }));
    },
    [today, range.start.getTime(), range.end.getTime()],
  );
}

/** What you finished today, quietly. Progress you can see, with no score attached. */
export default function DoneToday({ today, range }: { today: string; range: { start: Date; end: Date } }) {
  const items = useDoneIn(today, range);
  const runs = useRuns();
  const shows = useTodayParts();
  const ran = shows('askesis')
    ? (runs?.workouts ?? []).filter((entry) => entry.date === today).map((entry) => ({ id: entry.id, title: runTitle(entry, runs!.unit) }))
    : [];
  const done = items && [...items, ...ran];
  if (!done || done.length === 0) return null;

  return (
    <details className="done-today" open>
      <summary>
        Done today <span className="closed-list__count">{done.length}</span>
      </summary>
      <ul>
        {done.slice(0, SHOWN).map((entry) => (
          <li key={entry.id}>{entry.title}</li>
        ))}
        {done.length > SHOWN && <li className="done-today__more">and {done.length - SHOWN} more</li>}
      </ul>
    </details>
  );
}
