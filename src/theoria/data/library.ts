import type { TheoriaBook, TheoriaChapter } from '../core/books';
import { getCover, getFile, getText, outline, putCover, putFile, putText, splitText } from './files';
import { inspectReadingFile, PREVIEW_LENGTH, type ImportedReading } from './importers';
import { downloadPlain, downloadSealed, removeFromAccount, uploadSealed } from './cloudCopy';

/** Keeps a newly added book on this device: its full text, its file and its cover. */
export async function keepLocally(bookId: string, file: File | undefined, read: ImportedReading | undefined): Promise<void> {
  if (read?.chapters?.length) await putText({ bookId, chapters: read.chapters });
  if (file) await putFile({ bookId, name: file.name, type: file.type, blob: file });
  if (read?.coverFile) await putCover({ bookId, blob: read.coverFile });
}

/** The book's chapters with their text, from this device; undefined when the text is not here. */
export async function readableChapters(bookId: string): Promise<TheoriaChapter[] | undefined> {
  return (await getText(bookId))?.chapters;
}

export const localFile = (bookId: string) => getFile(bookId);

/** A picture for the cover: kept here, a public one from Open Library, or the sealed copy fetched once. */
export async function coverSource(book: TheoriaBook): Promise<string | undefined> {
  const kept = await getCover(book.id);
  if (kept) return URL.createObjectURL(kept.blob);
  if (book.coverUrl && /^https?:/.test(book.coverUrl)) return book.coverUrl;
  if (book.coverPath && book.coverSealed) {
    try {
      const blob = await downloadSealed('cover', book.id, book.coverPath, 'image/jpeg');
      await putCover({ bookId: book.id, blob });
      return URL.createObjectURL(blob);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Sends a sealed copy of the file (and cover) to the account; returns the record to save. */
export async function makeCloudCopy(book: TheoriaBook): Promise<TheoriaBook> {
  const file = await getFile(book.id);
  if (!file) throw new Error('The file is not on this device, so there is nothing to copy.');
  const filePath = await uploadSealed('book', book.id, file.blob);
  let next: TheoriaBook = { ...book, filePath, sealed: true, cloudCopy: true, updatedAt: new Date().toISOString() };
  const cover = await getCover(book.id);
  if (cover) {
    try {
      next = { ...next, coverPath: await uploadSealed('cover', book.id, cover.blob), coverSealed: true };
    } catch {
      // The cover can follow next time.
    }
  }
  return next;
}

/** Takes the account copy away; the book stays on this device. */
export async function dropCloudCopy(book: TheoriaBook): Promise<TheoriaBook> {
  if (book.filePath) await removeFromAccount('book', book.filePath);
  if (book.coverPath) await removeFromAccount('cover', book.coverPath);
  return { ...book, filePath: undefined, coverPath: undefined, sealed: undefined, coverSealed: undefined, cloudCopy: false, updatedAt: new Date().toISOString() };
}

/** Removes the account copy for good (after the undo window of a removed book). */
export async function forgetCloudCopy(book: TheoriaBook): Promise<void> {
  if (book.filePath) await removeFromAccount('book', book.filePath);
  if (book.coverPath) await removeFromAccount('cover', book.coverPath);
}

/** On another device: fetches the sealed copy, reads it, and keeps it here. */
export async function fetchCopy(book: TheoriaBook): Promise<void> {
  if (!book.filePath || !book.sealed) throw new Error('This book has no copy in your account. Add the file on this device.');
  const blob = await downloadSealed('book', book.id, book.filePath, book.fileType ?? '');
  await keepFile(book, new File([blob], book.fileName ?? 'book', { type: book.fileType ?? blob.type }));
}

/** Reads a file chosen (or fetched) for a book already on the shelf and keeps it here. */
export async function keepFile(book: TheoriaBook, file: File): Promise<ImportedReading> {
  const read = await inspectReadingFile(file);
  await keepLocally(book.id, file, read);
  return read;
}

const migrating = new Set<string>();

/**
 * Books saved by the first version: their whole text sat in the synced record, a text file was cut at 18,000
 * characters, and files and covers went to the account unsealed. Each is moved once: the text to this device,
 * the file fetched, kept here and sealed (when the account is unlocked), the unsealed copies removed.
 * Returns the record to save, or undefined when nothing changed.
 */
export async function migrateBook(book: TheoriaBook): Promise<TheoriaBook | undefined> {
  if (migrating.has(book.id)) return undefined;
  migrating.add(book.id);
  try {
    let next = book;
    let changed = false;
    const withText = book.chapters.filter((chapter) => chapter.content?.trim());
    if (withText.length) {
      if (!(await getText(book.id))) await putText({ bookId: book.id, chapters: book.chapters });
      next = { ...next, chapters: outline(book.chapters) };
      changed = true;
    }
    if ((book.contentPreview?.length ?? 0) > PREVIEW_LENGTH) {
      if (!withText.length && !(await getText(book.id))) {
        await putText({ bookId: book.id, chapters: splitText(book.contentPreview!, book.contentFormat === 'markdown') });
      }
      next = { ...next, contentPreview: book.contentPreview!.slice(0, PREVIEW_LENGTH) };
      changed = true;
    }
    if (book.filePath && !book.sealed) {
      try {
        const blob = await downloadPlain('book', book.filePath);
        if (blob) {
          const file = new File([blob], book.fileName ?? 'book', { type: book.fileType ?? blob.type });
          const read = await keepFile(next, file).catch(() => undefined);
          if (read?.chapters?.length) next = { ...next, chapters: outline(read.chapters), pageCount: read.pageCount ?? next.pageCount };
          const sealedPath = await uploadSealed('book', book.id, blob);
          await removeFromAccount('book', book.filePath);
          next = { ...next, filePath: sealedPath, sealed: true, cloudCopy: true };
          changed = true;
        }
      } catch {
        // Not signed in or offline: tried again next time.
      }
    }
    if (book.coverPath && !book.coverSealed) {
      try {
        const blob = await downloadPlain('cover', book.coverPath);
        if (blob) {
          await putCover({ bookId: book.id, blob });
          const sealedPath = await uploadSealed('cover', book.id, blob);
          await removeFromAccount('cover', book.coverPath);
          next = { ...next, coverPath: sealedPath, coverSealed: true };
          changed = true;
        }
      } catch {
        // Tried again next time.
      }
    }
    return changed ? { ...next, updatedAt: new Date().toISOString() } : undefined;
  } finally {
    migrating.delete(book.id);
  }
}
