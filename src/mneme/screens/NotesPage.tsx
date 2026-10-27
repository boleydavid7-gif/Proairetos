import { useMemo, useState, useSyncExternalStore } from 'react';
import { syncNow, syncStatus } from '../../app/sync/syncController';
import { ChevronIcon, PlusIcon, SearchIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { collections, notes, notePreview, type IdeaStage, type Note } from '../app/state';

type Filter = 'all' | 'recent' | 'pinned' | 'ideas';
type StageFilter = IdeaStage | 'all';

const ideaStages: { id: IdeaStage; label: string; hint: string }[] = [
  { id: 'spark', label: 'Sparks', hint: 'Raw thoughts' },
  { id: 'shape', label: 'Shape', hint: 'Worth exploring' },
  { id: 'next', label: 'Next', hint: 'Ready to act' },
  { id: 'parked', label: 'Parked', hint: 'Keep for later' },
];

function syncLabel(phase: ReturnType<typeof syncStatus.get>['phase']): string {
  if (phase === 'ready') return 'Synced across devices';
  if (phase === 'signed-out' || phase === 'needs-setup' || phase === 'locked') return 'Sync setup in Proairetos';
  return 'On this device';
}

export default function NotesPage({ nav }: { nav: MnemeNav }) {
  const allNotes = notes.use();
  const allCollections = collections.use();
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNotes
      .filter((note) => !note.archived)
      .filter((note) => filter !== 'ideas' || note.kind === 'idea')
      .filter((note) => filter !== 'pinned' || note.pinned)
      .filter((note) => filter !== 'ideas' || stageFilter === 'all' || (note.ideaStage || 'spark') === stageFilter)
      .filter((note) => !q || `${note.title} ${note.body}`.toLowerCase().includes(q))
      .sort((a, b) => (filter === 'recent' ? b.updatedAt.localeCompare(a.updatedAt) : filter === 'ideas' ? (ideaStages.findIndex((stage) => stage.id === (a.ideaStage || 'spark')) - ideaStages.findIndex((stage) => stage.id === (b.ideaStage || 'spark'))) || b.updatedAt.localeCompare(a.updatedAt) : Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)));
  }, [allNotes, filter, query, stageFilter]);
  const collectionName = (id?: string) => allCollections.find((item) => item.id === id)?.name;
  const ideaCount = allNotes.filter((note) => note.kind === 'idea' && !note.archived).length;
  const moveIdea = (note: Note, ideaStage: IdeaStage) => notes.put({ ...note, kind: 'idea', ideaStage, updatedAt: new Date().toISOString() });

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
        {(['all', 'recent', 'pinned', 'ideas'] as Filter[]).map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => { setFilter(item); if (item !== 'ideas') setStageFilter('all'); }}>{item === 'ideas' ? `Ideas${ideaCount ? ` · ${ideaCount}` : ''}` : item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      <div className="mneme-quick-actions"><button type="button" className="mneme-idea-action" onClick={() => nav.go({ name: 'capture', mode: 'idea' })}><span className="mneme-idea-action__mark">✦</span><span><strong>Idea dump</strong><small>Empty your head. Sort it later.</small></span><ChevronIcon size={20} /></button></div>
      {filter === 'ideas' && <section className="mneme-idea-desk" aria-label="Idea desk"><div className="mneme-idea-desk__heading"><span><strong>Idea desk</strong><small>Move each thought when it earns a place.</small></span><span className="mneme-idea-desk__count">{ideaCount}</span></div><div className="mneme-idea-stages"><button type="button" aria-selected={stageFilter === 'all'} onClick={() => setStageFilter('all')}>All</button>{ideaStages.map((stage) => <button type="button" key={stage.id} aria-selected={stageFilter === stage.id} onClick={() => setStageFilter(stage.id)}>{stage.label}<small>{allNotes.filter((note) => note.kind === 'idea' && !note.archived && (note.ideaStage || 'spark') === stage.id).length}</small></button>)}</div></section>}
      {visible.length === 0 ? (
        <section className="mneme-empty"><div className="mneme-empty__mark">✦</div><h2>{query || filter !== 'all' ? 'Nothing here yet' : 'Keep a thought close'}</h2><p>{query || filter !== 'all' ? 'Try another search or filter.' : 'Capture a note, then give it a collection when it earns one.'}</p><button type="button" className="mneme-primary" onClick={() => nav.go({ name: 'capture' })}>Write a note</button></section>
      ) : <div className="mneme-note-list">{visible.map((note) => <NoteCard key={note.id} note={note} collectionName={collectionName(note.collectionId)} onOpen={() => nav.go({ name: 'note', id: note.id })} onStageChange={note.kind === 'idea' ? (stage) => moveIdea(note, stage) : undefined} />)}</div>}
    </main>
  );
}

function NoteCard({ note, collectionName, onOpen, onStageChange }: { note: Note; collectionName?: string; onOpen: () => void; onStageChange?: (stage: IdeaStage) => void }) {
  const stage = note.ideaStage || 'spark';
  return <article className={`mneme-note-card${note.kind === 'idea' ? ' mneme-note-card--idea' : ''}`}>
    <button type="button" className="mneme-note-card__open" onClick={onOpen}>
      <span className="mneme-note-card__top"><span className="mneme-note-card__title">{note.title || (note.kind === 'idea' ? 'Untitled idea' : 'Untitled note')}</span><ChevronIcon size={22} /></span>
      <span className="mneme-note-card__body">{notePreview(note.body) || 'No words added yet.'}</span>
      <span className="mneme-note-card__meta">{collectionName || 'Inbox'}</span>
    </button>
    {onStageChange && <label className="mneme-idea-stage"><span>Stage</span><select value={stage} onChange={(event) => onStageChange(event.target.value as IdeaStage)} aria-label="Idea stage">{ideaStages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
  </article>;
}
