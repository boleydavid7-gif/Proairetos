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

/**
 * What practising each starting value can look like on an ordinary day.
 * Character grows through practice (Aristotle); these are examples, never
 * a standard to meet.
 */
const presetPractices: Readonly<Record<string, string>> = {
  Courage: 'Saying the honest thing kindly, or starting the task you would rather not.',
  Justice: 'Giving someone your full, fair hearing before you decide.',
  Temperance: 'Stopping at enough: one episode, one more bite, one fewer yes.',
  Wisdom: 'Pausing to ask what is actually true here before acting.',
  Calm: 'Letting a breath come before your reply.',
  Craft: 'Doing one small piece of work as well as you can, unseen.',
  Curiosity: 'Asking one more question than usual.',
  Discipline: 'Keeping one small promise to yourself.',
  Faith: 'Making a little room for what you hold sacred.',
  Family: 'Giving the people at home ten minutes of full attention.',
  Freedom: 'Choosing one part of your day on purpose.',
  Friendship: 'Sending a message to someone you have been thinking of.',
  Generosity: 'Giving something away, time included, without keeping count.',
  Growth: 'Trying something slightly harder than last time.',
  Health: 'Water, a short walk, or going to bed a little earlier.',
  Honesty: 'Saying "I don’t know" when you don’t.',
  Kindness: 'Including yourself in the kindness you give others.',
  Patience: 'Letting someone finish, or letting a slow thing be slow.',
  Presence: 'Doing one thing at a time, with your phone away.',
  Service: 'Doing one useful thing nobody asked for.',
};

export function practiceOfValue(name: string): string | undefined {
  return presetPractices[name];
}
