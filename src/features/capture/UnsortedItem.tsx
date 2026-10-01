import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';
import { lifeItemTypeLabels, lifeItemTypes } from './labels';

/** A capture waiting to be sorted, with one tap per type. */
export default function UnsortedItem({ item }: { item: LifeItem }) {
  const { openItem, offerUndo } = useOverlays();

  return (
    <div className="item-card">
      <button type="button" className="item-card__open" onClick={() => openItem(item.id)}>
        <span className="item-card__title">{item.title}</span>
      </button>
      <div className="chip-row" role="group" aria-label={`Sort "${item.title}"`}>
        {lifeItemTypes.map((type) => (
          <button key={type} type="button" className="chip" onClick={() => lifeService.sort(item.id, type)}>
            {lifeItemTypeLabels[type]}
          </button>
        ))}
        <button
          type="button"
          className="chip chip--quiet"
          aria-label={`Delete "${item.title}"`}
          onClick={async () => offerUndo(`Deleted: ${item.title}`, (await lifeService.deleteItem(item.id)).undo)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

