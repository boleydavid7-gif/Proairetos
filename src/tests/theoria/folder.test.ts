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
