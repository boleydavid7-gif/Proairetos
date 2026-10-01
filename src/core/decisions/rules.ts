import type { DomainContext } from '../context';
import { MAX_DECISION_OPTIONS, MAX_DECISION_TEXT, type Decision } from './types';

export type DecisionInput = {
  question: string;
  options: string[];
  choice: string;
  reasons?: string;
  revisitAt?: string;
  lifeItemId?: string;
};

export class DecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionError';
  }
}

const tidy = (text: string) => text.trim().replace(/\s+/g, ' ');

/** Records a decision. The person writes every part; nothing is suggested. */
export function makeDecision(ctx: DomainContext, userId: string, input: DecisionInput): Decision {
  const question = tidy(input.question);
  const choice = tidy(input.choice);
  // Same option written twice, in any case, counts once.
  const options = input.options
    .map(tidy)
    .filter(Boolean)
    .filter((option, index, all) => all.findIndex((o) => o.toLowerCase() === option.toLowerCase()) === index);
  if (choice && !options.some((option) => option.toLowerCase() === choice.toLowerCase())) options.push(choice);

  if (!question) throw new DecisionError('Write what you are deciding.');
  if (!choice) throw new DecisionError('Write what you chose.');
  if (options.length > MAX_DECISION_OPTIONS) throw new DecisionError(`Keep it to ${MAX_DECISION_OPTIONS} options.`);
  if ([question, choice, input.reasons ?? '', ...options].some((text) => text.length > MAX_DECISION_TEXT)) {
    throw new DecisionError(`Keep each part to ${MAX_DECISION_TEXT} characters.`);
  }

  return {
    id: ctx.newId(),
    userId,
    lifeItemId: input.lifeItemId,
    question,
    options,
    choice,
    reasons: input.reasons?.trim() || undefined,
    decidedAt: ctx.now().toISOString(),
    revisitAt: input.revisitAt,
  };
}

/** Decisions whose chosen revisit day has come and that the person has not finished looking back on. */
export function decisionsToRevisit(decisions: Decision[], now: Date): Decision[] {
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return decisions
    .filter((decision) => decision.revisitAt && !decision.revisitedAt && decision.revisitAt < endOfToday)
    .sort((a, b) => a.revisitAt!.localeCompare(b.revisitAt!));
}
