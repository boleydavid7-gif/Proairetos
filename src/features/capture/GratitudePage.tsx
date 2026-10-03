import { useState } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { ArrowLeftIcon, StarIcon } from '../../components/icons/Icons';
import GentleLine from '../../components/ui/GentleLine';
import { dayLabel } from '../reflect/format';

export const GRATITUDE = 'gratitude';

/**
 * What the person is grateful for, set down as it comes. Each line is kept
 * in Reflect, never as something to do. No counts, no daily ask.
 */
export default function GratitudePage({ onBack }: { onBack: () => void }) {
  useBackHandler(true, onBack);
  const { offerUndo } = useOverlays();
  const [text, setText] = useState('');
  const kept = (useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [])
    .filter((reflection) => reflection.promptKey === GRATITUDE)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

  const keep = async () => {
    const body = text.trim();
    if (!body) return;
    await reflectionService.write({ body, promptKey: GRATITUDE });
    setText('');
  };

  return (
    <div className="page capture-shelf">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={18} />
        Capture
      </button>
      <header className="capture-shelf__head">
        <span className="kind-tile__icon">
          <StarIcon size={28} />
        </span>
        <div>
          <h1 className="page-header__title">Grateful</h1>
        </div>
      </header>

      <form
        className="capture-bar"
        onSubmit={(event) => {
          event.preventDefault();
          void keep();
        }}
      >
        <input
          className="field-input"
          aria-label="I’m grateful for"
          placeholder="I’m grateful for…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="button-quiet" disabled={!text.trim()}>
          Keep
        </button>
      </form>

      {kept.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">Nothing here yet.</p>
          <GentleLine />
        </div>
      ) : (
        <ul className="gratitude-list">
          {kept.map((reflection) => (
            <li key={reflection.id} className="gratitude-list__item">
              <span className="gratitude-list__text">{reflection.body}</span>
              <span className="gratitude-list__meta">
                {dayLabel(reflection.createdAt)}
                <button
                  type="button"
                  className="text-link"
                  onClick={async () => {
                    const removal = await reflectionService.remove(reflection.id);
                    offerUndo('Removed', removal.undo);
                  }}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
