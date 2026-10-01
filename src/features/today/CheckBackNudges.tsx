import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { HourglassIcon } from '../../components/icons/Icons';
import type { LifeItem } from '../../core/life-items/types';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { formatLocalDay } from '../schedule/format';

const laterChoices = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

function Nudge({ item }: { item: LifeItem }) {
  const { openItem, offerUndo } = useOverlays();
  const [choosingLater, setChoosingLater] = useState(false);
  const chosenDay = toLocalDate(new Date(item.checkBackAt!));

  return (
    <div className="item-card">
      <button type="button" className="item-card__open" onClick={() => openItem(item.id)}>
        <span className="item-card__title">{item.title}</span>
        <span className="item-card__meta">You chose to check back {formatLocalDay(chosenDay)}</span>
      </button>
      {choosingLater ? (
        <div className="chip-row" role="group" aria-label="Check again">
          {laterChoices.map((choice) => (
            <button
              key={choice.days}
              type="button"
              className="chip"
              onClick={() =>
                lifeService.setCheckBack(
                  item.id,
                  atTime(addDays(toLocalDate(new Date()), choice.days), '00:00').toISOString(),
                )
              }
            >
              {choice.label}
            </button>
          ))}
          <button type="button" className="button-quiet" onClick={() => setChoosingLater(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="chip-row">
          <button type="button" className="chip" onClick={() => lifeService.setStatus(item.id, 'OPEN')}>
            Heard back
          </button>
          <button type="button" className="chip" onClick={() => setChoosingLater(true)}>
            Check again later
          </button>
          <button
            type="button"
            className="chip"
            onClick={async () => offerUndo(`Let go: ${item.title}`, (await lifeService.setStatus(item.id, 'LET_GO')).undo)}
          >
            Let go
          </button>
        </div>
      )}
    </div>
  );
}

/** Waiting items whose chosen day has come, brought back into view without urgency. */
export default function CheckBackNudges({ items }: { items: LifeItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="stack-tight" aria-label="Ready to check back">
      <h2 className="section-label section-label--icon">
        <HourglassIcon size={18} /> Ready to check back
      </h2>
      {items.map((item) => (
        <Nudge key={item.id} item={item} />
      ))}
    </section>
  );
}
