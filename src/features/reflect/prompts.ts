/**
 * Optional prompts. The person always writes the reflection; these only
 * offer a place to start. Self-distancing ("a friend") makes reflection
 * less likely to turn into rumination; the others follow Seneca's gentle
 * evening review.
 */
export const reflectionPrompts = [
  { key: 'friend', text: 'What would you tell a friend about today?' },
  { key: 'as-hoped', text: 'What went as you hoped?' },
  { key: 'next-time', text: 'What would you like to do differently next time?' },
  { key: 'let-go', text: 'What can you let go of?' },
] as const;

export function promptText(key: string | undefined): string | undefined {
  if (key === 'premeditation') return 'What might get in the way today?';
  if (key === 'weekly-review') return 'Weekly review';
  if (key === 'day-close') return 'Closing the day';
  if (key === 'worth-it') return 'What made today worth it';
  if (key === 'think-it-through') return 'Thought it through';
  if (key === 'after-run') return 'After a run, in Askesis';
  if (key === 'after-meal') return 'After a meal, in SOMA';
  if (key === 'gratitude') return 'Grateful for';
  if (key === 'three-good-things') return 'Three good things';
  return reflectionPrompts.find((prompt) => prompt.key === key)?.text;
}
