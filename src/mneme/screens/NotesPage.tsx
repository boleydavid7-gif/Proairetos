import { useMemo, useState } from 'react';
import { ChevronIcon, PlusIcon, SearchIcon } from '../../app/family/icons';
import type { MnemeNav, NoteFilter } from '../app/App';
import { collections, notes, notePreview, type Note } from '../app/state';
import { newId } from '../app/state';
import FileDropZone from '../../components/files/FileDropZone';

type Filter = NoteFilter;

const FILTERS: { id: Filter; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'recent', label: 'Recent' }, { id: 'pinned', label: 'Pinned' }, { id: 'inbox', label: 'Inbox' }];

/** A note's name: its title, else its first line. */
function nameOf(note: Note): { title: string; rest: string } {
  const title = note.title.trim();
  if (title) return { title, rest: notePreview(note.body) };
  const [first = '', ...more] = note.body.trim().split(/\n/);
  return { title: first.trim() || 'Empty note', rest: notePreview(more.join(' ')) };
}
export default function NotesPage({ nav, initial }: { nav: MnemeNav; initial?: Filter }) {
  const allNotes = notes.use();
  const allCollections = collections.use();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(initial ?? 'all');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNotes
      .filter((note) => !note.archived && note.kind !== 'idea')
      .filter((note) => filter !== 'pinned' || note.pinned)
      .filter((note) => filter !== 'inbox' || !note.collectionId)
      .filter((note) => !q || `${note.title} ${note.body}`.toLowerCase().includes(q))
      .sort((a, b) => (filter === 'recent' ? b.updatedAt.localeCompare(a.updatedAt) : Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)));
  }, [allNotes, filter, query]);
  const collectionName = (id?: string) => allCollections.find((item) => item.id === id)?.name;
  const importFiles = async (files: File[]) => {
    const textFiles = files.filter((file) => /\.(md|markdown|txt)$/i.test(file.name) || file.type === 'text/plain' || file.type === 'text/markdown');
    if (!textFiles.length) return;
    const now = new Date().toISOString();
    const imported: string[] = [];
    for (const file of textFiles) {
      const id = newId();
      notes.put({ id, title: file.name.replace(/\.(markdown|md|txt)$/i, '') || 'Imported note', body: await file.text(), pinned: false, archived: false, kind: 'note', source: 'file', createdAt: now, updatedAt: now });
      imported.push(id);
    }
    if (imported[0]) nav.go({ name: 'note', id: imported[0] });
  };

  return (
    <FileDropZone label="Drop text files to import" onFiles={(files) => void importFiles(files)}>
    <main className="mneme-page mneme-notes">
      <div className="mneme-heading-row"><h1>Notes</h1><button type="button" className="button-main" onClick={() => nav.go({ name: 'capture' })}><PlusIcon size={18} />Add</button></div>
      <label className="mneme-search"><SearchIcon size={22} /><input aria-label="Search notes" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="mneme-filters" role="tablist" aria-label="Note filters">
        {FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
      </div>
      {visible.length === 0 ? (
        <section className="mneme-empty"><button type="button" className="mneme-primary" onClick={() => nav.go({ name: 'capture' })}>Write a note</button></section>
      ) : <ul className="rows mneme-rows">{visible.map((note) => <NoteRow key={note.id} note={note} collectionName={collectionName(note.collectionId)} onOpen={() => nav.go({ name: 'note', id: note.id })} />)}</ul>}
    </main>
    </FileDropZone>
  );
}

function NoteRow({ note, collectionName, onOpen }: { note: Note; collectionName?: string; onOpen: () => void }) {
  const { title, rest } = nameOf(note);
  const when = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <li>
      <button type="button" className="row mneme-row" onClick={onOpen}>
        <span className="row__text">
          <span>{title}</span>
          <span className="row__detail mneme-row__detail">{[when, rest].filter(Boolean).join(' · ')}</span>
        </span>
        {collectionName && <span className="muted mneme-row__where">{collectionName}</span>}
        <ChevronIcon size={18} />
      </button>
    </li>
  );
}
