import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';

type Props = {
  days: number;
  earlier: LifeItem[];
  onDismiss: () => void;
};

/** After time away: no pile, no catching up. Just a soft way back in. */
export default function WelcomeBack({ days, earlier, onDismiss }: Props) {
  const { openItem } = useOverlays();
  const [looking, setLooking] = useState(false);

  return (
    <section className="welcome-back" aria-label="Welcome back">
      <p className="welcome-back__title">Welcome back.</p>
      <p className="welcome-back__text">
        It has been {days} days. Nothing here is late. Start wherever you like.
      </p>

      {earlier.length > 0 && (
        <>
          <p className="welcome-back__text">
            {earlier.length} {earlier.length === 1 ? 'thing had a time' : 'things had times'} on earlier days. You can
            clear those times and keep the items, or look at them first.
          </p>
          {looking && (
            <ul className="welcome-back__list">
              {earlier.map((item) => (
                <li key={item.id}>
                  <button type="button" className="text-link" onClick={() => openItem(item.id)}>
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="chip-row">
            <button
              type="button"
              className="chip chip--accent"
              onClick={async () => {
                await lifeService.clearTimes(earlier.map((item) => item.id));
                onDismiss();
              }}
            >
              Clear old times
            </button>
            {!looking && (
              <button type="button" className="chip" onClick={() => setLooking(true)}>
                Look at them
              </button>
            )}
          </div>
        </>
      )}

      <button type="button" className="button-quiet welcome-back__dismiss" onClick={onDismiss}>
        Thanks
      </button>
    </section>
  );
}
