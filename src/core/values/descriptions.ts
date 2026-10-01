/**
 * A short line under each starting value, describing the value itself.
 * Values the person writes themselves have no line; their name is enough.
 */
const presetDescriptions: Readonly<Record<string, string>> = {
  Courage: 'Doing what is right when it is hard.',
  Justice: 'Fairness toward others.',
  Temperance: 'Enough, not excess.',
  Wisdom: 'Seeking understanding.',
  Calm: 'Steady when things are not.',
  Craft: 'Care in the work itself.',
  Curiosity: 'Staying open to learning.',
  Discipline: 'Keeping the commitment.',
  Faith: 'Trust in what you hold sacred.',
  Family: 'The people closest to you.',
  Freedom: 'Room to choose your own way.',
  Friendship: 'Showing up for the people you love.',
  Generosity: 'Giving freely.',
  Growth: 'Becoming more capable over time.',
  Health: 'Caring for body and mind.',
  Honesty: 'Truth in word and deed.',
  Kindness: 'Warmth toward others and yourself.',
  Patience: 'Respond, not react.',
  Presence: 'Being here, now.',
  Service: 'Being useful to others.',
};

export function describeValue(name: string): string | undefined {
  return presetDescriptions[name];
}
