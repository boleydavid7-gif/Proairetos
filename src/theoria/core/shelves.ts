import type { TheoriaBook, TheoriaStatus } from './books';

/** Where a book sits: the person moves it; opening a book to read moves it to Reading. */
export type Shelf = 'reading' | 'to-read' | 'finished' | 'archived';
export const SHELVES: { id: Shelf; label: string; status: TheoriaStatus }[] = [
  { id: 'reading', label: 'Reading', status: 'reading' },
  { id: 'to-read', label: 'To read', status: 'want_to_read' },
  { id: 'finished', label: 'Finished', status: 'finished' },
  { id: 'archived', label: 'Put away', status: 'archived' },
];

export function shelfOf(status: TheoriaStatus): Shelf {
  if (status === 'reading') return 'reading';
  if (status === 'finished') return 'finished';
  if (status === 'archived') return 'archived';
  return 'to-read';
}

export type ShelfOrder = 'recent' | 'title' | 'author' | 'added';
export const ORDERS: { id: ShelfOrder; label: string }[] = [
  { id: 'recent', label: 'Last opened' },
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
  { id: 'added', label: 'Added' },
];

type Shown = Pick<TheoriaBook, 'title' | 'author' | 'status' | 'categories' | 'favorite' | 'lastOpenedAt' | 'createdAt'>;

const plain = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sortTitle = (title: string) => plain(title).replace(/^(the|a|an)\s+/, '');
const surname = (author?: string) => plain(author?.split(/[,&]| and /)[0].trim().split(/\s+/).pop() ?? '');

/**
 * The books to show: one shelf (or all but those put away), one category or favourites, every typed word found in
 * the title or author, in the chosen order.
 */
export function booksOnShelf<T extends Shown>(books: readonly T[], choice: { shelf?: Shelf; category?: string; query?: string; order?: ShelfOrder }): T[] {
  const words = plain(choice.query ?? '').split(/\s+/).filter(Boolean);
  const shown = books.filter((book) => {
    const shelf = shelfOf(book.status);
    if (choice.shelf ? shelf !== choice.shelf : shelf === 'archived') return false;
    if (choice.category === 'Favorites' && !book.favorite) return false;
    if (choice.category && choice.category !== 'All' && choice.category !== 'Favorites' && !book.categories.includes(choice.category)) return false;
    const text = plain(`${book.title} ${book.author ?? ''}`);
    return words.every((word) => text.includes(word));
  });
  const order = choice.order ?? 'recent';
  return shown.sort((a, b) => {
    if (order === 'title') return sortTitle(a.title).localeCompare(sortTitle(b.title));
    if (order === 'author') return surname(a.author).localeCompare(surname(b.author)) || sortTitle(a.title).localeCompare(sortTitle(b.title));
    if (order === 'added') return b.createdAt.localeCompare(a.createdAt);
    return (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt);
  });
}
