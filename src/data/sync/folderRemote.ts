import type { FileStore } from './attachmentFiles';
import type { OutgoingRecord, RemoteRecord, RemoteStore, SyncCollection, SyncStateStore } from './types';

/*
 * Sync through a folder in the person's own storage (Google Drive, Dropbox, OneDrive). There is no server to number
 * the changes, so each device writes its own log files, `log-<device>-<n>.json`, and reads the others'. Every record
 * carries the time it was written; a newer write wins, so the order the files are read in does not matter. A device
 * only ever rewrites or removes its own files (when it folds them into one), so devices never race on a file.
 *
 * The records are sealed on the device before they are written, exactly as for Proairetos's server: the folder holds
 * nothing its owner's storage company, or anyone else, can read.
 */

/** A flat folder in the person's storage, private to the app. */
export interface CloudFolder {
  /** Every file's name and a version that changes whenever its content does. */
  list(): Promise<{ name: string; version: string }[]>;
  read(name: string): Promise<Uint8Array<ArrayBuffer> | null>;
  write(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<void>;
  remove(name: string): Promise<void>;
}

type Logged = { c: SyncCollection; id: string; iv: string | null; ct: string | null; d: boolean; t: number };
type LogFile = { v: 1; device: string; records: Logged[] };

const META = {
  device: 'folder:device',
  counter: 'folder:counter',
  seen: 'folder:seen',
  times: 'folder:times',
  seq: 'folder:seq',
} as const;

// Own log files kept before they are folded into one; records per file (a simple upload stays under 4 MB).
const FOLD_AFTER = 24;
const PER_FILE = 1500;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyOf = (collection: string, id: string) => `${collection}:${id}`;
const pad = (n: number) => String(n).padStart(8, '0');

export const logName = (device: string, n: number) => `log-${device}-${pad(n)}.json`;

function readLogName(name: string): { device: string; n: number } | null {
  const match = /^log-([a-z0-9]+)-(\d{8})\.json$/.exec(name);
  return match ? { device: match[1], n: Number(match[2]) } : null;
}

async function deviceId(state: SyncStateStore): Promise<string> {
  const known = await state.getMeta<string>(META.device);
  if (known) return known;
  const made = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
  await state.setMeta(META.device, made);
  return made;
}

function parse(bytes: Uint8Array<ArrayBuffer> | null): LogFile | null {
  if (!bytes) return null;
  try {
    const file = JSON.parse(decoder.decode(bytes)) as LogFile;
    return file?.v === 1 && Array.isArray(file.records) ? file : null;
  } catch {
    return null;
  }
}

export type FolderRemote = RemoteStore & {
  /** After the engine has applied what was pulled and pushed its own: remembers what was read, tidies own files. */
  finish(): Promise<void>;
};

/** A RemoteStore over a folder. Make a new one for each sync run. */
export function createFolderRemote({ folder, state, now = Date.now }: { folder: CloudFolder; state: SyncStateStore; now?: () => number }): FolderRemote {
  let incoming: RemoteRecord[] | null = null;
  let seenAfter: Record<string, string> = {};
  let times: Record<string, number> = {};
  let seqAfter = 0;
  let ownFiles: string[] = [];

  async function gather(): Promise<RemoteRecord[]> {
    const device = await deviceId(state);
    const seen = (await state.getMeta<Record<string, string>>(META.seen)) ?? {};
    times = { ...((await state.getMeta<Record<string, number>>(META.times)) ?? {}) };
    const seq = (await state.getMeta<number>(META.seq)) ?? 0;
    const files = await folder.list();
    ownFiles = files.map((file) => file.name).filter((name) => readLogName(name)?.device === device);
    const fresh = files.filter((file) => {
      const log = readLogName(file.name);
      return log && log.device !== device && seen[file.name] !== file.version;
    });

    const newest = new Map<string, Logged>();
    seenAfter = {};
    for (const file of files) if (seen[file.name] !== undefined) seenAfter[file.name] = seen[file.name];
    for (const file of fresh) {
      const log = parse(await folder.read(file.name));
      seenAfter[file.name] = file.version;
      for (const record of log?.records ?? []) {
        const k = keyOf(record.c, record.id);
        if (record.t <= (times[k] ?? 0) || record.t <= (newest.get(k)?.t ?? 0)) continue;
        newest.set(k, record);
      }
    }
    const records = [...newest.values()].map((record, index) => ({
      collection: record.c,
      id: record.id,
      iv: record.iv,
      ciphertext: record.ct,
      deleted: record.d,
      seq: seq + index + 1,
    }));
    for (const record of newest.values()) times[keyOf(record.c, record.id)] = record.t;
    seqAfter = seq + records.length;
    return records;
  }

  async function nextNumber(): Promise<number> {
    const counted = (await state.getMeta<number>(META.counter)) ?? 0;
    const highest = Math.max(0, ...ownFiles.map((name) => readLogName(name)!.n));
    const n = Math.max(counted, highest) + 1;
    await state.setMeta(META.counter, n);
    return n;
  }

  async function writeLog(records: Logged[]): Promise<void> {
    const device = await deviceId(state);
    for (let i = 0; i < records.length; i += PER_FILE) {
      const name = logName(device, await nextNumber());
      const file: LogFile = { v: 1, device, records: records.slice(i, i + PER_FILE) };
      await folder.write(name, encoder.encode(JSON.stringify(file)));
      ownFiles.push(name);
    }
  }

  /** Folds this device's own files into as few as hold them, keeping the newest write of each record. */
  async function fold(): Promise<void> {
    if (ownFiles.length <= FOLD_AFTER) return;
    const old = [...ownFiles];
    const newest = new Map<string, Logged>();
    for (const name of old) {
      for (const record of parse(await folder.read(name))?.records ?? []) {
        const k = keyOf(record.c, record.id);
        if (record.t > (newest.get(k)?.t ?? 0)) newest.set(k, record);
      }
    }
    // Written before the old files go, so another device never finds a record missing.
    await writeLog([...newest.values()]);
    for (const name of old) await folder.remove(name);
    ownFiles = ownFiles.filter((name) => !old.includes(name));
  }

  return {
    async pull(afterSeq: number, limit: number): Promise<RemoteRecord[]> {
      incoming ??= await gather();
      return incoming.filter((record) => record.seq > afterSeq).slice(0, limit);
    },
    async push(records: OutgoingRecord[]): Promise<void> {
      if (records.length === 0) return;
      if (!incoming) await gather();
      const at = now();
      const logged = records.map((record) => {
        const k = keyOf(record.collection, record.id);
        // Never older than a write already seen for this record, whatever this device's clock says.
        const t = Math.max(at, (times[k] ?? 0) + 1);
        times[k] = t;
        return { c: record.collection, id: record.id, iv: record.iv, ct: record.ciphertext, d: record.deleted, t };
      });
      await writeLog(logged);
      await state.setMeta(META.times, times);
    },
    async finish(): Promise<void> {
      if (!incoming) return;
      await state.setMeta(META.seen, seenAfter);
      await state.setMeta(META.times, times);
      await state.setMeta(META.seq, seqAfter);
      await fold();
    },
  };
}

/** Forgets what was read from a folder, for a change of storage. The device's own name is kept. */
export async function forgetFolder(state: SyncStateStore): Promise<void> {
  for (const name of [META.seen, META.times, META.seq, META.counter]) await state.setMeta(name, null);
}

/** Sealed photos and files in the same folder, one file each (`file-<id>`). */
export function createFolderFileStore(folder: CloudFolder): FileStore {
  // Paths are `<user>/attachments/<id>`; the folder is the person's own, so the id alone names the file.
  const nameFor = (path: string) => `file-${path.split('/').pop()}`;
  return {
    upload: (path, bytes) => folder.write(nameFor(path), bytes),
    async download(path) {
      const bytes = await folder.read(nameFor(path));
      return bytes ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : null;
    },
    async remove(paths) {
      for (const path of paths) await folder.remove(nameFor(path)).catch(() => undefined);
    },
  };
}
