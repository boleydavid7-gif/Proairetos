/*
 * The exercises Dynamis builds sessions from. Each covers a movement pattern, so a few sessions a week reach every
 * major muscle group. At home without weights, an exercise is a ladder of variations from easier to harder: moving
 * up the ladder takes the place of adding weight.
 */

export type Pattern = 'squat' | 'hinge' | 'push' | 'pull' | 'press' | 'pulldown' | 'single' | 'core';
export type Place = 'gym' | 'home' | 'body';
export type Measure = 'reps' | 'seconds';

export type Exercise = {
  id: string;
  name: string;
  pattern: Pattern;
  measure: Measure;
  /** Moved with weight the person chooses (kg or lb); bodyweight ones are ladders instead. */
  loaded: boolean;
  /** A big lift, given the longer rest. */
  big?: boolean;
  /** Two or three short cues. */
  how: string[];
};

export const PATTERN_NAMES: Record<Pattern, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  push: 'Push',
  pull: 'Pull',
  press: 'Press overhead',
  pulldown: 'Pull down',
  single: 'One leg',
  core: 'Trunk',
};

export const EXERCISES: Record<string, Exercise> = {
  'goblet-squat': { id: 'goblet-squat', name: 'Goblet squat', pattern: 'squat', measure: 'reps', loaded: true, big: true, how: ['Hold one weight at your chest', 'Sit down between your heels, chest tall', 'Stand by pushing the floor away'] },
  'back-squat': { id: 'back-squat', name: 'Back squat', pattern: 'squat', measure: 'reps', loaded: true, big: true, how: ['Bar across your upper back', 'Knees track over your toes', 'Go as low as you stay tall'] },
  'leg-press': { id: 'leg-press', name: 'Leg press', pattern: 'squat', measure: 'reps', loaded: true, big: true, how: ['Feet hip-width on the plate', 'Lower until your hips would lift', 'Press through your whole foot'] },
  'romanian-deadlift': { id: 'romanian-deadlift', name: 'Romanian deadlift', pattern: 'hinge', measure: 'reps', loaded: true, big: true, how: ['Soft knees, push your hips back', 'Weights slide down your legs', 'Stand tall by bringing your hips forward'] },
  'bench-press': { id: 'bench-press', name: 'Dumbbell bench press', pattern: 'push', measure: 'reps', loaded: true, big: true, how: ['Shoulder blades back and down', 'Lower to the sides of your chest', 'Press up and slightly in'] },
  'floor-press': { id: 'floor-press', name: 'Dumbbell floor press', pattern: 'push', measure: 'reps', loaded: true, how: ['Lie on the floor, knees bent', 'Lower until your elbows touch the floor', 'Press straight up'] },
  'cable-row': { id: 'cable-row', name: 'Seated row', pattern: 'pull', measure: 'reps', loaded: true, how: ['Sit tall, chest up', 'Pull the handle to your lower ribs', 'Let your shoulders reach forward on the way back'] },
  'dumbbell-row': { id: 'dumbbell-row', name: 'One-arm dumbbell row', pattern: 'pull', measure: 'reps', loaded: true, how: ['One hand and knee on a bench or chair', 'Pull the weight to your hip', 'Lower it all the way'] },
  'shoulder-press': { id: 'shoulder-press', name: 'Dumbbell shoulder press', pattern: 'press', measure: 'reps', loaded: true, how: ['Weights at your shoulders', 'Press up, ribs down', 'Lower with control'] },
  'lat-pulldown': { id: 'lat-pulldown', name: 'Lat pulldown', pattern: 'pulldown', measure: 'reps', loaded: true, how: ['Hands a little wider than your shoulders', 'Pull the bar to your upper chest', 'Let it rise until your arms are long'] },
  'band-pulldown': { id: 'band-pulldown', name: 'Band pulldown', pattern: 'pulldown', measure: 'reps', loaded: false, how: ['Band fixed above you', 'Pull your elbows down to your sides', 'Pause, then let your arms rise'] },
  'split-squat': { id: 'split-squat', name: 'Split squat', pattern: 'single', measure: 'reps', loaded: true, how: ['One foot forward, one back', 'Lower the back knee toward the floor', 'Do every rep on one side, then the other'] },
  'step-up': { id: 'step-up', name: 'Step-up', pattern: 'single', measure: 'reps', loaded: true, how: ['Whole foot on a sturdy step', 'Stand up through that leg', 'Step down slowly'] },
  'plank': { id: 'plank', name: 'Plank', pattern: 'core', measure: 'seconds', loaded: false, how: ['Forearms down, body in one line', 'Squeeze your seat', 'Breathe steadily'] },
  'dead-bug': { id: 'dead-bug', name: 'Dead bug', pattern: 'core', measure: 'reps', loaded: false, how: ['Lie on your back, arms and knees up', 'Reach one arm and the other leg away', 'Keep your lower back down'] },
  'farmer-carry': { id: 'farmer-carry', name: 'Farmer carry', pattern: 'core', measure: 'seconds', loaded: true, how: ['A heavy weight in each hand', 'Walk tall and slow', 'Set them down before your grip goes'] },
};

/** Bodyweight ladders: easier first. Moving up a step stands in for adding weight. */
export const LADDERS: Record<string, { name: string; measure: Measure; how: string[] }[]> = {
  'bw-squat': [
    { name: 'Sit to stand', measure: 'reps', how: ['From a chair, stand without your hands', 'Sit back down slowly'] },
    { name: 'Bodyweight squat', measure: 'reps', how: ['Feet shoulder-width', 'Sit down between your heels, chest tall'] },
    { name: 'Pause squat', measure: 'reps', how: ['Hold the bottom for two seconds', 'Stand up steadily'] },
    { name: 'Rear-foot-elevated split squat', measure: 'reps', how: ['Back foot on a chair', 'Lower the back knee', 'Each side'] },
  ],
  'bw-hinge': [
    { name: 'Glute bridge', measure: 'reps', how: ['Lie on your back, knees bent', 'Lift your hips until your body is straight'] },
    { name: 'Single-leg glute bridge', measure: 'reps', how: ['One foot down, the other knee up', 'Lift through the heel on the floor', 'Each side'] },
    { name: 'Shoulders-up hip thrust', measure: 'reps', how: ['Upper back on a sofa or bench', 'Drive your hips up, pause at the top'] },
  ],
  'bw-push': [
    { name: 'Wall push-up', measure: 'reps', how: ['Hands on a wall at chest height', 'Body straight, chest to the wall'] },
    { name: 'Incline push-up', measure: 'reps', how: ['Hands on a table or counter', 'Lower your chest to the edge'] },
    { name: 'Knee push-up', measure: 'reps', how: ['Knees down, body straight from knees to head'] },
    { name: 'Push-up', measure: 'reps', how: ['Hands under your shoulders', 'Lower as one piece'] },
    { name: 'Feet-up push-up', measure: 'reps', how: ['Feet on a step or chair', 'Lower your chest toward the floor'] },
  ],
  'bw-pull': [
    { name: 'Band row', measure: 'reps', how: ['Band around something sturdy', 'Pull your hands to your ribs'] },
    { name: 'Table row, knees bent', measure: 'reps', how: ['Under a sturdy table, hold the edge', 'Pull your chest up to it'] },
    { name: 'Table row, legs straight', measure: 'reps', how: ['Heels on the floor, body straight', 'Pull your chest up'] },
  ],
  'bw-press': [
    { name: 'Hands-up pike push-up', measure: 'reps', how: ['Hands on a chair, hips high', 'Lower your head toward the chair'] },
    { name: 'Pike push-up', measure: 'reps', how: ['Hands on the floor, hips high', 'Lower your head between your hands'] },
    { name: 'Feet-up pike push-up', measure: 'reps', how: ['Feet on a chair, hips high', 'Lower your head toward the floor'] },
  ],
  'bw-single': [
    { name: 'Reverse lunge', measure: 'reps', how: ['Step back, lower the back knee', 'Each side'] },
    { name: 'Step-up', measure: 'reps', how: ['Whole foot on a step', 'Stand up through that leg', 'Each side'] },
    { name: 'Split squat with a pause', measure: 'reps', how: ['Hold the bottom for two seconds', 'Each side'] },
  ],
  'bw-core': [
    { name: 'Dead bug', measure: 'reps', how: ['Reach one arm and the other leg away', 'Lower back stays down'] },
    { name: 'Plank', measure: 'seconds', how: ['Forearms down, body in one line'] },
    { name: 'Side plank', measure: 'seconds', how: ['On one forearm, hips up', 'Each side'] },
  ],
};

/** Which exercise does each pattern, by place and by whether the person is new to lifting. */
export function exerciseFor(pattern: Pattern, place: Place, isNew: boolean): string {
  if (place === 'body') return `bw-${pattern === 'pulldown' ? 'pull' : pattern}`;
  const gym: Record<Pattern, string> = {
    squat: isNew ? 'goblet-squat' : 'back-squat',
    hinge: 'romanian-deadlift',
    push: 'bench-press',
    pull: 'cable-row',
    press: 'shoulder-press',
    pulldown: 'lat-pulldown',
    single: 'split-squat',
    core: 'plank',
  };
  const home: Record<Pattern, string> = {
    squat: 'goblet-squat',
    hinge: 'romanian-deadlift',
    push: 'floor-press',
    pull: 'dumbbell-row',
    press: 'shoulder-press',
    pulldown: 'band-pulldown',
    single: 'split-squat',
    core: 'dead-bug',
  };
  return (place === 'gym' ? gym : home)[pattern];
}

export function isLadder(id: string): boolean {
  return id in LADDERS;
}

/** The name and cues of an exercise, at a step of its ladder when it is one. */
export function describe(id: string, step = 0): { name: string; measure: Measure; how: string[]; loaded: boolean; big: boolean } {
  const ladder = LADDERS[id];
  if (ladder) {
    const at = ladder[Math.max(0, Math.min(ladder.length - 1, step))];
    return { name: at.name, measure: at.measure, how: at.how, loaded: false, big: false };
  }
  const exercise = EXERCISES[id];
  return exercise ? { name: exercise.name, measure: exercise.measure, how: exercise.how, loaded: exercise.loaded, big: Boolean(exercise.big) } : { name: id, measure: 'reps', how: [], loaded: true, big: false };
}

/** Other exercises for the same movement, to do instead (all those with weights; at home without, its ladder). */
export function alternatives(pattern: Pattern, place: Place): { id: string; name: string }[] {
  if (place === 'body') return [];
  return Object.values(EXERCISES)
    .filter((exercise) => exercise.pattern === pattern && (place === 'gym' || !['back-squat', 'leg-press', 'cable-row', 'lat-pulldown'].includes(exercise.id)))
    .map((exercise) => ({ id: exercise.id, name: exercise.name }));
}
