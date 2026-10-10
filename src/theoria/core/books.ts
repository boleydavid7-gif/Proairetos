export type TheoriaSource = 'upload' | 'web' | 'cloud' | 'manual';
export type TheoriaProvider = 'google-drive' | 'dropbox' | 'onedrive' | 'other';
export type TheoriaStatus = 'unread' | 'want_to_read' | 'reading' | 'finished' | 'archived';
export type TheoriaCategory = 'Philosophy' | 'Science' | 'Psychology' | 'History' | 'Leadership' | 'Personal' | string;
export type ReadingTheme = 'paper' | 'night' | 'sepia';
export type ReadingFont = 'serif' | 'sans' | 'dyslexia';
export type ConnectionRelationship = 'related' | 'supports' | 'contradicts' | 'inspired' | 'expanded';

export type TheoriaChapter = { id: string; title: string; order: number; location?: string; content?: string };
export type TheoriaReadingPosition = { chapterId?: string; paragraphIndex?: number; anchor?: string; updatedAt: string };
export type TheoriaHighlight = { id: string; text: string; location?: string; chapter?: string; color?: 'gold' | 'blue' | 'purple' | 'green'; createdAt: string };
export type TheoriaNote = { id: string; body: string; title?: string; highlightId?: string; chapter?: string; location?: string; createdAt: string; updatedAt?: string };
export type TheoriaReflection = { id: string; content: string; title?: string; highlightId?: string; chapter?: string; location?: string; answers?: { stoodOut?: string; why?: string; challenge?: string; apply?: string; remember?: string }; createdAt: string; updatedAt?: string };
export type TheoriaBookmark = { id: string; location: string; chapter?: string; label?: string; createdAt: string };
export type TheoriaIdea = { id: string; title: string; description?: string; createdAt: string };
export type TheoriaConnection = { id: string; sourceId: string; targetId: string; relationship: ConnectionRelationship; createdAt: string };

export type TheoriaNotePage = { id: string; title: string; body: string; bookId?: string; chapterId?: string; highlightId?: string; createdAt: string; updatedAt: string };
export type TheoriaNoteSection = { id: string; title: string; pages: TheoriaNotePage[] };
export type TheoriaNotebook = { id: string; userId: string; title: string; sections: TheoriaNoteSection[]; createdAt: string; updatedAt: string };

export type TheoriaBook = {
  id: string;
  userId: string;
  title: string;
  author?: string;
  description?: string;
  source: TheoriaSource;
  provider?: TheoriaProvider;
  sourceUrl?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  fileType?: string;
  contentFormat?: 'text' | 'markdown' | 'epub' | 'pdf';
  contentPreview?: string;
  coverUrl?: string;
  coverPath?: string;
  publisher?: string;
  language?: string;
  publicationDate?: string;
  categories: TheoriaCategory[];
  progress: number;
  status: TheoriaStatus;
  favorite?: boolean;
  chapters: TheoriaChapter[];
  highlights: TheoriaHighlight[];
  notes: TheoriaNote[];
  reflections: TheoriaReflection[];
  bookmarks: TheoriaBookmark[];
  ideas: TheoriaIdea[];
  connections: TheoriaConnection[];
  readingLocation?: string;
  readingPosition?: TheoriaReadingPosition;
  /** The file and cover in `filePath` / `coverPath` are sealed with the account key (from this version on). */
  sealed?: boolean;
  coverSealed?: boolean;
  /** A sealed copy of the file is kept in the account, by the person's choice. */
  cloudCopy?: boolean;
  /** For a PDF, its number of pages. */
  pageCount?: number;
  lastOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewTheoriaBook = Pick<TheoriaBook, 'title' | 'source'> & Partial<Omit<TheoriaBook, 'id' | 'userId' | 'title' | 'source' | 'createdAt' | 'updatedAt'>>;

export type NewTheoriaNotebook = Pick<TheoriaNotebook, 'title'> & Partial<Pick<TheoriaNotebook, 'sections'>>;

export function normalizeProgress(value: unknown): number {
  const progress = Number(value);
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
}

export function sourceLabel(book: Pick<TheoriaBook, 'source' | 'provider'>): string {
  if (book.source === 'upload') return 'On this device';
  if (book.source === 'web') return 'Web article';
  if (book.source === 'manual') return 'External source';
  if (book.provider === 'google-drive') return 'Google Drive';
  if (book.provider === 'dropbox') return 'Dropbox';
  if (book.provider === 'onedrive') return 'OneDrive';
  return 'Cloud link';
}

export function statusLabel(status: TheoriaStatus): string {
  if (status === 'unread' || status === 'want_to_read') return 'Want to read';
  if (status === 'reading') return 'Reading';
  if (status === 'finished') return 'Finished';
  return 'Archived';
}

export function makeBook(userId: string, input: NewTheoriaBook, now = new Date()): TheoriaBook {
  const timestamp = now.toISOString();
  return {
    id: newId(), userId, title: input.title.trim() || 'Untitled reading', author: input.author?.trim() || undefined,
    description: input.description?.trim() || undefined, source: input.source, provider: input.provider,
    sourceUrl: input.sourceUrl?.trim() || undefined, fileName: input.fileName, filePath: input.filePath, fileSize: input.fileSize, fileType: input.fileType, contentFormat: input.contentFormat, contentPreview: input.contentPreview, coverUrl: input.coverUrl, coverPath: input.coverPath,
    publisher: input.publisher, language: input.language ?? 'English', publicationDate: input.publicationDate,
    categories: input.categories?.length ? input.categories : ['Personal'], progress: normalizeProgress(input.progress), favorite: input.favorite ?? false,
    status: input.status ?? 'want_to_read', chapters: input.chapters ?? [], highlights: input.highlights ?? [], notes: input.notes ?? [],
    reflections: input.reflections ?? [], bookmarks: input.bookmarks ?? [], ideas: input.ideas ?? [], connections: input.connections ?? [],
    readingLocation: input.readingLocation, readingPosition: input.readingPosition, lastOpenedAt: input.lastOpenedAt, pageCount: input.pageCount, createdAt: timestamp, updatedAt: timestamp,
  };
}

/** Keeps shelves created by the first Theoria release readable after new fields arrive. */
export function normalizeBook(value: TheoriaBook): TheoriaBook {
  return {
    ...value,
    categories: value.categories?.length ? value.categories : ['Personal'],
    chapters: value.chapters ?? [],
    highlights: value.highlights ?? [],
    notes: value.notes ?? [],
    reflections: value.reflections ?? [],
    bookmarks: value.bookmarks ?? [],
    ideas: value.ideas ?? [],
    connections: value.connections ?? [],
    status: value.status === 'unread' ? 'want_to_read' : value.status ?? 'want_to_read',
    favorite: value.favorite ?? false,
    readingPosition: value.readingPosition,
  };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeNotebook(userId: string, input: NewTheoriaNotebook, now = new Date()): TheoriaNotebook {
  const timestamp = now.toISOString();
  return { id: newId(), userId, title: input.title.trim() || 'Untitled notebook', sections: input.sections ?? [], createdAt: timestamp, updatedAt: timestamp };
}

export function normalizeNotebook(value: TheoriaNotebook): TheoriaNotebook {
  return { ...value, sections: (value.sections ?? []).map((section) => ({ ...section, pages: (section.pages ?? []).map((page) => ({ ...page, body: page.body ?? '', title: page.title || 'Untitled page' })) })) };
}
