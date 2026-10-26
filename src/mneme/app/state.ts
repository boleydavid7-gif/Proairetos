import { collection, stored } from '../../app/family/shell';

export type NoteLink = { app: string; label: string };
export type Note = {
  id: string;
  title: string;
  body: string;
  collectionId?: string;
  source?: string;
  links: NoteLink[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
export type NoteCollection = { id: string; name: string; createdAt: string };

export const notes = collection<Note>('mneme:note:');
export const collections = collection<NoteCollection>('mneme:collection:');
export const settings = stored<{ started: boolean }>('mneme:settings', () => ({ started: true }));

export const APP_LINKS = [
  { id: 'proairetos', label: 'Proairetos' },
  { id: 'theoria', label: 'Theoria' },
  { id: 'poreia', label: 'Poreia' },
  { id: 'philia', label: 'Philia' },
  { id: 'therapeia', label: 'Therapeia' },
] as const;

export function newId(prefix = 'note'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function notePreview(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}
