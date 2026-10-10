import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import { BookIcon, BookmarkIcon, BulbIcon, GearIcon, PenIcon } from '../components/icons/Icons';
import { startSync, syncStatus, type SyncStatus } from '../app/sync/syncController';
import { displayName } from '../data/storage/preferences';
import TheoriaMark from '../components/brand/TheoriaMark';
import { addBook, addNotebook, listBooks, listNotebooks, putBook, putNotebook, removeBook, startStore, storeVersion, subscribe } from './data/store';
import { newId, type ReadingFont, type ReadingTheme, type TheoriaBook, type TheoriaNotebook } from './core/books';
import { AddBookDialog, CaptureDialog, EditBookDialog, NotebookDialog, NotePageDialog, type BookDetailsDraft, type InsightDraft, type InsightKind, type NewBookForm, type NotePageDraft } from './components/dialogs';
import { BookDetailView, LibraryHome, NotesPage, ReaderView, ReflectionsPage, SearchPage, SettingsPage, ShelfPage, buildInsightItems, type InsightItem, type ReaderSelection } from './components/views';
import { inspectReadingBuffer, inspectReadingFile } from './data/importers';
import { removeBookFile, removeCoverFile, signedBookUrl, signedCoverUrl, uploadBookFile, uploadCoverFile } from './data/cloudStorage';
import { lookupBookMetadata } from './data/metadata';

type View = 'library' | 'shelf' | 'reader' | 'notes' | 'reflections' | 'settings' | 'detail' | 'search';
type CaptureState = { bookId: string; kind: InsightKind; selection?: ReaderSelection; initial?: InsightDraft };
type NoteState = { current?: NotePageDraft & { id?: string } };

const navGroups: readonly { items: readonly { id: View; label: string; Icon: ComponentType<{ size?: number }> }[] }[] = [
  { items: [{ id: 'library', label: 'Library', Icon: BookIcon }, { id: 'reader', label: 'Reader', Icon: BookmarkIcon }, { id: 'notes', label: 'Notes', Icon: PenIcon }, { id: 'reflections', label: 'Reflections', Icon: BulbIcon }, { id: 'settings', label: 'Settings', Icon: GearIcon }] },
];

function useBooks(): { books: TheoriaBook[]; loading: boolean; error?: string } {
  const version = useSyncExternalStore(subscribe, storeVersion);
  const [state, setState] = useState<{ books: TheoriaBook[]; loading: boolean; error?: string }>({ books: [], loading: true });
  useEffect(() => {
    let active = true;
    void listBooks().then(async (records) => {
      const hydrated = await Promise.all(records.map(async (book) => {
        if (!book.coverPath || book.coverUrl) return book;
        try { return { ...book, coverUrl: await signedCoverUrl(book.coverPath) }; } catch { return book; }
      }));
      if (active) setState({ books: hydrated.sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt)), loading: false });
    }).catch((error) => active && setState({ books: [], loading: false, error: error instanceof Error ? error.message : 'Your library could not be opened.' }));
    return () => { active = false; };
  }, [version]);
  return state;
}

function useNotebooks(): { notebooks: TheoriaNotebook[]; loading: boolean; error?: string } {
  const version = useSyncExternalStore(subscribe, storeVersion);
  const [state, setState] = useState<{ notebooks: TheoriaNotebook[]; loading: boolean; error?: string }>({ notebooks: [], loading: true });
  useEffect(() => {
    let active = true;
    void listNotebooks().then((notebooks) => active && setState({ notebooks, loading: false })).catch((error) => active && setState({ notebooks: [], loading: false, error: error instanceof Error ? error.message : 'Notes could not be opened.' }));
    return () => { active = false; };
  }, [version]);
  return state;
}

export default function TheoriaApp() {
  const [view, setView] = useState<View>('library');
  const [name] = useState(displayName);
  const [addOpen, setAddOpen] = useState(false);
  const [editBookOpen, setEditBookOpen] = useState(false);
  const [capture, setCapture] = useState<CaptureState>();
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [noteState, setNoteState] = useState<NoteState>();
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState('');
  const [sync, setSync] = useState<SyncStatus>(syncStatus.get());
  const [theme, setTheme] = useState<ReadingTheme>(() => (localStorage.getItem('theoria:readingTheme') as ReadingTheme | null) ?? 'paper');
  const [font, setFont] = useState<ReadingFont>(() => (localStorage.getItem('theoria:readingFont') as ReadingFont | null) ?? 'serif');
  const positionTimer = useRef<number | undefined>(undefined);
  const booksState = useBooks();
  const notebooksState = useNotebooks();
  const shelf = booksState.books;
  const notebooks = notebooksState.notebooks;
  const selected = shelf.find((book) => book.id === selectedId);
  const insightSets = useMemo(() => buildInsightItems(shelf), [shelf]);

  useEffect(() => {
    void startStore();
    void startSync();
    return syncStatus.subscribe(() => setSync(syncStatus.get()));
  }, []);

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };
  const chooseView = (next: View) => {
    if (next === 'reader') {
      const nextBook = selected ?? shelf.find((book) => book.status === 'reading') ?? shelf[0];
      if (nextBook) { setSelectedId(nextBook.id); void openReader(nextBook); } else setAddOpen(true);
      return;
    }
    setView(next);
  };
  const openBook = (book: TheoriaBook) => { setSelectedId(book.id); setView('detail'); };
  const openReader = async (book = selected) => {
    if (!book) { setAddOpen(true); return; }
    const now = new Date().toISOString();
    await putBook({ ...book, status: book.status === 'finished' ? 'finished' : 'reading', lastOpenedAt: now, updatedAt: now });
    setSelectedId(book.id);
    setView('reader');
    if (book.filePath && !book.chapters.some((chapter) => chapter.content?.trim())) void loadSource(book);
  };
  const openExternal = async (book = selected) => {
    if (!book) return;
    if (book.sourceUrl) { window.open(book.sourceUrl, '_blank', 'noopener,noreferrer'); return; }
    if (book.filePath) {
      try { const url = await signedBookUrl(book.filePath); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else toast('Sign in to open this cloud book.'); } catch (error) { toast(error instanceof Error ? error.message : 'The cloud book could not be opened.'); }
      return;
    }
    toast('This book has no source link yet.');
  };
  const toggleFavorite = async () => {
    if (!selected) return;
    await putBook({ ...selected, favorite: !selected.favorite, updatedAt: new Date().toISOString() });
    toast(selected.favorite ? 'Removed from favorites.' : 'Added to favorites.');
  };
  const refreshMetadata = async (book = selected) => {
    if (!book) return;
    try {
      const metadata = await lookupBookMetadata(book.title, book.author);
      let coverPath = book.coverPath;
      let coverUrl = metadata.coverUrl ?? book.coverUrl;
      if (metadata.coverFile) {
        try {
          const cover = await uploadCoverFile(book.id, metadata.coverFile);
          if (book.coverPath && book.coverPath !== cover.path) await removeCoverFile(book.coverPath);
          coverPath = cover.path;
        } catch {
          coverUrl = book.coverPath ? undefined : coverUrl;
        }
      }
      await putBook({ ...book, title: metadata.title ?? book.title, author: metadata.author ?? book.author, description: metadata.description ?? book.description, publisher: metadata.publisher ?? book.publisher, language: metadata.language ?? book.language, publicationDate: metadata.publicationDate ?? book.publicationDate, coverUrl, coverPath, updatedAt: new Date().toISOString() });
      toast('Book details refreshed.');
    } catch (error) { toast(error instanceof Error ? error.message : 'Book details could not be refreshed.'); }
  };
  const saveBookDetails = async (draft: BookDetailsDraft) => {
    if (!selected) return;
    await putBook({ ...selected, title: draft.title, author: draft.author || undefined, description: draft.description || undefined, updatedAt: new Date().toISOString() });
    setEditBookOpen(false);
    toast('Book details saved.');
  };
  const removeSelectedBook = async () => {
    if (!selected || !window.confirm(`Remove “${selected.title}” from your library?`)) return;
    try {
      if (selected.filePath) await removeBookFile(selected.filePath);
      if (selected.coverPath) await removeCoverFile(selected.coverPath);
    } catch {
      toast('The book was removed from this device. Its cloud copy may remain.');
    }
    await removeBook(selected.id);
    setSelectedId(undefined);
    setEditBookOpen(false);
    setView('library');
    toast('Book removed from your library.');
  };
  const saveBook = async (input: NewBookForm) => {
    let imported: Awaited<ReturnType<typeof inspectReadingFile>> | undefined;
    if (input.file) {
      try { imported = await inspectReadingFile(input.file); } catch (error) { toast(error instanceof Error ? error.message : 'That file could not be read.'); return; }
    }
    const book = await addBook({ title: imported?.title || input.title, author: imported?.author || input.author, description: input.description || undefined, coverUrl: input.coverUrl, publisher: imported?.publisher || input.publisher, language: imported?.language || input.language, publicationDate: input.publicationDate, chapters: imported?.chapters, contentFormat: imported?.contentFormat, contentPreview: imported?.contentPreview, source: input.source, provider: input.provider, sourceUrl: input.sourceUrl, fileName: input.fileName, fileSize: input.file?.size, fileType: input.file?.type, categories: input.categories, status: input.source === 'upload' ? 'want_to_read' : input.source === 'cloud' || input.source === 'web' ? 'reading' : 'want_to_read' });
    let updated = book;
    if (input.file) {
      try { const uploaded = await uploadBookFile(book.id, input.file); updated = { ...updated, filePath: uploaded.path, updatedAt: new Date().toISOString() }; } catch (error) { toast(error instanceof Error ? error.message : 'The book was saved on this device.'); }
      const coverFile = imported?.coverFile ?? input.coverFile;
      if (coverFile) {
        try { const cover = await uploadCoverFile(book.id, coverFile); updated = { ...updated, coverPath: cover.path, updatedAt: new Date().toISOString() }; } catch { /* A cover can be added later. */ }
      }
    } else if (input.coverFile) {
      try { const cover = await uploadCoverFile(book.id, input.coverFile); updated = { ...updated, coverPath: cover.path, updatedAt: new Date().toISOString() }; } catch { /* A cover can be added later. */ }
    }
    if (updated !== book) await putBook(updated);
    setSelectedId(book.id);
    setAddOpen(false);
    setView('detail');
    toast(input.file ? book.title + ' added to your library.' : 'Book saved to your library.');
  };
  const loadSource = async (book = selected) => {
    if (!book?.filePath) { toast('Add an EPUB file or a source link to read this book.'); return; }
    try {
      const url = await signedBookUrl(book.filePath);
      if (!url) { toast('Sign in to load this private book.'); return; }
      const response = await fetch(url);
      if (!response.ok) throw new Error('The private book could not be downloaded.');
      const parsed = await inspectReadingBuffer(await response.arrayBuffer(), book.fileName ?? 'book.epub', book.fileType);
      await putBook({ ...book, chapters: parsed.chapters ?? book.chapters, contentPreview: parsed.contentPreview ?? book.contentPreview, contentFormat: parsed.contentFormat, author: book.author ?? parsed.author, publisher: book.publisher ?? parsed.publisher, language: book.language ?? parsed.language, updatedAt: new Date().toISOString() });
      toast('Book loaded for reading.');
    } catch (error) { toast(error instanceof Error ? error.message : 'The book could not be loaded.'); }
  };
  const updatePosition = (position: { chapterId?: string; paragraphIndex?: number; anchor?: string; progress?: number }) => {
    if (!selected) return;
    window.clearTimeout(positionTimer.current);
    positionTimer.current = window.setTimeout(() => {
      const book = shelf.find((item) => item.id === selected.id);
      if (!book) return;
      const chapter = book.chapters.find((item) => item.id === position.chapterId);
      void putBook({ ...book, readingPosition: { chapterId: position.chapterId, paragraphIndex: position.paragraphIndex, anchor: position.anchor, updatedAt: new Date().toISOString() }, readingLocation: chapter?.title ?? book.readingLocation, progress: position.progress ?? book.progress, status: position.progress === 100 ? 'finished' : 'reading', updatedAt: new Date().toISOString() });
    }, 400);
  };
  const addHighlight = async (selection: ReaderSelection) => {
    if (!selected) return;
    await putBook({ ...selected, highlights: [...selected.highlights, { id: newId(), text: selection.text, location: selection.location, chapter: selection.chapterTitle, color: 'gold', createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() });
    toast('Highlight saved.');
  };
  const openCapture = (kind: InsightKind, book = selected, selection?: ReaderSelection, initial?: InsightDraft) => {
    if (book) setCapture({ bookId: book.id, kind, selection, initial });
    else setAddOpen(true);
  };
  const saveInsight = async (kind: InsightKind, draft: InsightDraft) => {
    const state = capture;
    const book = state ? shelf.find((item) => item.id === state.bookId) : selected;
    if (!book) return;
    const now = new Date().toISOString();
    if (kind === 'highlight') {
      await putBook({ ...book, highlights: [...book.highlights, { id: newId(), text: draft.text, location: draft.location, chapter: draft.chapter, color: 'gold', createdAt: now }], updatedAt: now });
    } else if (kind === 'note') {
      await putBook({ ...book, notes: [...book.notes, { id: newId(), body: draft.text, highlightId: state?.selection ? undefined : undefined, location: draft.location, chapter: draft.chapter, createdAt: now, updatedAt: now }], updatedAt: now });
    } else {
      const next = { id: draft.id ?? newId(), content: draft.text, location: draft.location, chapter: draft.chapter, answers: draft.answers, highlightId: undefined, createdAt: draft.id ? (book.reflections.find((item) => item.id === draft.id)?.createdAt ?? now) : now, updatedAt: now };
      const reflections = draft.id ? book.reflections.map((item) => item.id === draft.id ? next : item) : [...book.reflections, next];
      await putBook({ ...book, reflections, updatedAt: now });
    }
    setCapture(undefined);
    toast(kind === 'highlight' ? 'Highlight saved.' : kind === 'note' ? 'Note saved.' : 'Reflection saved.');
  };
  const deleteReflection = async (item: InsightItem) => {
    const book = shelf.find((candidate) => candidate.id === item.book.id);
    if (!book) return;
    await putBook({ ...book, reflections: book.reflections.filter((reflection) => reflection.id !== item.id), updatedAt: new Date().toISOString() });
    toast('Reflection deleted.');
  };
  const editReflection = (item: InsightItem) => {
    const reflection = item.book.reflections.find((candidate) => candidate.id === item.id);
    if (reflection) openCapture('reflection', item.book, undefined, { id: reflection.id, text: reflection.content, location: reflection.location, chapter: reflection.chapter, answers: reflection.answers });
  };
  const createNotebook = async (title: string, sectionTitle: string) => {
    const notebook = await addNotebook({ title, sections: [{ id: newId(), title: sectionTitle, pages: [] }] });
    setNotebookOpen(false);
    toast(notebook.title + ' created.');
  };
  const savePage = async (draft: NotePageDraft & { id?: string }) => {
    const notebook = notebooks.find((item) => item.id === draft.notebookId);
    if (!notebook) return;
    const now = new Date().toISOString();
    const sections = notebook.sections.map((section) => {
      if (section.id !== draft.sectionId) return section;
      const page = { id: draft.id ?? newId(), title: draft.title, body: draft.body, bookId: draft.bookId, chapterId: draft.chapterId, createdAt: draft.id ? (section.pages.find((item) => item.id === draft.id)?.createdAt ?? now) : now, updatedAt: now };
      return { ...section, pages: draft.id ? section.pages.map((item) => item.id === draft.id ? page : item) : [...section.pages, page] };
    });
    await putNotebook({ ...notebook, sections, updatedAt: now });
    setNoteState(undefined);
    toast('Note page saved.');
  };
  const deletePage = async (notebookId: string, sectionId: string, pageId: string) => {
    const notebook = notebooks.find((item) => item.id === notebookId);
    if (!notebook) return;
    await putNotebook({ ...notebook, sections: notebook.sections.map((section) => section.id === sectionId ? { ...section, pages: section.pages.filter((page) => page.id !== pageId) } : section), updatedAt: new Date().toISOString() });
    toast('Note page deleted.');
  };
  const newPage = (notebookId: string, sectionId: string) => { setNoteState({ current: { notebookId, sectionId, title: '', body: '' } }); };
  const editPage = (notebookId: string, sectionId: string, pageId: string) => {
    const notebook = notebooks.find((item) => item.id === notebookId);
    const page = notebook?.sections.find((section) => section.id === sectionId)?.pages.find((item) => item.id === pageId);
    if (page) setNoteState({ current: { id: page.id, notebookId, sectionId, title: page.title, body: page.body, bookId: page.bookId, chapterId: page.chapterId } });
  };
  const changeTheme = (value: ReadingTheme) => { setTheme(value); localStorage.setItem('theoria:readingTheme', value); };
  const changeFont = (value: ReadingFont) => { setFont(value); localStorage.setItem('theoria:readingFont', value); };

  return <div className={'theoria-app theoria-app--' + view}>
    <aside className="theoria-sidebar"><a href="/" className="theoria-family-link">PROAIRETOS <small>family</small></a><div className="theoria-brand"><TheoriaMark size={48} /><span><strong>THEORIA</strong></span></div><div className="theoria-sidebar-nav">{navGroups.map((group) => <TheoriaNav view={view} onView={chooseView} items={group.items} key={group.items[0].id} />)}</div><div className="theoria-sidebar-spacer" /><button type="button" className="theoria-person" onClick={() => setView('settings')}><span>{(name || 'R').slice(0, 1).toUpperCase()}</span>{name || 'Reader'}</button></aside>
    <main className="theoria-main"><header className="theoria-topbar"><a className="theoria-mobile-brand" href="/"><TheoriaMark size={30} /><span>THEORIA</span></a><span className="theoria-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><span className={'theoria-sync theoria-sync--' + sync.phase}><i />{sync.phase === 'ready' ? 'Synced' : sync.phase === 'signed-out' ? 'On this device' : 'Preparing'}</span></header><div className="theoria-page">
      {view === 'library' && <LibraryHome name={name} shelf={shelf} loading={booksState.loading} error={booksState.error} onAdd={() => setAddOpen(true)} onOpen={openBook} onContinue={(book) => void openReader(book)} onShelf={() => setView('shelf')} onSearch={() => setView('search')} />}
      {view === 'shelf' && <ShelfPage shelf={shelf} onBack={() => setView('library')} onOpen={openBook} onAdd={() => setAddOpen(true)} />}
      {view === 'detail' && selected && <BookDetailView book={selected} onBack={() => setView('library')} onRead={() => void openReader(selected)} onExternal={() => void openExternal(selected)} onCapture={(kind) => openCapture(kind, selected)} onToggleFavorite={() => void toggleFavorite()} onRefresh={() => refreshMetadata(selected)} onEdit={() => setEditBookOpen(true)} onRemove={() => void removeSelectedBook()} />}
      {view === 'reader' && selected && <ReaderView book={selected} theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} onBack={() => setView('detail')} onPosition={updatePosition} onHighlight={addHighlight} onCapture={(kind, selection) => openCapture(kind, selected, selection)} onBookmark={async (chapterId, location) => { if (!selected) return; await putBook({ ...selected, bookmarks: [...selected.bookmarks, { id: newId(), chapter: selected.chapters.find((item) => item.id === chapterId)?.title, location, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }); toast('Bookmark saved.'); }} onExternal={() => void openExternal(selected)} onLoadSource={loadSource} />}
      {view === 'notes' && <NotesPage notebooks={notebooks} shelf={shelf} loading={notebooksState.loading} error={notebooksState.error} onNewNotebook={() => setNotebookOpen(true)} onNewPage={newPage} onEditPage={editPage} onDeletePage={deletePage} />}
      {view === 'reflections' && <ReflectionsPage reflections={insightSets.reflections} onNew={() => openCapture('reflection')} onEdit={editReflection} onDelete={(item) => void deleteReflection(item)} />}
      {view === 'search' && <SearchPage shelf={shelf} notebooks={notebooks} reflections={insightSets.reflections} onOpen={openBook} />}
      {view === 'settings' && <SettingsPage theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} />}
    </div></main>
    <nav className="theoria-bottom-nav"><TheoriaNav view={view} onView={chooseView} items={[{ id: 'library', label: 'Library', Icon: BookIcon }, { id: 'reader', label: 'Reader', Icon: BookmarkIcon }, { id: 'notes', label: 'Notes', Icon: PenIcon }, { id: 'reflections', label: 'Reflect', Icon: BulbIcon }, { id: 'settings', label: 'Settings', Icon: GearIcon }]} /></nav>
    {addOpen && <AddBookDialog onClose={() => setAddOpen(false)} onSave={saveBook} onLookup={lookupBookMetadata} />}{editBookOpen && selected && <EditBookDialog book={selected} onClose={() => setEditBookOpen(false)} onSave={saveBookDetails} />}{capture && <CaptureDialog kind={capture.kind} selection={capture.selection} initial={capture.initial} onClose={() => setCapture(undefined)} onSave={saveInsight} />}{notebookOpen && <NotebookDialog onClose={() => setNotebookOpen(false)} onSave={createNotebook} />}{noteState && <NotePageDialog notebooks={notebooks} shelf={shelf} current={noteState.current} onClose={() => setNoteState(undefined)} onSave={savePage} />}{notice && <div className="theoria-toast" role="status">{notice}</div>}
  </div>;
}

function TheoriaNav({ view, onView, items }: { view: View; onView: (view: View) => void; items: readonly { id: View; label: string; Icon: ComponentType<{ size?: number }> }[] }) {
  return <div className="theoria-nav-list">{items.map((item) => <button type="button" key={item.id} className={view === item.id || (item.id === 'library' && view === 'shelf') ? 'is-active' : ''} onClick={() => onView(item.id)}><span><item.Icon size={19} /></span><small>{item.label}</small></button>)}</div>;
}
