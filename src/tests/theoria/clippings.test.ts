import { describe, expect, it } from 'vitest';
import { addImported, fromKindleClippings, fromReadwiseCsv, readHighlightsFile } from '../../theoria/core/clippings';
import { makeBook } from '../../theoria/core/books';

const kindle = `﻿Meditations (Marcus Aurelius)
- Your Highlight on page 12 | Location 180-182 | Added on Monday, March 4, 2024 10:22:13 PM

You have power over your mind, not outside events.
==========
Meditations (Marcus Aurelius)
- Your Note on page 12 | Location 182 | Added on Monday, March 4, 2024 10:23:01 PM

Read this again in the morning.
==========
Meditations (Marcus Aurelius)
- Your Bookmark on page 30 | Location 400 | Added on Tuesday, March 5, 2024 7:00:00 AM


==========
Letters from a Stoic (Seneca)
- Your Highlight at location 99-100 | Added on Friday, April 5, 2024 8:00:00 AM

We suffer more often in imagination than in reality.
==========
`;

describe('highlights from elsewhere', () => {
  it('reads a Kindle clippings file, with notes beside their highlight and bookmarks left out', () => {
    const books = fromKindleClippings(kindle);
    expect(books.map((book) => [book.title, book.author, book.highlights.length])).toEqual([
      ['Meditations', 'Marcus Aurelius', 1],
      ['Letters from a Stoic', 'Seneca', 1],
    ]);
    expect(books[0].highlights[0]).toMatchObject({ text: 'You have power over your mind, not outside events.', note: 'Read this again in the morning.', location: 'Location 180-182' });
    expect(books[0].highlights[0].at?.slice(0, 10)).toBe('2024-03-04');
  });

  it('reads a Readwise export', () => {
    const csv = 'Highlight,Book Title,Book Author,Amazon Book ID,Note,Color,Tags,Location Type,Location,Highlighted at,Document tags\n"The obstacle is the way.",The Obstacle Is the Way,Ryan Holiday,,"Use at work",yellow,,location,1200,2024-05-01 10:00:00+00:00,\n';
    expect(fromReadwiseCsv(csv)).toEqual([
      { title: 'The Obstacle Is the Way', author: 'Ryan Holiday', highlights: [{ text: 'The obstacle is the way.', location: 'Location 1200', at: '2024-05-01T10:00:00.000Z', note: 'Use at work' }] },
    ]);
    expect(readHighlightsFile(csv, 'readwise.csv')).toHaveLength(1);
  });

  it('adds to a book already on the shelf, makes the others, and never adds a highlight twice', () => {
    const shelf = [makeBook('me', { title: 'meditations', author: 'Marcus Aurelius', source: 'upload' })];
    const first = addImported(shelf, fromKindleClippings(kindle), 'me');
    expect(first.count).toBe(2);
    expect(first.changed.map((book) => book.title)).toEqual(['meditations']);
    expect(first.changed[0].notes[0]).toMatchObject({ body: 'Read this again in the morning.', highlightId: first.changed[0].highlights[0].id });
    expect(first.added.map((book) => [book.title, book.source, book.highlights.length])).toEqual([['Letters from a Stoic', 'manual', 1]]);

    const again = addImported([...first.changed, ...first.added], fromKindleClippings(kindle), 'me');
    expect(again).toEqual({ changed: [], added: [], count: 0 });
  });
});
