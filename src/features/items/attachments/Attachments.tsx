import { useEffect, useMemo, useState } from 'react';
import { useServiceData } from '../../../app/hooks/useServiceData';
import { useOverlays } from '../../../app/overlays/OverlayContext';
import { attachmentService } from '../../../app/services';
import { NoteIcon, PlusIcon } from '../../../components/icons/Icons';
import { useSheet } from '../../../components/ui/useSheet';
import { isImage, sizeLabel, type Attachment } from '../../../core/attachments/types';
import { prepareFile } from './prepare';

/** A short-lived address for stored bytes, released when no longer shown. */
function useObjectUrl(attachment: Attachment | undefined): string | undefined {
  const url = useMemo(
    () => (attachment ? URL.createObjectURL(new Blob([attachment.data], { type: attachment.type })) : undefined),
    [attachment],
  );
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function Thumb({ attachment, onOpen }: { attachment: Attachment; onOpen: () => void }) {
  const url = useObjectUrl(isImage(attachment) ? attachment : undefined);
  return (
    <button type="button" className="attachment-thumb" aria-label={`Open ${attachment.name}`} onClick={onOpen}>
      {url ? (
        <img src={url} alt="" />
      ) : (
        <span className="attachment-thumb__file">
          <NoteIcon size={22} />
          <span>{attachment.name}</span>
        </span>
      )}
    </button>
  );
}

function Viewer({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const url = useObjectUrl(attachment);
  return (
    <dialog
      ref={dialog}
      className="sheet sheet--tall"
      aria-label={attachment.name}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel attachment-viewer">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        {isImage(attachment) && url ? (
          <img className="attachment-viewer__image" src={url} alt={attachment.name} />
        ) : (
          <p className="sheet__title sheet__title--static">{attachment.name}</p>
        )}
        <p className="sheet__hint">
          {attachment.name} · {sizeLabel(attachment.size)}
        </p>
        <div className="chip-row">
          {url && !isImage(attachment) && (
            <a className="chip" href={url} target="_blank" rel="noreferrer">
              Open
            </a>
          )}
          {url && (
            <a className="chip" href={url} download={attachment.name}>
              Save a copy
            </a>
          )}
          <button
            type="button"
            className="button-quiet"
            onClick={async () => {
              const removal = await attachmentService.remove(attachment.id);
              offerUndo(`Removed ${attachment.name}`, removal.undo);
              close();
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Photos and files kept with an item: a receipt, a letter, a screenshot.
 * They stay on this device and in backups; they are not synced.
 */
export default function Attachments({ itemId }: { itemId: string }) {
  const attachments = useServiceData(attachmentService.subscribe, () => attachmentService.forItem(itemId), [itemId]) ?? [];
  const [open, setOpen] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of Array.from(files)) await attachmentService.add(itemId, await prepareFile(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be kept.');
    } finally {
      setBusy(false);
    }
  }

  const picker = (
    <label className={attachments.length ? 'attachment-thumb attachment-thumb--add' : 'text-link attachment-add'}>
      {attachments.length ? <PlusIcon size={22} /> : busy ? 'Adding…' : 'Add a photo or file'}
      {attachments.length > 0 && <span className="visually-hidden">Add a photo or file</span>}
      <input
        type="file"
        multiple
        className="visually-hidden"
        onChange={(event) => {
          void add(event.target.files);
          event.target.value = '';
        }}
      />
    </label>
  );

  return (
    <section className="sheet__section" aria-label="Photos and files">
      {attachments.length > 0 && <p className="sheet__label">Photos and files</p>}
      {attachments.length > 0 ? (
        <div className="attachment-grid">
          {attachments.map((attachment) => (
            <Thumb key={attachment.id} attachment={attachment} onOpen={() => setOpen(attachment)} />
          ))}
          {picker}
        </div>
      ) : (
        picker
      )}
      {error && <p className="form-error">{error}</p>}
      {open && <Viewer attachment={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
