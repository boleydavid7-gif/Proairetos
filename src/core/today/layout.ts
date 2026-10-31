import type { TodayPart } from '../../data/storage/preferences';

/** Today's sections that the person can put in their own order (the top messages and the foot stay where they are). */
export const TODAY_SECTIONS = [
  'intention',
  'together',
  'next',
  'day',
  'apps',
  'on-this-day',
  'open-time',
  'also',
  'done',
  'close-day',
  'line',
] as const;
export type TodaySection = (typeof TODAY_SECTIONS)[number];

export const SECTION_NAMES: Record<TodaySection, string> = {
  intention: 'Today’s intention',
  together: 'Shared list',
  next: 'Next',
  day: 'Your day',
  apps: 'From your apps',
  'on-this-day': 'On this day',
  'open-time': 'Open time',
  also: 'Folded lists',
  done: 'Done today',
  'close-day': 'Close the day',
  line: 'Daily thought',
};

/** Sections switched by a What's included part, so the switch here and the one in Settings are the same switch. */
export const SECTION_PART: Partial<Record<TodaySection, TodayPart>> = {
  intention: 'intention',
  'on-this-day': 'on-this-day',
  'open-time': 'open-time',
  'close-day': 'close-day',
  line: 'line',
};

/** The person's layout: the order they chose and the sections without a part that they turned off. */
export type TodayLayout = { order: TodaySection[]; off: TodaySection[] };

const isSection = (value: unknown): value is TodaySection => (TODAY_SECTIONS as readonly unknown[]).includes(value);

/** A stored layout made whole: known sections in the stored order, any new ones in their usual place, nothing twice. */
export function readLayout(saved: unknown): TodayLayout {
  const raw = (saved && typeof saved === 'object' ? saved : {}) as Partial<Record<'order' | 'off', unknown>>;
  const stored = Array.isArray(raw.order) ? [...new Set(raw.order.filter(isSection))] : [];
  const order = [...stored];
  // A section the stored order does not know yet goes in after the section that comes before it usually.
  TODAY_SECTIONS.forEach((section, at) => {
    if (order.includes(section)) return;
    const before = TODAY_SECTIONS.slice(0, at).reverse().find((each) => order.includes(each));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, section);
  });
  const off = Array.isArray(raw.off) ? [...new Set(raw.off.filter(isSection))].filter((section) => !SECTION_PART[section]) : [];
  return { order, off };
}

/** One section moved up (-1) or down (+1); the ends stay where they are. */
export function moveSection(layout: TodayLayout, section: TodaySection, by: -1 | 1): TodayLayout {
  const order = [...layout.order];
  const from = order.indexOf(section);
  const to = from + by;
  if (from < 0 || to < 0 || to >= order.length) return layout;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...layout, order };
}

/** One section placed at a new position (dragging), the rest closing up around it. */
export function placeSection(layout: TodayLayout, section: TodaySection, at: number): TodayLayout {
  const order = layout.order.filter((each) => each !== section);
  order.splice(Math.max(0, Math.min(at, order.length)), 0, section);
  return { ...layout, order };
}

export const isUsualOrder = (layout: TodayLayout) => layout.order.every((section, at) => section === TODAY_SECTIONS[at]);
