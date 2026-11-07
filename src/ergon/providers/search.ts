import { present, type Provider } from '../../core/providers';
import { watchLocal } from '../../app/family/localChanges';
import { allChores, homes } from '../app/state';

/*
 * Chores: the name and the room. Not the note, who it is given to, or its steps (manifest, ergon.search). It reads the
 * household's list while the person is in one, as Ergon itself does (`allChores`).
 */
export const ergonSearch: Provider<'search'> = {
  app: 'ergon',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ergon:chore:', 'shared:ergon'],
  read() {
    return allChores().map((chore) => ({
      ref: { app: 'ergon' as const, kind: 'chore', id: chore.id },
      title: chore.name,
      titleField: 'chore name',
      fields: present({ name: 'room', text: chore.room }),
      at: chore.createdAt,
      label: 'Chore in Ergon',
      open: `/ergon/?open=${encodeURIComponent(`chore:${chore.id}`)}`,
    }));
  },
  subscribe(listener) {
    const offShared = homes.subscribeShared(listener);
    const offOwn = watchLocal('ergon:chore:', listener);
    return () => {
      offShared();
      offOwn();
    };
  },
};
