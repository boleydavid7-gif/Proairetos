/**
 * Sounds and music for Meditate: real recordings, kept in public/sounds as
 * seamless loops (see docs/SOUNDS.md for where each comes from). Sounds
 * loop without a seam; music plays a whole piece and begins again.
 */
export type SoundKind = 'sound' | 'music';

export type SoundEntry = {
  id: string;
  kind: SoundKind;
  title: string;
  line: string;
  icon: string;
  file: string;
};

const sound = (id: string, title: string, line: string, icon: string): SoundEntry => ({
  id,
  kind: 'sound',
  title,
  line,
  icon,
  file: `/sounds/${id}.mp3`,
});

const music = (id: string, title: string, line: string, icon: string): SoundEntry => ({
  id,
  kind: 'music',
  title,
  line,
  icon,
  file: `/sounds/${id}.mp3`,
});

export const soundCatalogue: readonly SoundEntry[] = [
  sound('rain', 'Rain', 'Light rain, steady and soft.', 'rain'),
  sound('window', 'Rain on a window', 'Rain against the glass, from inside.', 'rain'),
  sound('storm', 'Thunderstorm', 'Rain with thunder rolling past.', 'storm'),
  sound('river', 'River', 'Water running over stones.', 'river'),
  sound('ocean', 'Ocean', 'Waves on the shore.', 'wave'),
  sound('waterfall', 'Waterfall', 'A deep, even rush of water.', 'river'),
  sound('forest', 'Wind in the trees', 'Leaves moving in a breeze.', 'trees'),
  sound('birds', 'Birdsong', 'Birds in the morning.', 'leaf'),
  sound('crickets', 'Night', 'Crickets on a summer night.', 'moon'),
  sound('campfire', 'Campfire', 'A fire crackling.', 'flame'),
  sound('wind', 'Wind', 'Wind rising and falling.', 'wind'),
  sound('chimes', 'Wind chimes', 'Chimes stirring in the air.', 'chimes'),
  sound('fan', 'Fan', 'A fan turning; even and steady.', 'fan'),
  music('beethoven', 'Beethoven: Adagio cantabile', 'From the Pathétique sonata. Piano.', 'keys'),
  music('mozart', 'Mozart: Andante cantabile', 'From the sonata K. 333. Piano.', 'keys'),
  music('schubert', 'Schubert: Andante sostenuto', 'From the sonata D. 960. Piano.', 'keys'),
  music('bach', 'Bach: Aria', 'From the Aria variata, BWV 989. Piano.', 'keys'),
  music('flutes', 'Boismortier: Adagio', 'From the concerto for five flutes.', 'flute'),
  music('cello', 'Cello and guitar', 'A short, quiet duet.', 'cello'),
  music('bowls', 'Singing bowls', 'A bowl struck now and then, left to ring.', 'bowl'),
];

export function soundEntry(id: string | null | undefined): SoundEntry | undefined {
  return soundCatalogue.find((entry) => entry.id === id);
}

/** The bell that opens and closes a sit: one strike of a real singing bowl. */
export const BELL_FILE = '/sounds/bell.mp3';
