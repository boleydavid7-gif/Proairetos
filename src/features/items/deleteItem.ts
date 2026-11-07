import { attachmentService, lifeService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';

/**
 * Deletes an item with its photos and files, and offers to bring both back. The one way to take a thing off the list
 * (the owner's choice: Delete, not a second "Let go").
 */
export async function deleteWithUndo(item: Pick<LifeItem, 'id' | 'title'>, offerUndo: (message: string, undo: () => Promise<void>) => void): Promise<void> {
  const files = await attachmentService.removeForItem(item.id);
  const deletion = await lifeService.deleteItem(item.id);
  offerUndo(`“${item.title}” deleted`, async () => {
    await deletion.undo();
    await files.undo();
  });
}
