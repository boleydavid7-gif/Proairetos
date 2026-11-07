import type { DomainContext } from '../../core/context';
import { MAX_ATTACHMENT_BYTES, type Attachment } from '../../core/attachments/types';
import type { AttachmentRepository } from '../../data/repositories/attachmentRepository';
import { createListeners } from '../listeners';

export type AttachmentServiceDeps = { userId: string; context: DomainContext; attachments: AttachmentRepository };

export class AttachmentTooLargeError extends Error {
  constructor() {
    super('That file is larger than 10 MB, so it was not kept.');
    this.name = 'AttachmentTooLargeError';
  }
}

/** Photos and files kept with items, on this device. Every removal offers an undo that puts it back exactly. */
export function createAttachmentService({ userId, context, attachments }: AttachmentServiceDeps) {
  const listeners = createListeners();

  return {
    subscribe: listeners.subscribe,
    refresh: listeners.notify,

    async forItem(itemId: string): Promise<Attachment[]> {
      return (await attachments.list(userId))
        .filter((attachment) => attachment.itemId === itemId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async add(itemId: string, file: { name: string; type: string; data: ArrayBuffer }): Promise<Attachment> {
      if (file.data.byteLength > MAX_ATTACHMENT_BYTES) throw new AttachmentTooLargeError();
      const attachment: Attachment = {
        id: context.newId(),
        userId,
        itemId,
        name: file.name || 'File',
        type: file.type || 'application/octet-stream',
        size: file.data.byteLength,
        createdAt: context.now().toISOString(),
        data: file.data,
      };
      await attachments.add(attachment);
      listeners.notify();
      return attachment;
    },

    async remove(id: string): Promise<{ undo: () => Promise<void> }> {
      const attachment = (await attachments.list(userId)).find((a) => a.id === id);
      await attachments.remove(id);
      listeners.notify();
      return {
        undo: async () => {
          if (!attachment) return;
          await attachments.add(attachment);
          listeners.notify();
        },
      };
    },

    /** Everything kept with an item, for when the item itself is deleted. */
    async removeForItem(itemId: string): Promise<{ undo: () => Promise<void> }> {
      const kept = (await attachments.list(userId)).filter((a) => a.itemId === itemId);
      for (const attachment of kept) await attachments.remove(attachment.id);
      if (kept.length) listeners.notify();
      return {
        undo: async () => {
          for (const attachment of kept) await attachments.add(attachment);
          if (kept.length) listeners.notify();
        },
      };
    },
  };
}

export type AttachmentService = ReturnType<typeof createAttachmentService>;
