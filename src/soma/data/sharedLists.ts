import { createSharedLists, joinProof, sharingAvailable } from '../../app/family/sharedLists';
import type { SharedItem } from '../core/sharedList';

/** SOMA's shared grocery lists: the family's sealed shared lists, with SOMA's own keys and label. */
const lists = createSharedLists<SharedItem>({
  listsKey: 'soma:sharedLists',
  cachePrefix: 'somaShared',
  label: 'soma-list',
  order: (a, b) => a.addedAt.localeCompare(b.addedAt),
  defaultName: 'Groceries',
});

export { joinProof, sharingAvailable };
export const { sharedLists, subscribeShared, sharedVersion, sealItem, openItem, createList, joinList, leaveList, sharedItems, changeItem, refreshList } = lists;
