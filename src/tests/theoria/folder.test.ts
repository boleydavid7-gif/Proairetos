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
    expect(planFolderScan(files, known, new Set(['m', 'l']))).toEqual({ add: ['New 2.md', 'New 10.md'], replace: [{ path: 'Stoics/Letters.pdf', bookId: 'l' }] });
  });
});
