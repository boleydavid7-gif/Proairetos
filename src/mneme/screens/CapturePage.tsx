import { useState } from 'react';
import { BackIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { collections, newId, notes } from '../app/state';
import { MnemeBrand } from '../app/App';

export default function CapturePage({ nav }: { nav: MnemeNav }) {
  const allCollections = collections.use();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const save = () => {
    if (!title.trim() && !body.trim()) return;
    const now = new Date().toISOString();
    const id = newId();
    notes.put({ id, title: title.trim(), body: body.trim(), collectionId: collectionId || undefined, links: [], pinned: false, archived: false, createdAt: now, updatedAt: now });
    nav.go({ name: 'note', id });
  };
  return <main className="mneme-page mneme-capture"><header className="mneme-detail-header"><button type="button" className="mneme-back" onClick={nav.back}><BackIcon size={22} /> Back</button><MnemeBrand /><button type="button" className="mneme-cancel" onClick={nav.back}>Cancel</button></header><p className="mneme-kicker">Capture</p><h1>Write it down.</h1><p className="mneme-intro">You can organize and connect it later.</p><label className="mneme-field"><span>Title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A name for this note" /></label><label className="mneme-field"><span>Note</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start writing…" rows={9} /></label>{allCollections.length > 0 && <label className="mneme-field"><span>Collection <em>optional</em></span><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Inbox</option>{allCollections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<button type="button" className="mneme-primary mneme-primary--wide" onClick={save} disabled={!title.trim() && !body.trim()}>Save note</button></main>;
}
