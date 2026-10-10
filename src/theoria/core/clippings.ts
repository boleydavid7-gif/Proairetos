import { parseCsv } from '../../core/import/readers';
import { makeBook, newId, type TheoriaBook, type TheoriaHighlight, type TheoriaNote } from './books';

/**
 * Highlights kept elsewhere, brought onto the shelf: a Kindle's "My Clippings.txt" or a Readwise CSV export.
 * Each book is matched to one already on the shelf by title (and author when both have one), or added as a
 * book with no file; a highlight already there is not added twice.
 */
export type ImportedBook = { title: string; author?: string; highlights: { text: string; location?: string; at?: string; note?: string }[] };

const clean = (text: string) => text.replace(/^﻿/, '').replace(/\s+/g, ' ').trim();
const key = (text: string) => clean(text).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '');

/** "Meditations (Marcus Aurelius)" → title and author. */
function titleAndAuthor(line: string): { title: string; author?: string } {
  const match = clean(line).match(/^(.*)\(([^()]*)\)\s*$/);
  return match ? { title: clean(match[1]), author: clean(match[2]) || undefined } : { title: clean(line) };
}

/** A Kindle's clippings file: highlights and notes, book by book; bookmarks are left out. */
export function fromKindleClippings(text: string): ImportedBook[] {
  const books = new Map<string, ImportedBook>();
  for (const block of text.replace(/\r\n?/g, '\n').split(/^==========\s*$/m)) {
    const lines = block.split('\n').map((line) => line.trim());
    while (lines.length && !lines[0]) lines.shift();
    if (lines.length < 3) continue;
    const meta = lines[1];
    if (!/^-\s/.test(meta)) continue;
    const body = clean(lines.slice(2).join(' '));
    if (!body) continue;
    const kind = /\bnote\b/i.test(meta.split('|')[0]) ? 'note' : /\bbookmark\b/i.test(meta) ? 'bookmark' : 'highlight';
    if (kind === 'bookmark') continue;
    const place = meta.match(/(?:location|loc\.?)\s+([\d-]+)/i)?.[1];
    const page = meta.match(/page\s+([\d-]+)/i)?.[1];
    const location = place ? `Location ${place}` : page ? `Page ${page}` : undefined;
    const added = meta.match(/Added on\s+(.+)$/i)?.[1];
    const at = added && !Number.isNaN(Date.parse(added.replace(/^\w+,\s*/, ''))) ? new Date(Date.parse(added.replace(/^\w+,\s*/, ''))).toISOString() : undefined;
    const { title, author } = titleAndAuthor(lines[0]);
    const id = key(title);
    const book = books.get(id) ?? { title, author, highlights: [] };
    books.set(id, book);
    if (kind === 'note') {
      // A Kindle note follows the highlight it belongs to, at the same place.
      const last = book.highlights.at(-1);
      if (last && (!location || !last.location || last.location.split(/\D+/).some((n) => n && location.includes(n)))) last.note = body;
      else book.highlights.push({ text: '', location, at, note: body });
    } else {
      book.highlights.push({ text: body, location, at });
    }
  }
  return [...books.values()].filter((book) => book.highlights.length > 0);
}

/** A Readwise CSV export (Highlight, Book Title, Book Author, Note, Location, Highlighted at…). */
export function fromReadwiseCsv(text: string): ImportedBook[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const [highlight, title, author, note, location, at] = ['highlight', 'book title', 'book author', 'note', 'location', 'highlighted at'].map(column);
  if (highlight < 0 || title < 0) return [];
  const books = new Map<string, ImportedBook>();
  for (const row of rows.slice(1)) {
    const textValue = clean(row[highlight] ?? '');
    const titleValue = clean(row[title] ?? '');
    if (!textValue || !titleValue) continue;
    const id = key(titleValue);
    const book = books.get(id) ?? { title: titleValue, author: clean(row[author] ?? '') || undefined, highlights: [] };
    books.set(id, book);
    const when = at >= 0 ? Date.parse(row[at] ?? '') : NaN;
    book.highlights.push({
      text: textValue,
      location: location >= 0 && row[location] ? `Location ${clean(row[location])}` : undefined,
      at: Number.isNaN(when) ? undefined : new Date(when).toISOString(),
      note: note >= 0 ? clean(row[note] ?? '') || undefined : undefined,
    });
  }
  return [...books.values()];
}

export function readHighlightsFile(text: string, name = ''): ImportedBook[] {
  if (/\.csv$/i.test(name) || /^﻿?"?highlight"?,/i.test(text.trim())) return fromReadwiseCsv(text);
  return fromKindleClippings(text);
}

const sameBook = (book: TheoriaBook, imported: ImportedBook) =>
  key(book.title) === key(imported.title) && (!book.author || !imported.author || key(book.author) === key(imported.author));

/**
 * The shelf with the imported highlights added: the books that changed and the books that are new, and how many
 * highlights came in. Highlights already on a book (same words) are skipped.
 */
export function addImported(shelf: readonly TheoriaBook[], imported: readonly ImportedBook[], userId: string, now = new Date()) {
  const changed: TheoriaBook[] = [];
  const added: TheoriaBook[] = [];
  let count = 0;
  for (const source of imported) {
    const existing = shelf.find((book) => sameBook(book, source)) ?? added.find((book) => sameBook(book, source));
    const book = existing ?? makeBook(userId, { title: source.title, author: source.author, source: 'manual', status: 'finished' }, now);
    const known = new Set(book.highlights.map((each) => key(each.text)));
    const highlights: TheoriaHighlight[] = [];
    const notes: TheoriaNote[] = [];
    for (const item of source.highlights) {
      const createdAt = item.at ?? now.toISOString();
      if (item.text && known.has(key(item.text))) continue;
      if (item.text) {
        const highlight: TheoriaHighlight = { id: newId(), text: item.text, location: item.location, color: 'gold', createdAt };
        highlights.push(highlight);
        known.add(key(item.text));
        if (item.note) notes.push({ id: newId(), body: item.note, highlightId: highlight.id, location: item.location, createdAt });
      } else if (item.note && !book.notes.some((each) => key(each.body) === key(item.note!))) {
        notes.push({ id: newId(), body: item.note, location: item.location, createdAt });
      }
    }
    if (highlights.length === 0 && notes.length === 0) continue;
    count += highlights.length;
    const next = { ...book, highlights: [...book.highlights, ...highlights], notes: [...book.notes, ...notes], updatedAt: now.toISOString() };
    if (existing && shelf.includes(existing)) changed.push(next);
    else if (existing) added.splice(added.indexOf(existing), 1, next);
    else added.push(next);
  }
  return { changed, added, count };
}
