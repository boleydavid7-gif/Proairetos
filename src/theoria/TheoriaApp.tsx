import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { startSync, syncStatus, type SyncStatus } from '../app/sync/syncController';
import { displayName } from '../data/storage/preferences';
import TheoriaMark from '../components/brand/TheoriaMark';
import { addBook, listBooks, putBook, startStore, storeVersion, subscribe } from './data/store';
import { featuredBooks, newId, type ReadingFont, type ReadingTheme, type TheoriaBook } from './core/books';
import { AddBookDialog, InsightDialog, type InsightKind, type NewBookForm } from './components/dialogs';
import { BookDetailView, ConnectionsPage, DailyWisdomPage, LibraryHome, NotesPage, ProfilePage, ReaderView, SearchPage, SettingsPage, StudyPathsPage, buildInsightItems } from './components/views';
import { signedBookUrl, uploadBookFile } from './data/cloudStorage';

type View = 'library' | 'read' | 'notes' | 'connections' | 'study-paths' | 'search' | 'profile' | 'settings' | 'detail' | 'reader' | 'daily';

const navGroups: readonly { label?: string; items: readonly { id: View; label: string; glyph: string }[] }[] = [
  { items: [{ id: 'library', label: 'Library', glyph: '▤' }, { id: 'read', label: 'Read', glyph: '◈' }, { id: 'notes', label: 'Notes', glyph: '✎' }, { id: 'connections', label: 'Connections', glyph: '⌘' }] },
  { label: 'Explore', items: [{ id: 'study-paths', label: 'Study Paths', glyph: '✦' }, { id: 'search', label: 'Search', glyph: '⌕' }] },
  { label: 'Personal', items: [{ id: 'profile', label: 'Profile', glyph: '♙' }, { id: 'settings', label: 'Settings', glyph: '⚙' }] },
];

function useBooks(): TheoriaBook[] | undefined {
  const version = useSyncExternalStore(subscribe, storeVersion);
  const [books, setBooks] = useState<TheoriaBook[]>();
  useEffect(() => {
    let active = true;
    void listBooks().then((next) => active && setBooks(next.sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))));
    return () => { active = false; };
  }, [version]);
  return books;
}

export default function TheoriaApp() {
  const [view, setView] = useState<View>('library');
  const [name] = useState(displayName);
  const [addOpen, setAddOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState('');
  const [sync, setSync] = useState<SyncStatus>(syncStatus.get());
  const [theme, setTheme] = useState<ReadingTheme>(() => (localStorage.getItem('theoria:readingTheme') as ReadingTheme | null) ?? 'paper');
  const [font, setFont] = useState<ReadingFont>(() => (localStorage.getItem('theoria:readingFont') as ReadingFont | null) ?? 'serif');
  const books = useBooks();

  useEffect(() => {
    void startStore();
    void startSync();
    return syncStatus.subscribe(() => setSync(syncStatus.get()));
  }, []);

  const shelf = books ?? [];
  const displayShelf = shelf.length ? shelf : featuredBooks;
  const selected = shelf.find((book) => book.id === selectedId) ?? shelf.find((book) => book.status === 'reading') ?? shelf[0] ?? featuredBooks[0];
  const insightSets = useMemo(() => buildInsightItems(shelf), [shelf]);

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };
  const chooseView = (next: View) => { if (next === 'read') void openReader(); else setView(next); };
  const openBook = (book: TheoriaBook) => { setSelectedId(book.id); setView('detail'); };
  const openReader = async () => {
    if (selected.userId === 'featured') { setAddOpen(true); return; }
    const now = new Date().toISOString();
    await putBook({ ...selected, status: selected.status === 'finished' ? 'finished' : 'reading', lastOpenedAt: now, updatedAt: now });
    setView('reader');
  };
  const openExternal = async () => {
    if (selected.sourceUrl) { window.open(selected.sourceUrl, '_blank', 'noopener,noreferrer'); return; }
    if (selected.filePath) {
      try { const url = await signedBookUrl(selected.filePath); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else toast('Sign in to open this cloud book.'); } catch (error) { toast(error instanceof Error ? error.message : 'The cloud book could not be opened.'); }
      return;
    }
    toast(selected.fileName ? 'This file is only a shelf reference. Add a cloud link to open it.' : 'Add a source link to open this reading.');
  };
  const saveBook = async (input: NewBookForm) => {
    const book = await addBook({ title: input.title, author: input.author, source: input.source, provider: input.provider, sourceUrl: input.sourceUrl, fileName: input.fileName, fileSize: input.file?.size, fileType: input.file?.type, categories: input.categories, status: input.source === 'cloud' || input.source === 'web' ? 'reading' : 'want_to_read' });
    if (input.file) {
      try {
        const uploaded = await uploadBookFile(book.id, input.file);
        await putBook({ ...book, filePath: uploaded.path, updatedAt: new Date().toISOString() });
        toast(`${book.title} added to your private cloud library.`);
      } catch (error) {
        toast(error instanceof Error ? `${book.title} saved as a shelf reference.` : `${book.title} added to your library.`);
      }
    }
    setSelectedId(book.id);
    setAddOpen(false);
    setView('detail');
    toast(`${book.title} added to your library.`);
  };
  const saveInsight = async (bookId: string, kind: InsightKind, text: string, location?: string) => {
    const book = shelf.find((item) => item.id === bookId);
    if (!book) return;
    const now = new Date().toISOString();
    const updated = kind === 'highlight'
      ? { ...book, highlights: [...book.highlights, { id: newId(), text, location: location || undefined, createdAt: now }], updatedAt: now }
      : kind === 'note'
        ? { ...book, notes: [...book.notes, { id: newId(), body: text, createdAt: now }], updatedAt: now }
        : { ...book, reflections: [...book.reflections, { id: newId(), content: text, highlightId: location || undefined, createdAt: now }], updatedAt: now };
    await putBook(updated);
    setCaptureOpen(false);
    toast(kind === 'highlight' ? 'Highlight saved.' : kind === 'note' ? 'Note saved.' : 'Reflection saved.');
  };
  const updateProgress = async (progress: number) => {
    if (selected.userId === 'featured') return;
    await putBook({ ...selected, progress, status: progress >= 100 ? 'finished' : 'reading', readingLocation: progress >= 68 ? 'Book III · 12' : selected.readingLocation, updatedAt: new Date().toISOString() });
  };
  const changeTheme = (value: ReadingTheme) => { setTheme(value); localStorage.setItem('theoria:readingTheme', value); };
  const changeFont = (value: ReadingFont) => { setFont(value); localStorage.setItem('theoria:readingFont', value); };
  const capture = () => shelf.length ? setCaptureOpen(true) : setAddOpen(true);

  return <div className="theoria-app">
    <aside className="theoria-sidebar"><a href="/" className="theoria-family-link">PROAIRETOS <small>family</small></a><div className="theoria-brand"><TheoriaMark size={48} /><span><strong>THEORIA</strong><small>Read deeper<br />Think clearer<br />Connect ideas</small></span></div><div className="theoria-sidebar-nav">{navGroups.map((group) => <div className="theoria-nav-group" key={group.label ?? 'main'}>{group.label && <p className="theoria-sidebar-label">{group.label}</p>}<TheoriaNav view={view} onView={chooseView} items={group.items} /></div>)}</div><div className="theoria-sidebar-spacer" /><div className="theoria-sidebar-note"><span>✦</span><span><strong>Read slowly.</strong><small>Keep what changes the way you see.</small></span></div><button type="button" className="theoria-person" onClick={() => setView('profile')}><span>{(name || 'D').slice(0, 1).toUpperCase()}</span>{name || 'Your library'}</button></aside>
    <main className="theoria-main"><header className="theoria-topbar"><a className="theoria-mobile-brand" href="/"><TheoriaMark size={30} /><span>THEORIA</span></a><span className="theoria-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><span className={`theoria-sync theoria-sync--${sync.phase}`}><i />{sync.phase === 'ready' ? 'Synced' : sync.phase === 'signed-out' ? 'On this device' : 'Preparing'}</span></header><div className="theoria-page">
      {view === 'library' && <LibraryHome name={name} shelf={shelf} displayShelf={displayShelf} selected={selected} onAdd={() => setAddOpen(true)} onOpen={openBook} onCapture={capture} onNotes={() => setView('notes')} onSearch={() => setView('search')} onDaily={() => setView('daily')} />}
      {view === 'detail' && <BookDetailView book={selected} onBack={() => setView('library')} onRead={openReader} onExternal={openExternal} onCapture={capture} />}
      {view === 'reader' && <ReaderView book={selected} theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} onBack={() => setView('detail')} onProgress={updateProgress} onCapture={capture} onExternal={openExternal} />}
      {view === 'notes' && <NotesPage notes={insightSets.notes} highlights={insightSets.highlights} reflections={insightSets.reflections} shelf={shelf} onAdd={() => setAddOpen(true)} onCapture={capture} />}
      {view === 'connections' && <ConnectionsPage shelf={shelf} onAdd={capture} />}
      {view === 'study-paths' && <StudyPathsPage shelf={displayShelf} onAdd={() => setAddOpen(true)} onOpen={openBook} />}
      {view === 'search' && <SearchPage shelf={shelf} onOpen={openBook} />}
      {view === 'profile' && <ProfilePage name={name} syncPhase={sync.phase} onSettings={() => setView('settings')} />}
      {view === 'settings' && <SettingsPage theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} />}
      {view === 'daily' && <DailyWisdomPage onBack={() => setView('library')} onCapture={capture} />}
    </div></main>
    <nav className="theoria-bottom-nav"><TheoriaNav view={view} onView={chooseView} items={[{ id: 'library', label: 'Library', glyph: '▤' }, { id: 'read', label: 'Read', glyph: '◈' }, { id: 'notes', label: 'Notes', glyph: '✎' }, { id: 'connections', label: 'Connect', glyph: '⌘' }, { id: 'profile', label: 'Profile', glyph: '♙' }]} /></nav>
    {addOpen && <AddBookDialog onClose={() => setAddOpen(false)} onSave={saveBook} />}{captureOpen && <InsightDialog shelf={shelf} onClose={() => setCaptureOpen(false)} onSave={saveInsight} />}{notice && <div className="theoria-toast" role="status">{notice}</div>}
  </div>;
}

function TheoriaNav({ view, onView, items }: { view: View; onView: (view: View) => void; items: readonly { id: View; label: string; glyph: string }[] }) {
  return <div className="theoria-nav-list">{items.map((item) => <button type="button" key={item.id} className={view === item.id ? 'is-active' : ''} onClick={() => onView(item.id)}><span>{item.glyph}</span><small>{item.label}</small></button>)}</div>;
}
