import { writableFolder, writeToFolder } from '../../app/family/backupFolder';
import { folderFileName } from '../core/folder';
import { getFile } from './files';
import { listBooks } from './store';

export const BOOKS_SUB = 'Theoria books';

/**
 * Copies every book kept on this device into the family backup folder's "Theoria books", by title; a copy already
 * there with the same size is left alone. Quietly does nothing without a folder, or when the browser no longer
 * allows writing and `ask` (a tap) is not given. Returns how many files were written.
 */
export async function copyBooksToFolder(ask = false): Promise<number> {
  const folder = await writableFolder(ask).catch(() => undefined);
  if (!folder) return 0;
  const books = await listBooks();
  const titles = new Map<string, number>();
  for (const book of books) titles.set(book.title.toLowerCase(), (titles.get(book.title.toLowerCase()) ?? 0) + 1);
  let written = 0;
  for (const book of books) {
    const file = await getFile(book.id).catch(() => undefined);
    if (!file) continue;
    // Two books of one title keep apart by a short mark from their id.
    const title = (titles.get(book.title.toLowerCase()) ?? 0) > 1 ? `${book.title} (${book.id.slice(0, 4)})` : book.title;
    const name = folderFileName({ title, fileName: book.fileName ?? file.name }, file.type);
    if (await writeToFolder(folder, name, file.blob, { sub: BOOKS_SUB, keepSame: true }).catch(() => false)) written += 1;
  }
  return written;
}
