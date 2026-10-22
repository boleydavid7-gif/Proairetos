import { useEffect, useSyncExternalStore } from 'react';
import { createSharedLists, sharingAvailable, type SharedListRef } from '../family/sharedLists';
import type { SharedTodo } from '../../core/together/sharedTodos';

/**
 * One to-do list shared with the people at home: every line sealed with the list's key (`createSharedLists`,
 * label `proairetos-list`). Which list this person has is a synced setting; its lines are cached on the device.
 */
export const togetherLists = createSharedLists<SharedTodo>({
  listsKey: 'proairetos.together',
  cachePrefix: 'proairetosTogether',
  label: 'proairetos-list',
  order: (a, b) => a.createdAt.localeCompare(b.createdAt),
  defaultName: 'Home',
});

export { sharingAvailable };

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

/** The shared list, if this person has one (Proairetos keeps to one). */
export const togetherList = (): SharedListRef | undefined => togetherLists.sharedLists()[0];

/** The list and its lines, kept fresh: on showing, every 15 s while in view, and on coming back into view. */
export function useTogether(): { list?: SharedListRef; todos: SharedTodo[] } {
  useSyncExternalStore(togetherLists.subscribeShared, togetherLists.sharedVersion);
  const list = togetherList();
  useEffect(() => {
    if (!list) return;
    const pull = () => document.visibilityState === 'visible' && void togetherLists.refreshList(list).catch(() => undefined);
    pull();
    const timer = window.setInterval(pull, 15_000);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [list?.id]);
  return { list, todos: list ? togetherLists.sharedItems(list) : [] };
}

const INVITE = 'proairetosTogether.invite';

/** An invite opened from a link, kept for this visit until joined or set aside. */
export function pendingInvite(): { id: string; key: string; name: string } | undefined {
  try {
    const raw = sessionStorage.getItem(INVITE);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
export function keepInvite(invite: { id: string; key: string; name: string }): void {
  try {
    sessionStorage.setItem(INVITE, JSON.stringify(invite));
  } catch {
    // Without session storage the link can be opened again.
  }
}
export function dropInvite(): void {
  try {
    sessionStorage.removeItem(INVITE);
  } catch {
    // Nothing kept.
  }
}
