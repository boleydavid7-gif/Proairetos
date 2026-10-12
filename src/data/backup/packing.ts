/*
 * The backup file, compressed on the device (gzip through CompressionStream, everywhere current): records and
 * photos written out as text shrink several times over. Reading takes either kind, so files saved before, or by a
 * browser without compression, still restore.
 */

const GZIP = [0x1f, 0x8b];

export function canCompress(): boolean {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
}

export async function packBackup(text: string): Promise<{ blob: Blob; extension: string }> {
  if (!canCompress()) return { blob: new Blob([text], { type: 'application/json' }), extension: 'json' };
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return { blob: new Blob([await new Response(stream).arrayBuffer()], { type: 'application/gzip' }), extension: 'json.gz' };
}

/** The backup's text, from a plain or compressed file. */
export async function backupText(file: Blob): Promise<string> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (head[0] !== GZIP[0] || head[1] !== GZIP[1]) return file.text();
  if (!canCompress()) throw new Error('This browser cannot open a compressed backup. Try it in another browser.');
  return new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

/** Saves the backup as a file, compressed where the browser can. */
export async function downloadBackup(text: string, day: string): Promise<void> {
  const { blob, extension } = await packBackup(text);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `proairetos-backup-${day}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** What a backup file input accepts. */
export const BACKUP_ACCEPT = 'application/json,.json,application/gzip,.gz';
