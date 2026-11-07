import { useMemo, useState } from 'react';
import { BoxIcon, ChevronIcon, PlusIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { offerUndo } from '../../app/family/shell';
import { collections, notes, notePreview, type Note, type NoteCollection } from '../app/state';

const countText = (count: number) => `${count} ${count === 1 ? 'note' : 'notes'}`;

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
    <div className="mneme-heading-row"><h1>Collections</h1><button type="button" className="button-main" onClick={() => nav.go({ name: 'capture' })}><PlusIcon size={18} />Add</button></div>
    <div className="mneme-smart-list">
      <SmartCollection label="Inbox" count={allNotes.filter((note) => !note.collectionId && !note.archived).length} onClick={() => nav.swap({ name: 'notes', filter: 'inbox' })} />
      <SmartCollection label="Pinned" count={allNotes.filter((note) => note.pinned && !note.archived).length} onClick={() => nav.swap({ name: 'notes', filter: 'pinned' })} />
    </div>
    {creating ? <div className="mneme-create"><input className="field-input" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} aria-label="Collection name" /><button type="button" className="mneme-primary" onClick={create} disabled={!newName.trim()}>Create</button><button type="button" className="mneme-secondary" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button></div> : <button type="button" className="mneme-new-collection" onClick={() => setCreating(true)}><PlusIcon size={22} /> New collection</button>}
    {allCollections.length > 0 && <div className="mneme-collection-list">{allCollections.map((item) => <button type="button" className="mneme-collection-row" key={item.id} onClick={() => nav.go({ name: 'collection', id: item.id })}><span className="mneme-collection-row__icon"><BoxIcon size={22} /></span><span><strong>{item.name}</strong><small>{countText(allNotes.filter((note) => note.collectionId === item.id).length)}</small></span><ChevronIcon size={22} /></button>)}</div>}
  </main>;
}

function SmartCollection({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return <button type="button" className="mneme-smart-row" onClick={onClick}><span className="mneme-smart-row__icon"><BoxIcon size={22} /></span><span><strong>{label}</strong><small>{countText(count)}</small></span><ChevronIcon size={22} /></button>;
}

function CollectionDetail({ nav, collection, notes: collectionNotes }: { nav: MnemeNav; collection?: NoteCollection; notes: Note[] }) {
  const sorted = useMemo(() => collectionNotes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [collectionNotes]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(collection?.name ?? '');
  const rename = () => {
    const next = name.trim();
    if (!collection || !next) return;
    const before = collection;
    collections.put({ ...collection, name: next });
    offerUndo(`Renamed to “${next}”`, () => collections.put(before));
    setRenaming(false);
  };
  const remove = () => {
    if (!collection) return;
    const before = collection;
    const held = collectionNotes;
    held.forEach((note) => notes.put({ ...note, collectionId: undefined }));
    collections.remove(collection.id);
    offerUndo(`“${before.name}” deleted`, () => {
      collections.put(before);
      held.forEach((note) => notes.put(note));
    });
    nav.back();
  };
  return <main className="mneme-page mneme-collections"><button type="button" className="mneme-back-source" data-back aria-hidden="true" onClick={nav.back}>Back</button><p className="mneme-kicker">Collection</p>{renaming ? <div className="mneme-create"><input className="field-input" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && rename()} aria-label="Collection name" /><button type="button" className="mneme-primary" onClick={rename} disabled={!name.trim()}>Save</button><button type="button" className="mneme-secondary" onClick={() => { setRenaming(false); setName(collection?.name ?? ''); }}>Cancel</button></div> : <h1>{collection?.name || 'Collection'}</h1>}{sorted.length ? <div className="mneme-note-list">{sorted.map((note) => <NoteCard key={note.id} note={note} onOpen={() => nav.go({ name: 'note', id: note.id })} />)}</div> : <section className="mneme-empty"><h2>No notes here yet</h2><button type="button" className="mneme-primary" onClick={() => nav.go({ name: 'capture' })}>Write a note</button></section>}{collection && !renaming && <div className="button-row mneme-collection-actions"><button type="button" className="text-link" onClick={() => setRenaming(true)}>Rename</button><button type="button" className="text-link" onClick={remove}>Delete collection</button></div>}</main>;
}

function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return <article className="mneme-note-card">
    <button type="button" className="mneme-note-card__open" onClick={onOpen}>
      <span className="mneme-note-card__top"><span className="mneme-note-card__title">{note.title || (note.kind === 'idea' ? 'Untitled idea' : 'Untitled note')}</span><ChevronIcon size={22} /></span>
      <span className="mneme-note-card__body">{notePreview(note.body) || 'No words added yet.'}</span>
      <span className="mneme-note-card__meta">{note.kind === 'idea' ? 'Idea' : 'Note'}</span>
    </button>
  </article>;
}
