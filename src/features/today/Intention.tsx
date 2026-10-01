import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { BookmarkIcon } from '../../components/icons/Icons';

/** The person's own intention for a day, in their words. Optional. */
export default function Intention({ date, isToday }: { date: string; isToday: boolean }) {
  const { offerUndo } = useOverlays();
  // Wrapped, so "no intention yet" is told apart from "still loading".
  const loaded = useServiceData(
    reflectionService.subscribe,
    async () => ({ body: (await reflectionService.intentionFor(date))?.body ?? '' }),
    [date],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (!loaded) return null;

  const current = loaded.body;
  const label = isToday ? 'Today’s intention' : 'Intention';

  function edit() {
    setDraft(current);
    setEditing(true);
  }

  async function save() {
    await reflectionService.setIntention(date, draft);
    setEditing(false);
    if (current && !draft.trim()) {
      offerUndo('Intention cleared', () => reflectionService.setIntention(date, current));
    }
  }

  return (
    <section className="today-section" aria-label={label}>
      <div className="section-heading">
        <h2 className="section-label">{label}</h2>
        {!editing && (
          <button type="button" className="text-link" onClick={edit}>
            {current ? 'Edit' : 'Set'}
          </button>
        )}
      </div>
      {editing ? (
        <form
          className="intention intention--editing"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <textarea
            className="intention__input"
            rows={2}
            autoFocus
            aria-label={label}
            placeholder="How do you want to meet this day?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="composer__actions">
            <button type="button" className="button-quiet" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="button-accent">
              Save
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={`intention${current ? '' : ' intention--empty'}`} onClick={edit}>
          <span className="intention__text">{current || 'How do you want to meet this day? Optional.'}</span>
          <BookmarkIcon size={20} className="intention__mark" />
        </button>
      )}
    </section>
  );
}
