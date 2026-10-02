import { describe, expect, it } from 'vitest';
import { guessKind, namedDay, readDump, splitDump } from '../../core/capture/brainDump';

describe('brain dump', () => {
  it('splits on lines, bullets, semicolons, sentences, and short comma lists', () => {
    expect(splitDump('- call the garage\n• buy milk; email Sam. Worried about the exam!')).toEqual([
      'call the garage',
      'buy milk',
      'email Sam',
      'Worried about the exam!',
    ]);
    expect(splitDump('pay rent, book dentist, and water the plants')).toEqual(['pay rent', 'book dentist', 'water the plants']);
    expect(splitDump('I need to call the garage tomorrow, buy milk, email Sam')).toEqual(['I need to call the garage tomorrow', 'buy milk', 'email Sam']);
    // A sentence with a comma or two stays whole.
    expect(splitDump('when the car is back, ring Jo about Saturday')).toEqual(['when the car is back, ring Jo about Saturday']);
  });

  it('makes a first guess, feelings and worries before tasks', () => {
    expect(guessKind('I need to call the bank')).toBe('DO');
    expect(guessKind('renew passport')).toBe('DO');
    expect(guessKind('worried about mum’s appointment')).toBe('CONCERN');
    expect(guessKind('call mum, worried about her')).toBe('CONCERN');
    expect(guessKind('I’m feeling really tired')).toBe('FEELING');
    expect(guessKind('maybe a herb garden')).toBe('IDEA');
    expect(guessKind('the blue folder is in the car')).toBe('NOTE');
  });

  it('cleans task lead-ins and reads named days', () => {
    const lines = readDump('I need to call the garage tomorrow\nidea: a reading corner', '2026-10-02');
    expect(lines).toEqual([
      { text: 'Call the garage tomorrow', kind: 'DO', plannedFor: '2026-10-03' },
      { text: 'Idea: a reading corner', kind: 'IDEA' },
    ]);
    // 2026-10-02 is a Friday: "Friday" means next week's, "Monday" the coming one.
    expect(namedDay('pay rent on Friday', '2026-10-02')).toBe('2026-10-09');
    expect(namedDay('book it Monday', '2026-10-02')).toBe('2026-10-05');
    expect(namedDay('nothing here', '2026-10-02')).toBeUndefined();
  });
});
