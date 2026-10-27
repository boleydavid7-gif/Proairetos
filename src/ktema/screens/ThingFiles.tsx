import { useEffect, useMemo, useRef, useState } from 'react';
import { archiveName, downloadZip } from '../../app/family/downloadZip';
import { offerUndo, say } from '../../app/family/shell';
import { prepareFile } from '../../features/items/attachments/prepare';
import { newId } from '../app/state';
import { filesFor, importFiles, putFile, removeFile, type KtemaFile } from '../data/files';

const LIMIT = 10_000_000;

/** A thing's photos and files: add from the camera or files, open, remove with undo. On this device only. */
export default function ThingFiles({ thingId }: { thingId: string }) {
  const [files, setFiles] = useState<KtemaFile[]>([]);
  const [viewing, setViewing] = useState<KtemaFile>();
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  const reload = () => void filesFor(thingId).then((list) => setFiles(list.sort((a, b) => a.at.localeCompare(b.at))));
  useEffect(reload, [thingId]);
  const urls = useMemo(() => new Map(files.map((file) => [file.id, URL.createObjectURL(new Blob([file.data], { type: file.type }))])), [files]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);

  const add = async (chosen: FileList | null) => {
    for (const file of Array.from(chosen ?? [])) {
      if (file.size > LIMIT * 3) {
        say(`${file.name} is too large`);
        continue;
      }
      const ready = await prepareFile(file);
      if (ready.data.byteLength > LIMIT) {
        say(`${file.name} is too large`);
        continue;
      }
      await putFile({ id: newId(), thingId, name: ready.name, type: ready.type, data: ready.data, at: new Date().toISOString() });
    }
    reload();
  };

  const saveCopy = async () => {
    setSaving(true);
    try {
      downloadZip(`ktema-files-${new Date().toISOString().slice(0, 10)}`, [
        { path: 'manifest.json', data: JSON.stringify({ app: 'ktema', thingId, exportedAt: new Date().toISOString(), files: files.map(({ data: _data, ...info }) => info) }) },
        ...files.map((file) => ({ path: `files/${archiveName(file.name)}-${file.id}`, data: file.data })),
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h2 className="card__title card__title--small">Photos and files</h2>
      {files.length > 0 && (
        <ul className="ktema-files">
          {files.map((file) => (
            <li key={file.id}>
              {file.type.startsWith('image/') ? (
                <button type="button" className="ktema-files__thumb" onClick={() => setViewing(file)} aria-label={`Open ${file.name}`}>
                  <img src={urls.get(file.id)} alt="" />
                </button>
              ) : (
                <a className="ktema-files__doc" href={urls.get(file.id)} target="_blank" rel="noreferrer noopener">{file.name}</a>
              )}
              <button type="button" className="text-link" onClick={async () => {
                await removeFile(file.id);
                reload();
                offerUndo('Removed', () => void putFile(file).then(reload));
              }}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden onChange={(event) => { void add(event.target.files); event.target.value = ''; }} />
      <button type="button" className="button-quiet" onClick={() => input.current?.click()}>Add a receipt, photo or manual</button>
      {files.length > 0 && <button type="button" className="button-quiet" disabled={saving} onClick={() => void saveCopy()}>{saving ? 'Preparing…' : 'Save a copy of these files'}</button>}
      <input ref={restoreInput} type="file" accept=".zip,application/zip" hidden onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setRestoring(true);
        try {
          const count = await importFiles(file, thingId);
          say(count ? `${count} ${count === 1 ? 'file' : 'files'} restored` : 'No files were found in that archive');
          reload();
        } catch {
          say('Couldn’t open that archive');
        } finally {
          setRestoring(false);
        }
      }} />
      <button type="button" className="button-quiet" disabled={restoring} onClick={() => restoreInput.current?.click()}>{restoring ? 'Restoring…' : 'Restore a copy'}</button>
      {viewing && (
        <div className="ktema-viewer" role="dialog" aria-label={viewing.name} onClick={() => setViewing(undefined)}>
          <img src={urls.get(viewing.id)} alt={viewing.name} />
          <button type="button" className="button-quiet" onClick={() => setViewing(undefined)}>Close</button>
        </div>
      )}
    </section>
  );
}
