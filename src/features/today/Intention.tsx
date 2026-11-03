import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, reflectionService } from '../../app/services';
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
    async () => {
      const intention = await reflectionService.intentionFor(date);
      return { body: intention?.body ?? '', valueIds: intention?.valueIds ?? [] };
    },
    [date],
  );
  const values = useServiceData(compassService.subscribe, () => compassService.values(), []) ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);
  const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);
  if (!loaded) return null;

  const current = loaded.body;
  const currentValueIds = loaded.valueIds;
  const selectedPrinciples = values
    .filter((value) => selectedValueIds.includes(value.id))
    .flatMap((value) => value.principles ?? []);
  const label = isToday ? 'Today’s intention' : 'Intention';

  function edit() {
    setDraft(current);
    setSelectedValueIds(currentValueIds);
    setEditing(true);
  }

  async function save() {
    await reflectionService.setIntention(date, draft, selectedValueIds);
    setPicking(false);
    setEditing(false);
    if (current && !draft.trim()) {
      offerUndo('Intention cleared', () => reflectionService.setIntention(date, current, currentValueIds));
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
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {values.length > 0 && (
            <div className="intention__value-picker">
              <span className="daily-line__label">Connect to a value (optional)</span>
              <div className="chip-row" role="group" aria-label="Values for this intention">
                {values.map((value) => {
                  const selected = selectedValueIds.includes(value.id);
                  return (
                    <button
                      key={value.id}
                      type="button"
                      className="chip chip--small"
                      aria-pressed={selected}
                      onClick={() => setSelectedValueIds((current) => selected
                        ? current.filter((id) => id !== value.id)
                        : [...current, value.id])}
                    >
                      {value.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selectedPrinciples.length > 0 && (
            <div className="intention__principles">
              <span className="daily-line__label">Draw on one of your principles</span>
              <div className="intention__principles-list">
                {selectedPrinciples.map((principle) => (
                  <button
                    key={principle}
                    type="button"
                    className="chip chip--small"
                    onClick={() => setDraft((current) => {
                      const lines = current.split('\n').map((line) => line.trim());
                      if (lines.includes(principle)) return current;
                      return current.trim() ? `${current.trim()}\n${principle}` : principle;
                    })}
                  >
                    {principle}
                  </button>
                ))}
              </div>
            </div>
          )}
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
      {!editing && currentValueIds.length > 0 && (
        <div className="intention__values" aria-label="Connected values">
          {values.filter((value) => currentValueIds.includes(value.id)).map((value) => (
            <span key={value.id} className="chip chip--small">{value.name}</span>
          ))}
        </div>
      )}
      {!editing && isToday && items && <TodayThree date={date} items={items} embedded />}
    </section>
  );
}
