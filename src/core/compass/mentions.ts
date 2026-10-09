import type { LifeItem } from '../life-items/types';
import type { Reflection } from '../reflections/types';

/**
 * Where a person's name appears in what the person wrote, as whole words. A way back to those moments;
 * nothing is counted or concluded.
 */
export type Mention = { id: string; kind: 'item' | 'reflection'; text: string; at: string };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function mentionsOf(
  name: string,
  items: readonly Pick<LifeItem, 'id' | 'title' | 'notes' | 'createdAt'>[],
  reflections: readonly Pick<Reflection, 'id' | 'body' | 'createdAt' | 'kind'>[],
  limit = 5,
): Mention[] {
  const clean = name.trim();
  if (clean.length < 2) return [];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(clean)}(?![\\p{L}\\p{N}])`, 'iu');
  const found: Mention[] = [];
  for (const item of items) {
    if (pattern.test(item.title) || pattern.test(item.notes ?? '')) found.push({ id: item.id, kind: 'item', text: item.title, at: item.createdAt });
  }
  for (const reflection of reflections) {
    if (reflection.kind === 'INTENTION' || !pattern.test(reflection.body)) continue;
    const match = pattern.exec(reflection.body)!;
    const start = Math.max(0, match.index - 40);
    const end = Math.min(reflection.body.length, match.index + clean.length + 60);
    found.push({
      id: reflection.id,
      kind: 'reflection',
      text: `${start > 0 ? '…' : ''}${reflection.body.slice(start, end).trim()}${end < reflection.body.length ? '…' : ''}`,
      at: reflection.createdAt,
    });
  }
  return found.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
