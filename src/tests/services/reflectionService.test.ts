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
});
