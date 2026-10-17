import { allowedFolder, chooseFolder, forgetFolder, storedFolder } from '../../app/family/backupFolder';
import type { FolderBooks } from '../core/folder';

/*
 * Theoria's library folder: a folder on a computer (Chrome or Edge) that Theoria looks through whenever it opens
 * there, bringing in new books and newer versions of ones it brought in. The books then travel to every other
 * device as sealed account copies. What came from which path is the synced setting `theoria:folderBooks`, so a
 * second computer with the same folder (a Drive or Dropbox folder, say) does not add them twice. The folder's
 * handle stays on the device that chose it.
 */

export const LIBRARY_KEY = 'theoria-library';
const KNOWN = 'theoria:folderBooks';
const MOST_FILES = 3000;

export type FolderFile = { path: string; size: number; file: File };

export const libraryFolder = () => storedFolder(LIBRARY_KEY);
export const chooseLibraryFolder = () => chooseFolder(LIBRARY_KEY, 'read');
export const forgetLibraryFolder = () => forgetFolder(LIBRARY_KEY);

/** The folder if reading it is allowed now; `ask` (a tap) asks the browser again. */
export const readableLibrary = (ask = false) => allowedFolder(LIBRARY_KEY, 'read', ask);

type Entries = { entries: () => AsyncIterable<[string, FileSystemHandle]> };

/** Every file in the folder and its subfolders (hidden ones left out), with its path inside the folder. */
export async function filesIn(folder: FileSystemDirectoryHandle, prefix = '', found: FolderFile[] = [], depth = 0): Promise<FolderFile[]> {
  if (depth > 6) return found;
  for await (const [name, handle] of (folder as unknown as Entries).entries()) {
    if (found.length >= MOST_FILES || name.startsWith('.')) continue;
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') await filesIn(handle as FileSystemDirectoryHandle, path, found, depth + 1);
    else {
      const file = await (handle as FileSystemFileHandle).getFile().catch(() => undefined);
      if (file) found.push({ path, size: file.size, file });
    }
  }
  return found;
}

export function folderBooks(): FolderBooks {
  try {
    return (JSON.parse(localStorage.getItem(KNOWN) ?? '{}') as FolderBooks) ?? {};
  } catch {
    return {};
  }
}

export function saveFolderBooks(known: FolderBooks): void {
  try {
    localStorage.setItem(KNOWN, JSON.stringify(known));
  } catch {
    // Storage full: the next look adds nothing twice anyway, books on the shelf are matched by id.
  }
}
