import { collection } from '../family/shell';

export interface LibraryFavorite {
  /** The stable, namespaced key from the Life Record projection. */
  id: string;
  savedAt: string;
}

/**
 * Favorites are small account-level records stored as synced Proairetos
 * preferences. This keeps favorites portable without adding another database
 * table or changing any source app's records.
 */
export const libraryFavorites = collection<LibraryFavorite>('proairetos.libraryFavorite:');

export function setLibraryFavorite(key: string, saved: boolean): void {
  if (saved) {
    libraryFavorites.put({ id: key, savedAt: new Date().toISOString() });
  } else {
    libraryFavorites.remove(key);
  }
}
