import { describe, expect, it } from 'vitest';
import { mentionsOf } from '../../core/compass/mentions';

const item = (id: string, title: string, at = '2026-10-01T10:00:00Z', notes?: string) => ({ id, title, notes, createdAt: at });
const note = (id: string, body: string, at: string, kind: 'FREE' | 'INTENTION' = 'FREE') => ({ id, body, createdAt: at, kind });

describe('mentionsOf', () => {
  it('finds a name as a whole word, in items and reflections, newest first', () => {
    const found = mentionsOf(
      'Sam',
      [item('a', 'Call Sam about the trip', '2026-10-05T10:00:00Z'), item('b', 'Buy the same bread'), item('c', 'Plan', '2026-10-02T10:00:00Z', 'Ask sam for the photos')],
      [note('r', 'Had a long walk with Sam by the river today.', '2026-10-08T10:00:00Z')],
    );
    expect(found.map((m) => m.id)).toEqual(['r', 'a', 'c']);
    expect(found[0].text).toContain('Sam');
  });

  it('leaves intentions out, and tiny names', () => {
    expect(mentionsOf('Sam', [], [note('i', 'Be kind to Sam', '2026-10-08T10:00:00Z', 'INTENTION')])).toEqual([]);
    expect(mentionsOf('A', [item('a', 'A plan')], [])).toEqual([]);
  });

  it('handles accents and punctuation in a name', () => {
    expect(mentionsOf('José', [item('a', 'Dinner with José.')], []).length).toBe(1);
    expect(mentionsOf('Mr. X', [item('a', 'Meet Mr. X today')], []).length).toBe(1);
  });
});
