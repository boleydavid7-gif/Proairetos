import { useState } from 'react';
import { offerUndo, say } from '../../app/family/shell';
import { useLaunchedFile } from '../../app/family/launchFiles';
import { prepareFile } from '../../features/items/attachments/prepare';
import type { KtemaNav } from '../app/App';
import { newId, putThing, things } from '../app/state';
import { putFile, removeFile } from '../data/files';

const LIMIT = 10_000_000;

/** Photos or PDFs shared into Ktema from another app: kept with a thing chosen here, or with a new one. */
export default function SharedPage({ nav }: { nav: KtemaNav }) {
  const all = [...things.use()].sort((a, b) => a.name.localeCompare(b.name));
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useLaunchedFile((file) => file.type.startsWith('image/') || file.type === 'application/pdf', (file) => setFiles((now) => [...now, file]));

  const keepWith = async (thingId: string, label: string) => {
    setBusy(true);
    const kept: string[] = [];
    for (const file of files) {
      const ready = await prepareFile(file);
      if (ready.data.byteLength > LIMIT) {
        say(`${file.name} is too large`);
        continue;
      }
      const id = newId();
      await putFile({ id, thingId, name: ready.name, type: ready.type, data: ready.data, at: new Date().toISOString() });
      kept.push(id);
    }
    setBusy(false);
    if (kept.length) offerUndo(`Kept with ${label}`, () => kept.forEach((id) => void removeFile(id)));
    nav.swap({ name: 'thing', id: thingId });
  };

  return (
    <div className="page ktema-page">
      <div className="page-top">
        <button type="button" className="back-link" onClick={() => nav.swap({ name: 'things' })}>Cancel</button>
      </div>
      <h1 className="title">Add to a thing</h1>
      <p className="muted">{files.length === 0 ? 'Nothing was shared.' : files.map((file) => file.name).join(', ')}</p>
      {files.length > 0 && (
        <>
          <form
            className="add-line"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim() || busy) return;
              const thing = { id: newId(), name: name.trim(), category: 'Other' as const, createdAt: new Date().toISOString() };
              putThing(thing);
              void keepWith(thing.id, thing.name);
            }}
          >
            <input className="input" aria-label="A new thing" value={name} onChange={(event) => setName(event.target.value)} />
            <button type="submit" className="button-quiet" disabled={!name.trim() || busy}>Add</button>
          </form>
          {all.length > 0 && (
            <ul className="rows">
              {all.map((thing) => (
                <li key={thing.id}>
                  <button type="button" className="row row--plain" disabled={busy} onClick={() => void keepWith(thing.id, thing.name)}>
                    <span className="row__text">
                      <span>{thing.name}</span>
                      {thing.place && <span className="row__detail">{thing.place}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
