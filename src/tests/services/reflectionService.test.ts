import { createMemoryReflectionRepository } from '../../data/repositories/memory/memoryRepositories';
import { createReflectionService } from '../../services/reflection/reflectionService';
import { testContext } from '../support/testContext';

const DAY = 24 * 60 * 60 * 1000;

describe('reflection service', () => {
  it('keeps the text exactly as written', async () => {
    const { context } = testContext();
    const service = createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });
    const body = '  Quiet morning.\nWalked before work.  ';

    expect((await service.write({ body })).body).toBe(body);
    await expect(service.write({ body: '  ' })).rejects.toThrow();
  });

  it('lists reflections for the chosen period, newest first', async () => {
    // Wednesday, 1 October 2026, local noon.
    const { context, advance } = testContext(new Date(2026, 9, 1, 12).toISOString());
    const reflections = createMemoryReflectionRepository();
    const service = createReflectionService({ userId: 'u', context, reflections });

    await service.write({ body: 'Wednesday' });
    advance(1 * DAY);
    await service.write({ body: 'Thursday' });
    advance(5 * DAY);
    await service.write({ body: 'Next Tuesday' });

    expect((await service.listFor('today')).map((r) => r.body)).toEqual(['Next Tuesday']);
    expect((await service.listFor('week')).map((r) => r.body)).toEqual(['Next Tuesday']);
    expect((await service.listFor('month')).map((r) => r.body)).toEqual(['Next Tuesday', 'Thursday', 'Wednesday']);
  });

  it('keeps optional value connections on a daily intention', async () => {
    const { context } = testContext();
    const service = createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });

    await service.setIntention('2026-11-02', 'Be present at home.', ['family-id', 'growth-id', 'family-id']);
    expect(await service.intentionFor('2026-11-02')).toMatchObject({
      body: 'Be present at home.',
      valueIds: ['family-id', 'growth-id'],
    });

    await service.setIntention('2026-11-02', 'Be present at home.', []);
    expect((await service.intentionFor('2026-11-02'))?.valueIds).toBeUndefined();
  });

  it('edits a reflection without changing its original date or context', async () => {
    const { context, advance } = testContext();
    const service = createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });
    const written = await service.write({ body: 'First thought.', promptKey: 'gratitude', weather: 'CLEAR', valueIds: ['family'] });
    advance(DAY);

    const updated = await service.updateBody(written.id, 'A more considered thought.');
    expect(updated).toMatchObject({
      id: written.id,
      body: 'A more considered thought.',
      createdAt: written.createdAt,
      promptKey: 'gratitude',
      weather: 'CLEAR',
      valueIds: ['family'],
    });
    await expect(service.updateBody(written.id, '  ')).rejects.toThrow();
  });

  it('deletes a reflection, and undo brings it back', async () => {
    const { context } = testContext();
    const service = createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });
    const written = await service.write({ body: 'Not what I meant to write' });

    const deletion = await service.remove(written.id);
    expect(await service.all()).toEqual([]);
    await deletion.undo();
    expect(await service.all()).toEqual([written]);
  });

  it('archives and restores a reflection without losing its original text', async () => {
    const { context } = testContext();
    const service = createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });
    const written = await service.write({ body: 'Keep this thought.', valueIds: ['family'] });

    await service.archive(written.id);
    expect(await service.all()).toEqual([]);
    expect(await service.listFor('today')).toEqual([]);
    expect((await service.all(true))[0]).toMatchObject({ body: written.body, archivedAt: expect.any(String) });

    await service.restore(written.id);
    expect(await service.all()).toEqual([written]);
  });

  it('unlinks a value without deleting or changing the reflection', async () => {
    const { context } = testContext();
    const service = createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });
    const written = await service.write({ body: 'A thought about home.', valueIds: ['family', 'presence'] });

    await service.disconnectValue(written.id, 'family');
    expect(await service.all()).toMatchObject([{ id: written.id, body: written.body, valueIds: ['presence'] }]);
  });
});
