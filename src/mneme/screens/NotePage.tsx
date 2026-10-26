import { useMemo, useState } from 'react';
import { BackIcon, TrashIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { collections, notes } from '../app/state';

export default function NotePage({ nav, id }: { nav: MnemeNav; id: string }) {
  const note = notes.use().find((item) => item.id === id);
  const allCollections = collections.use();
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [collectionId, setCollectionId] = useState(note?.collectionId ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const save = () => {
    if (!note) return;
    notes.put({ ...note, title: title.trim(), body: body.trim(), collectionId: collectionId || undefined, pinned, updatedAt: new Date().toISOString() });
    nav.back();
  };
  const remove = () => { if (note) { notes.remove(note.id); nav.back(); } };
  const updated = useMemo(() => note ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '', [note]);
  if (!note) return <main className="mneme-page mneme-empty"><h1>Note not found</h1><button type="button" className="mneme-primary" onClick={nav.back}>Back to notes</button></main>;
  return <main className="mneme-page mneme-note-page"><div className="mneme-header-actions-source" data-header-actions aria-hidden="true"><button type="button" aria-label="Save note" onClick={save}>Save</button></div><button type="button" className="mneme-back" data-back onClick={nav.back}><BackIcon size={22} /> Notes</button><div className="mneme-note-editor"><p className="mneme-kicker">Edited {updated}</p><input className="mneme-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled note" aria-label="Note title" /><textarea className="mneme-body-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start writing…" aria-label="Note body" rows={13} /><div className="mneme-editor-tools"><label className="mneme-toggle"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /> <span>{pinned ? 'Pinned' : 'Pin note'}</span></label><label className="mneme-inline-field"><span>Collection</span><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Inbox</option>{allCollections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><button type="button" className="mneme-delete" onClick={remove}><TrashIcon size={22} /> Delete note</button></div></main>;
}
