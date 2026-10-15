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
export type ShelfFile = { id: string; fileName?: string; fileSize?: number };

/** The same file: the same name (case aside) and, when both sizes are known, the same size. */
export const sameFile = (a: { fileName?: string; fileSize?: number }, name: string, size?: number) =>
  Boolean(a.fileName) && a.fileName!.toLowerCase() === name.toLowerCase() && (!a.fileSize || !size || a.fileSize === size);

/**
 * What a look through the library folder does: new paths become books, unless the shelf already has that file (added
 * by hand or on another device), which is then linked instead; a path already brought in whose file changed size
 * replaces that book's file (its highlights and place stay); a book taken off the shelf is not brought back. Files
 * gone from the folder leave their books as they are.
 */
export function planFolderScan(
  files: readonly { path: string; size: number }[],
  known: FolderBooks,
  onShelf: ReadonlySet<string>,
  shelf: readonly ShelfFile[] = [],
): { add: string[]; replace: { path: string; bookId: string }[]; link: { path: string; bookId: string }[] } {
  const add: string[] = [];
  const replace: { path: string; bookId: string }[] = [];
  const link: { path: string; bookId: string }[] = [];
  const linked = new Set(Object.values(known).map((each) => each.bookId));
  for (const file of files) {
    const name = file.path.split('/').pop() ?? file.path;
    if (!READABLE.test(name) || name.startsWith('.')) continue;
    const before = known[file.path];
    if (!before) {
      const there = shelf.find((book) => !linked.has(book.id) && sameFile(book, name, file.size));
      if (there) {
        link.push({ path: file.path, bookId: there.id });
        linked.add(there.id);
      } else add.push(file.path);
    } else if (before.size !== file.size && onShelf.has(before.bookId)) replace.push({ path: file.path, bookId: before.bookId });
  }
  add.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { add, replace, link };
}

type Mergeable = ShelfFile & {
  fromFolder?: string;
  createdAt: string;
  highlights: { id: string }[];
  notes: { id: string }[];
  reflections: { id: string }[];
  bookmarks: { id: string }[];
};

const marks = (book: Mergeable) => book.highlights.length + book.notes.length + book.reflections.length + book.bookmarks.length;

/**
 * Books the library folder added a second time (the same file as one already on the shelf): each pair names the book
 * to keep (one added by hand first, then the one with more of the person's own marks, then the oldest) and the copy to
 * take away. Only books the folder added are ever taken away.
 */
export function folderDuplicates<T extends Mergeable>(books: readonly T[]): { keep: T; drop: T }[] {
  const pairs: { keep: T; drop: T }[] = [];
  const taken = new Set<string>();
  for (const book of books) {
    if (!book.fileName || taken.has(book.id)) continue;
    const same = books.filter((other) => !taken.has(other.id) && sameFile(other, book.fileName!, book.fileSize));
    if (same.length < 2) continue;
    const ranked = [...same].sort((a, b) => Number(Boolean(a.fromFolder)) - Number(Boolean(b.fromFolder)) || marks(b) - marks(a) || a.createdAt.localeCompare(b.createdAt));
    const keep = ranked[0];
    for (const drop of ranked.slice(1)) {
      if (!drop.fromFolder) continue;
      pairs.push({ keep, drop });
      taken.add(drop.id);
    }
    taken.add(keep.id);
  }
  return pairs;
}

const byId = <T extends { id: string }>(first: readonly T[], second: readonly T[]) => [...first, ...second.filter((item) => !first.some((each) => each.id === item.id))];

/** The kept book with everything the copy had: marks joined, the further place, the later opening, the folder link. */
export function mergeBooks<T extends Mergeable & { progress: number; status: string; lastOpenedAt?: string; readingPosition?: unknown; readingLocation?: string; foundIn?: unknown }>(keep: T, drop: T, now = new Date()): T {
  const dropLater = (drop.lastOpenedAt ?? '') > (keep.lastOpenedAt ?? '');
  const statusRank = (status: string) => ['unread', 'want_to_read', 'archived', 'reading', 'finished'].indexOf(status);
  return {
    ...keep,
    highlights: byId(keep.highlights, drop.highlights),
    notes: byId(keep.notes, drop.notes),
    reflections: byId(keep.reflections, drop.reflections),
    bookmarks: byId(keep.bookmarks, drop.bookmarks),
    progress: Math.max(keep.progress, drop.progress),
    status: statusRank(drop.status) > statusRank(keep.status) ? drop.status : keep.status,
    lastOpenedAt: dropLater ? drop.lastOpenedAt : keep.lastOpenedAt,
    readingPosition: dropLater && drop.readingPosition ? drop.readingPosition : keep.readingPosition,
    readingLocation: dropLater && drop.readingLocation ? drop.readingLocation : keep.readingLocation,
    fromFolder: keep.fromFolder ?? drop.fromFolder,
    foundIn: keep.foundIn ?? drop.foundIn,
    fileSize: keep.fileSize ?? drop.fileSize,
    updatedAt: now.toISOString(),
  };
}
