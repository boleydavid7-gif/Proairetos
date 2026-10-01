import { useEffect, useRef, useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { StarIcon } from '../../components/icons/Icons';
import type { LifeItem, LifeItemStatus } from '../../core/life-items/types';
import { lifeItemTypeLabels, lifeItemTypes } from '../capture/labels';
import { formatDay, fromDateInput, fromDateTimeInput, toDateInput, toDateTimeInput } from './dateFields';
import { describeEvent } from './historyLabels';

type Props = {
  itemId: string;
  onClose: () => void;
};

const closeLabels: Partial<Record<LifeItemStatus, string>> = {
  DONE: 'Done',
  LET_GO: 'Let go',
};

function WaitingSection({ item }: { item: LifeItem }) {
  const [choosing, setChoosing] = useState(false);
  const [checkBack, setCheckBack] = useState('');

  if (item.status === 'WAITING') {
    return (
      <section className="sheet__section" aria-label="Waiting">
        <p className="sheet__label">Waiting</p>
        <label className="field-row">
          <span>Check back</span>
          <input
            type="date"
            className="field-input"
            value={toDateInput(item.checkBackAt)}
            onChange={(event) => lifeService.setCheckBack(item.id, fromDateInput(event.target.value))}
          />
        </label>
        <button type="button" className="chip" onClick={() => lifeService.setStatus(item.id, 'OPEN')}>
          No longer waiting
        </button>
      </section>
    );
  }

  if (item.status !== 'OPEN') return null;

  if (!choosing) {
    return (
      <button type="button" className="chip chip--wide" onClick={() => setChoosing(true)}>
        Waiting on someone or something
      </button>
    );
  }

  return (
    <section className="sheet__section" aria-label="Start waiting">
      <p className="sheet__label">Waiting</p>
      <label className="field-row">
        <span>Check back</span>
        <input
          type="date"
          className="field-input"
          value={checkBack}
          onChange={(event) => setCheckBack(event.target.value)}
        />
      </label>
      <p className="sheet__hint">A check-back date brings it back to Today. It is optional.</p>
      <div className="chip-row">
        <button
          type="button"
          className="chip chip--accent"
          onClick={() => lifeService.setStatus(item.id, 'WAITING', { checkBackAt: fromDateInput(checkBack) })}
        >
          Start waiting
        </button>
        <button type="button" className="button-quiet" onClick={() => setChoosing(false)}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function SheetBody({ item, onClose }: { item: LifeItem; onClose: () => void }) {
  const { offerUndo } = useOverlays();
  const history = useServiceData(lifeService.subscribe, () => lifeService.history(item.id), [item.id]) ?? [];
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [when, setWhen] = useState(toDateTimeInput(item.scheduledAt));
  const isActive = item.status === 'OPEN' || item.status === 'WAITING';

  async function close(status: 'DONE' | 'LET_GO') {
    const change = await lifeService.setStatus(item.id, status);
    onClose();
    offerUndo(`${closeLabels[status]}: ${item.title}`, change.undo);
  }

  return (
    <>
      <input
        className="sheet__title"
        aria-label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          if (title.trim() && title.trim() !== item.title) lifeService.edit(item.id, { title });
          else setTitle(item.title);
        }}
      />

      {!isActive && (
        <p className="sheet__status">
          {item.status === 'DONE' ? 'Done' : 'Let go'} · {formatDay(item.updatedAt)}
        </p>
      )}

      <div className="chip-row" role="group" aria-label="Type">
        {lifeItemTypes.map((type) => (
          <button
            key={type}
            type="button"
            className="chip"
            aria-pressed={item.type === type}
            onClick={() => lifeService.sort(item.id, item.type === type ? null : type)}
          >
            {lifeItemTypeLabels[type]}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="toggle-row"
        aria-pressed={item.important}
        onClick={() => lifeService.setImportant(item.id, !item.important)}
      >
        <StarIcon filled={item.important} size={20} />
        <span>{item.important ? 'Marked important' : 'Mark important'}</span>
      </button>

      <section className="sheet__section" aria-label="When">
        <p className="sheet__label">When</p>
        <div className="field-row">
          <input
            type="datetime-local"
            className="field-input"
            aria-label="Date and time"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            onBlur={() => {
              if (when !== toDateTimeInput(item.scheduledAt)) lifeService.schedule(item.id, fromDateTimeInput(when));
            }}
          />
          {item.scheduledAt && (
            <button
              type="button"
              className="button-quiet"
              onClick={() => {
                setWhen('');
                lifeService.schedule(item.id, undefined);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <WaitingSection item={item} />

      <section className="sheet__section" aria-label="Notes">
        <p className="sheet__label">Notes</p>
        <textarea
          className="field-input field-input--area"
          rows={3}
          aria-label="Notes"
          placeholder="Anything you want to keep with this"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => {
            if (notes !== (item.notes ?? '')) lifeService.edit(item.id, { notes });
          }}
        />
      </section>

      {history.length > 0 && (
        <details className="sheet__history">
          <summary>History</summary>
          <ol>
            {history.map((event) => (
              <li key={event.id}>
                <span>{describeEvent(event)}</span>
                <time dateTime={event.timestamp}>{formatDay(event.timestamp)}</time>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="sheet__footer">
        {isActive ? (
          <>
            <button type="button" className="button-quiet" onClick={() => close('LET_GO')}>
              Let go
            </button>
            <button type="button" className="button-accent" onClick={() => close('DONE')}>
              Done
            </button>
          </>
        ) : (
          <button type="button" className="button-accent" onClick={() => lifeService.setStatus(item.id, 'OPEN')}>
            Reopen
          </button>
        )}
      </div>
    </>
  );
}

export default function ItemSheet({ itemId, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const item = useServiceData(lifeService.subscribe, () => lifeService.get(itemId), [itemId]);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={item?.title ?? 'Item'}
      onClose={onClose}
      onClick={(event) => {
        // A tap on the backdrop (the dialog itself, outside the panel) closes it.
        if (event.target === dialog.current) dialog.current?.close();
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          Close
        </button>
        {item && <SheetBody key={item.id} item={item} onClose={() => dialog.current?.close()} />}
        {item === null && <p className="empty-note">This item is no longer here.</p>}
      </div>
    </dialog>
  );
}
