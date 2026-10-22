import { describe, expect, it } from 'vitest';
import { arrange, inviteLink, readInvite, type SharedTodo } from '../../core/together/sharedTodos';

const todo = (id: string, createdAt: string, doneAt?: string): SharedTodo => ({ id, title: id, createdAt, doneAt });

describe('a shared to-do list', () => {
  it('lists open ones oldest first and done ones from the last two days, latest first', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    const { open, done } = arrange(
      [todo('b', '2026-10-21T09:00:00Z'), todo('a', '2026-10-20T09:00:00Z'), todo('old', '2026-10-01T09:00:00Z', '2026-10-10T09:00:00Z'), todo('x', '2026-10-01T09:00:00Z', '2026-10-21T09:00:00Z'), todo('y', '2026-10-01T09:00:00Z', '2026-10-22T09:00:00Z')],
      now,
    );
    expect(open.map((each) => each.id)).toEqual(['a', 'b']);
    expect(done.map((each) => each.id)).toEqual(['y', 'x']);
  });

  it('reads back its own invite and nothing else', () => {
    const list = { id: '6f1c2a40-1b2c-4d5e-8f90-123456789abc', key: 'A'.repeat(43), name: 'Home & kids' };
    const url = new URL(inviteLink('https://proairetos.com', list));
    expect(readInvite(url.search, url.hash)).toEqual(list);
    expect(readInvite('?open=home:6f1c2a40-1b2c-4d5e-8f90-123456789abc', url.hash)).toBeUndefined();
    expect(readInvite(url.search, '#k=short')).toBeUndefined();
  });
});
