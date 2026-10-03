/**
 * The Stoics on food, one line a day. Musonius Rufus gave two lectures on
 * food; the lines here keep close to their sense, credited to where they
 * come from.
 */
export type Line = { text: string; source: string };

export const lines: Line[] = [
  { text: 'Food is for nourishing the body, not for pleasure alone.', source: 'After Musonius Rufus, Lecture 18A' },
  { text: 'Choose food that is simple, easily had, and good for the body.', source: 'After Musonius Rufus, Lecture 18A' },
  { text: 'Self-control begins at the table: in what we eat, and how much.', source: 'After Musonius Rufus, Lecture 18B' },
  {
    text: 'Behave as at a banquet. Is anything brought around to you? Put out your hand and take a moderate share.',
    source: 'Epictetus, Enchiridion 15',
  },
  {
    text: 'Set aside a few days to be content with the plainest fare, and ask yourself: is this what I feared?',
    source: 'After Seneca, Letter 18',
  },
  { text: 'Nature asks for little; it is opinion that asks for more.', source: 'After Seneca, Letter 16' },
  { text: 'Eat to live, as the body asks, and keep the rest of your attention for your life.', source: 'After Musonius Rufus, Lecture 18B' },
  { text: 'Hunger is the best sauce.', source: 'After Socrates, as Cicero tells it (Tusculan Disputations 5.90)' },
];

/** The line for a day: the same all day, a different one tomorrow. */
export function lineFor(date: string): Line {
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
  return lines[((day % lines.length) + lines.length) % lines.length];
}
