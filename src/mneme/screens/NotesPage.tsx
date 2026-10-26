import { useMemo, useState } from 'react';
import { syncNow, syncStatus } from '../../app/sync/syncController';
import { ChevronIcon, PlusIcon, SearchIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { collections, notes, notePreview, type Note } from '../app/state';

type Filter = 'all' | 'recent' | 'pinned' | 'linked';

function syncLabel(phase: ReturnType<typeof syncStatus.get>['phase']): string {
  if (phase === 'ready') return 'Synced across devices';
  if (phase === 'signed-out' || phase === 'needs-setup' || phase === 'locked') return 'Sync setup in Proairetos';
  return 'On this device';
}

export default function NotesPage({ nav }: { nav: MnemeNav }) {
  const allNotes = notes.use();
  const allCollections = collections.use();
  const sync = syncStatus.get();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNotes
      .filter((note) => !note.archived)
      .filter((note) => filter === 'all' || (filter === 'pinned' ? note.pinned : filter === 'linked' ? note.links.length > 0 : true))
      .filter((note) => !q || `${note.title} ${note.body}`.toLowerCase().includes(q))
      .sort((a, b) => (filter === 'recent' ? b.updatedAt.localeCompare(a.updatedAt) : Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)));
  }, [allNotes, filter, query]);
  const collectionName = (id?: string) => allCollections.find((item) => item.id === id)?.name;

  return (
    <main className="mneme-page mneme-notes">
      <div className="mneme-header-actions-source" data-header-actions aria-hidden="true"><button type="button" aria-label="New note" onClick={() => nav.go({ name: 'capture' })}><PlusIcon size={22} /></button></div>
      <div className="mneme-heading-row">
        <h1>Notes</h1>
        <button className="mneme-sync" type="button" onClick={() => void syncNow()} disabled={sync.syncing}>{sync.syncing ? 'Syncing…' : 'Sync'}</button>
      </div>
      <p className="mneme-sync-line"><span className={`mneme-sync-dot mneme-sync-dot--${sync.phase}`} />{syncLabel(sync.phase)}{sync.phase !== 'ready' && <a href="/?open=account">Set up</a>}</p>
      <label className="mneme-search"><SearchIcon size={22} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" /></label>
      <div className="mneme-filters" role="tablist" aria-label="Note filters">
        {(['all', 'recent', 'pinned', 'linked'] as Filter[]).map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      {visible.length === 0 ? (
        <section className="mneme-empty"><div className="mneme-empty__mark">✦</div><h2>{query || filter !== 'all' ? 'Nothing here yet' : 'Keep a thought close'}</h2><p>{query || filter !== 'all' ? 'Try another search or filter.' : 'Capture a note, then connect it to the parts of life it belongs with.'}</p><button type="button" className="mneme-primary" onClick={() => nav.go({ name: 'capture' })}>Write a note</button></section>
      ) : <div className="mneme-note-list">{visible.map((note) => <NoteCard key={note.id} note={note} collectionName={collectionName(note.collectionId)} onOpen={() => nav.go({ name: 'note', id: note.id })} />)}</div>}
    </main>
  );
}

function NoteCard({ note, collectionName, onOpen }: { note: Note; collectionName?: string; onOpen: () => void }) {
  return <button type="button" className="mneme-note-card" onClick={onOpen}>
    <span className="mneme-note-card__top"><span className="mneme-note-card__title">{note.title || 'Untitled note'}</span><ChevronIcon size={22} /></span>
    <span className="mneme-note-card__body">{notePreview(note.body) || 'No words added yet.'}</span>
    <span className="mneme-note-card__meta">{collectionName || 'Inbox'}{note.links.length ? ` · ${note.links.length} connection${note.links.length === 1 ? '' : 's'}` : ''}</span>
  </button>;
}
