/**
 * Colours the person can give their own things, so a week reads at a
 * glance. Only a label the person chose; nothing ranks or acts on it.
 */
export type TagColor = 'amber' | 'violet' | 'sage' | 'sky' | 'rose' | 'slate';

export const tagColors: readonly { id: TagColor; label: string }[] = [
  { id: 'amber', label: 'Amber' },
  { id: 'violet', label: 'Violet' },
  { id: 'sage', label: 'Sage' },
  { id: 'sky', label: 'Sky' },
  { id: 'rose', label: 'Rose' },
  { id: 'slate', label: 'Slate' },
];

export const isTagColor = (value: unknown): value is TagColor => tagColors.some((color) => color.id === value);
