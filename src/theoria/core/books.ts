export type TheoriaSource = 'upload' | 'web' | 'cloud' | 'manual';
export type TheoriaProvider = 'google-drive' | 'dropbox' | 'onedrive' | 'other';
export type TheoriaStatus = 'unread' | 'reading' | 'finished';

export type TheoriaHighlight = {
  id: string;
  text: string;
  location?: string;
  createdAt: string;
};

export type TheoriaNote = {
  id: string;
  body: string;
  highlightId?: string;
  createdAt: string;
};

export type TheoriaBook = {
  id: string;
  userId: string;
  title: string;
  author?: string;
  source: TheoriaSource;
  provider?: TheoriaProvider;
  sourceUrl?: string;
  fileName?: string;
  coverUrl?: string;
  progress: number;
  status: TheoriaStatus;
  highlights: TheoriaHighlight[];
  notes: TheoriaNote[];
  createdAt: string;
  updatedAt: string;
};

export type NewTheoriaBook = Pick<TheoriaBook, 'title' | 'source'> & Partial<Omit<TheoriaBook, 'id' | 'userId' | 'title' | 'source' | 'createdAt' | 'updatedAt'>>;

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

export function makeBook(userId: string, input: NewTheoriaBook, now = new Date()): TheoriaBook {
  const timestamp = now.toISOString();
  return {
    id: newId(),
    userId,
    title: input.title.trim() || 'Untitled reading',
    author: input.author?.trim() || undefined,
    source: input.source,
    provider: input.provider,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    fileName: input.fileName,
    coverUrl: input.coverUrl,
    progress: normalizeProgress(input.progress),
    status: input.status ?? 'unread',
    highlights: input.highlights ?? [],
    notes: input.notes ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const featuredBooks: readonly TheoriaBook[] = [
  { id: 'featured-meditations', userId: 'featured', title: 'Meditations', author: 'Marcus Aurelius', source: 'manual', progress: 68, status: 'reading', highlights: [], notes: [], createdAt: '', updatedAt: '' },
  { id: 'featured-republic', userId: 'featured', title: 'The Republic', author: 'Plato', source: 'manual', progress: 24, status: 'reading', highlights: [], notes: [], createdAt: '', updatedAt: '' },
  { id: 'featured-letters', userId: 'featured', title: 'Letters from a Stoic', author: 'Seneca', source: 'manual', progress: 42, status: 'reading', highlights: [], notes: [], createdAt: '', updatedAt: '' },
  { id: 'featured-walden', userId: 'featured', title: 'Walden', author: 'Henry David Thoreau', source: 'manual', progress: 12, status: 'unread', highlights: [], notes: [], createdAt: '', updatedAt: '' },
];
