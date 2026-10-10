import { describe, expect, it } from 'vitest';
import { answer, cardsFromText, newCard, nextDay, ready } from '../../praxis/cards';
import { findJudgmentLanguage } from '../../core/rules/languageRules';
import { readFileSync } from 'node:fs';

const today = '2026-10-10';

describe('cards to look at again', () => {
  it('starts in the first box, ready today', () => {
    expect(newCard(' Mitral valve? ', ' Between the left atrium and ventricle ', today, 'c1', 'b1')).toMatchObject({ front: 'Mitral valve?', back: 'Between the left atrium and ventricle', box: 1, due: today, blockId: 'b1' });
  });

  it('moves a known card on and further off, and brings an unknown one back to tomorrow', () => {
    let card = newCard('a', 'b', today, 'c1');
    card = answer(card, true, today);
    expect([card.box, card.due]).toEqual([2, '2026-10-12']);
    card = answer(card, true, '2026-10-12');
    expect([card.box, card.due]).toEqual([3, '2026-10-16']);
    card = answer({ ...card, box: 5 }, true, '2026-10-16');
    expect([card.box, card.due]).toEqual([5, '2026-11-01']);
    card = answer(card, false, '2026-11-01');
    expect([card.box, card.due]).toEqual([1, '2026-11-02']);
  });

  it('offers what is ready, longest waiting first, a handful at a time; the rest simply wait', () => {
    const cards = Array.from({ length: 30 }, (_, index) => ({ ...newCard(`q${index}`, 'a', today, `c${index}`, index % 2 ? 'b1' : 'b2'), due: index < 25 ? `2026-10-${String(index % 9 + 1).padStart(2, '0')}` : '2026-10-20' }));
    const sitting = ready(cards, today);
    expect(sitting).toHaveLength(20);
    expect(sitting[0].due).toBe('2026-10-01');
    expect(ready(cards, today, 'b1').every((card) => card.blockId === 'b1')).toBe(true);
    expect(nextDay(cards, today)).toBe('2026-10-20');
  });

  it('reads cards written as lines', () => {
    expect(cardsFromText('Aorta :: largest artery\nCapital of Peru\tLima\nWhat is ATP?\nThe cell’s energy carrier\n')).toEqual([
      { front: 'Aorta', back: 'largest artery' },
      { front: 'Capital of Peru', back: 'Lima' },
      { front: 'What is ATP?', back: 'The cell’s energy carrier' },
    ]);
  });

  it('keeps its words plain', () => {
    const source = readFileSync('src/praxis/cards.ts', 'utf8') + readFileSync('src/praxis/CardsView.tsx', 'utf8');
    expect(source).not.toMatch(/overdue|streak|score|missed/i);
    expect(findJudgmentLanguage(source)).toEqual([]);
  });
});
