import { scheduleTemplates } from '../../core/scheduling/templates';
import {
  createMemoryScheduleExceptionRepository,
  createMemorySchedulePatternRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { ScheduleValidationError, createScheduleService, type PatternInput } from '../../services/schedule/scheduleService';
import { testContext } from '../support/testContext';

const rotation = scheduleTemplates.find((t) => t.id === 'three-shift-rotation')!;
const input: PatternInput = {
  name: '  Work  ',
  kind: 'COMMITTED',
  layout: 'CYCLE',
  anchorDate: '2026-09-29',
  segments: rotation.segments,
};

function setup() {
  return createScheduleService({
    userId: 'u',
    context: testContext().context,
    patterns: createMemorySchedulePatternRepository(),
    exceptions: createMemoryScheduleExceptionRepository(),
  });
}

describe('schedule service', () => {
  it('creates, updates, and removes patterns', async () => {
    const service = setup();
    const created = await service.createPattern(input);
    expect(created.name).toBe('Work');

    await service.updatePattern(created.id, { ...input, name: 'Plant' });
    expect((await service.patterns()).map((p) => p.name)).toEqual(['Plant']);

    await service.removePattern(created.id);
    expect(await service.patterns()).toEqual([]);
  });

  it('refuses an invalid pattern and says why', async () => {
    const service = setup();
    const attempt = service.createPattern({ ...input, segments: [] });
    await expect(attempt).rejects.toBeInstanceOf(ScheduleValidationError);
    await expect(attempt).rejects.toMatchObject({ problems: ['Add at least one run of days.'] });
  });

  it('changes and restores a single day', async () => {
    const service = setup();
    const work = await service.createPattern(input);

    await service.changeDay(work.id, '2026-10-01', []);
    expect(await service.day('2026-10-01')).toEqual([]);

    await service.changeDay(work.id, '2026-10-01', [{ start: '10:00', end: '14:00' }]);
    const [changed] = await service.day('2026-10-01');
    expect(changed.changed).toBe(true);
    expect(changed.start.getHours()).toBe(10);

    await service.restoreDay(work.id, '2026-10-01');
    expect((await service.day('2026-10-01'))[0].label).toBe('Days');
  });

  it("removes a pattern's day changes with it", async () => {
    const service = setup();
    const work = await service.createPattern(input);
    await service.changeDay(work.id, '2026-10-01', []);
    await service.removePattern(work.id);

    const again = await service.createPattern(input);
    expect((await service.day('2026-10-01')).map((o) => o.patternId)).toEqual([again.id]);
  });
});
