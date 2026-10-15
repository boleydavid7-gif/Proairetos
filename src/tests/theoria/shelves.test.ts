import { describe, expect, it } from 'vitest';
import { booksOnShelf, shelfOf } from '../../theoria/core/shelves';
import type { TheoriaStatus } from '../../theoria/core/books';

const book = (title: string, status: TheoriaStatus, extra: { author?: string; categories?: string[]; favorite?: boolean; lastOpenedAt?: string; createdAt?: string } = {}) => ({
  title,
  status,
  author: extra.author,
  categories: extra.categories ?? ['Personal'],
  favorite: extra.favorite,
  lastOpenedAt: extra.lastOpenedAt,
  createdAt: extra.createdAt ?? '2026-01-01T00:00:00Z',
});

const books = [
  book('The Republic', 'finished', { author: 'Plato', categories: ['Philosophy'], createdAt: '2026-02-01T00:00:00Z' }),
  book('Meditations', 'reading', { author: 'Marcus Aurelius', categories: ['Philosophy'], favorite: true, lastOpenedAt: '2026-10-14T00:00:00Z' }),
  book('A Brief History of Time', 'want_to_read', { author: 'Stephen Hawking', categories: ['Science'], createdAt: '2026-03-01T00:00:00Z' }),
  book('Old notes', 'archived'),
  book('Émile', 'unread', { author: 'Jean-Jacques Rousseau' }),
];

describe('Theoria shelves', () => {
  it('puts unread and want to read on To read', () => {
    expect(shelfOf('unread')).toBe('to-read');
    expect(shelfOf('want_to_read')).toBe('to-read');
  });

  it('shows all but what was put away, and one shelf when chosen', () => {
    expect(booksOnShelf(books, {}).map((each) => each.title)).not.toContain('Old notes');
    expect(booksOnShelf(books, { shelf: 'archived' }).map((each) => each.title)).toEqual(['Old notes']);
    expect(booksOnShelf(books, { shelf: 'to-read', order: 'title' }).map((each) => each.title)).toEqual(['A Brief History of Time', 'Émile']);
  });

  it('finds every word in title or author, without accents', () => {
    expect(booksOnShelf(books, { query: 'emile rousseau' }).map((each) => each.title)).toEqual(['Émile']);
    expect(booksOnShelf(books, { query: 'plato republic' })).toHaveLength(1);
    expect(booksOnShelf(books, { query: 'kant' })).toHaveLength(0);
  });

  it('filters by category or favourites and orders by title past articles, or by surname', () => {
    expect(booksOnShelf(books, { category: 'Philosophy', order: 'title' }).map((each) => each.title)).toEqual(['Meditations', 'The Republic']);
    expect(booksOnShelf(books, { category: 'Favorites' }).map((each) => each.title)).toEqual(['Meditations']);
    expect(booksOnShelf(books, { order: 'author' }).map((each) => each.author)).toEqual(['Marcus Aurelius', 'Stephen Hawking', 'Plato', 'Jean-Jacques Rousseau']);
    expect(booksOnShelf(books, { order: 'recent' })[0].title).toBe('Meditations');
  });
});
