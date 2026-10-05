import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { startSync, syncStatus, type SyncStatus } from '../app/sync/syncController';
import { displayName } from '../data/storage/preferences';
import TheoriaMark from '../components/brand/TheoriaMark';
import { addBook, listBooks, putBook, startStore, storeVersion, subscribe } from './data/store';
import { featuredBooks, newId, type TheoriaBook, type TheoriaProvider, type TheoriaSource } from './core/books';

type View = 'library' | 'notes' | 'quotes' | 'connections';
type InsightKind = 'highlight' | 'note';

const nav: readonly { id: View; label: string; glyph: string }[] = [
  { id: 'library', label: 'Library', glyph: '▤' },
  { id: 'notes', label: 'Notes', glyph: '≡' },
  { id: 'quotes', label: 'Quotes', glyph: '“' },
  { id: 'connections', label: 'Connections', glyph: '⌘' },
];

const insightExamples = [
  { quote: 'Discipline is a form of freedom.', source: 'Marcus Aurelius · Meditations', color: 'violet' },
  { quote: 'We suffer more often in imagination than in reality.', source: 'Seneca · Letters from a Stoic', color: 'brass' },
  { quote: 'A calm mind is the highest form of strength.', source: 'Theoria notebook', color: 'lavender' },
];

const dailyQuotes = [
  { quote: 'The happiness of your life depends upon the quality of your thoughts.', source: 'Marcus Aurelius · Meditations' },
  { quote: 'You yourself must strive. The Buddhas only point the way.', source: 'Dhammapada · 276' },
  { quote: 'The roots of education are bitter, but the fruit is sweet.', source: 'Aristotle · Nicomachean Ethics' },
  { quote: 'What we learn with pleasure we never forget.', source: 'Alfred Mercier' },
  { quote: 'The mind is everything. What you think you become.', source: 'Dhammapada · 1' },
];

function dailyQuote(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return dailyQuotes[Math.abs(day) % dailyQuotes.length];
}

function useBooks(): TheoriaBook[] | undefined {
  const version = useSyncExternalStore(subscribe, storeVersion);
  const [books, setBooks] = useState<TheoriaBook[]>();
  useEffect(() => {
    let active = true;
    void listBooks().then((next) => active && setBooks(next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
    return () => { active = false; };
  }, [version]);
  return books;
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${hello}, ${name}.` : `${hello}.`;
}

export default function TheoriaApp() {
  const [view, setView] = useState<View>('library');
  const [name] = useState(displayName);
  const [addOpen, setAddOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState('');
  const [sync, setSync] = useState<SyncStatus>(syncStatus.get());
  const books = useBooks();

  useEffect(() => {
    void startStore();
    void startSync();
    return syncStatus.subscribe(() => setSync(syncStatus.get()));
  }, []);

  const shelf = books ?? [];
  const displayShelf = shelf.length ? shelf : featuredBooks;
  const selected = shelf.find((book) => book.id === selectedId) ?? shelf.find((book) => book.status === 'reading') ?? shelf[0] ?? featuredBooks[0];
  const highlights = useMemo(() => shelf.flatMap((book) => book.highlights.map((highlight) => ({ ...highlight, book }))), [shelf]);
  const notes = useMemo(() => shelf.flatMap((book) => book.notes.map((note) => ({ ...note, book }))), [shelf]);

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const openBook = (book: TheoriaBook) => {
    setSelectedId(book.id);
    if (book.sourceUrl) window.open(book.sourceUrl, '_blank', 'noopener,noreferrer');
    else toast(book.fileName ? 'Add a cloud or web link to open this reading.' : 'Add a source link to open this reading.');
  };

  const saveBook = async (input: NewBookForm) => {
    const book = await addBook({
      title: input.title,
      author: input.author,
      source: input.source,
      provider: input.provider,
      sourceUrl: input.sourceUrl,
      fileName: input.fileName,
      status: input.source === 'cloud' || input.source === 'web' ? 'reading' : 'unread',
    });
    setSelectedId(book.id);
    setAddOpen(false);
    toast(`${book.title} added to your shelf.`);
  };

  const saveInsight = async (bookId: string, kind: InsightKind, text: string, location?: string) => {
    const book = shelf.find((item) => item.id === bookId);
    if (!book) return;
    const now = new Date().toISOString();
    const updated = kind === 'highlight'
      ? { ...book, highlights: [...book.highlights, { id: newId(), text, location: location || undefined, createdAt: now }], updatedAt: now }
      : { ...book, notes: [...book.notes, { id: newId(), body: text, createdAt: now }], updatedAt: now };
    await putBook(updated);
    setCaptureOpen(false);
    toast(kind === 'highlight' ? 'Highlight saved.' : 'Note saved.');
  };

  return (
    <div className="theoria-app">
      <aside className="theoria-sidebar">
        <a href="/" className="theoria-family-link">PROAIRETOS <small>family</small></a>
        <div className="theoria-brand"><TheoriaMark size={48} /><span><strong>THEORIA</strong><small>Read. Notice. Connect.</small></span></div>
        <p className="theoria-sidebar-label">Your library</p>
        <TheoriaNav view={view} onView={setView} />
        <div className="theoria-sidebar-spacer" />
        <div className="theoria-sidebar-note"><span>✦</span><span><strong>Read slowly.</strong><small>Keep what changes the way you see.</small></span></div>
        <div className="theoria-person"><span>{(name || 'T').slice(0, 1).toUpperCase()}</span>{name || 'Your library'}</div>
      </aside>

      <main className="theoria-main">
        <header className="theoria-topbar"><a className="theoria-mobile-brand" href="/"><TheoriaMark size={30} /><span>THEORIA</span></a><span className="theoria-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><span className={`theoria-sync theoria-sync--${sync.phase}`}><i />{sync.phase === 'ready' ? 'Synced' : sync.phase === 'signed-out' ? 'On this device' : 'Preparing'}</span></header>
        <div className="theoria-page">
          {view === 'library' && <LibraryView name={name} shelf={displayShelf} realShelf={shelf} selected={selected} onAdd={() => setAddOpen(true)} onOpen={openBook} onSelect={setSelectedId} onNotes={() => setView('notes')} onCapture={() => shelf.length ? setCaptureOpen(true) : setAddOpen(true)} />}
          {view === 'notes' && <NotesView notes={notes} shelf={shelf} onAdd={() => setAddOpen(true)} />}
          {view === 'quotes' && <QuotesView highlights={highlights} shelf={shelf} onAdd={() => setAddOpen(true)} />}
          {view === 'connections' && <ConnectionsView shelf={shelf} onAdd={() => setAddOpen(true)} />}
        </div>
      </main>

      <nav className="theoria-bottom-nav"><TheoriaNav view={view} onView={setView} /></nav>
      {addOpen && <AddBookDialog onClose={() => setAddOpen(false)} onSave={saveBook} />}
      {captureOpen && <InsightDialog shelf={shelf} onClose={() => setCaptureOpen(false)} onSave={saveInsight} />}
      {notice && <div className="theoria-toast" role="status">{notice}</div>}
    </div>
  );
}

function TheoriaNav({ view, onView }: { view: View; onView: (view: View) => void }) {
  return <div className="theoria-nav-list">{nav.map((item) => <button type="button" key={item.id} className={view === item.id ? 'is-active' : ''} onClick={() => onView(item.id)}><span>{item.glyph}</span><small>{item.label}</small></button>)}</div>;
}

function Cover({ book, index = 0 }: { book: TheoriaBook; index?: number }) {
  return book.coverUrl ? <img className="theoria-cover" src={book.coverUrl} alt={`${book.title} cover`} /> : <div className={`theoria-cover theoria-cover--${index % 4}`}><span>{book.title}</span><small>{book.author ?? 'Theoria edition'}</small></div>;
}

function LibraryView({ name, shelf, realShelf, selected, onAdd, onOpen, onSelect, onNotes, onCapture }: { name: string; shelf: readonly TheoriaBook[]; realShelf: readonly TheoriaBook[]; selected: TheoriaBook; onAdd: () => void; onOpen: (book: TheoriaBook) => void; onSelect: (id: string) => void; onNotes: () => void; onCapture: () => void }) {
  const isFeatured = selected.userId === 'featured';
  const quote = dailyQuote();
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Library</p><h1>{greeting(name)}</h1><p>Read with attention. Keep the ideas that stay with you.</p></div><button type="button" className="theoria-add-button" onClick={onAdd}>＋ Add to shelf</button></div>
    <div className="theoria-library-grid"><article className="theoria-card theoria-continue"><div className="theoria-card-kicker">{isFeatured ? 'A place to begin' : 'Continue reading'} <span>↗</span></div><div className="theoria-continue-body"><div><h2>{selected.title}</h2><p className="theoria-author">{selected.author}</p><div className="theoria-progress"><span style={{ width: `${selected.progress}%` }} /></div><small>{selected.progress}% read</small><button type="button" className="theoria-primary-button" onClick={() => isFeatured ? onAdd() : onOpen(selected)}>{isFeatured ? 'Add to shelf' : 'Continue reading'} <span>→</span></button></div><Cover book={selected} index={0} /></div></article>
      <article className="theoria-card theoria-shelf-card"><div className="theoria-card-title"><div><p className="theoria-eyebrow">Your shelf</p><h2>{realShelf.length ? `${realShelf.length} ${realShelf.length === 1 ? 'source' : 'sources'}` : 'Make it yours'}</h2></div><button type="button" onClick={onAdd}>See all →</button></div><div className="theoria-shelf-grid">{shelf.slice(0, 4).map((book, index) => <button type="button" className={`theoria-shelf-item${book.id === selected.id ? ' is-selected' : ''}`} key={book.id} onClick={() => realShelf.includes(book) ? (onSelect(book.id), onOpen(book)) : onAdd()}><Cover book={book} index={index} /><strong>{book.title}</strong><small>{book.author}</small><span><i style={{ width: `${book.progress}%` }} /></span></button>)}</div></article></div>
    <article className="theoria-daily-quote"><div><p className="theoria-eyebrow">Today’s passage</p><span className="theoria-daily-quote-mark">“</span></div><div><p>{quote.quote}</p><small>{quote.source}</small></div><span className="theoria-daily-quote-date">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date())}</span></article>
    <div className="theoria-section-heading"><div><p className="theoria-eyebrow">Recent insights</p><h2>What stayed with you.</h2></div><div className="theoria-section-actions"><button type="button" onClick={onCapture}>＋ Capture</button><button type="button" onClick={onNotes}>See all →</button></div></div><div className="theoria-insight-grid">{insightExamples.map((item) => <article className={`theoria-insight theoria-insight--${item.color}`} key={item.quote}><span>“</span><div><p>{item.quote}</p><small>{item.source}</small></div><button type="button" aria-label="Open insight">…</button></article>)}</div>
  </section>;
}

function NotesView({ notes, shelf, onAdd }: { notes: { body: string; book: TheoriaBook }[]; shelf: TheoriaBook[]; onAdd: () => void }) {
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Notes</p><h1>Leave a margin.</h1><p>Your thoughts beside the passages that prompted them.</p></div><button type="button" className="theoria-add-button" onClick={onAdd}>＋ Add a source</button></div><div className="theoria-notes-list">{notes.length ? notes.map((note) => <article className="theoria-note-card" key={`${note.book.id}-${note.body}`}><span>✎</span><div><p>{note.body}</p><small>{note.book.title} · {note.book.author}</small></div><button type="button">…</button></article>) : <article className="theoria-empty-card"><TheoriaMark size={42} /><h2>Your notes will live here.</h2><p>Add a book or cloud link, then keep a thought beside what you read.</p><button type="button" className="theoria-primary-button" onClick={onAdd}>Add to shelf →</button></article>}</div><div className="theoria-notes-foot">{shelf.length ? `${shelf.length} sources in your library` : 'Your library is ready for its first source.'}</div></section>;
}

function QuotesView({ highlights, shelf, onAdd }: { highlights: { text: string; location?: string; book: TheoriaBook }[]; shelf: TheoriaBook[]; onAdd: () => void }) {
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Quotes</p><h1>Keep the line.</h1><p>A small collection of words worth returning to.</p></div><button type="button" className="theoria-add-button" onClick={onAdd}>＋ Add a source</button></div><div className="theoria-quote-list">{highlights.length ? highlights.map((item) => <article className="theoria-quote-card" key={`${item.book.id}-${item.text}`}><p>“{item.text}”</p><small>{item.book.author ?? item.book.title}{item.location ? ` · ${item.location}` : ''}</small><button type="button">Link idea ↗</button></article>) : <article className="theoria-empty-card"><span className="theoria-big-quote">“</span><h2>Quotes worth keeping.</h2><p>Highlights from your books will gather here, ready to revisit.</p><button type="button" className="theoria-primary-button" onClick={onAdd}>Add a source →</button></article>}</div>{shelf.length === 0 && <p className="theoria-muted-line">Start with a book, article, or cloud link.</p>}</section>;
}

function ConnectionsView({ shelf, onAdd }: { shelf: TheoriaBook[]; onAdd: () => void }) {
  const names = shelf.length ? shelf.slice(0, 4) : featuredBooks;
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Connections</p><h1>Ideas in relation.</h1><p>See the threads running between what you read.</p></div><button type="button" className="theoria-add-button" onClick={onAdd}>＋ Add a source</button></div><article className="theoria-card theoria-connections"><div className="theoria-orbit theoria-orbit--one"><span>Discipline</span><small>{names[0]?.title}</small></div><div className="theoria-orbit theoria-orbit--two"><span>Self-knowledge</span><small>{names[1]?.title}</small></div><div className="theoria-orbit theoria-orbit--three"><span>Nature</span><small>{names[2]?.title}</small></div><div className="theoria-orbit theoria-orbit--four"><span>Reason</span><small>{names[3]?.title}</small></div><div className="theoria-connection-core">Inner<br />freedom</div><div className="theoria-connection-lines" /><button type="button" className="theoria-primary-button" onClick={() => onAdd()}>＋ Link idea</button></article></section>;
}

type NewBookForm = { title: string; author: string; source: TheoriaSource; provider: TheoriaProvider; sourceUrl: string; fileName?: string };

function InsightDialog({ shelf, onClose, onSave }: { shelf: readonly TheoriaBook[]; onClose: () => void; onSave: (bookId: string, kind: InsightKind, text: string, location?: string) => Promise<void> }) {
  const [bookId, setBookId] = useState(shelf[0]?.id ?? '');
  const [kind, setKind] = useState<InsightKind>('highlight');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookId || !text.trim()) return;
    setSaving(true);
    await onSave(bookId, kind, text.trim(), location.trim());
    setSaving(false);
  };
  return <div className="theoria-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="theoria-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close">×</button><p className="theoria-eyebrow">Keep an idea</p><h2>Capture what stayed.</h2><p className="theoria-modal-intro">Save a passage or your own thought beside the source it belongs to.</p><div className="theoria-source-tabs"><button type="button" className={kind === 'highlight' ? 'is-active' : ''} onClick={() => setKind('highlight')}>Highlight</button><button type="button" className={kind === 'note' ? 'is-active' : ''} onClick={() => setKind('note')}>Note</button></div><label>Source<select value={bookId} onChange={(event) => setBookId(event.target.value)}>{shelf.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}</select></label><label>{kind === 'highlight' ? 'Passage' : 'Your note'}<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={kind === 'highlight' ? 'A line worth returning to…' : 'What did this make you notice?'} autoFocus /></label>{kind === 'highlight' && <label>Location <span>optional</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Chapter 2 or page 48" /></label>}<div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Save insight'}</button></div></form></div>;
}

function AddBookDialog({ onClose, onSave }: { onClose: () => void; onSave: (form: NewBookForm) => Promise<void> }) {
  const [source, setSource] = useState<TheoriaSource>('cloud');
  const [provider, setProvider] = useState<TheoriaProvider>('google-drive');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title, author, source, provider, sourceUrl, fileName });
    setSaving(false);
  };
  const filePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.(epub|pdf)$/i, '').replace(/[-_]+/g, ' '));
  };
  return <div className="theoria-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="theoria-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close">×</button><p className="theoria-eyebrow">New source</p><h2>Add to your shelf.</h2><p className="theoria-modal-intro">Keep the reading source here; the original file or link stays where you own it.</p><div className="theoria-source-tabs">{(['cloud', 'web', 'upload', 'manual'] as const).map((kind) => <button type="button" key={kind} className={source === kind ? 'is-active' : ''} onClick={() => setSource(kind)}>{kind === 'cloud' ? 'Cloud link' : kind === 'web' ? 'Web article' : kind === 'upload' ? 'File reference' : 'Manual'}</button>)}</div><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Meditations" autoFocus /></label><label>Author <span>optional</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Marcus Aurelius" /></label>{source === 'cloud' && <><label>Storage provider<select value={provider} onChange={(event) => setProvider(event.target.value as TheoriaProvider)}><option value="google-drive">Google Drive</option><option value="dropbox">Dropbox</option><option value="onedrive">OneDrive</option><option value="other">Other cloud storage</option></select></label><label>Share link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://drive.google.com/..." /></label></>}{source === 'web' && <label>Article link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>}{source === 'upload' && <label>EPUB or PDF<input type="file" accept=".epub,.pdf,application/pdf,application/epub+zip" onChange={filePicked} /><small>{fileName ?? 'Stores the filename; use a cloud link for cross-device access.'}</small></label>}{source === 'manual' && <label>Reading link <span>optional</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>}<div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add to shelf'}</button></div></form></div>;
}
