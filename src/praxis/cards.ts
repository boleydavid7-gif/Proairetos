import { addDaysKey } from './data';

/**
 * Cards to look at again: a question on the front, the answer on the back. Each sits in one of five boxes
 * (Leitner); knowing it moves it a box on and the next look further off, not knowing it brings it back to the
 * first box. Cards that are ready simply wait: nothing is ever late, and a sitting offers at most a handful.
 */
export type Card = { id: string; front: string; back: string; blockId?: string; box: number; due: string; createdAt: string; lastSeen?: string };

/** Days until the next look, by box (1 to 5). */
export const BOX_DAYS = [1, 2, 4, 8, 16] as const;
export const AT_A_TIME = 20;
export const CARDS_SOURCE = 'Leitner (1972); spacing: Cepeda et al. (2006); recalling, not rereading: Roediger & Karpicke (2006).';

export function newCard(front: string, back: string, today: string, id: string, blockId?: string, now = new Date()): Card {
  return { id, front: front.trim(), back: back.trim(), blockId, box: 1, due: today, createdAt: now.toISOString() };
}

/** After an answer: a box on and further off when known; back to the first box, tomorrow, when not. */
export function answer(card: Card, knew: boolean, today: string): Card {
  const box = knew ? Math.min(BOX_DAYS.length, card.box + 1) : 1;
  return { ...card, box, due: addDaysKey(today, knew ? BOX_DAYS[box - 1] : 1), lastSeen: today };
}

/** The cards to look at in one sitting: those whose day has come, the longest waiting first. */
export function ready(cards: readonly Card[], today: string, blockId?: string, most = AT_A_TIME): Card[] {
  return cards
    .filter((card) => card.due <= today && (!blockId || card.blockId === blockId))
    .sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box || a.createdAt.localeCompare(b.createdAt))
    .slice(0, most);
}

/** The next day a card comes round, when none is ready now. */
export function nextDay(cards: readonly Card[], today: string, blockId?: string): string | undefined {
  return cards
    .filter((card) => card.due > today && (!blockId || card.blockId === blockId))
    .map((card) => card.due)
    .sort()[0];
}

/** Cards written as lines: "front :: back", or a question line followed by its answer line. */
export function cardsFromText(text: string): { front: string; back: string }[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pairs: { front: string; back: string }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const split = lines[index].split(/\s*(?:::|\t|\s—\s|\s-\s)\s*/);
    if (split.length >= 2 && split[0] && split.slice(1).join(' ').trim()) pairs.push({ front: split[0], back: split.slice(1).join(' ').trim() });
    else if (lines[index + 1] && !/::|\t/.test(lines[index + 1])) {
      pairs.push({ front: lines[index], back: lines[index + 1] });
      index += 1;
    }
  }
  return pairs.filter((pair) => pair.front.length <= 300 && pair.back.length <= 600);
}
