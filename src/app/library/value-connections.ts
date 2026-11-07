import { collection } from '../family/shell';

export interface LibraryValueConnection {
  /** Stable Life Record key; the source record remains owned by its app. */
  id: string;
  valueIds: string[];
  updatedAt: string;
}

/**
 * Optional, Library-owned links to a person's chosen values.
 * This lets records from companion apps that do not natively support values
 * participate in Reflect without changing their source data.
 */
export const libraryValueConnections = collection<LibraryValueConnection>('proairetos.libraryValueConnection:');

export function setLibraryValueConnection(recordKey: string, valueId: string, connected: boolean): void {
  const current = libraryValueConnections.get(recordKey);
  const valueIds = new Set(current?.valueIds ?? []);
  if (connected) valueIds.add(valueId);
  else valueIds.delete(valueId);

  if (!valueIds.size) {
    libraryValueConnections.remove(recordKey);
    return;
  }

  libraryValueConnections.put({
    id: recordKey,
    valueIds: [...valueIds],
    updatedAt: new Date().toISOString(),
  });
}
