import type { Attachment } from '../../core/attachments/types';

export interface AttachmentRepository {
  list(userId: string): Promise<Attachment[]>;
  add(attachment: Attachment): Promise<Attachment>;
  put(attachment: Attachment): Promise<Attachment>;
  remove(id: string): Promise<void>;
}
