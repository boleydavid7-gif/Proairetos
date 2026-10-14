import { strToU8, zipSync } from 'fflate';

export type ArchiveEntry = { path: string; data: string | ArrayBuffer | Uint8Array };

/** Keeps names safe inside a downloaded archive while retaining the useful part of the original name. */
export function archiveName(name: string): string {
  const clean = [...name].map((character) => (character.charCodeAt(0) < 32 ? '_' : character)).join('');
  return clean.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || 'file';
}

function bytes(data: ArchiveEntry['data']): Uint8Array {
  if (typeof data === 'string') return strToU8(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return data;
}

/** Downloads one small archive so browser download prompts do not have to handle many files at once. */
export function downloadZip(filename: string, entries: readonly ArchiveEntry[]): void {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) files[entry.path] = bytes(entry.data);
  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped.slice().buffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
