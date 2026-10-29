import { describe, expect, it } from 'vitest';
import { householdLink, membersOf, namesText, partState, partsOf, readHouseholdInvite, type HouseholdItem } from '../../core/household/household';

const list = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', key: 'k'.repeat(43), name: 'The Smiths' };

describe('household', () => {
  it('makes an invite link that reads back, key after the #', () => {
    const link = new URL(householdLink('https://proairetos.com', list));
    expect(link.search).toBe(`?open=household:${list.id}`);
    expect(readHouseholdInvite(link.search, link.hash)).toEqual(list);
    expect(readHouseholdInvite('?open=household:nope', link.hash)).toBeUndefined();
    expect(readHouseholdInvite(`?open=together:${list.id}`, link.hash)).toBeUndefined();
  });

  it('joins a part, keeps one already joined, and leaves an app sharing elsewhere alone', () => {
    const part = { id: 'part:ergon', kind: 'part' as const, app: 'ergon' as const, list: { id: 'a', key: 'x', name: 'Home' }, at: '' };
    expect(partState(part, [], true)).toBe('join');
    expect(partState(part, [{ id: 'a' }], true)).toBe('shared');
    expect(partState(part, [{ id: 'b' }], true)).toBe('elsewhere');
    expect(partState(part, [{ id: 'b' }], false)).toBe('join');
  });

  it('splits parts from members, members in the order they joined', () => {
    const items: HouseholdItem[] = [
      { id: 'member:2', kind: 'member', name: 'Alex', at: '2026-10-02' },
      { id: 'part:soma', kind: 'part', app: 'soma', list: { id: 's', key: 'k', name: 'Groceries' }, at: '' },
      { id: 'member:1', kind: 'member', name: 'Sam', at: '2026-10-01' },
    ];
    expect(partsOf(items).map((part) => part.app)).toEqual(['soma']);
    expect(namesText(membersOf(items).map((member) => member.name))).toBe('Sam and Alex');
    expect(namesText(['Sam', 'Alex', 'Jo'])).toBe('Sam, Alex and Jo');
  });
});
