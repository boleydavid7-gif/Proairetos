export type FreeMeditationLink = {
  title: string;
  source: string;
  detail: string;
  url: string;
};

/** Public libraries the person can open when they want a recorded guide. */
export const freeGuidedMeditations: readonly FreeMeditationLink[] = [
  {
    title: 'UCLA Mindful',
    source: 'UCLA Mindful Awareness Research Center',
    detail: 'Free practices for breathing, sleep, stress, and everyday attention.',
    url: 'https://www.uclahealth.org/programs/marc/free-guided-meditations',
  },
  {
    title: 'Tara Brach',
    source: 'Tara Brach',
    detail: 'Free talks and guided practices rooted in mindfulness and compassion.',
    url: 'https://www.tarabrach.com/guided-meditations/',
  },
  {
    title: 'Plum Village',
    source: 'Plum Village',
    detail: 'Meditations and practices from the Plum Village tradition.',
    url: 'https://plumvillage.org/mindfulness-practice',
  },
  {
    title: 'Audio Dharma',
    source: 'Insight Meditation Center',
    detail: 'A large free library of Buddhist meditation talks and practices.',
    url: 'https://www.audiodharma.org/series/1/talk/1762/',
  },
  {
    title: 'Insight Timer',
    source: 'Insight Timer',
    detail: 'A broad free library of guided practices from teachers around the world.',
    url: 'https://insighttimer.com/meditation-app',
  },
];
