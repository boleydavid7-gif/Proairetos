let requested = false;

/** Ask the browser to keep local app data when storage pressure is high. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (requested || typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  requested = true;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
