import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import { itemKinds, type ItemKind } from '../../core/life-items/kinds';

/** Something shared from another app, ready to keep in Capture. Nothing is saved until the person says so. */
export default function SharedSheet({ text, onClose }: { text: string; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const [value, setValue] = useState(text);
  const [kind, setKind] = useState<ItemKind | undefined>();

  async function keep() {
    const [first, ...rest] = value.trim().split('\n');
    const item = await lifeService.add(first, kind);
    if (rest.length) await lifeService.edit(item.id, { notes: rest.join('\n') });
    offerUndo(`Captured: ${item.title}`, async () => {
      await lifeService.deleteItem(item.id);
    });
    close();
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Shared to Proairetos"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Cancel
        </button>
        <p className="sheet__title sheet__title--static">Capture this</p>
        <textarea
          className="field-input field-input--area"
          rows={5}
          aria-label="What was shared"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="sheet__hint">The first line becomes the title; the rest is kept as a note.</p>
        <div className="chip-row" role="group" aria-label="Kind (optional)">
          {itemKinds.map((option) => (
            <button
              key={option.id}
              type="button"
              className="chip chip--small"
              aria-pressed={kind === option.id}
              onClick={() => setKind(kind === option.id ? undefined : option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className="button-accent" disabled={!value.trim()} onClick={keep}>
          Capture
        </button>
      </div>
    </dialog>
  );
}
