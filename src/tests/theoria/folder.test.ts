import { describe, expect, it } from 'vitest';
import { booksToAdd, folderFileName } from '../../theoria/core/folder';

const file = (name: string, size = 10, path = '') => ({ name, size, webkitRelativePath: path });

describe('bringing in a folder', () => {
  it('takes readable kinds, skips hidden files, doubles and books already on the shelf, in path order', () => {
    const picked = [
      file('Book 10.epub', 5, 'Books/Book 10.epub'),
      file('cover.jpg'),
      file('.DS_Store'),
      file('Book 2.pdf', 7, 'Books/Book 2.pdf'),
      file('Notes.md', 3, 'Books/a/Notes.md'),
      file('Book 2.pdf', 7, 'Books/copy/Book 2.pdf'),
      file('Old.txt', 4, 'Books/Old.txt'),
    ];
    const shelf = [{ fileName: 'Old.txt', fileSize: 4 }];
    expect(booksToAdd(picked, shelf).map((each) => each.webkitRelativePath)).toEqual(['Books/a/Notes.md', 'Books/Book 2.pdf', 'Books/Book 10.epub']);
  });

  it('names a book in the backup folder by its title', () => {
    expect(folderFileName({ title: 'Meditations', fileName: 'marcus.EPUB' })).toBe('Meditations.epub');
    expect(folderFileName({ title: 'Notes' }, 'application/pdf')).toBe('Notes.pdf');
  });
});

describe('keeping in step with the library folder', () => {
  it('adds new paths, replaces changed files, and never brings back a removed book', async () => {
    const { planFolderScan } = await import('../../theoria/core/folder');
    const files = [
      { path: 'Stoics/Meditations.epub', size: 100 },
      { path: 'Stoics/Letters.pdf', size: 250 },
      { path: 'Removed.txt', size: 5 },
      { path: 'New 10.md', size: 9 },
      { path: 'New 2.md', size: 9 },
      { path: 'cover.jpg', size: 9 },
      { path: '.hidden.epub', size: 9 },
    ];
    const known = {
      'Stoics/Meditations.epub': { bookId: 'm', size: 100 },
      'Stoics/Letters.pdf': { bookId: 'l', size: 200 },
      'Removed.txt': { bookId: 'r', size: 4 },
    };
    expect(planFolderScan(files, known, new Set(['m', 'l']))).toEqual({ add: ['New 2.md', 'New 10.md'], replace: [{ path: 'Stoics/Letters.pdf', bookId: 'l' }], link: [] });
  });
});

describe('the library folder and books already on the shelf', () => {
  const book = (id: string, extra: Record<string, unknown> = {}) => ({
    id, fileName: 'Meditations.epub', fileSize: 100, createdAt: `2026-10-0${id.length}T00:00:00Z`, highlights: [] as { id: string }[], notes: [] as { id: string }[], reflections: [] as { id: string }[], bookmarks: [] as { id: string }[], progress: 0, status: 'want_to_read', ...extra,
  });

  it('links a folder file to the book already on the shelf instead of adding it again', async () => {
    const { planFolderScan } = await import('../../theoria/core/folder');
    const plan = planFolderScan(
      [{ path: 'Stoics/Meditations.epub', size: 100 }, { path: 'Letters.pdf', size: 20 }, { path: 'meditations.EPUB', size: 100 }],
      {},
      new Set(['old']),
      [{ id: 'old', fileName: 'Meditations.epub', fileSize: 100 }],
    );
    expect(plan.link).toEqual([{ path: 'Stoics/Meditations.epub', bookId: 'old' }]);
    expect(plan.add).toEqual(['Letters.pdf', 'meditations.EPUB']);
  });

  it('finds the copies the folder added and merges them into the original', async () => {
    const { folderDuplicates, mergeBooks } = await import('../../theoria/core/folder');
    const original = book('a', { highlights: [{ id: 'h1' }], progress: 30, status: 'reading', lastOpenedAt: '2026-10-05' });
    const copy = book('bb', { fromFolder: 'onedrive:Meditations.epub', highlights: [{ id: 'h2' }], progress: 10, lastOpenedAt: '2026-10-09', readingPosition: { anchor: 'x' } });
    const other = book('ccc', { fileName: 'Letters.pdf' });
    const pairs = folderDuplicates([copy, original, other]);
    expect(pairs.map(({ keep, drop }) => [keep.id, drop.id])).toEqual([['a', 'bb']]);
    const merged = mergeBooks(original, copy);
    expect(merged).toMatchObject({ id: 'a', progress: 30, status: 'reading', lastOpenedAt: '2026-10-09', readingPosition: { anchor: 'x' }, fromFolder: 'onedrive:Meditations.epub' });
    expect(merged.highlights.map((each) => each.id)).toEqual(['h1', 'h2']);
  });

  it('never takes away a book added by hand', async () => {
    const { folderDuplicates } = await import('../../theoria/core/folder');
    expect(folderDuplicates([book('a'), book('bb')])).toEqual([]);
  });
});
