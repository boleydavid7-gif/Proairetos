import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';

const SHOWN = 6;

/** What you finished today, quietly. Progress you can see, with no score attached. */
export default function DoneToday({ today, range }: { today: string; range: { start: Date; end: Date } }) {
  const done = useServiceData(
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
