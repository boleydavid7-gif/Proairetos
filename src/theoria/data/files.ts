import type { TheoriaChapter } from '../core/books';

/*
 * A book's text and its file live on this device, in their own database, apart from the book's record. The
 * record (title, position, highlights, notes) is what syncs; the text never rides along with every change.
 * A copy can go to the account if the person chooses, sealed with their key first (`cloudCopy.ts`).
 */
const NAME = 'theoria-files';
const VERSION = 1;
const TEXTS = 'texts';
const FILES = 'files';
const COVERS = 'covers';

export type StoredText = { bookId: string; chapters: TheoriaChapter[] };
export type StoredFile = { bookId: string; name: string; type: string; blob: Blob };
export type StoredCover = { bookId: string; blob: Blob };

let opened: Promise<IDBDatabase | null> | undefined;

function db(): Promise<IDBDatabase | null> {
  opened ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const store of [TEXTS, FILES, COVERS]) if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: 'bookId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return opened;
}

const memory = { [TEXTS]: new Map<string, unknown>(), [FILES]: new Map<string, unknown>(), [COVERS]: new Map<string, unknown>() };

async function get<T>(store: string, bookId: string): Promise<T | undefined> {
  const database = await db();
  if (!database) return memory[store as keyof typeof memory].get(bookId) as T | undefined;
  return new Promise((resolve) => {
    const request = database.transaction(store, 'readonly').objectStore(store).get(bookId);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => resolve(undefined);
  });
}

async function put(store: string, value: { bookId: string }): Promise<void> {
  const database = await db();
  if (!database) {
    memory[store as keyof typeof memory].set(value.bookId, value);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(store, 'readwrite');
    transaction.objectStore(store).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('The book could not be kept on this device.'));
  });
}

async function remove(store: string, bookId: string): Promise<void> {
  const database = await db();
  if (!database) {
    memory[store as keyof typeof memory].delete(bookId);
    return;
  }
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(store, 'readwrite');
    transaction.objectStore(store).delete(bookId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
}

export const getText = (bookId: string) => get<StoredText>(TEXTS, bookId);
export const putText = (text: StoredText) => put(TEXTS, text);
export const getFile = (bookId: string) => get<StoredFile>(FILES, bookId);
export const putFile = (file: StoredFile) => put(FILES, file);
export const getCover = (bookId: string) => get<StoredCover>(COVERS, bookId);
export const putCover = (cover: StoredCover) => put(COVERS, cover);

/** Everything kept for a book on this device, to remove it, or to put it back on undo. */
export async function takeAll(bookId: string): Promise<{ text?: StoredText; file?: StoredFile; cover?: StoredCover }> {
  const kept = { text: await getText(bookId), file: await getFile(bookId), cover: await getCover(bookId) };
  await Promise.all([remove(TEXTS, bookId), remove(FILES, bookId), remove(COVERS, bookId)]);
  return kept;
}

export async function putAll(kept: { text?: StoredText; file?: StoredFile; cover?: StoredCover }): Promise<void> {
  if (kept.text) await putText(kept.text);
  if (kept.file) await putFile(kept.file);
  if (kept.cover) await putCover(kept.cover);
}

/** Chapters without their text, as the synced record keeps them. */
export const outline = (chapters: readonly TheoriaChapter[]): TheoriaChapter[] =>
  chapters.map(({ content: _content, ...rest }) => rest);

/**
 * Plain text in parts the reader can page through: by headings when there are any (Markdown `#` lines, or
 * lines such as "Chapter 3" or "BOOK II"), otherwise every forty paragraphs. Nothing is cut.
 */
export function splitText(text: string, markdown: boolean): TheoriaChapter[] {
  const clean = text.replace(/\r\n?/g, '\n').trim();
  if (!clean) return [];
  const lines = clean.split('\n');
  const heading = (line: string) =>
    (markdown && /^#{1,3}\s+\S/.test(line)) || /^(chapter|book|part|section)\s+([0-9]+|[ivxlcdm]+)\b/i.test(line.trim());
  const parts: { title: string; lines: string[] }[] = [];
  for (const line of lines) {
    if (heading(line)) parts.push({ title: line.replace(/^#+\s*/, '').trim().slice(0, 120), lines: [] });
    else {
      if (parts.length === 0) parts.push({ title: '', lines: [] });
      parts[parts.length - 1].lines.push(line);
    }
  }
  const sections = parts.filter((part) => part.title || part.lines.join('').trim());
  const named = sections.length > 1 || Boolean(sections[0]?.title);
  if (named) {
    return sections.map((part, index) => ({
      id: `part-${index + 1}`,
      title: part.title || (index === 0 ? 'Opening' : `Part ${index + 1}`),
      order: index + 1,
      content: part.lines.join('\n').trim(),
    }));
  }
  const paragraphs = clean.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: TheoriaChapter[] = [];
  for (let start = 0; start < paragraphs.length; start += 40) {
    const order = chunks.length + 1;
    chunks.push({ id: `part-${order}`, title: `Part ${order}`, order, content: paragraphs.slice(start, start + 40).join('\n\n') });
  }
  return chunks;
}
