import {
  createMemoryCompassStatementRepository,
  createMemoryValueRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { createCompassService } from '../../services/compass/compassService';
import { testContext } from '../support/testContext';

function setup() {
  const { context, advance } = testContext();
  const service = createCompassService({
    userId: 'u',
    context,
    values: createMemoryValueRepository(),
    statements: createMemoryCompassStatementRepository(),
  });
  return { service, advance };
}

describe('compass service', () => {
  it('keeps values in the order they were chosen and notifies on change', async () => {
    const { service, advance } = setup();
    const listener = vi.fn();
    service.subscribe(listener);

    await service.chooseValue('Patience');
    advance(1000);
    const courage = await service.chooseValue('Courage');
    expect((await service.values()).map((v) => v.name)).toEqual(['Patience', 'Courage']);

    await service.removeValue(courage.id);
    expect((await service.values()).map((v) => v.name)).toEqual(['Patience']);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('refuses a sixth value without storing anything', async () => {
    const { service } = setup();
    for (const name of ['Courage', 'Wisdom', 'Justice', 'Temperance', 'Family']) await service.chooseValue(name);

    await expect(service.chooseValue('Health')).rejects.toThrow();
    expect(await service.values()).toHaveLength(5);
  });

  it('stores statements as written, trimmed', async () => {
    const { service } = setup();
    await service.writeStatement('REMEMBER', '  People over plans  ');
    await service.writeStatement('PUSHED_ASIDE', 'Comparing myself to others');

    expect((await service.statements()).map((s) => [s.type, s.body])).toEqual([
      ['REMEMBER', 'People over plans'],
      ['PUSHED_ASIDE', 'Comparing myself to others'],
    ]);
    await expect(service.writeStatement('REMEMBER', '   ')).rejects.toThrow();
  });
});

describe('removing from Compass', () => {
  it('puts a removed value and statement back exactly on undo', async () => {
    const { service } = setup();
    const value = await service.chooseValue('Patience');
    const statement = await service.writeStatement('REMEMBER', 'Begin again');

    const valueRemoval = await service.removeValue(value.id);
    const statementRemoval = await service.removeStatement(statement.id);
    expect(await service.values()).toEqual([]);
    expect(await service.statements()).toEqual([]);

    await valueRemoval.undo();
    await statementRemoval.undo();
    await valueRemoval.undo();
    expect(await service.values()).toEqual([value]);
    expect(await service.statements()).toEqual([statement]);
  });
});
