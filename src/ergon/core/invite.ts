/** A home's invite: `/ergon/?open=home:ID#k=KEY&n=NAME`. The key after `#` never reaches a server. */
export function inviteLink(origin: string, list: { id: string; key: string; name: string }): string {
  return `${origin}/ergon/?open=home:${list.id}#k=${list.key}&n=${encodeURIComponent(list.name)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readInvite(search: string, hash: string): { id: string; key: string; name: string } | undefined {
  const open = new URLSearchParams(search).get('open') ?? '';
  if (!open.startsWith('home:')) return undefined;
  const id = open.slice(5);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const key = fragment.get('k') ?? '';
  if (!UUID.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) return undefined;
  return { id, key, name: (fragment.get('n') ?? '').slice(0, 60) || 'Home' };
}
