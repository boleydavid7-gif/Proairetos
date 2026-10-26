import { collection, stored } from '../../app/family/shell';

export type Note = {
  id: string;
  title: string;
  body: string;
  collectionId?: string;
  source?: string;
  recording?: { attachmentId: string; durationMs: number; mimeType: string };
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
export type NoteCollection = { id: string; name: string; createdAt: string };

export const notes = collection<Note>('mneme:note:');
export const collections = collection<NoteCollection>('mneme:collection:');
export const settings = stored<{ started: boolean }>('mneme:settings', () => ({ started: true }));

export function newId(prefix = 'note'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function notePreview(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}
