/** The middle-of-the-night steps, offered in the order used by CBT-I. */
export const CANT_SLEEP_STEPS = [
  {
    id: 'get-up',
    title: 'Leave the bed for a while',
    line: 'If you have been awake for about 20 minutes, get up. Keep the light dim and do something calm. Return when you feel sleepy.',
    source: 'Bootzin RR, Epstein DR. Understanding and treating insomnia. Annu Rev Clin Psychol 2011;7:435–458.',
  },
  {
    id: 'shuffle',
    title: 'Picture ordinary words',
    line: 'Choose a word, picture it, then let another ordinary word arrive. There is no story to finish.',
    source: 'Beaudoin LP, Beaudoin CE. Cognitive shuffle for sleep onset. 2015.',
  },
] as const;

export const SHUFFLE_WORDS = [
  'river', 'button', 'lemon', 'window', 'candle', 'pencil', 'meadow', 'orange',
  'basket', 'feather', 'mug', 'garden', 'ladder', 'paper', 'stone', 'teacup',
] as const;

export function shuffleWord(index: number): string {
  return SHUFFLE_WORDS[((index % SHUFFLE_WORDS.length) + SHUFFLE_WORDS.length) % SHUFFLE_WORDS.length];
}
