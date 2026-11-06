import { watchLocal } from '../../app/family/localChanges';
import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';
import { ideas, notes } from '../app/state';

/**
 * The notes and ideas the person chose for Reflect, as the existing adapters project them. A note qualifies when it was chosen, or, if
 * that was never decided, when it was pinned (`inReflect ?? pinned`); an idea only when it was chosen (`inReflect`). The selection stays in
 * the adapters; this provider adds nothing to it. Archiving a note is still done from the Library page and is not a provider action.
 * Never a note or idea that was not chosen, a voice recording, a collection or an attachment.
 */
export const mnemeLibrary: Provider<'library'> = {
  app: 'mneme',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['local:mneme:note:', 'local:mneme:idea:'],
  read: () => [...lifeRecordAdapters.mnemeNotes.toRecords(notes.list()), ...lifeRecordAdapters.mnemeIdeas.toRecords(ideas.list())],
  subscribe: (listener) => watchLocal('mneme:', listener),
};
