import type { DomainContext } from '../../core/context';
import { occurrencesBetween, occurrencesOnDay, validatePattern } from '../../core/scheduling/patterns';
import type {
  ScheduleException,
  ScheduleOccurrence,
  SchedulePattern,
  TimeBlock,
} from '../../core/scheduling/types';
import type { ScheduleExceptionRepository, SchedulePatternRepository } from '../../data/repositories/scheduleRepository';
import { createListeners } from '../listeners';

export type PatternInput = Pick<SchedulePattern, 'name' | 'kind' | 'layout' | 'anchorDate' | 'segments' | 'endDate'>;

export class ScheduleValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join(' '));
    this.name = 'ScheduleValidationError';
  }
}

export type ScheduleServiceDeps = {
  userId: string;
  context: DomainContext;
  patterns: SchedulePatternRepository;
  exceptions: ScheduleExceptionRepository;
};

/** The person's own schedule patterns. Shows time; never decides availability. */
export function createScheduleService({ userId, context, patterns, exceptions }: ScheduleServiceDeps) {
  const listeners = createListeners();

  function check(input: PatternInput) {
    const problems = validatePattern(input);
    if (problems.length > 0) throw new ScheduleValidationError(problems);
  }

  const clean = (input: PatternInput): PatternInput => ({
    ...input,
    name: input.name.trim(),
    segments: input.segments.map((segment) => ({
      days: segment.days,
      blocks: segment.blocks.map((block) => ({ ...block, label: block.label?.trim() || undefined })),
    })),
  });

  async function load() {
    const [allPatterns, allExceptions] = await Promise.all([patterns.list(userId), exceptions.list(userId)]);
    return { patterns: allPatterns.sort((a, b) => a.createdAt.localeCompare(b.createdAt)), exceptions: allExceptions };
  }

  return {
    subscribe: listeners.subscribe,

    async patterns(): Promise<SchedulePattern[]> {
      return (await load()).patterns;
    },

    async getPattern(id: string): Promise<SchedulePattern | null> {
      return (await patterns.list(userId)).find((pattern) => pattern.id === id) ?? null;
    },

    async createPattern(input: PatternInput): Promise<SchedulePattern> {
      check(input);
      const timestamp = context.now().toISOString();
      const pattern: SchedulePattern = {
        ...clean(input),
        id: context.newId(),
        userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await patterns.add(pattern);
      listeners.notify();
      return pattern;
    },

    async updatePattern(id: string, input: PatternInput): Promise<SchedulePattern> {
      check(input);
      const existing = (await patterns.list(userId)).find((pattern) => pattern.id === id);
      if (!existing) throw new Error('That schedule no longer exists.');
      const pattern: SchedulePattern = { ...existing, ...clean(input), updatedAt: context.now().toISOString() };
      await patterns.put(pattern);
      listeners.notify();
      return pattern;
    },

    async removePattern(id: string): Promise<void> {
      const related = (await exceptions.list(userId)).filter((exception) => exception.patternId === id);
      await Promise.all(related.map((exception) => exceptions.remove(exception.id)));
      await patterns.remove(id);
      listeners.notify();
    },

    /** Changes one day: different hours, or none (an empty list). */
    async changeDay(patternId: string, date: string, blocks: TimeBlock[]): Promise<ScheduleException> {
      const exception: ScheduleException = {
        id: `${patternId}:${date}`,
        userId,
        patternId,
        date,
        blocks,
        createdAt: context.now().toISOString(),
      };
      await exceptions.put(exception);
      listeners.notify();
      return exception;
    },

    async dayChange(patternId: string, date: string): Promise<ScheduleException | null> {
      return (await exceptions.list(userId)).find((e) => e.patternId === patternId && e.date === date) ?? null;
    },

    async restoreDay(patternId: string, date: string): Promise<void> {
      await exceptions.remove(`${patternId}:${date}`);
      listeners.notify();
    },

    async occurrencesBetween(from: Date, to: Date): Promise<ScheduleOccurrence[]> {
      const { patterns: all, exceptions: changes } = await load();
      return occurrencesBetween(all, changes, from, to);
    },

    async day(date: string): Promise<ScheduleOccurrence[]> {
      const { patterns: all, exceptions: changes } = await load();
      return occurrencesOnDay(all, changes, date);
    },
  };
}

export type ScheduleService = ReturnType<typeof createScheduleService>;
