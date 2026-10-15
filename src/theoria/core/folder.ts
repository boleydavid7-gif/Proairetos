/*
 * Bringing in many books at once: from several chosen files or a whole folder (its subfolders too). Only the kinds
 * Theoria reads are taken, and a file already on the shelf (same name and size) is left out.
 */

export const READABLE = /\.(epub|pdf|txt|md|markdown)$/i;

type Picked = { name: string; size: number; webkitRelativePath?: string };

export function booksToAdd<T extends Picked>(files: readonly T[], shelf: readonly { fileName?: string; fileSize?: number }[]): T[] {
  const there = new Set(shelf.filter((book) => book.fileName).map((book) => `${book.fileName}\n${book.fileSize ?? ''}`));
  const seen = new Set<string>();
  return files
    .filter((file) => READABLE.test(file.name) && !file.name.startsWith('.'))
    .filter((file) => {
      const key = `${file.name}\n${file.size}`;
      const keyNoSize = `${file.name}\n`;
      if (there.has(key) || there.has(keyNoSize) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));
}

/** The file name a book gets in the backup folder: its title, and the extension it came with. */
export function folderFileName(book: { title: string; fileName?: string }, type = ''): string {
  const extension = book.fileName?.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? (type.includes('pdf') ? '.pdf' : type.includes('epub') ? '.epub' : type.includes('markdown') ? '.md' : '.txt');
  return `${book.title}${extension.toLowerCase()}`;
}

/** What the library folder brought in, by path within it: the book made from it and the file's size then. */
export type FolderBooks = Record<string, { bookId: string; size: number }>;

/**
 * What a look through the library folder does: new paths become books; a path already brought in whose file
 * changed size replaces that book's file (its highlights and place stay); a book taken off the shelf is not brought
 * back. Files gone from the folder leave their books as they are.
 */
export function planFolderScan(files: readonly { path: string; size: number }[], known: FolderBooks, onShelf: ReadonlySet<string>): { add: string[]; replace: { path: string; bookId: string }[] } {
  const add: string[] = [];
  const replace: { path: string; bookId: string }[] = [];
  for (const file of files) {
    const name = file.path.split('/').pop() ?? file.path;
    if (!READABLE.test(name) || name.startsWith('.')) continue;
    const before = known[file.path];
    if (!before) add.push(file.path);
    else if (before.size !== file.size && onShelf.has(before.bookId)) replace.push({ path: file.path, bookId: before.bookId });
  }
  add.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { add, replace };
}
