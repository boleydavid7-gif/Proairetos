import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getText, outline, splitText, takeAll, putAll } from '../../theoria/data/files';
import { migrateBook } from '../../theoria/data/library';
import { makeBook } from '../../theoria/core/books';
import { findJudgmentLanguage } from '../../core/rules/languageRules';
import { readFileSync } from 'node:fs';

const long = Array.from({ length: 399 }, (_, index) => `Paragraph ${index + 1}. ${'From my grandfather Verus I learned good morals. '.repeat(5)}`).join('\n\n');

describe('books kept in full', () => {
  it('splits a long text into parts, keeping every paragraph', () => {
    const parts = splitText(long, false);
    expect(parts).toHaveLength(10);
    const all = parts.map((part) => part.content).join('\n\n');
    expect(all.split('\n\n')).toHaveLength(399);
    expect(all.endsWith('good morals.')).toBe(true);
  });

  it('follows headings when a text has them', () => {
    const parts = splitText('# One\n\nFirst.\n\n# Two\n\nSecond.', true);
    expect(parts.map((part) => [part.title, part.content])).toEqual([['One', 'First.'], ['Two', 'Second.']]);
    expect(splitText('Preface words.\n\nChapter 1\n\nIt begins.\n\nChapter 2\n\nIt goes on.', false).map((part) => part.title)).toEqual(['Opening', 'Chapter 1', 'Chapter 2']);
  });

  it('keeps chapters without their text in the record', () => {
    expect(outline([{ id: 'a', title: 'A', order: 1, content: 'words' }])).toEqual([{ id: 'a', title: 'A', order: 1 }]);
  });
});

describe('moving a first-version book', () => {
  it('moves the text out of the record and onto the device', async () => {
    const book = makeBook('local', { title: 'Old', source: 'upload', contentFormat: 'epub', chapters: [{ id: 'c1', title: 'One', order: 1, content: 'Text of one.' }], contentPreview: 'x'.repeat(18_000) });
    const next = await migrateBook(book);
    expect(next?.chapters).toEqual([{ id: 'c1', title: 'One', order: 1 }]);
    expect(next?.contentPreview).toHaveLength(600);
    expect((await getText(book.id))?.chapters[0].content).toBe('Text of one.');
    expect(await migrateBook(next!)).toBeUndefined();
  });

  it('keeps what it can of a text file that was cut', async () => {
    const book = makeBook('local', { title: 'Cut', source: 'upload', contentFormat: 'text', contentPreview: long.slice(0, 18_000) });
    await migrateBook(book);
    expect((await getText(book.id))?.chapters.length).toBeGreaterThan(0);
  });

  it('can take everything for a book away and put it back (undo)', async () => {
    const book = makeBook('local', { title: 'Undo', source: 'upload', contentFormat: 'epub', chapters: [{ id: 'c', title: 'C', order: 1, content: 'Kept.' }] });
    await migrateBook(book);
    const kept = await takeAll(book.id);
    expect(await getText(book.id)).toBeUndefined();
    await putAll(kept);
    expect((await getText(book.id))?.chapters[0].content).toBe('Kept.');
  });
});

describe('Theoria words', () => {
  it('has no placeholder fields or judging words on its screens', () => {
    const source = readFileSync('src/theoria/components/views.tsx', 'utf8') + readFileSync('src/theoria/TheoriaApp.tsx', 'utf8');
    expect(source).not.toMatch(/Unknown author|Not recorded|Not parsed|Not opened yet|shelf is quiet|Preparing/);
    expect(findJudgmentLanguage(source)).toEqual([]);
  });
});
