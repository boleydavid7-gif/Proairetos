import type { TheoriaBook, TheoriaReflection } from './books';

const quote = (text: string) => text.split('\n').map((line) => `> ${line}`).join('\n');
const where = (chapter?: string, location?: string) => [chapter, location && !location.startsWith('chapter:') ? location : undefined].filter(Boolean).join(' · ');

function reflectionLines(reflection: TheoriaReflection): string[] {
  const answers = reflection.answers ?? {};
  const parts: [string, string | undefined][] = [
    ['What stood out', answers.stoodOut],
    ['Why it caught my attention', answers.why],
    ['What it challenges', answers.challenge],
    ['How it applies', answers.apply],
    ['What I want to remember', answers.remember],
  ];
  return [reflection.content, ...parts.filter(([, text]) => text?.trim()).map(([label, text]) => `**${label}:** ${text!.trim()}`)].filter((line) => line?.trim());
}

/**
 * A book's highlights, notes, reflections and bookmarks as Markdown: the person's own reading, in the order
 * they kept it. Not the book's text.
 */
export function bookMarkdown(book: TheoriaBook): string {
  const out: string[] = [`# ${book.title}`];
  if (book.author) out.push(`*${book.author}*`);
  const byTime = <T extends { createdAt: string }>(items: readonly T[]) => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (book.highlights.length) {
    out.push('## Highlights');
    for (const item of byTime(book.highlights)) out.push([quote(item.text), where(item.chapter, item.location)].filter(Boolean).join('\n\n'));
  }
  if (book.notes.length) {
    out.push('## Notes');
    for (const item of byTime(book.notes)) out.push([item.body, where(item.chapter, item.location) && `*${where(item.chapter, item.location)}*`].filter(Boolean).join('\n\n'));
  }
  if (book.reflections.length) {
    out.push('## Reflections');
    for (const item of byTime(book.reflections)) out.push(reflectionLines(item).join('\n\n'));
  }
  if (book.bookmarks.length) {
    out.push('## Bookmarks');
    out.push(byTime(book.bookmarks).map((item) => `- ${item.label || item.chapter || 'A place in the book'}`).join('\n'));
  }
  return out.join('\n\n') + '\n';
}

export function downloadBookNotes(book: TheoriaBook): void {
  const url = URL.createObjectURL(new Blob([bookMarkdown(book)], { type: 'text/markdown' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'book'}-notes.md`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One highlight for a day, from the whole library, steady through the day. */
export function highlightOfDay(books: readonly Pick<TheoriaBook, 'id' | 'title' | 'author' | 'highlights'>[], day: string): { text: string; bookId: string; title: string; author?: string } | undefined {
  const all = books.flatMap((book) => (book.highlights ?? []).filter((item) => item.text?.trim()).map((item) => ({ text: item.text.trim(), bookId: book.id, title: book.title, author: book.author, id: item.id })));
  if (all.length === 0) return undefined;
  all.sort((a, b) => a.id.localeCompare(b.id));
  let hash = 2166136261;
  for (const character of day) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const { id: _id, ...chosen } = all[(hash >>> 0) % all.length];
  return chosen;
}
