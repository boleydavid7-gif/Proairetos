import { describe, expect, it } from 'vitest';
import { createMemoryAttachmentRepository } from '../../data/repositories/memory/memoryRepositories';
import { AttachmentTooLargeError, createAttachmentService } from '../../services/attachments/attachmentService';
import { testContext } from '../support/testContext';

describe('photos and files', () => {
  it('keeps them with an item, removes with undo, and clears with the item', async () => {
    const { context } = testContext();
    const service = createAttachmentService({ userId: 'u', context, attachments: createMemoryAttachmentRepository() });
    const photo = await service.add('i', { name: 'receipt.jpg', type: 'image/jpeg', data: new Uint8Array([1, 2, 3]).buffer });
    await service.add('other', { name: 'x.pdf', type: 'application/pdf', data: new ArrayBuffer(1) });
    expect((await service.forItem('i')).map((a) => [a.name, a.size])).toEqual([['receipt.jpg', 3]]);

    const removal = await service.remove(photo.id);
    expect(await service.forItem('i')).toEqual([]);
    await removal.undo();
    expect((await service.forItem('i'))[0].id).toBe(photo.id);

    const cleared = await service.removeForItem('i');
    expect(await service.forItem('i')).toEqual([]);
    await cleared.undo();
    expect(await service.forItem('i')).toHaveLength(1);
  });

  it('turns away a file over 10 MB', async () => {
    const { context } = testContext();
    const service = createAttachmentService({ userId: 'u', context, attachments: createMemoryAttachmentRepository() });
    await expect(service.add('i', { name: 'big', type: 'video/mp4', data: new ArrayBuffer(11 * 1024 * 1024) })).rejects.toBeInstanceOf(AttachmentTooLargeError);
  });
});
