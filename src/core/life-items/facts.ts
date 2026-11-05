import { daysBetween, toLocalDate } from '../scheduling/dates';
import type { LifeItem } from './types';

/**
 * Plain facts about an item, to make a choice quicker: what the person
 * marked, the dates they set, and how long it has been there. Never a
 * ranking or a verdict; the order is fixed and nothing is weighed.
 */
export function itemFacts(item: LifeItem, today: string, valueNames: ReadonlyMap<string, string>): string[] {
  const facts: string[] = [];
  const day = (date: string) => {
    const gap = daysBetween(today, date);
    if (gap === 0) return 'today';
    if (gap === 1) return 'tomorrow';
    if (gap === -1) return 'yesterday';
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (item.important) facts.push('Marked important');
  for (const id of item.valueIds ?? []) {
    const name = valueNames.get(id);
    if (name) facts.push(`Linked to ${name}`);
  }
  if (item.scheduledAt) facts.push(`Set for ${day(toLocalDate(new Date(item.scheduledAt)))}`);
  else if (item.plannedFor) facts.push(`Planned for ${day(item.plannedFor)}`);
  if (item.status === 'WAITING') facts.push('Waiting on someone or something');
  if (item.nextStep) facts.push(`Next step: ${item.nextStep}`);

  const age = daysBetween(toLocalDate(new Date(item.createdAt)), today);
  facts.push(age <= 0 ? 'Added today' : age === 1 ? 'Added yesterday' : `Added ${age} days ago`);
  return facts;
}
