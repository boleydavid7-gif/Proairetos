/** A to-do on a list shared with someone (a partner, a housemate): sealed on the device, read by everyone on the list. */
export type SharedTodo = {
  id: string;
  title: string;
  /** Who added it, by the name they go by. */
  by?: string;
  createdAt: string;
  doneAt?: string;
  doneBy?: string;
};

const DONE_SHOWN_MS = 2 * 86_400_000;

/** Open ones oldest first; done ones from the last two days, latest first (older ones stay on the list, out of view). */
export function arrange(todos: readonly SharedTodo[], now: Date): { open: SharedTodo[]; done: SharedTodo[] } {
  const open = todos.filter((todo) => !todo.doneAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = todos
    .filter((todo) => todo.doneAt && now.getTime() - new Date(todo.doneAt).getTime() < DONE_SHOWN_MS)
    .sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
  return { open, done };
}

/** The list's invite: `/?open=together:ID#k=KEY&n=NAME`. The key after `#` never reaches a server. */
export function inviteLink(origin: string, list: { id: string; key: string; name: string }): string {
  return `${origin}/?open=together:${list.id}#k=${list.key}&n=${encodeURIComponent(list.name)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readInvite(search: string, hash: string): { id: string; key: string; name: string } | undefined {
  const open = new URLSearchParams(search).get('open') ?? '';
  if (!open.startsWith('together:')) return undefined;
  const id = open.slice('together:'.length);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const key = fragment.get('k') ?? '';
  if (!UUID.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) return undefined;
  return { id, key, name: (fragment.get('n') ?? '').slice(0, 60) || 'Home' };
}
