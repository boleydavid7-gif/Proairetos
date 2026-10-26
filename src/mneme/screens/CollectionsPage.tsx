import { useMemo, useState } from 'react';
import { BoxIcon, ChevronIcon, PlusIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { collections, notes, notePreview, type Note, type NoteCollection } from '../app/state';

export default function CollectionsPage({ nav, id }: { nav: MnemeNav; id?: string }) {
  const allNotes = notes.use();
  const allCollections = collections.use();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  if (id) {
    const collection = allCollections.find((item) => item.id === id);
    return <CollectionDetail nav={nav} collection={collection} notes={allNotes.filter((note) => note.collectionId === id)} />;
  }
  const create = () => {
    const name = newName.trim();
    if (!name) return;
    collections.put({ id: `collection-${Date.now().toString(36)}`, name, createdAt: new Date().toISOString() });
    setNewName('');
    setCreating(false);
  };
  return <main className="mneme-page mneme-collections">
    <div className="mneme-header-actions-source" data-header-actions aria-hidden="true"><button type="button" aria-label="New note" onClick={() => nav.go({ name: 'capture' })}><PlusIcon size={22} /></button></div>
    <h1>Collections</h1>
    <div className="mneme-smart-list">
      <SmartCollection label="Inbox" count={allNotes.filter((note) => !note.collectionId && !note.archived).length} onClick={() => nav.swap({ name: 'notes' })} />
      <SmartCollection label="Pinned" count={allNotes.filter((note) => note.pinned && !note.archived).length} onClick={() => nav.swap({ name: 'notes' })} />
    </div>
    {creating ? <div className="mneme-create"><input className="field-input" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} placeholder="Collection name" /><button type="button" className="mneme-primary" onClick={create} disabled={!newName.trim()}>Create</button><button type="button" className="mneme-secondary" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button></div> : <button type="button" className="mneme-new-collection" onClick={() => setCreating(true)}><PlusIcon size={22} /> New collection</button>}
    {allCollections.length > 0 && <div className="mneme-collection-list">{allCollections.map((item) => <button type="button" className="mneme-collection-row" key={item.id} onClick={() => nav.go({ name: 'collection', id: item.id })}><span className="mneme-collection-row__icon"><BoxIcon size={22} /></span><span><strong>{item.name}</strong><small>{allNotes.filter((note) => note.collectionId === item.id).length} notes</small></span><ChevronIcon size={22} /></button>)}</div>}
  </main>;
}

function SmartCollection({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return <button type="button" className="mneme-smart-row" onClick={onClick}><span className="mneme-smart-row__icon"><BoxIcon size={22} /></span><span><strong>{label}</strong><small>{count} {count === 1 ? 'note' : 'notes'}</small></span><ChevronIcon size={22} /></button>;
}

function CollectionDetail({ nav, collection, notes: collectionNotes }: { nav: MnemeNav; collection?: NoteCollection; notes: Note[] }) {
  const sorted = useMemo(() => collectionNotes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [collectionNotes]);
  return <main className="mneme-page mneme-collections"><button type="button" className="mneme-back-source" data-back aria-hidden="true" onClick={nav.back}>Back</button><p className="mneme-kicker">Collection</p><h1>{collection?.name || 'Collection'}</h1>{sorted.length ? <div className="mneme-note-list">{sorted.map((note) => <button type="button" className="mneme-note-card" key={note.id} onClick={() => nav.go({ name: 'note', id: note.id })}><span className="mneme-note-card__top"><span className="mneme-note-card__title">{note.title || 'Untitled note'}</span><ChevronIcon size={22} /></span><span className="mneme-note-card__body">{notePreview(note.body) || 'No words added yet.'}</span></button>)}</div> : <section className="mneme-empty"><h2>No notes here yet</h2><p>Capture something and place it in this collection.</p><button type="button" className="mneme-primary" onClick={() => nav.go({ name: 'capture' })}>Write a note</button></section>}</main>;
}
