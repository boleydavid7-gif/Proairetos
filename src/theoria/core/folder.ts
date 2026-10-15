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
