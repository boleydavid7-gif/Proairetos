import { describe, expect, it } from 'vitest';
import { safeName, writeToFolder } from '../../app/family/backupFolder';

/** A small stand-in for a File System Access folder, held in memory. */
type MemoryFolder = {
  name: string;
  files: Map<string, Blob>;
  folders: Map<string, MemoryFolder>;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<MemoryFolder>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<unknown>;
};
function memoryFolder(): MemoryFolder {
  const files = new Map<string, Blob>();
  const folders = new Map<string, MemoryFolder>();
  const folder: MemoryFolder = {
    name: 'Backups',
    files,
    folders,
    async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      if (!folders.has(name)) {
        if (!options?.create) throw new DOMException('Not found', 'NotFoundError');
        folders.set(name, memoryFolder());
      }
      return folders.get(name)!;
    },
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name) && !options?.create) throw new DOMException('Not found', 'NotFoundError');
      return {
        getFile: async () => files.get(name) ?? new Blob([]),
        createWritable: async () => {
          let written: Blob = new Blob([]);
          return { write: async (blob: Blob) => { written = blob; }, close: async () => { files.set(name, written); } };
        },
      };
    },
  };
  return folder;
}

describe('backup folder', () => {
  it('makes names safe on every system', () => {
    expect(safeName('Plato: Republic / Book 1?')).toBe('Plato Republic Book 1');
    expect(safeName('..hidden')).toBe('hidden');
    expect(safeName('')).toBe('Untitled');
    expect(safeName('a\u0007b')).toBe('a b');
  });

  it('writes into a subfolder and leaves a same-size copy alone when asked', async () => {
    const folder = memoryFolder();
    const target = folder as unknown as FileSystemDirectoryHandle;
    expect(await writeToFolder(target, 'Meditations.epub', new Blob(['abc']), { sub: 'Theoria books', keepSame: true })).toBe(true);
    expect(await writeToFolder(target, 'Meditations.epub', new Blob(['xyz']), { sub: 'Theoria books', keepSame: true })).toBe(false);
    expect(await writeToFolder(target, 'Meditations.epub', new Blob(['abcd']), { sub: 'Theoria books', keepSame: true })).toBe(true);
    expect(await folder.folders.get('Theoria books')!.files.get('Meditations.epub')!.text()).toBe('abcd');
  });
});
