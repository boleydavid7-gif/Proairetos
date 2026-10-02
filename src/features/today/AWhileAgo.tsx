import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';
import { dayLabel } from '../reflect/format';

type Props = { items: LifeItem[]; onKeep: (id: string) => void };

/** Old concerns in the person's own words. Keep one, or let it go; nothing else is said. */
export default function AWhileAgo({ items, onKeep }: Props) {
  const { offerUndo, openItem } = useOverlays();
  return (
    <ul className="a-while-ago">
      {items.map((item) => (
        <li key={item.id} className="a-while-ago__row">
          <button type="button" className="a-while-ago__title" onClick={() => openItem(item.id)}>
            <span>{item.title}</span>
            <span className="a-while-ago__when">Noted {dayLabel(item.createdAt)}</span>
          </button>
          <div className="chip-row">
            <button type="button" className="chip chip--small" onClick={() => onKeep(item.id)}>
              Still with me
            </button>
            <button
              type="button"
              className="chip chip--small"
              onClick={async () => {
                const change = await lifeService.setStatus(item.id, 'LET_GO');
                offerUndo(`Let go: ${item.title}`, change.undo);
              }}
            >
              Let it go
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
