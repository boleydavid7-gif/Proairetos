/**
 * Think it through: a written practice for a thought that has a grip. The
 * person answers in their own words; every step can be skipped, and nothing
 * is kept unless they choose to keep it. The app adds no words of its own to
 * what they wrote and never judges a thought as right or wrong.
 */
export type ThinkStepId = 'happened' | 'thought' | 'otherwise' | 'upToYou' | 'step';

export type ThinkStep = {
  id: ThinkStepId;
  question: string;
  hint: string;
  /** Other ways in, shown only if the person asks for one. */
  angles?: string[];
};

export const thinkSteps: readonly ThinkStep[] = [
  { id: 'happened', question: 'What happened?', hint: 'Just what a camera would have seen.' },
  { id: 'thought', question: 'What went through your mind?', hint: 'The thought, in the words it came in.' },
  {
    id: 'otherwise',
    question: 'What else could be true?',
    hint: 'Not to argue with yourself; only to see it from another side.',
    angles: [
      'What would you say to a friend who thought this?',
      'What would you notice if you looked at it a week from now?',
      'Is there anything that does not fit the thought?',
      'Is there a kinder way to put it that is still honest?',
    ],
  },
  { id: 'upToYou', question: 'What part of this is up to you?', hint: 'Your own choices and responses. The rest can be set down.' },
  { id: 'step', question: 'One small step, if there is one.', hint: 'Something you could do. It can go on your list.' },
];

export type ThinkAnswers = Partial<Record<ThinkStepId, string>>;

export const thinkThroughSource =
  'Epictetus, Enchiridion 5: “It is not things that disturb us, but our judgments about things.” ' +
  'The steps follow the thought record from cognitive behavioural therapy (Aaron Beck), which grew in part from that Stoic idea.';

/** What gets kept: the person's own answers under the questions they answered. */
export function composeThinkThrough(answers: ThinkAnswers): string {
  return thinkSteps
    .filter((step) => answers[step.id]?.trim())
    .map((step) => `${step.question}\n${answers[step.id]!.trim()}`)
    .join('\n\n');
}
