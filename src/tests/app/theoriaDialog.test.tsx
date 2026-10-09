// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../theoria/data/importers', () => ({
  inspectReadingFile: async () => ({ title: 'Mistakes Were Made', author: 'Carol Tavris' }),
}));

import { AddBookDialog } from '../../theoria/components/dialogs';

afterEach(cleanup);

describe('adding a book to Theoria', () => {
  it("fills in the book's own title and author from the file, not its file name", async () => {
    render(<AddBookDialog onClose={() => undefined} onSave={async () => undefined} onLookup={async () => ({})} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'mistakes-were-made-3e.epub', { type: 'application/epub+zip' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Mistakes Were Made'));
    expect((screen.getByLabelText('Author') as HTMLInputElement).value).toBe('Carol Tavris');
  });

  it('keeps a title the reader has already typed', async () => {
    render(<AddBookDialog onClose={() => undefined} onSave={async () => undefined} onLookup={async () => ({})} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My own name for it' } });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'book.epub')] } });
    await waitFor(() => expect((screen.getByLabelText('Author') as HTMLInputElement).value).toBe('Carol Tavris'));
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('My own name for it');
  });
});
