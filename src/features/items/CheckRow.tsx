import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { tap } from '../../app/feel';
import { lifeService } from '../../app/services';
import { CheckIcon, MoreIcon, TrashIcon } from '../../components/icons/Icons';
import type { LifeItem } from '../../core/life-items/types';

/** One checklist row. Checking closes it with an undo; unchecking reopens it. */
export default function CheckRow({ item, done, detail, allowDelete = false }: { item: LifeItem; done: boolean; detail?: string; allowDelete?: boolean }) {
  const { openItem, offerUndo } = useOverlays();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!done) tap();
    setBusy(true);
    try {
      const change = await lifeService.setStatus(item.id, done ? 'OPEN' : 'DONE');
      if (!done) offerUndo(`Done: ${item.title}`, change.undo);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const deletion = await lifeService.deleteItem(item.id);
      offerUndo(`Deleted: ${item.title}`, deletion.undo);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`check-row${done ? ' check-row--done' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={item.title}
        className="check-row__box"
        disabled={busy}
        onClick={toggle}
      >
        {done && <CheckIcon size={16} />}
      </button>
      <button type="button" className="check-row__title" onClick={() => openItem(item.id)}>
        <span>{item.title}</span>
        {detail && <span className="check-row__detail">{detail}</span>}
      </button>
      <button type="button" className="check-row__more" aria-label={`More for ${item.title}`} onClick={() => openItem(item.id)}>
        <MoreIcon size={20} />
      </button>
      {allowDelete && (
        <button type="button" className="check-row__delete" aria-label={`Delete ${item.title}`} disabled={busy} onClick={() => void remove()}>
          <TrashIcon size={18} />
        </button>
      )}
      {item.checklist && !done && (
        <ul className="check-lines">
          {item.checklist.map((line) => (
            <li key={line.id} className={`check-lines__line${line.done ? ' check-lines__line--done' : ''}`}>
              <button
                type="button"
                role="checkbox"
                aria-checked={line.done}
                aria-label={line.text}
                className="check-lines__box"
                onClick={() => lifeService.toggleChecklistLine(item.id, line.id)}
              >
                {line.done && <CheckIcon size={12} />}
              </button>
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
