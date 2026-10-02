import type { CaptureKind, LifeItem, LifeItemType } from './types';

/**
 * The one set of kinds people see everywhere: on Capture, in Empty your
 * head, on an item, and in Insights. Stored as the item's type and capture
 * tag, so everything recorded before keeps working; this is only how it
 * reads. Always the person's choice, never inferred after saving.
 */
export type ItemKind = 'TODO' | 'REMEMBER' | 'CONCERN' | 'IDEA' | 'FEELING';

export const itemKinds: readonly { id: ItemKind; label: string; prompt: string }[] = [
  { id: 'TODO', label: 'To do', prompt: 'Something to do…' },
  { id: 'REMEMBER', label: 'Remember', prompt: 'Don’t let me forget…' },
  { id: 'CONCERN', label: 'Concern', prompt: 'I’m worried about…' },
  { id: 'IDEA', label: 'Idea', prompt: 'An idea for later…' },
  { id: 'FEELING', label: 'Feeling', prompt: 'I’m feeling…' },
];

export const kindLabel = (kind: ItemKind | undefined) => itemKinds.find((k) => k.id === kind)?.label;

/** How an item reads, from what is stored. Undefined means not sorted. */
export function kindOf(item: Pick<LifeItem, 'type' | 'captureKind'>): ItemKind | undefined {
  if (item.type === 'DO' || item.type === 'MAKE_TIME_FOR') return 'TODO';
  if (item.captureKind === 'EMOTION') return 'FEELING';
  if (item.captureKind === 'CONCERN') return 'CONCERN';
  if (item.captureKind === 'IDEA') return 'IDEA';
  if (item.type === 'THINKING_ABOUT') return 'CONCERN';
  if (item.type === 'REMEMBER' || item.captureKind === 'THOUGHT') return 'REMEMBER';
  return undefined;
}

/** What is stored for a kind. Concerns keep the "thinking about" type, so decisions and the control split stay with them. */
export function kindFields(kind: ItemKind | undefined): { type: LifeItemType | null; captureKind?: CaptureKind } {
  switch (kind) {
    case 'TODO':
      return { type: 'DO' };
    case 'REMEMBER':
      return { type: 'REMEMBER', captureKind: 'THOUGHT' };
    case 'CONCERN':
      return { type: 'THINKING_ABOUT', captureKind: 'CONCERN' };
    case 'IDEA':
      return { type: 'REMEMBER', captureKind: 'IDEA' };
    case 'FEELING':
      return { type: 'REMEMBER', captureKind: 'EMOTION' };
    default:
      return { type: null };
  }
}
