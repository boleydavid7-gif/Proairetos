export type StoicLine = { text: string; source?: string };

/** Short passages from the Stoics, in common public-domain translations. */
export const stoicLines: readonly StoicLine[] = [
  { text: 'You cannot control everything, but you can control your response.' },
  { text: 'Some things are within our power, while others are not.', source: 'Epictetus, Enchiridion 1' },
  { text: 'It is not things that disturb us, but our judgements about things.', source: 'Epictetus, Enchiridion 5' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', source: 'Epictetus, Discourses 3.23' },
  { text: 'No one is free who is not master of himself.', source: 'Epictetus, Fragments' },
  { text: 'How long are you going to wait before you demand the best for yourself?', source: 'Epictetus, Enchiridion 51' },
  { text: 'We suffer more often in imagination than in reality.', source: 'Seneca, Letters 13' },
  { text: 'While we are postponing, life speeds by.', source: 'Seneca, Letters 1' },
  { text: 'Begin at once to live, and count each separate day as a separate life.', source: 'Seneca, Letters 101' },
  {
    text: 'It is not that we have a short time to live, but that we waste a lot of it.',
    source: 'Seneca, On the Shortness of Life',
  },
  { text: 'Associate with those who will make a better person of you.', source: 'Seneca, Letters 7' },
  {
    text: 'A well-ordered mind can stop just where it is and pass some time in its own company.',
    source: 'Seneca, Letters 2',
  },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', source: 'Marcus Aurelius, Meditations 5.20' },
  { text: 'Such as are your habitual thoughts, such also will be the character of your mind.', source: 'Marcus Aurelius, Meditations 5.16' },
  { text: 'If it is not right, do not do it; if it is not true, do not say it.', source: 'Marcus Aurelius, Meditations 12.17' },
  { text: 'Confine yourself to the present.', source: 'Marcus Aurelius, Meditations 7.29' },
  {
    text: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.',
    source: 'Marcus Aurelius, Meditations 7.67',
  },
  { text: 'Look within. Within is the fountain of good, and it will ever bubble up, if you will ever dig.', source: 'Marcus Aurelius, Meditations 7.59' },
  { text: 'The best way of avenging yourself is not to become like the wrongdoer.', source: 'Marcus Aurelius, Meditations 6.6' },
  { text: 'Loss is nothing else but change, and change is nature’s delight.', source: 'Marcus Aurelius, Meditations 9.35' },
  { text: 'Watch the stars in their courses as if you were running alongside them.', source: 'Marcus Aurelius, Meditations 7.47' },
];

/**
 * One line for a local date ('YYYY-MM-DD'). Scattered by a hash so the order
 * feels random, but steady through the day so it never flickers on a revisit.
 */
export function stoicLineFor(date: string, lines: readonly StoicLine[] = stoicLines): StoicLine {
  let hash = 2166136261;
  for (const char of date) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return lines[(hash >>> 0) % lines.length];
}
