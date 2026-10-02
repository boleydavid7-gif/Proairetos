import { useSyncExternalStore } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import type { Overlap } from '../../core/rhythm/overlaps';
import { keepOverlap, keptOverlaps, subscribePreferences } from '../../data/storage/preferences';
import { formatTimeOf } from '../schedule/format';

/**
 * When a set time now shares its time with a commitment or an event, a
 * quiet note says so, with plain ways to move it. Nothing moves by itself.
 */
export default function Overlaps({ overlaps, moveTo }: { overlaps: Overlap[]; moveTo?: Date }) {
  const { openItem, offerUndo } = useOverlays();
  const kept = new Set(useSyncExternalStore(subscribePreferences, keptOverlaps).split('\n'));
  const shown = overlaps.filter((overlap) => !kept.has(overlap.key));
  if (shown.length === 0) return null;

  return (
    <ul className="overlaps" aria-label="Times that now overlap">
      {shown.map(({ item, with: other, key }) => (
        <li key={key} className="overlap">
          <p className="overlap__text">
            {item.title} at {formatTimeOf(new Date(item.scheduledAt!))} is now during {other}.
          </p>
          <div className="chip-row">
            {moveTo && (
              <button
                type="button"
                className="chip chip--small"
                onClick={async () => {
                  const before = item.scheduledAt;
                  await lifeService.schedule(item.id, moveTo.toISOString());
                  offerUndo(`Moved to ${formatTimeOf(moveTo)}: ${item.title}`, async () => {
                    await lifeService.schedule(item.id, before);
                  });
                }}
              >
                Move to {formatTimeOf(moveTo)}
              </button>
            )}
            <button type="button" className="chip chip--small" onClick={() => openItem(item.id)}>
              Another time
            </button>
            <button type="button" className="chip chip--small chip--quiet" onClick={() => keepOverlap(key)}>
              Keep it
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
