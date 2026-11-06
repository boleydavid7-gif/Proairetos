import { present, type Provider } from '../../core/providers';
import type { TheoriaBook } from '../core/books';

/* Books: title, author, the person's highlights and notes. Not the book's text or file (manifest, theoria.search). */
export const theoriaSearch: Provider<'search'> = {
  app: 'theoria',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['theoriaBooks'],
  async read(ctx) {
    return (await ctx.records<TheoriaBook>('theoriaBooks')).map((book) => ({
      ref: { app: 'theoria' as const, kind: 'book', id: book.id },
      title: book.title,
      titleField: 'book title',
      fields: present(
        { name: 'author', text: book.author },
        { name: 'highlights', text: book.highlights.map((highlight) => highlight.text).join('\n') },
        { name: 'reading notes', text: book.notes.map((note) => note.body).join('\n') },
      ),
      at: book.updatedAt,
      label: 'Book in Theoria',
      open: '/theoria/',
    }));
  },
};
