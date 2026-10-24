import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { BookmarkIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import TodayThree from './TodayThree';
import type { LifeItem } from '../../core/life-items/types';

/** The person's own intention for a day, in their words. */
export default function Intention({ date, isToday, items }: { date: string; isToday: boolean; items?: LifeItem[] }) {
  const { offerUndo } = useOverlays();
  // Wrapped, so "no intention yet" is told apart from "still loading".
  const loaded = useServiceData(
    reflectionService.subscribe,
    async () => ({ body: (await reflectionService.intentionFor(date))?.body ?? '' }),
    [date],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);
  if (!loaded) return null;

  const current = loaded.body;
  const label = isToday ? 'Today’s intention' : 'Intention';

  function edit() {
    setDraft(current);
    setEditing(true);
  }

  async function save() {
    await reflectionService.setIntention(date, draft);
    setPicking(false);
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
          <span className="section-heading__actions">
            {!current && isToday && <NotForMe part="intention" />}
            {current && (
              <button type="button" className="text-link" onClick={edit}>
                Edit
              </button>
            )}
          </span>
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
            placeholder="An intention for today"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {isToday && items && (
            <TodayThree date={date} items={items} embedded pickerOpen={picking} onPickerOpenChange={setPicking} />
          )}
          <div className="intention__actions">
            <button type="button" className="text-link intention__choose" onClick={() => setPicking(true)}>
              Choose from your list
            </button>
            <span className="intention__actions-right">
              <button type="button" className="button-quiet" onClick={() => { setPicking(false); setEditing(false); }}>
                Cancel
              </button>
              <button type="submit" className="button-accent">
                Save
              </button>
            </span>
          </div>
        </form>
      ) : (
        <button type="button" className={`intention${current ? '' : ' intention--empty'}`} onClick={edit}>
          <span className="intention__text">{current || 'An intention for today'}</span>
          <BookmarkIcon size={20} className="intention__mark" />
        </button>
      )}
      {!editing && isToday && items && <TodayThree date={date} items={items} embedded />}
    </section>
  );
}
