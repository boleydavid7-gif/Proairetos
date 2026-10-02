export type StoicLine = {
  text: string;
  source?: string;
  /** One way to try the line today, shown only when the person turns the line over. */
  tryIt?: string;
};

/** Short passages from the Stoics, in common public-domain translations. */
const baseLines: readonly StoicLine[] = [
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

/** Keyed by the line's text, so the lines above stay easy to read. */
const waysToTry: Readonly<Record<string, string>> = {
  'You cannot control everything, but you can control your response.':
    'When something goes sideways today, take one breath before you answer it.',
  'Some things are within our power, while others are not.':
    'Pick one thing on your mind and sort it: the part that is yours to act on, and the part that is not.',
  'It is not things that disturb us, but our judgements about things.':
    'When something stings today, name the event plainly, then notice the story you added to it.',
  'First say to yourself what you would be; and then do what you have to do.':
    'Before your next task, finish this sentence: today I want to be someone who…',
  'No one is free who is not master of himself.':
    'Notice one urge today, to check, snap, or scroll, and let it pass once without acting on it.',
  'How long are you going to wait before you demand the best for yourself?':
    'Choose one small thing you keep putting off and give it five minutes now.',
  'We suffer more often in imagination than in reality.':
    'When a worry arrives, ask: is this happening now, or only in my head?',
  'While we are postponing, life speeds by.':
    'Do the smallest first step of something you have been meaning to begin.',
  'Begin at once to live, and count each separate day as a separate life.':
    'Let yesterday be finished. Treat this day as a fresh start, complete in itself.',
  'It is not that we have a short time to live, but that we waste a lot of it.':
    'Notice one stretch of time today that went somewhere you did not choose. No judgement, just notice.',
  'Associate with those who will make a better person of you.':
    'Reach out to one person who brings out your best: a message is enough.',
  'A well-ordered mind can stop just where it is and pass some time in its own company.':
    'Spend two minutes doing nothing at all: no phone, no task. Just sit.',
  'The impediment to action advances action. What stands in the way becomes the way.':
    'Take today’s biggest obstacle and ask what it lets you practise: patience, skill, or courage.',
  'Such as are your habitual thoughts, such also will be the character of your mind.':
    'Catch one repeating thought today and ask whether it is one you would choose.',
  'If it is not right, do not do it; if it is not true, do not say it.':
    'Before you speak in a tense moment, check: is it true, and is it kind?',
  'Confine yourself to the present.':
    'Do one ordinary thing today with full attention, like washing a cup or walking to the car.',
  'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.':
    'Name one simple thing today that was already enough.',
  'Look within. Within is the fountain of good, and it will ever bubble up, if you will ever dig.':
    'Recall one moment you acted at your best. What was in you then is still there.',
  'The best way of avenging yourself is not to become like the wrongdoer.':
    'If someone is unkind today, answer the way you would be proud of later.',
  'Loss is nothing else but change, and change is nature’s delight.':
    'Notice one thing that has changed lately, and see whether you can meet it with curiosity.',
  'Watch the stars in their courses as if you were running alongside them.':
    'Step outside for a minute today and look up, at sky, clouds, or stars.',
};

export const stoicLines: readonly StoicLine[] = baseLines.map((line) =>
  waysToTry[line.text] ? { ...line, tryIt: waysToTry[line.text] } : line,
);

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
