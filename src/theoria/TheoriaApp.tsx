import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import { BookIcon, BookmarkIcon, BulbIcon, GearIcon, PenIcon } from '../components/icons/Icons';
import { startSync, syncStatus, type SyncStatus } from '../app/sync/syncController';
import { displayName } from '../data/storage/preferences';
import TheoriaMark from '../components/brand/TheoriaMark';
import { addBook, addNotebook, listBooks, listNotebooks, putBook, putNotebook, removeBook, startStore, storeVersion, subscribe, USER_ID } from './data/store';
import { addImported, readHighlightsFile } from './core/clippings';
import { newId, type ReadingFont, type ReadingTheme, type TheoriaBook, type TheoriaNotebook } from './core/books';
import { AddBookDialog, CaptureDialog, EditBookDialog, NotebookDialog, NotePageDialog, type BookDetailsDraft, type InsightDraft, type InsightKind, type NewBookForm, type NotePageDraft } from './components/dialogs';
import { BookDetailView, type BookCopy, LibraryHome, NotesPage, ReaderView, ReflectionsPage, SearchPage, SettingsPage, ShelfPage, buildInsightItems, type InsightItem, type ReaderSelection } from './components/views';
import { inspectReadingFile } from './data/importers';
import { lookupBookMetadata } from './data/metadata';
import { coverSource, dropCloudCopy, fetchCopy, forgetCloudCopy, keepFile, keepLocally, localFile, makeCloudCopy, migrateBook, readableChapters } from './data/library';
import { outline, putAll, putCover, takeAll } from './data/files';
import type { TheoriaChapter } from './core/books';
import { takeOpening } from '../app/family/opening';
import { reflectionService } from '../app/services';
import { downloadBookNotes } from './core/export';

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
        return { ...book, coverUrl: await coverSource(book).catch(() => undefined) };
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
  const [notice, setNotice] = useState<{ message: string; undo?: () => void }>();
  const noticeTimer = useRef<number | undefined>(undefined);
  const [readerText, setReaderText] = useState<{ bookId: string; chapters?: TheoriaChapter[]; pdf?: Blob; loading: boolean }>();
  const [here, setHere] = useState<Set<string>>(new Set());
  const [copyNew, setCopyNew] = useState(() => localStorage.getItem('theoria:copyNew') !== 'false');
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

  const toast = (message: string, undo?: () => void) => {
    setNotice({ message, undo });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(undefined), undo ? 7000 : 3200);
  };

  // Books from the first version are moved once: text to this device, files sealed (see `migrateBook`).
  useEffect(() => {
    if (booksState.loading) return;
    for (const book of shelf) void migrateBook(book).then((next) => next && putBook(next)).catch(() => undefined);
  }, [booksState.loading, shelf.length, sync.phase]);

  // Which books are on this phone in full.
  useEffect(() => {
    let live = true;
    void Promise.all(shelf.map(async (book) => ((await readableChapters(book.id)) || (await localFile(book.id)) ? book.id : undefined))).then((ids) => live && setHere(new Set(ids.filter((id): id is string => Boolean(id)))));
    return () => { live = false; };
  }, [shelf, readerText]);

  // The reader takes the book's text from this phone.
  const loadText = async (book: TheoriaBook) => {
    setReaderText({ bookId: book.id, loading: true });
    const [chapters, file] = await Promise.all([readableChapters(book.id), localFile(book.id)]);
    setReaderText({ bookId: book.id, chapters, pdf: book.contentFormat === 'pdf' || file?.type === 'application/pdf' ? file?.blob : undefined, loading: false });
  };

  // A link or shortcut: `continue` (the book being read) or `add`.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || booksState.loading) return;
    opened.current = true;
    const open = takeOpening();
    if (open === 'add') setAddOpen(true);
    if (open === 'settings') setView('settings');
    if (open?.startsWith('book:') && shelf.some((book) => book.id === open.slice(5))) { setSelectedId(open.slice(5)); setView('detail'); }
    if (open === 'continue') {
      const book = shelf.filter((item) => item.status === 'reading').sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))[0] ?? shelf[0];
      if (book) void openReader(book);
    }
  }, [booksState.loading]);
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
    void loadText(book);
  };
  const openExternal = async (book = selected) => {
    if (!book) return;
    if (book.sourceUrl) { window.open(book.sourceUrl, '_blank', 'noopener,noreferrer'); return; }
    toast('This book has no link.');
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
      // Only what is missing is filled in; what the person wrote stays. Undo puts the book back as it was.
      const next: TheoriaBook = { ...book, author: book.author ?? metadata.author, description: book.description ?? metadata.description, publisher: book.publisher ?? metadata.publisher, language: book.language ?? metadata.language, publicationDate: book.publicationDate ?? metadata.publicationDate, coverUrl: book.coverUrl ?? metadata.coverUrl, updatedAt: new Date().toISOString() };
      const hadCover = Boolean(book.coverUrl);
      if (!hadCover && metadata.coverFile) await putCover({ bookId: book.id, blob: metadata.coverFile });
      await putBook(next);
      toast('Details filled in from Open Library.', () => void putBook(book));
    } catch (error) { toast(error instanceof Error ? error.message : 'Book details could not be found right now.'); }
  };
  const saveBookDetails = async (draft: BookDetailsDraft) => {
    if (!selected) return;
    await putBook({ ...selected, title: draft.title, author: draft.author || undefined, description: draft.description || undefined, updatedAt: new Date().toISOString() });
    setEditBookOpen(false);
    toast('Book details saved.');
  };
  const removeSelectedBook = async () => {
    if (!selected) return;
    const book = selected;
    const kept = await takeAll(book.id);
    await removeBook(book.id);
    setSelectedId(undefined);
    setEditBookOpen(false);
    setView('library');
    let undone = false;
    // The account copy is removed only once the chance to undo has passed.
    window.setTimeout(() => { if (!undone) void forgetCloudCopy(book); }, 8000);
    toast(`${book.title} removed`, () => { undone = true; void putAll(kept).then(() => putBook(book)); });
  };
  // Highlights from a Kindle's clippings file or a Readwise export, onto the shelf, with undo.
  const bringInHighlights = async (file: File) => {
    const imported = readHighlightsFile(await file.text(), file.name);
    const { changed, added, count } = addImported(shelf, imported, USER_ID);
    if (count === 0 && changed.length === 0 && added.length === 0) {
      toast(imported.length ? 'Those highlights are already here.' : 'That file has no highlights in it. A Kindle’s My Clippings.txt or a Readwise CSV works.');
      return;
    }
    const before = shelf.filter((book) => changed.some((each) => each.id === book.id));
    for (const book of [...changed, ...added]) await putBook(book);
    const books = added.length ? ` and ${added.length} ${added.length === 1 ? 'book' : 'books'}` : '';
    toast(`${count} ${count === 1 ? 'highlight' : 'highlights'}${books} brought in.`, () => {
      for (const book of before) void putBook(book);
      for (const book of added) void removeBook(book.id);
    });
  };

  const saveBook = async (input: NewBookForm) => {
    let imported: Awaited<ReturnType<typeof inspectReadingFile>> | undefined;
    if (input.file) {
      try { imported = await inspectReadingFile(input.file); } catch (error) { toast(error instanceof Error ? error.message : 'That file could not be read.'); return; }
    }
    const book = await addBook({ title: imported?.title || input.title, author: imported?.author || input.author, description: input.description || undefined, coverUrl: input.coverUrl, publisher: imported?.publisher || input.publisher, language: imported?.language || input.language, publicationDate: input.publicationDate, chapters: imported?.chapters ? outline(imported.chapters) : undefined, pageCount: imported?.pageCount, contentFormat: imported?.contentFormat, contentPreview: imported?.contentPreview, source: input.source, provider: input.provider, sourceUrl: input.sourceUrl, fileName: input.fileName ?? input.file?.name, fileSize: input.file?.size, fileType: input.file?.type, categories: input.categories, status: input.source === 'cloud' || input.source === 'web' ? 'reading' : 'want_to_read' });
    // The book itself stays on this phone; only its record syncs.
    await keepLocally(book.id, input.file, imported ? { ...imported, coverFile: imported.coverFile ?? input.coverFile } : undefined);
    if (!imported && input.coverFile) await putCover({ bookId: book.id, blob: input.coverFile });
    let saved = book;
    if (input.file && copyNew && sync.phase === 'ready') {
      try { saved = await makeCloudCopy(book); await putBook(saved); } catch (error) { toast(error instanceof Error ? error.message : 'The book is on this phone; the account copy can be made later.'); }
    }
    setSelectedId(book.id);
    setAddOpen(false);
    setView('detail');
    toast(book.title + ' is on your shelf.', () => { void takeAll(book.id).then(() => removeBook(book.id)).then(() => forgetCloudCopy(saved)); setView('library'); });
  };
  const loadSource = async (book = selected) => {
    if (!book) return;
    try {
      await fetchCopy(book);
      await loadText(book);
      toast('The book is on this phone now.');
    } catch (error) { toast(error instanceof Error ? error.message : 'The copy could not be fetched.'); }
  };
  const chooseFile = async (file: File) => {
    if (!selected) return;
    try {
      const read = await keepFile(selected, file);
      await putBook({ ...selected, chapters: read.chapters ? outline(read.chapters) : selected.chapters, pageCount: read.pageCount ?? selected.pageCount, contentFormat: read.contentFormat, fileName: file.name, fileSize: file.size, fileType: file.type, updatedAt: new Date().toISOString() });
      await loadText(selected);
      toast('The book is on this phone now.');
    } catch (error) { toast(error instanceof Error ? error.message : 'That file could not be read.'); }
  };
  const setCloudCopy = async (on: boolean) => {
    if (!selected) return;
    try {
      await putBook(on ? await makeCloudCopy(selected) : await dropCloudCopy(selected));
      toast(on ? 'A sealed copy is in your account.' : 'The account copy is removed; the book stays on this phone.');
    } catch (error) { toast(error instanceof Error ? error.message : 'That did not finish.'); }
  };
  const removeItem = async (kind: 'highlight' | 'note' | 'reflection' | 'bookmark', id: string) => {
    if (!selected) return;
    const book = selected;
    const field = kind === 'highlight' ? 'highlights' : kind === 'note' ? 'notes' : kind === 'reflection' ? 'reflections' : 'bookmarks';
    await putBook({ ...book, [field]: (book[field] as { id: string }[]).filter((item) => item.id !== id), updatedAt: new Date().toISOString() });
    toast(`${kind[0].toUpperCase()}${kind.slice(1)} removed`, () => void putBook(book));
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
      if (draft.toReflect) {
        // One line in Proairetos Reflect, if the person asked: their words, with the book's name.
        const words = [draft.text, ...Object.values(draft.answers ?? {})].map((part) => part?.trim()).filter(Boolean).join(' · ');
        if (words) await reflectionService.write({ body: `${book.title}: ${words}`, kind: 'FREE', promptKey: 'after-reading' });
      }
    }
    setCapture(undefined);
    toast(kind === 'highlight' ? 'Highlight saved.' : kind === 'note' ? 'Note saved.' : 'Reflection saved.');
  };
  const deleteReflection = async (item: InsightItem) => {
    const book = shelf.find((candidate) => candidate.id === item.book.id);
    if (!book) return;
    await putBook({ ...book, reflections: book.reflections.filter((reflection) => reflection.id !== item.id), updatedAt: new Date().toISOString() });
    toast('Reflection deleted', () => void putBook(book));
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
    toast('Page deleted', () => void putNotebook(notebook));
  };
  const newPage = (notebookId: string, sectionId: string) => { setNoteState({ current: { notebookId, sectionId, title: '', body: '' } }); };
  const editPage = (notebookId: string, sectionId: string, pageId: string) => {
    const notebook = notebooks.find((item) => item.id === notebookId);
    const page = notebook?.sections.find((section) => section.id === sectionId)?.pages.find((item) => item.id === pageId);
    if (page) setNoteState({ current: { id: page.id, notebookId, sectionId, title: page.title, body: page.body, bookId: page.bookId, chapterId: page.chapterId } });
  };
  const changeTheme = (value: ReadingTheme) => { setTheme(value); localStorage.setItem('theoria:readingTheme', value); };
  const changeFont = (value: ReadingFont) => { setFont(value); localStorage.setItem('theoria:readingFont', value); };
  const changeCopyNew = (value: boolean) => { setCopyNew(value); localStorage.setItem('theoria:copyNew', String(value)); };
  const syncWords = sync.phase === 'ready' ? 'Synced' : sync.phase === 'locked' ? 'Locked' : sync.phase === 'needs-setup' ? 'Finish setup in Proairetos' : 'On this device';
  const copy: BookCopy = { here: selected ? here.has(selected.id) : false, canCopy: sync.phase === 'ready' };
  const readerBook = selected && readerText?.bookId === selected.id && readerText.chapters ? { ...selected, chapters: readerText.chapters } : selected ? { ...selected, chapters: [] } : undefined;

  return <div className={'theoria-app theoria-app--' + view}>
    <aside className="theoria-sidebar"><a href="/" className="theoria-family-link">PROAIRETOS <small>family</small></a><div className="theoria-brand"><TheoriaMark size={48} /><span><strong>THEORIA</strong></span></div><div className="theoria-sidebar-nav">{navGroups.map((group) => <TheoriaNav view={view} onView={chooseView} items={group.items} key={group.items[0].id} />)}</div><div className="theoria-sidebar-spacer" /><button type="button" className="theoria-person" onClick={() => setView('settings')}><span>{(name || 'R').slice(0, 1).toUpperCase()}</span>{name || 'Reader'}</button></aside>
    <main className="theoria-main"><header className="theoria-topbar"><a className="theoria-mobile-brand" href="/"><TheoriaMark size={30} /><span>THEORIA</span></a><span className="theoria-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><span className={'theoria-sync theoria-sync--' + sync.phase}><i />{syncWords}</span></header><div className="theoria-page">
      {view === 'library' && <LibraryHome name={name} shelf={shelf} loading={booksState.loading} error={booksState.error} onAdd={() => setAddOpen(true)} onOpen={openBook} onContinue={(book) => void openReader(book)} onShelf={() => setView('shelf')} onSearch={() => setView('search')} />}
      {view === 'shelf' && <ShelfPage shelf={shelf} onBack={() => setView('library')} onOpen={openBook} onAdd={() => setAddOpen(true)} />}
      {view === 'detail' && selected && <BookDetailView book={selected} copy={copy} onRemoveItem={(kind, id) => void removeItem(kind, id)} onExport={() => downloadBookNotes(selected)} onCloudCopy={(on) => void setCloudCopy(on)} onBack={() => setView('library')} onRead={() => void openReader(selected)} onExternal={() => void openExternal(selected)} onCapture={(kind) => openCapture(kind, selected)} onToggleFavorite={() => void toggleFavorite()} onRefresh={() => refreshMetadata(selected)} onEdit={() => setEditBookOpen(true)} onRemove={() => void removeSelectedBook()} />}
      {view === 'reader' && readerBook && <ReaderView book={readerBook} pdf={readerText?.bookId === readerBook.id ? readerText.pdf : undefined} loadingText={readerText?.loading} onChooseFile={(file) => void chooseFile(file)} theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} onBack={() => setView('detail')} onPosition={updatePosition} onHighlight={addHighlight} onCapture={(kind, selection) => openCapture(kind, selected, selection)} onBookmark={async (chapterId, location) => { if (!selected) return; await putBook({ ...selected, bookmarks: [...selected.bookmarks, { id: newId(), chapter: selected.chapters.find((item) => item.id === chapterId)?.title, location, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }); toast('Bookmark saved.'); }} onExternal={() => void openExternal(selected)} onLoadSource={loadSource} />}
      {view === 'notes' && <NotesPage notebooks={notebooks} shelf={shelf} loading={notebooksState.loading} error={notebooksState.error} onNewNotebook={() => setNotebookOpen(true)} onNewPage={newPage} onEditPage={editPage} onDeletePage={deletePage} />}
      {view === 'reflections' && <ReflectionsPage reflections={insightSets.reflections} onNew={() => openCapture('reflection')} onEdit={editReflection} onDelete={(item) => void deleteReflection(item)} />}
      {view === 'search' && <SearchPage shelf={shelf} notebooks={notebooks} reflections={insightSets.reflections} onOpen={openBook} />}
      {view === 'settings' && <SettingsPage theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} copyNew={copyNew} onCopyNew={changeCopyNew} onHighlights={(file) => void bringInHighlights(file)} />}
    </div></main>
    <nav className="theoria-bottom-nav"><TheoriaNav view={view} onView={chooseView} items={[{ id: 'library', label: 'Library', Icon: BookIcon }, { id: 'reader', label: 'Reader', Icon: BookmarkIcon }, { id: 'notes', label: 'Notes', Icon: PenIcon }, { id: 'reflections', label: 'Reflect', Icon: BulbIcon }, { id: 'settings', label: 'Settings', Icon: GearIcon }]} /></nav>
    {addOpen && <AddBookDialog onClose={() => setAddOpen(false)} onSave={saveBook} onLookup={lookupBookMetadata} />}{editBookOpen && selected && <EditBookDialog book={selected} onClose={() => setEditBookOpen(false)} onSave={saveBookDetails} />}{capture && <CaptureDialog kind={capture.kind} selection={capture.selection} initial={capture.initial} onClose={() => setCapture(undefined)} onSave={saveInsight} />}{notebookOpen && <NotebookDialog onClose={() => setNotebookOpen(false)} onSave={createNotebook} />}{noteState && <NotePageDialog notebooks={notebooks} shelf={shelf} current={noteState.current} onClose={() => setNoteState(undefined)} onSave={savePage} />}{notice && <div className="theoria-toast" role="status"><span>{notice.message}</span>{notice.undo && <button type="button" onClick={() => { notice.undo?.(); setNotice(undefined); }}>Undo</button>}</div>}
  </div>;
}

function TheoriaNav({ view, onView, items }: { view: View; onView: (view: View) => void; items: readonly { id: View; label: string; Icon: ComponentType<{ size?: number }> }[] }) {
  return <div className="theoria-nav-list">{items.map((item) => <button type="button" key={item.id} className={view === item.id || (item.id === 'library' && view === 'shelf') ? 'is-active' : ''} onClick={() => onView(item.id)}><span><item.Icon size={19} /></span><small>{item.label}</small></button>)}</div>;
}
