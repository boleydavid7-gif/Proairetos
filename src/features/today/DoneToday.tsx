import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';
import { toLocalDate } from '../../core/scheduling/dates';

const SHOWN = 6;

/** What you finished today, quietly. Progress you can see, with no score attached. */
export default function DoneToday({ today }: { today: string }) {
  const done = useServiceData(
    lifeService.subscribe,
    async () => {
      const [items, events] = await Promise.all([lifeService.list(), lifeService.historyForAll()]);
      const titles = new Map(items.map((item) => [item.id, item.title]));
      return events
        .filter((event) => event.kind === 'COMPLETED' && toLocalDate(new Date(event.timestamp)) === today)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map((event) => ({ id: event.id, title: titles.get(event.itemId) ?? 'An item' }));
    },
    [today],
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
