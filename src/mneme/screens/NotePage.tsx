import { useMemo, useState } from 'react';
import { BackIcon, CloseIcon, TrashIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { APP_LINKS, collections, notes, type NoteLink } from '../app/state';

export default function NotePage({ nav, id }: { nav: MnemeNav; id: string }) {
  const note = notes.use().find((item) => item.id === id);
  const allCollections = collections.use();
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [collectionId, setCollectionId] = useState(note?.collectionId ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [links, setLinks] = useState<NoteLink[]>(note?.links ?? []);
  const [linkApp, setLinkApp] = useState<string>(APP_LINKS[0].id);
  const [linkLabel, setLinkLabel] = useState('');
  const addLink = () => {
    const label = linkLabel.trim() || APP_LINKS.find((app) => app.id === linkApp)?.label || linkApp;
    if (links.some((link) => link.app === linkApp && link.label === label)) return;
    setLinks((current) => [...current, { app: linkApp, label }]);
    setLinkLabel('');
  };
  const save = () => {
    if (!note) return;
    notes.put({ ...note, title: title.trim(), body: body.trim(), collectionId: collectionId || undefined, pinned, links, updatedAt: new Date().toISOString() });
    nav.back();
  };
  const remove = () => { if (note) { notes.remove(note.id); nav.back(); } };
  const updated = useMemo(() => note ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '', [note]);
  if (!note) return <main className="mneme-page mneme-empty"><h1>Note not found</h1><button type="button" className="mneme-primary" onClick={nav.back}>Back to notes</button></main>;
  return <main className="mneme-page mneme-note-page"><div className="mneme-header-actions-source" data-header-actions aria-hidden="true"><button type="button" aria-label="Save note" onClick={save}>Save</button></div><button type="button" className="mneme-back" data-back onClick={nav.back}><BackIcon size={22} /> Notes</button><div className="mneme-note-editor"><p className="mneme-kicker">Edited {updated}</p><input className="mneme-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled note" aria-label="Note title" /><textarea className="mneme-body-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start writing…" aria-label="Note body" rows={13} /><div className="mneme-editor-tools"><label className="mneme-toggle"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /> <span>{pinned ? 'Pinned' : 'Pin note'}</span></label><label className="mneme-inline-field"><span>Collection</span><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Inbox</option>{allCollections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><section className="mneme-connections"><h2>Connections</h2><p>Keep this note close to the parts of life it belongs with.</p>{links.length > 0 && <div className="mneme-link-list">{links.map((link, index) => <span className="mneme-link-chip" key={`${link.app}-${link.label}`}>{link.label}<button type="button" aria-label={`Remove ${link.label}`} onClick={() => setLinks((current) => current.filter((_, item) => item !== index))}><CloseIcon size={22} /></button></span>)}</div>}<div className="mneme-link-add"><select value={linkApp} onChange={(event) => setLinkApp(event.target.value)} aria-label="Connected app">{APP_LINKS.map((app) => <option key={app.id} value={app.id}>{app.label}</option>)}</select><input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="What is this connected to?" /><button type="button" className="mneme-secondary" onClick={addLink}>Add</button></div></section><button type="button" className="mneme-delete" onClick={remove}><TrashIcon size={22} /> Delete note</button></div></main>;
}
