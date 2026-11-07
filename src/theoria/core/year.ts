import { countText, facts, inYear, type Year } from '../../core/year/year';
import type { TheoriaBook } from './books';

/** Reading in a year: books added, highlights, notes and reflections, and each book's highlights. */
export function theoriaYear(books: readonly TheoriaBook[], year: number): Year {
  const added = books.filter((book) => inYear(book.createdAt, year)).length;
  const count = (pick: (book: TheoriaBook) => readonly { createdAt: string }[]) => books.reduce((sum, book) => sum + pick(book).filter((each) => inYear(each.createdAt, year)).length, 0);
  const highlights = count((book) => book.highlights);
  const notes = count((book) => book.notes);
  const reflections = count((book) => book.reflections);
  const byBook = books
    .map((book) => ({ book, n: book.highlights.filter((each) => inYear(each.createdAt, year)).length }))
    .filter((each) => each.n > 0)
    .sort((a, b) => b.n - a.n || a.book.title.localeCompare(b.book.title));
  return {
    facts: facts(
      ['Books added', added > 0 && countText(added)],
      ['Highlights', highlights > 0 && countText(highlights)],
      ['Notes', notes > 0 && countText(notes)],
      ['Reflections', reflections > 0 && countText(reflections)],
    ),
    lists: [{ title: 'Highlights by book', lines: byBook.map(({ book, n }) => `${book.title}${book.author ? `, ${book.author}` : ''}: ${countText(n)}`) }].filter((list) => list.lines.length),
  };
}

export const theoriaDates = (books: readonly TheoriaBook[]) => books.flatMap((book) => [book.createdAt, ...book.highlights.map((each) => each.createdAt), ...book.notes.map((each) => each.createdAt), ...book.reflections.map((each) => each.createdAt)]);
