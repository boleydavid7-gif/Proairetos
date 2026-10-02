import { describe, expect, it } from 'vitest';
import { search, type Searchable } from '../../core/search/search';

const things: Searchable[] = [
  { id: '1', kind: 'item', title: 'Call about car insurance', fields: [{ name: 'Notes', text: 'Policy ends in November' }], at: '2026-09-10T10:00:00Z' },
  { id: '2', kind: 'reflection', title: 'Thursday', fields: [{ name: 'Entry', text: 'Felt calmer after the walk. The Café was quiet.' }], at: '2026-09-20T10:00:00Z' },
  { id: '3', kind: 'item', title: 'Renew passport', fields: [], at: '2026-09-25T10:00:00Z' },
];

describe('search', () => {
  it('finds every word in any order, across fields, ignoring case and accents', () => {
    expect(search('insurance CAR', things).map((h) => h.id)).toEqual(['1']);
    expect(search('november', things)[0]).toMatchObject({ id: '1', snippet: 'Policy ends in November' });
    expect(search('cafe', things).map((h) => h.id)).toEqual(['2']);
    expect(search('passport car', things)).toEqual([]);
    expect(search('   ', things)).toEqual([]);
  });

  it('lists newest first', () => {
    expect(search('a', things).map((h) => h.id)).toEqual(['3', '2', '1']);
  });
});
