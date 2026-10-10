import { openBytes, sealBytes } from './keys';
import type { LocalRecord, SyncStateStore } from './types';

const BUCKET = 'proairetos-files';
const UPLOADED = 'uploadedFiles';

/** Where sealed file bytes are kept. A small seam so tests need no server. */
export interface FileStore {
  upload(path: string, bytes: Uint8Array<ArrayBuffer>): Promise<void>;
  download(path: string): Promise<ArrayBuffer | null>;
  remove(paths: string[]): Promise<void>;
}

export const pathFor = (userId: string, id: string) => `${userId}/attachments/${id}`;

const hasBytes = (record: LocalRecord) => record.data instanceof ArrayBuffer && record.data.byteLength > 0;

/**
 * Brings photos and files in step with the account after the records have synced: sends bytes that have not
 * gone up, fetches bytes for records that arrived without them, and clears files for items that are gone.
 * Everything is encrypted on this device before it leaves. Returns how many files were fetched.
 */
export async function syncAttachmentFiles(deps: {
  rawList: () => Promise<LocalRecord[]>;
  putWithBytes: (record: LocalRecord) => Promise<void>;
  state: SyncStateStore;
  files: FileStore;
  key: CryptoKey;
  userId: string;
}): Promise<{ fetched: number; sent: number }> {
  const { rawList, putWithBytes, state, files, key, userId } = deps;
  const uploaded = new Set((await state.getMeta<string[]>(UPLOADED)) ?? []);
  const here = await rawList();
  let sent = 0;
  let fetched = 0;

  for (const record of here) {
    if (hasBytes(record)) {
      if (uploaded.has(record.id)) continue;
      const sealed = await sealBytes(key, `attachment:${record.id}`, record.data as ArrayBuffer);
      await files.upload(pathFor(userId, record.id), sealed);
      uploaded.add(record.id);
      sent += 1;
    } else if (typeof record.size === 'number' && record.size > 0) {
      const sealed = await files.download(pathFor(userId, record.id));
      if (!sealed) continue;
      const data = await openBytes(key, `attachment:${record.id}`, sealed);
      await putWithBytes({ ...record, data });
      uploaded.add(record.id);
      fetched += 1;
    }
  }

  // Files for items that were deleted (here or elsewhere) are cleared from the account.
  const present = new Set(here.map((record) => record.id));
  const gone = [...uploaded].filter((id) => !present.has(id));
  if (gone.length > 0) {
    await files.remove(gone.map((id) => pathFor(userId, id))).catch(() => undefined);
    for (const id of gone) uploaded.delete(id);
  }
  await state.setMeta(UPLOADED, [...uploaded]);
  return { fetched, sent };
}

export const filesBucket = BUCKET;
