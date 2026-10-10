/**
 * Short practices from the traditions Proairetos draws on: a few steps each,
 * none scored or required, each with its source.
 */
export type PracticeId = 'ground' | 'sit-with-it' | 'view-from-above' | 'kindness' | 'noting' | 'simple-good';

export type Practice = {
  id: PracticeId;
  title: string;
  /** One line under the title in the list. */
  line: string;
  steps: string[];
  /** The closing line. */
  close: string;
  source: string;
};

export const practices: readonly Practice[] = [
  {
    id: 'ground',
    title: 'Come back to the room',
    line: 'For a moment that feels like too much.',
    steps: [
      'Put your feet flat on the floor. Feel it holding you up.',
      'Look around and name five things you can see.',
      'Four things you can feel: your clothes, the air, the chair, your hands.',
      'Three things you can hear, near or far.',
      'Two things you can smell, or two you like the smell of.',
      'One slow breath, longer out than in.',
    ],
    close: 'You’re here, in this room.',
    source: 'The 5-4-3-2-1 grounding exercise, widely used for anxiety, rooted in mindful attention to the senses.',
  },
  {
    id: 'sit-with-it',
    title: 'Sit with it',
    line: 'For a feeling that is here right now.',
    steps: [
      'Notice what you’re feeling. Name it if a word comes: tired, worried, hurt, restless.',
      'Let it be there. No need to fix it or push it away.',
      'Where do you feel it in your body? Chest, throat, shoulders, stomach. Stay with it.',
      'What would you say to a friend who felt this? Say it to yourself, the same way.',
    ],
    close: 'Let it stay or pass.',
    source: 'RAIN (Recognize, Allow, Investigate, Nurture), as taught by Tara Brach, with self-compassion from Kristin Neff.',
  },
  {
    id: 'view-from-above',
    title: 'View from above',
    line: 'For when something feels very large.',
    steps: [
      'Picture yourself where you are, as if from the ceiling.',
      'Rise higher: the building, the street, the town, with everyone in it living their own day.',
      'Higher still: the country, the whole earth turning slowly, morning somewhere, night somewhere else.',
      'From here, look at what was weighing on you. It is still real. Notice its size now.',
      'Come back down, slowly, to where you are.',
    ],
    close: 'You’re back.',
    source: 'Marcus Aurelius, Meditations, and Pierre Hadot’s account of Stoic spiritual exercises.',
  },
  {
    id: 'kindness',
    title: 'Kind wishes',
    line: 'For warmth toward yourself and others.',
    steps: [
      'Bring to mind someone who is easy to care about. Silently wish: may you be well, may you be at ease.',
      'Now yourself, as you are today: may I be well, may I be at ease.',
      'Someone you see often but hardly know, perhaps a coworker or a neighbour: may you be well.',
      'And widening, to everyone having a day like yours: may we all be at ease.',
    ],
    close: 'May you be well.',
    source: 'Loving-kindness (metta) meditation from the Buddhist tradition.',
  },
  {
    id: 'noting',
    title: 'Noting',
    line: 'For a busy mind.',
    steps: [
      'Sit as you are. Let your attention rest wherever it lands.',
      'When a thought comes, note it: thinking. A plan: planning. A memory: remembering.',
      'When a sound or feeling takes your attention, note that: hearing, feeling.',
      'Keep noting as things come and go.',
    ],
    close: 'Everything you noted came and went.',
    source: 'Noting practice from Buddhist insight meditation; impermanence (anicca).',
  },
  {
    id: 'simple-good',
    title: 'One simple good thing',
    line: 'For finding enough in an ordinary day.',
    steps: [
      'Think of one small good thing from today, however ordinary: a warm drink, a kind word, a quiet minute.',
      'What made it good?',
      'Notice how little it needed.',
    ],
    close: 'Keep it in mind today.',
    source: 'Epicurus, on simple pleasures and the calm (ataraxia) they bring.',
  },
];

export function practiceById(id: PracticeId): Practice {
  return practices.find((practice) => practice.id === id)!;
}
