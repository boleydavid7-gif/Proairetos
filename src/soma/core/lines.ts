/** Lines on food from the Stoics and their neighbours, one a day, each with its source. */
export type Line = { text: string; source: string };

export const lines: Line[] = [
  {
    text: 'The beginning and foundation of self-control lies in self-restraint in eating and drinking.',
    source: 'Musonius Rufus, Lecture 18A',
  },
  {
    text: 'Behave as at a banquet. Is anything brought around to you? Put out your hand and take a moderate share.',
    source: 'Epictetus, Enchiridion 15',
  },
  {
    text: 'Set aside a certain number of days, during which you shall be content with the scantiest and cheapest fare.',
    source: 'Seneca, Letters 18',
  },
  { text: 'Natural desires are limited; those which spring from false opinion have no stopping-point.', source: 'Seneca, Letters 16' },
  { text: 'Plain fare gives as much pleasure as a costly diet, once the pain of want is removed.', source: 'Epicurus, Letter to Menoeceus' },
  { text: 'The best seasoning for food is hunger.', source: 'Socrates, as Cicero tells it (Tusculan Disputations 5.90)' },
]

/** The line for a day: the same all day, a different one tomorrow. */
export function lineFor(date: string): Line {
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
  return lines[((day % lines.length) + lines.length) % lines.length];
}
