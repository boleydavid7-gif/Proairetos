import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';
import { itemKinds } from '../../core/life-items/kinds';

/** A capture waiting to be sorted, with one tap per kind. */
export default function UnsortedItem({ item }: { item: LifeItem }) {
  const { openItem, offerUndo } = useOverlays();

  return (
    <div className="item-card">
      <button type="button" className="item-card__open" onClick={() => openItem(item.id)}>
        <span className="item-card__title">{item.title}</span>
      </button>
      <div className="chip-row" role="group" aria-label={`Sort "${item.title}"`}>
        {itemKinds.map((kind) => (
          <button key={kind.id} type="button" className="chip" onClick={() => lifeService.setKind(item.id, kind.id)}>
            {kind.label}
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

