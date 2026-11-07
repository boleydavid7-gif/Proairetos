/**
 * A photo or file the person kept with an item. Stored on the device and in
 * backups; not synced. The bytes are kept as an ArrayBuffer so they store
 * and copy the same way everywhere.
 */
export interface Attachment {
  id: string;
  userId: string;
  itemId: string;
  name: string;
  /** Media type, e.g. image/jpeg or application/pdf. */
  type: string;
  size: number;
  createdAt: string;
  data: ArrayBuffer;
}

/** Larger files are not kept; photos are made smaller first, so this is rarely reached. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const isImage = (attachment: Pick<Attachment, 'type'>) => attachment.type.startsWith('image/');

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
