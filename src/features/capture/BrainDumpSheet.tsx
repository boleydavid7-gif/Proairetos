import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import MicButton from '../../components/dictation/MicButton';
import { useSheet } from '../../components/ui/useSheet';
import { readDump, type DumpKind, type DumpLine } from '../../core/capture/brainDump';
import type { CaptureKind, LifeItemType } from '../../core/life-items/types';
import { toLocalDate } from '../../core/scheduling/dates';
import { formatLocalDay } from '../schedule/format';

export const dumpKinds: readonly { id: DumpKind; label: string }[] = [
  { id: 'DO', label: 'To do' },
  { id: 'CONCERN', label: 'Concern' },
  { id: 'IDEA', label: 'Idea' },
  { id: 'FEELING', label: 'Feeling' },
  { id: 'NOTE', label: 'Note' },
];

/** How each kind is saved: the same type and capture tags the rest of the app already reads. */
export const savedAs: Record<DumpKind, { type: LifeItemType | null; captureKind?: CaptureKind }> = {
  DO: { type: 'DO' },
  CONCERN: { type: 'THINKING_ABOUT', captureKind: 'CONCERN' },
  IDEA: { type: 'THINKING_ABOUT', captureKind: 'IDEA' },
  FEELING: { type: null, captureKind: 'EMOTION' },
  NOTE: { type: null, captureKind: 'THOUGHT' },
};

type Row = DumpLine & { key: number };

/**
 * Empty your head: write or speak everything at once, then see it split into
 * separate items with a first guess at each. Nothing is saved until the
 * person says so, and every guess can be changed with one tap.
 */
export default function BrainDumpSheet({ onClose }: { onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = toLocalDate(new Date());

  const update = (key: number, changes: Partial<Row>) =>
    setRows((current) => current?.map((row) => (row.key === key ? { ...row, ...changes } : row)) ?? null);

  async function saveAll() {
    if (!rows) return;
    const keep = rows.filter((row) => row.text.trim());
    setSaving(true);
    setError('');
    const saved: string[] = [];
    try {
      for (const row of keep) {
        const { type, captureKind } = savedAs[row.kind];
        const item = await lifeService.capture(row.text, type, {
          ...(captureKind ? { captureKind } : {}),
          ...(row.plannedFor ? { plannedFor: row.plannedFor } : {}),
        });
        saved.push(item.id);
      }
      offerUndo(saved.length === 1 ? 'Saved 1 thing' : `Saved ${saved.length} things`, async () => {
        for (const id of saved) await lifeService.deleteItem(id);
      });
      close();
    } catch {
      setError(saved.length > 0 ? `Saved ${saved.length}; the rest is still here.` : 'Could not save just now.');
      setRows((current) => current?.slice(saved.length) ?? null);
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Empty your head"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          {rows ? 'Cancel' : 'Close'}
        </button>
        <p className="sheet__title sheet__title--static">Empty your head</p>

        {rows === null ? (
          <>
            <p className="sheet__hint">
              Everything at once, in any order. It will be split into separate things for you to check. Nothing is saved
              until you say so.
            </p>
            <div className="dump-box">
              <textarea
                className="field-input field-input--area dump-box__text"
                rows={8}
                aria-label="Everything on your mind"
                placeholder={'Call the garage, buy milk\nWorried about Friday\nMaybe a reading corner'}
                value={text}
                onChange={(event) => setText(event.target.value)}
                autoFocus
              />
              <MicButton onText={(spoken) => setText((current) => (current ? `${current}\n${spoken}` : spoken))} />
            </div>
            <div className="chip-row">
              <button
                type="button"
                className="chip chip--accent"
                disabled={!text.trim()}
                onClick={() => setRows(readDump(text, today).map((line, key) => ({ ...line, key })))}
              >
                Split it up
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="sheet__hint">A first guess at each. Tap to change it, or leave it.</p>
            {rows.length === 0 && <p className="empty-note">Nothing left.</p>}
            <ul className="dump-list">
              {rows.map((row) => (
                <li key={row.key} className="dump-row">
                  <div className="dump-row__top">
                    <input
                      className="field-input dump-row__text"
                      aria-label="What it is"
                      value={row.text}
                      onChange={(event) => update(row.key, { text: event.target.value })}
                    />
                    <button
                      type="button"
                      className="text-link dump-row__remove"
                      aria-label={`Leave out ${row.text}`}
                      onClick={() => setRows(rows.filter((other) => other.key !== row.key))}
                    >
                      Leave out
                    </button>
                  </div>
                  <div className="chip-row dump-row__kinds" role="group" aria-label={`Kind for ${row.text}`}>
                    {dumpKinds.map((kind) => (
                      <button
                        key={kind.id}
                        type="button"
                        className="chip chip--small"
                        aria-pressed={row.kind === kind.id}
                        onClick={() => update(row.key, { kind: kind.id })}
                      >
                        {kind.label}
                      </button>
                    ))}
                    {row.plannedFor && (
                      <button
                        type="button"
                        className="chip chip--small"
                        aria-pressed="true"
                        aria-label={`For ${formatLocalDay(row.plannedFor)}. Tap to remove the day`}
                        onClick={() => update(row.key, { plannedFor: undefined })}
                      >
                        {formatLocalDay(row.plannedFor, { weekday: 'short', month: 'short', day: 'numeric' })} ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {error && <p className="form-error">{error}</p>}
            <div className="chip-row">
              <button
                type="button"
                className="chip chip--accent"
                disabled={saving || !rows.some((row) => row.text.trim())}
                onClick={saveAll}
              >
                {rows.length === 1 ? 'Save it' : `Save all ${rows.length}`}
              </button>
              <button type="button" className="button-quiet" onClick={() => setRows(null)}>
                Back to writing
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
