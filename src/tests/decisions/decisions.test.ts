import { DecisionError, decisionsToRevisit, makeDecision } from '../../core/decisions/rules';
import type { Decision } from '../../core/decisions/types';
import { createMemoryDecisionRepository } from '../../data/repositories/memory/memoryRepositories';
import { createDecisionService } from '../../services/decisions/decisionService';
import { testContext } from '../support/testContext';

describe('making a decision', () => {
  const { context } = testContext();

  it('keeps the person’s words, tidied, and always includes the choice among the options', () => {
    const decision = makeDecision(context, 'u', {
      question: '  Whether to   change teams ',
      options: ['Stay', 'Move', 'stay', ' '],
      choice: 'Ask for a trial month',
      reasons: '  Less risk  ',
    });
    expect(decision).toMatchObject({
      question: 'Whether to change teams',
      options: ['Stay', 'Move', 'Ask for a trial month'],
      choice: 'Ask for a trial month',
      reasons: 'Less risk',
    });
  });

  it('needs a question and a choice', () => {
    expect(() => makeDecision(context, 'u', { question: ' ', options: [], choice: 'x' })).toThrow(DecisionError);
    expect(() => makeDecision(context, 'u', { question: 'x', options: ['a'], choice: '' })).toThrow(DecisionError);
  });

  it('brings back decisions on or after their revisit day until finished', () => {
    const base = { userId: 'u', question: 'q', options: [], choice: 'c', decidedAt: '2026-09-01T00:00:00.000Z' };
    const decisions: Decision[] = [
      { ...base, id: 'due', revisitAt: new Date(2026, 9, 10).toISOString() },
      { ...base, id: 'earlier', revisitAt: new Date(2026, 9, 2).toISOString() },
      { ...base, id: 'later', revisitAt: new Date(2026, 9, 11).toISOString() },
      { ...base, id: 'finished', revisitAt: new Date(2026, 9, 2).toISOString(), revisitedAt: '2026-10-03' },
      { ...base, id: 'no date' },
    ];
    expect(decisionsToRevisit(decisions, new Date(2026, 9, 10, 18)).map((d) => d.id)).toEqual(['earlier', 'due']);
  });
});

describe('decision service', () => {
  it('stores, lists newest first, and tracks revisiting', async () => {
    const { context, advance } = testContext('2026-10-01T12:00:00.000Z');
    const service = createDecisionService({ userId: 'u', context, decisions: createMemoryDecisionRepository() });

    const first = await service.decide({ question: 'Gym or run', options: ['Gym', 'Run'], choice: 'Run' });
    advance(60_000);
    const second = await service.decide({
      question: 'Change teams',
      options: [],
      choice: 'Stay',
      revisitAt: '2026-10-01T00:00:00.000Z',
    });

    expect((await service.list()).map((d) => d.id)).toEqual([second.id, first.id]);
    expect((await service.toRevisit()).map((d) => d.id)).toEqual([second.id]);

    await service.finishRevisiting(second.id);
    expect(await service.toRevisit()).toEqual([]);

    await service.setRevisit(second.id, '2026-10-01T00:00:00.000Z');
    expect((await service.toRevisit()).map((d) => d.id)).toEqual([second.id]);
  });

  it('keeps the expectation written beforehand and the two look-back answers', async () => {
    const { context } = testContext('2026-10-01T12:00:00.000Z');
    const service = createDecisionService({ userId: 'u', context, decisions: createMemoryDecisionRepository() });
    const decision = await service.decide({
      question: 'Change teams',
      options: ['Stay', 'Move'],
      choice: 'Move',
      expected: '  More interesting work within a month  ',
      confidence: 'MEDIUM',
      revisitAt: '2026-10-01T00:00:00.000Z',
    });
    expect(decision).toMatchObject({ expected: 'More interesting work within a month', confidence: 'MEDIUM' });

    const looked = await service.recordLookBack(decision.id, 'AGAIN', 'NOT_AS_HOPED');
    expect(looked.lookBack).toMatchObject({ process: 'AGAIN', outcome: 'NOT_AS_HOPED' });
    expect(await service.toRevisit()).toEqual([]);
  });
});
