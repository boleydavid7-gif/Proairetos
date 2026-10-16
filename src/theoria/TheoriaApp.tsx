import { endsWith, useLaunchedFile } from '../app/family/launchFiles';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import ProairetosTab from '../app/family/ProairetosTab';
import YearPage from '../app/family/YearPage';
import { theoriaDates, theoriaYear } from './core/year';
import { BookIcon, BookmarkIcon, BulbIcon, GearIcon, PenIcon } from '../components/icons/Icons';
import { startSync, syncStatus, type SyncStatus } from '../app/sync/syncController';
import { displayName } from '../data/storage/preferences';
import TheoriaMark from '../components/brand/TheoriaMark';
import { addBook, addNotebook, listBooks, listNotebooks, putBook, putNotebook, removeBook, startStore, storeVersion, subscribe, USER_ID } from './data/store';
import { addImported, readHighlightsFile } from './core/clippings';
import { newId, type ReadingFont, type ReadingTheme, type TheoriaBook, type TheoriaNotebook } from './core/books';
import { AddBookDialog, CaptureDialog, EditBookDialog, NotebookDialog, NotePageDialog, type BookDetailsDraft, type InsightDraft, type InsightKind, type NewBookForm, type NotePageDraft } from './components/dialogs';
import { SHELVES, type Shelf } from './core/shelves';
import { booksToAdd, folderDuplicates, mergeBooks, planFolderScan, READABLE, sameFile } from './core/folder';
import { filesIn, folderBooks, readableLibrary, saveFolderBooks } from './data/libraryFolder';
import { chosenCloudFolder, cloudConnected, CLOUD_NAMES, connectedClouds, downloadCloudFile, filesInCloud, findInCloud, finishCloud, type CloudProvider } from './data/cloudLibrary';
import { copyBooksToFolder } from './data/toFolder';
import { BookDetailView, type BookCopy, LibraryHome, NotesPage, ReaderView, ReflectionsPage, SearchPage, SettingsPage, ShelfPage, buildInsightItems, type InsightItem, type ReaderSelection } from './components/views';
import { inspectReadingFile } from './data/importers';
import { lookupBookMetadata } from './data/metadata';
import { coverSource, dropCloudCopy, fetchCopy, forgetCloudCopy, keepFile, keepLocally, localFile, makeCloudCopy, migrateBook, readableChapters } from './data/library';
import { outline, putAll, putCover, takeAll } from './data/files';
import type { TheoriaChapter } from './core/books';
import { takeOpening } from '../app/family/opening';
import { reflectionService } from '../app/services';
import { downloadBookNotes } from './core/export';

type View = 'library' | 'shelf' | 'reader' | 'notes' | 'reflections' | 'settings' | 'detail' | 'search' | 'year';
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

/** One tab or window at a time (Web Locks where the browser has them). */
function withLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: { request: (name: string, work: () => Promise<T>) => Promise<T> } }).locks;
  return locks ? locks.request(name, work) : work();
}

export default function TheoriaApp() {
  const [view, setView] = useState<View>('library');
  const [name] = useState(displayName);
  const [addOpen, setAddOpen] = useState(false);
  const [launched, setLaunched] = useState<File>();
  // A book opened with Theoria on a computer opens Add a book with the file chosen.
  useLaunchedFile(endsWith('.epub', '.pdf', '.txt', '.md'), (file) => {
    setLaunched(file);
    setAddOpen(true);
  });
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
  const [driveReturn, setDriveReturn] = useState<CloudProvider>();
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
    // Books into the backup folder, when one is chosen and the browser still allows it (no prompt here).
    window.setTimeout(() => void copyBooksToFolder(), 6000);
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

  // Which books are on this device in full.
  useEffect(() => {
    let live = true;
    void Promise.all(shelf.map(async (book) => ((await readableChapters(book.id)) || (await localFile(book.id)) ? book.id : undefined))).then((ids) => live && setHere(new Set(ids.filter((id): id is string => Boolean(id)))));
    return () => { live = false; };
  }, [shelf, readerText]);

  // The reader takes the book's text from this device.
  /**
   * A book not on this device yet: from the cloud storage this device is signed in to (where it was found before, else
   * by its file name and size), else from its sealed account copy. Says where it came from, or undefined.
   */
  const bringBook = async (book: TheoriaBook): Promise<string | undefined> => {
    if (!book.fileName) return undefined;
    const clouds = connectedClouds();
    const order = book.foundIn && clouds.includes(book.foundIn.provider) ? [book.foundIn.provider, ...clouds.filter((each) => each !== book.foundIn!.provider)] : clouds;
    for (const provider of order) {
      try {
        const place = book.foundIn?.provider === provider ? { provider, id: book.foundIn.id } : await findInCloud(provider, book.fileName, book.fileSize);
        if (!place) continue;
        const file = await downloadCloudFile(provider, place, book.fileName);
        if (book.fileSize && file.size !== book.fileSize && book.foundIn?.provider !== provider) continue;
        await keepFile(book, file);
        if (book.foundIn?.id !== place.id) await putBook({ ...book, foundIn: { provider, id: place.id }, updatedAt: new Date().toISOString() });
        return CLOUD_NAMES[provider];
      } catch {
        // Not there, or the storage could not be reached: the next one, then the account copy.
      }
    }
    if (book.cloudCopy && book.filePath && book.sealed) {
      try {
        await fetchCopy(book);
        return 'your account';
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const loadText = async (book: TheoriaBook) => {
    setReaderText({ bookId: book.id, loading: true });
    let [chapters, file] = await Promise.all([readableChapters(book.id), localFile(book.id)]);
    if (!chapters && !file) {
      const from = await bringBook(book);
      if (from) {
        [chapters, file] = await Promise.all([readableChapters(book.id), localFile(book.id)]);
        toast(`Brought from ${from}.`);
      }
    }
    setReaderText({ bookId: book.id, chapters, pdf: book.contentFormat === 'pdf' || file?.type === 'application/pdf' ? file?.blob : undefined, loading: false });
  };

  // A link or shortcut: `continue` (the book being read) or `add`.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || booksState.loading) return;
    opened.current = true;
    const open = takeOpening();
    // Back from connecting OneDrive for the library folder: settings, where the folder is chosen.
    void finishCloud().then((back) => { if (back) { setView('settings'); if (back.intent === 'folder') setDriveReturn(back.provider); else toast(`${CLOUD_NAMES[back.provider]} is connected. Books not on this device come from it when opened.`); } }).catch((error) => { setView('settings'); toast(error instanceof Error ? error.message : 'The storage did not connect.'); });
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
  const moveToShelf = async (shelf: Shelf) => {
    if (!selected) return;
    const before = selected;
    const status = SHELVES.find((each) => each.id === shelf)!.status;
    await putBook({ ...selected, status, updatedAt: new Date().toISOString() });
    toast(`Moved to ${SHELVES.find((each) => each.id === shelf)!.label}`, () => void putBook(before));
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
  /**
   * Settings › Clear the library: every book off the shelf (on every device, as removals sync), with one undo; the
   * account copies go only once the undo has passed. With a library folder, a fresh look follows, which adds each
   * file once.
   */
  const clearLibrary = async (): Promise<string> => {
    const books = await listBooks();
    if (!books.length) return 'The library is already empty.';
    const knownBefore = folderBooks();
    const kept: { book: TheoriaBook; files: Awaited<ReturnType<typeof takeAll>> }[] = [];
    for (const book of books) {
      kept.push({ book, files: await takeAll(book.id) });
      await removeBook(book.id);
    }
    saveFolderBooks({});
    setSelectedId(undefined);
    let undone = false;
    window.setTimeout(() => { if (!undone) for (const { book } of kept) void forgetCloudCopy(book); }, 10_000);
    toast(`${books.length === 1 ? 'One book' : `${books.length} books`} removed.`, () => {
      undone = true;
      void (async () => {
        for (const { book, files } of kept) { await putAll(files); await putBook(book); }
        saveFolderBooks(knownBefore);
      })();
    });
    // A fresh look through the folder, once the chance to undo has passed.
    window.setTimeout(() => { if (!undone) void syncLibraryFolder(); }, 10_500);
    return `${books.length === 1 ? 'One book' : `${books.length} books`} removed.`;
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

  /** One book onto the shelf: read, kept on this device, an account copy if chosen. Throws when the file cannot be read. */
  const addOne = async (input: NewBookForm, extra: { fromFolder?: string } = {}): Promise<{ book: TheoriaBook; saved: TheoriaBook }> => {
    const imported = input.file ? await inspectReadingFile(input.file) : undefined;
    const book = await addBook({ title: imported?.title || input.title, author: imported?.author || input.author, description: input.description || undefined, coverUrl: input.coverUrl, publisher: imported?.publisher || input.publisher, language: imported?.language || input.language, publicationDate: input.publicationDate, chapters: imported?.chapters ? outline(imported.chapters) : undefined, pageCount: imported?.pageCount, contentFormat: imported?.contentFormat, contentPreview: imported?.contentPreview, source: input.source, provider: input.provider, sourceUrl: input.sourceUrl, fileName: input.fileName ?? input.file?.name, fileSize: input.file?.size, fileType: input.file?.type, categories: input.categories, status: input.source === 'cloud' || input.source === 'web' ? 'reading' : 'want_to_read', fromFolder: extra.fromFolder });
    // The book itself stays on this device; only its record syncs.
    await keepLocally(book.id, input.file, imported ? { ...imported, coverFile: imported.coverFile ?? input.coverFile } : undefined);
    if (!imported && input.coverFile) await putCover({ bookId: book.id, blob: input.coverFile });
    let saved = book;
    // A book from the library folder always gets its account copy: that is how it reaches the other devices.
    if (input.file && (copyNew || extra.fromFolder) && sync.phase === 'ready') {
      try { saved = await makeCloudCopy(book); await putBook(saved); } catch (error) { toast(error instanceof Error ? error.message : 'The book is on this device; the account copy can be made later.'); }
    }
    return { book, saved };
  };
  const saveBook = async (input: NewBookForm) => {
    // The same file already on the shelf opens that book rather than making a second.
    const already = input.file ? (await listBooks()).find((book) => sameFile(book, input.file!.name, input.file!.size)) : undefined;
    if (already) {
      setAddOpen(false);
      setSelectedId(already.id);
      setView('detail');
      toast(`${already.title} is already on your shelf.`);
      return;
    }
    let added: Awaited<ReturnType<typeof addOne>>;
    try { added = await addOne(input); } catch (error) { toast(error instanceof Error ? error.message : 'That file could not be read.'); return; }
    const { book, saved } = added;
    setSelectedId(book.id);
    setAddOpen(false);
    setView('detail');
    void copyBooksToFolder();
    toast(book.title + ' is on your shelf.', () => { void takeAll(book.id).then(() => removeBook(book.id)).then(() => forgetCloudCopy(saved)); setView('library'); });
  };
  /** Several files or a whole folder: each readable book not already on the shelf, one undo for all. */
  const saveMany = async (files: File[]) => {
    const chosen = booksToAdd(files, shelf);
    setAddOpen(false);
    if (!chosen.length) { toast('No new books there. Theoria reads EPUB, PDF, text and Markdown.'); return; }
    const added: { book: TheoriaBook; saved: TheoriaBook }[] = [];
    let unread = 0;
    for (const [index, file] of chosen.entries()) {
      toast(`Adding ${index + 1} of ${chosen.length}…`);
      const name = file.name.replace(READABLE, '');
      try { added.push(await addOne({ title: name, author: '', description: '', source: 'upload', provider: 'other', sourceUrl: '', fileName: file.name, file, categories: ['Personal'] })); } catch { unread += 1; }
    }
    setView('shelf');
    void copyBooksToFolder();
    const words = `${added.length === 1 ? 'One book' : `${added.length} books`} added${unread ? `; ${unread} could not be read` : ''}.`;
    toast(words, added.length ? () => { for (const { book, saved } of added) void takeAll(book.id).then(() => removeBook(book.id)).then(() => forgetCloudCopy(saved)); } : undefined);
  };
  /**
   * The library folder (on the computer that chose it): new books in, newer files of books it brought in replaced,
   * and account copies made for folder books still waiting for one. Quiet unless something came in.
   */
  const folderBusy = useRef(false);
  const syncLibraryFolder = (ask = false): Promise<string | undefined> => withLock('theoria-library-folder', () => syncLibraryFolderHere(ask));
  const syncLibraryFolderHere = async (ask = false): Promise<string | undefined> => {
    if (folderBusy.current) return undefined;
    folderBusy.current = true;
    try {
      // Two kinds of library folder: one on this computer (Chrome, Edge) and one in OneDrive (any device).
      type Found = { path: string; size: number; name: string; get: () => Promise<File> };
      const found: Found[] = [];
      const names: string[] = [];
      let problem: string | undefined;
      const local = await readableLibrary(ask);
      if (local) {
        names.push(local.name);
        for (const each of await filesIn(local)) found.push({ path: each.path, size: each.size, name: each.file.name, get: async () => each.file });
      }
      const cloud = chosenCloudFolder();
      if (cloud && cloudConnected(cloud.provider)) {
        try {
          for (const each of await filesInCloud(cloud)) {
            const name = each.path.split('/').pop() ?? each.path;
            found.push({ path: `${cloud.provider}:${each.path}`, size: each.size, name, get: () => downloadCloudFile(cloud.provider, each, name) });
          }
          names.push(`${cloud.name} (${CLOUD_NAMES[cloud.provider]})`);
        } catch (error) {
          problem = error instanceof Error ? error.message : `${CLOUD_NAMES[cloud.provider]} could not be reached.`;
        }
      }
      if (!names.length) return problem ?? (ask ? 'The folder could not be opened. Choose it again.' : undefined);
      const books = await listBooks();
      const known = folderBooks();
      const plan = planFolderScan(found.map(({ path, size }) => ({ path, size })), known, new Set(books.map((book) => book.id)), books);
      // Files already on the shelf (added by hand, or on another device): linked to that book, never added twice.
      for (const { path, bookId } of plan.link) {
        const item = found.find((each) => each.path === path)!;
        const book = books.find((each) => each.id === bookId);
        if (!book) continue;
        known[path] = { bookId, size: item.size };
        if (!book.fromFolder) await putBook({ ...book, fromFolder: path, fileSize: book.fileSize ?? item.size, updatedAt: new Date().toISOString() });
        if (!(await localFile(bookId))) await item.get().then((file) => keepFile(book, file)).catch(() => undefined);
      }
      if (plan.link.length) saveFolderBooks(known);
      let added = 0;
      for (const path of plan.add) {
        const item = found.find((each) => each.path === path)!;
        // The shelf as it is now (another device's sync may have just brought this book): linked, never added twice.
        const already = (await listBooks()).find((book) => sameFile(book, item.name, item.size));
        if (already) {
          known[path] = { bookId: already.id, size: item.size };
          saveFolderBooks(known);
          continue;
        }
        try {
          const file = await item.get();
          const { book } = await addOne({ title: item.name.replace(READABLE, ''), author: '', description: '', source: 'upload', provider: path.startsWith('onedrive:') ? 'onedrive' : path.startsWith('google:') ? 'google-drive' : path.startsWith('dropbox:') ? 'dropbox' : 'other', sourceUrl: '', fileName: item.name, file, categories: ['Personal'] }, { fromFolder: path });
          known[path] = { bookId: book.id, size: item.size };
          added += 1;
        } catch {
          // Not a readable book after all: remembered, so it is not tried at every look.
          known[path] = { bookId: '', size: item.size };
        }
        saveFolderBooks(known);
      }
      // The same file at a second path is the same book.
      for (const { path, as } of plan.same) if (known[as]) known[path] = known[as];
      if (plan.same.length) saveFolderBooks(known);
      let replaced = 0;
      for (const { path, bookId } of plan.replace) {
        const item = found.find((each) => each.path === path)!;
        const book = books.find((each) => each.id === bookId);
        if (!book) continue;
        try {
          await keepFile(book, await item.get());
          let next: TheoriaBook = { ...book, fileSize: item.size, updatedAt: new Date().toISOString() };
          if (sync.phase === 'ready') next = await makeCloudCopy(next).catch(() => next);
          await putBook(next);
          known[path] = { bookId, size: item.size };
          saveFolderBooks(known);
          replaced += 1;
        } catch {
          // Left as it was; the next look tries again.
        }
      }
      // Folder books on the shelf (from another device) that are not here yet: straight from the folder when it is
      // reachable here.
      for (const book of await listBooks()) {
        if (!book.fromFolder || (await localFile(book.id))) continue;
        const item = found.find((each) => each.path === book.fromFolder);
        if (item) await item.get().then((file) => keepFile(book, file)).catch(() => undefined);
      }
      // Copies made by another device or window before this one saw them are merged now.
      if (added) await cleanDuplicatesHere().catch(() => undefined);
      if (added || replaced) void copyBooksToFolder();
      const words = [added ? `${added === 1 ? 'One book' : `${added} books`} added from ${names.join(' and ')}` : '', replaced ? `${replaced === 1 ? 'one' : replaced} updated` : ''].filter(Boolean).join(', ');
      if (words) toast(`${words[0].toUpperCase()}${words.slice(1)}.`);
      return problem ?? (words ? `${words[0].toUpperCase()}${words.slice(1)}.` : `Nothing new in ${names.join(' or ')}.`);
    } finally {
      folderBusy.current = false;
    }
  };
  /**
   * Copies the library folder added of books already on the shelf (before it learned to link them): each merged into
   * the original (marks joined, the further place kept) and taken away, with one undo for all.
   */
  const duplicatesKept = useRef(false);
  const cleanDuplicates = () => withLock('theoria-library-folder', cleanDuplicatesHere);
  const cleanDuplicatesHere = async () => {
    // Undone: the copies stay for the rest of this visit; the next opening merges them again.
    if (duplicatesKept.current) return;
    const books = await listBooks();
    const pairs = folderDuplicates(books);
    if (!pairs.length) return;
    const knownBefore = folderBooks();
    const known = { ...knownBefore };
    const undo: (() => Promise<void>)[] = [];
    const settled = new Map<string, TheoriaBook>();
    for (const { keep: first, drop } of pairs) {
      const keep = settled.get(first.id) ?? first;
      const merged = mergeBooks(keep, drop);
      if (!(await localFile(keep.id))) {
        const theirs = await localFile(drop.id);
        if (theirs) await keepFile(merged, new File([theirs.blob], theirs.name || keep.fileName || 'book', { type: theirs.type })).catch(() => undefined);
      }
      await putBook(merged);
      settled.set(keep.id, merged);
      for (const [path, entry] of Object.entries(known)) if (entry.bookId === drop.id) known[path] = { ...entry, bookId: keep.id };
      const files = await takeAll(drop.id);
      await removeBook(drop.id);
      undo.push(async () => { await putBook(drop); await putAll(files); });
      window.setTimeout(() => { if (undo.length) void forgetCloudCopy(drop); }, 15_000);
    }
    saveFolderBooks(known);
    const originals = pairs.map(({ keep }) => keep);
    toast(`${pairs.length === 1 ? 'One duplicate book' : `${pairs.length} duplicate books`} merged into the originals.`, () => {
      const steps = undo.splice(0);
      duplicatesKept.current = true;
      void (async () => {
        for (const step of steps) await step();
        for (const book of originals) await putBook(book);
        saveFolderBooks(knownBefore);
      })();
    });
  };

  /** On every device: books from the library folder that are not here yet come from their account copies. */
  const fetching = useRef(new Set<string>());
  const fetchFolderBooks = async () => {
    if (sync.phase !== 'ready') return;
    // Books whose account copy could not be made when they were added (signed out, or the server not set up yet):
    // made now, unless the person took the copy away from that book (`cloudCopy: false`).
    for (const book of await listBooks()) {
      const wanted = book.cloudCopy === undefined && (book.fromFolder || copyNew);
      if (!wanted || !(await localFile(book.id))) continue;
      try { await putBook(await makeCloudCopy(book)); } catch { break; }
    }
    // Every book with an account copy that is not on this device yet comes down by itself.
    let brought = 0;
    for (const book of await listBooks()) {
      if (!book.cloudCopy || !book.filePath || !book.sealed || fetching.current.has(book.id)) continue;
      fetching.current.add(book.id);
      if (await localFile(book.id)) continue;
      await fetchCopy(book).then(() => { brought += 1; }).catch(() => fetching.current.delete(book.id));
    }
    if (brought) toast(`${brought === 1 ? 'One book' : `${brought} books`} brought to this device.`);
  };
  useEffect(() => {
    let last = 0;
    const look = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return;
      last = Date.now();
      void cleanDuplicates().catch(() => undefined).then(() => syncLibraryFolder()).then(() => fetchFolderBooks());
    };
    const first = window.setTimeout(look, 5000);
    document.addEventListener('visibilitychange', look);
    return () => {
      window.clearTimeout(first);
      document.removeEventListener('visibilitychange', look);
    };
    // Looks again when sync becomes ready, so copies can go up and come down.
  }, [sync.phase]);

  const loadSource = async (book = selected) => {
    if (!book) return;
    const from = await bringBook(book);
    if (from) {
      await loadText(book);
      toast(`The book is on this device now, from ${from}.`);
    } else toast(connectedClouds().length ? 'The book was not found in your storage or your account. Choose the file on this device.' : 'This book has no copy in your account. Connect the storage it is in (Settings), or choose the file on this device.');
  };
  const chooseFile = async (file: File) => {
    if (!selected) return;
    try {
      const read = await keepFile(selected, file);
      await putBook({ ...selected, chapters: read.chapters ? outline(read.chapters) : selected.chapters, pageCount: read.pageCount ?? selected.pageCount, contentFormat: read.contentFormat, fileName: file.name, fileSize: file.size, fileType: file.type, updatedAt: new Date().toISOString() });
      await loadText(selected);
      toast('The book is on this device now.');
    } catch (error) { toast(error instanceof Error ? error.message : 'That file could not be read.'); }
  };
  const setCloudCopy = async (on: boolean) => {
    if (!selected) return;
    try {
      await putBook(on ? await makeCloudCopy(selected) : await dropCloudCopy(selected));
      toast(on ? 'A sealed copy is in your account.' : 'The account copy is removed; the book stays on this device.');
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
    <aside className="theoria-sidebar"><a href="/" className="theoria-family-link">Proairetos</a><div className="theoria-brand"><TheoriaMark size={48} /><span><strong>Theoria</strong></span></div><div className="theoria-sidebar-nav">{navGroups.map((group) => <TheoriaNav view={view} onView={chooseView} items={group.items} key={group.items[0].id} />)}</div><div className="theoria-sidebar-spacer" /><button type="button" className="theoria-person" onClick={() => setView('settings')}><span>{(name || 'R').slice(0, 1).toUpperCase()}</span>{name || 'Reader'}</button></aside>
    <main className="theoria-main"><header className="theoria-topbar"><a className="theoria-mobile-brand" href="/"><TheoriaMark size={30} /><span>Theoria</span></a><span className="theoria-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><span className={'theoria-sync theoria-sync--' + sync.phase}><i />{syncWords}</span></header><div className="theoria-page">
      {view === 'library' && <LibraryHome shelf={shelf} loading={booksState.loading} error={booksState.error} onAdd={() => setAddOpen(true)} onOpen={openBook} onContinue={(book) => void openReader(book)} onShelf={() => setView('shelf')} onSearch={() => setView('search')} />}
      {view === 'shelf' && <ShelfPage shelf={shelf} onBack={() => setView('library')} onOpen={openBook} onAdd={() => setAddOpen(true)} />}
      {view === 'detail' && selected && <BookDetailView book={selected} copy={copy} onRemoveItem={(kind, id) => void removeItem(kind, id)} onExport={() => downloadBookNotes(selected)} onCloudCopy={(on) => void setCloudCopy(on)} onBack={() => setView('library')} onRead={() => void openReader(selected)} onExternal={() => void openExternal(selected)} onCapture={(kind) => openCapture(kind, selected)} onToggleFavorite={() => void toggleFavorite()} onRefresh={() => refreshMetadata(selected)} onEdit={() => setEditBookOpen(true)} onRemove={() => void removeSelectedBook()} onShelf={(shelf) => void moveToShelf(shelf)} />}
      {view === 'reader' && readerBook && <ReaderView book={readerBook} pdf={readerText?.bookId === readerBook.id ? readerText.pdf : undefined} loadingText={readerText?.loading} onChooseFile={(file) => void chooseFile(file)} theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} onBack={() => setView('detail')} onPosition={updatePosition} onHighlight={addHighlight} onCapture={(kind, selection) => openCapture(kind, selected, selection)} onBookmark={async (chapterId, location) => { if (!selected) return; await putBook({ ...selected, bookmarks: [...selected.bookmarks, { id: newId(), chapter: selected.chapters.find((item) => item.id === chapterId)?.title, location, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }); toast('Bookmark saved.'); }} onExternal={() => void openExternal(selected)} onLoadSource={loadSource} />}
      {view === 'notes' && <NotesPage notebooks={notebooks} shelf={shelf} loading={notebooksState.loading} error={notebooksState.error} onNewNotebook={() => setNotebookOpen(true)} onNewPage={newPage} onEditPage={editPage} onDeletePage={deletePage} />}
      {view === 'reflections' && <ReflectionsPage reflections={insightSets.reflections} onNew={() => openCapture('reflection')} onEdit={editReflection} onDelete={(item) => void deleteReflection(item)} />}
      {view === 'search' && <SearchPage shelf={shelf} notebooks={notebooks} reflections={insightSets.reflections} onOpen={openBook} />}
      {view === 'settings' && <SettingsPage theme={theme} font={font} onTheme={changeTheme} onFont={changeFont} copyNew={copyNew} onCopyNew={changeCopyNew} onHighlights={(file) => void bringInHighlights(file)} onYear={() => setView('year')} onCheckFolder={() => syncLibraryFolder(true)} onClearLibrary={clearLibrary} bookCount={shelf.length} driveReturn={driveReturn} folderBooksHere={shelf.some((book) => book.fromFolder)} />}
      {view === 'year' && <section className="theoria-view"><div className="family-surface"><YearPage dates={theoriaDates(shelf)} build={(year) => theoriaYear(shelf, year)} onBack={() => setView('settings')} /></div></section>}
    </div></main>
    <nav className="theoria-bottom-nav"><TheoriaNav bottom view={view} onView={chooseView} items={[{ id: 'library', label: 'Library', Icon: BookIcon }, { id: 'reader', label: 'Reader', Icon: BookmarkIcon }, { id: 'notes', label: 'Notes', Icon: PenIcon }, { id: 'reflections', label: 'Reflect', Icon: BulbIcon }, { id: 'settings', label: 'Settings', Icon: GearIcon }]} /></nav>
    {addOpen && <AddBookDialog onMany={(files) => void saveMany(files)} initialFile={launched} onClose={() => (setAddOpen(false), setLaunched(undefined))} onSave={saveBook} onLookup={lookupBookMetadata} />}{editBookOpen && selected && <EditBookDialog book={selected} onClose={() => setEditBookOpen(false)} onSave={saveBookDetails} />}{capture && <CaptureDialog kind={capture.kind} selection={capture.selection} initial={capture.initial} onClose={() => setCapture(undefined)} onSave={saveInsight} />}{notebookOpen && <NotebookDialog onClose={() => setNotebookOpen(false)} onSave={createNotebook} />}{noteState && <NotePageDialog notebooks={notebooks} shelf={shelf} current={noteState.current} onClose={() => setNoteState(undefined)} onSave={savePage} />}{notice && <div className="theoria-toast" role="status"><span>{notice.message}</span>{notice.undo && <button type="button" onClick={() => { notice.undo?.(); setNotice(undefined); }}>Undo</button>}</div>}
  </div>;
}

function TheoriaNav({ bottom = false, view, onView, items }: { bottom?: boolean; view: View; onView: (view: View) => void; items: readonly { id: View; label: string; Icon: ComponentType<{ size?: number }> }[] }) {
  return <div className="theoria-nav-list">{items.map((item) => <button type="button" key={item.id} className={view === item.id || (item.id === 'library' && view === 'shelf') ? 'is-active' : ''} onClick={() => onView(item.id)}><span><item.Icon size={19} /></span><small>{item.label}</small></button>)}{bottom && <ProairetosTab className="theoria-proairetos" size={19} />}</div>;
}
