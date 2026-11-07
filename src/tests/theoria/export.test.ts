import { describe, expect, it } from 'vitest';
import { bookMarkdown, highlightOfDay } from '../../theoria/core/export';
import { makeBook } from '../../theoria/core/books';

const book = makeBook('local', {
  title: 'Letters from a Stoic',
  author: 'Seneca',
  source: 'upload',
  highlights: [{ id: 'h2', text: 'Nothing is ours except time.', chapter: 'Letter 1', createdAt: '2026-10-02' }, { id: 'h1', text: 'Hold every hour.', createdAt: '2026-10-01' }],
  notes: [{ id: 'n', body: 'Time as the one possession.', chapter: 'Letter 1', createdAt: '2026-10-03' }],
  reflections: [{ id: 'r', content: 'On wasted hours.', answers: { remember: 'Count the hours given away.' }, createdAt: '2026-10-04' }],
});

describe('exporting a book', () => {
  it('writes the person’s highlights, notes and reflections as Markdown, oldest first', () => {
    const text = bookMarkdown(book);
    expect(text.startsWith('# Letters from a Stoic\n\n*Seneca*')).toBe(true);
    expect(text.indexOf('> Hold every hour.')).toBeLessThan(text.indexOf('> Nothing is ours except time.'));
    expect(text).toContain('## Notes\n\nTime as the one possession.\n\n*Letter 1*');
    expect(text).toContain('**What I want to remember:** Count the hours given away.');
    expect(text).not.toContain('## Bookmarks');
  });
});

describe('a highlight a day', () => {
  it('stays the same through a day and is none without highlights', () => {
    const one = highlightOfDay([book], '2026-10-10');
    expect(one).toEqual(highlightOfDay([book], '2026-10-10'));
    expect(one?.title).toBe('Letters from a Stoic');
    expect(highlightOfDay([{ ...book, highlights: [] }], '2026-10-10')).toBeUndefined();
    const days = new Set(Array.from({ length: 10 }, (_, index) => highlightOfDay([book], `2026-10-${10 + index}`)?.text));
    expect(days.size).toBe(2);
  });
});
