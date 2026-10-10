import { describe, expect, it } from 'vitest';
import { inviteLink, queue, readInvite, toShared, withPending, type SharedItem } from '../../soma/core/sharedList';
import { joinProof, openItem, sealItem } from '../../soma/data/sharedLists';
import { findJudgmentLanguage } from '../../core/rules/languageRules';
import { readFileSync } from 'node:fs';

const list = { id: '6f1c2a5e-4b7d-4c1e-9a2b-3c4d5e6f7a8b', key: 'q1W2e3R4t5Y6u7I8o9P0a1S2d3F4g5H6j7K8l9Z0x1C', name: 'Our groceries', joinedAt: '2026-10-10T10:00:00Z' };
const item = (id: string, name: string, at = '2026-10-10T10:00:00Z'): SharedItem => ({ id, name, amounts: [], aisle: 'Produce', checked: false, addedAt: at });

describe('a shared grocery list', () => {
  it('carries its key only after the #, and reads it back', () => {
    const link = inviteLink('https://proairetos.com', list);
    const url = new URL(link);
    expect(url.search).toBe(`?open=list:${list.id}`);
    expect(url.hash).toContain(`k=${list.key}`);
    expect(readInvite(url.search, url.hash)).toEqual({ id: list.id, key: list.key, name: 'Our groceries' });
  });

  it('ignores links that are not complete invites', () => {
    expect(readInvite('?open=recipe:1', '')).toBeUndefined();
    expect(readInvite(`?open=list:${list.id}`, '')).toBeUndefined();
    expect(readInvite('?open=list:not-an-id', `#k=${list.key}`)).toBeUndefined();
  });

  it('shows unsent changes over the server’s copy, the latest change for each line', () => {
    const server = [item('a', 'lemons'), item('b', 'rice', '2026-10-10T11:00:00Z')];
    let pending = queue([], { id: 'c', item: item('c', 'bread', '2026-10-10T12:00:00Z') });
    pending = queue(pending, { id: 'a', item: null });
    pending = queue(pending, { id: 'c', item: { ...item('c', 'bread', '2026-10-10T12:00:00Z'), checked: true } });
    expect(pending).toHaveLength(2);
    expect(withPending(server, pending).map((each) => [each.name, each.checked])).toEqual([['rice', false], ['bread', true]]);
  });

  it('keeps recipe links on this phone', () => {
    const shared = toShared({ ...item('a', 'lemons'), from: [{ id: 'r1', title: 'Lemon cake' }] });
    expect(shared).not.toHaveProperty('from');
  });

  it('seals each line with the list key, bound to the list and the line', async () => {
    const sealed = await sealItem(list, item('a', 'lemons'));
    expect(sealed).not.toContain('lemons');
    expect(await openItem(list, 'a', sealed)).toEqual(item('a', 'lemons'));
    // Moved onto another line, or opened with another list's key: nothing.
    expect(await openItem(list, 'b', sealed)).toBeUndefined();
    expect(await openItem({ ...list, id: '00000000-0000-4000-8000-000000000000', key: 'Z'.repeat(43) }, 'a', sealed)).toBeUndefined();
  });

  it('proves the key without sending it', async () => {
    const proof = await joinProof(list.key);
    expect(proof).not.toContain(list.key);
    expect(proof).toBe(await joinProof(list.key));
    expect(proof).not.toBe(await joinProof('Z'.repeat(43)));
  });

  it('uses plain words', () => {
    const source = readFileSync('src/soma/screens/SharedList.tsx', 'utf8') + readFileSync('src/soma/data/sharedLists.ts', 'utf8');
    expect(findJudgmentLanguage(source)).toEqual([]);
  });
});
