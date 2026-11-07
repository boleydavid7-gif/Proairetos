/*
 * Short mobility routines: a few minutes, held stretches, both sides where it says. Five minutes or more a week,
 * spread over most days, improved range of motion in the studies pooled by Thomas et al. (2018); strength
 * training through a full range did as well as stretching (Afonso et al., 2021). Nothing here is counted against.
 */

export type Stretch = { name: string; seconds: number; sides?: boolean; how: string };
export type Routine = { id: string; name: string; when: string; stretches: Stretch[] };

export const ROUTINES: Routine[] = [
  {
    id: 'morning',
    name: 'Morning',
    when: 'On waking',
    stretches: [
      { name: 'Cat and cow', seconds: 40, how: 'On hands and knees, round your back, then let it dip, with your breath.' },
      { name: 'Hip flexor stretch', seconds: 30, sides: true, how: 'Kneel on one knee, tuck your seat under, lean forward a little.' },
      { name: 'Hamstring stretch', seconds: 30, sides: true, how: 'Heel on a low step, hinge forward with a long back.' },
      { name: 'Doorway chest stretch', seconds: 30, how: 'Forearms on a door frame, step through until the chest opens.' },
      { name: 'Child’s pose', seconds: 40, how: 'Knees wide, sit back toward your heels, arms long.' },
    ],
  },
  {
    id: 'sitting',
    name: 'After sitting',
    when: 'A break from a desk, a drive or a shift',
    stretches: [
      { name: 'Hip flexor stretch', seconds: 30, sides: true, how: 'Kneel on one knee, tuck your seat under, lean forward a little.' },
      { name: 'Open book', seconds: 30, sides: true, how: 'Lie on your side, knees bent, open the top arm across to the floor on the other side.' },
      { name: 'Doorway chest stretch', seconds: 30, how: 'Forearms on a door frame, step through until the chest opens.' },
      { name: 'Calf stretch', seconds: 30, sides: true, how: 'Hands on a wall, one leg back, heel down.' },
    ],
  },
  {
    id: 'after',
    name: 'After training',
    when: 'At the end of a session',
    stretches: [
      { name: 'Standing quad stretch', seconds: 30, sides: true, how: 'Hold one foot up at your seat, knees together, stand tall.' },
      { name: 'Hamstring stretch', seconds: 30, sides: true, how: 'Heel on a low step, hinge forward with a long back.' },
      { name: 'Figure-four stretch', seconds: 30, sides: true, how: 'On your back, ankle across the other knee, draw them in.' },
      { name: 'Lat stretch', seconds: 30, sides: true, how: 'Hold a door frame overhead, sit your hips back and away.' },
      { name: 'Doorway chest stretch', seconds: 30, how: 'Forearms on a door frame, step through until the chest opens.' },
    ],
  },
  {
    id: 'hips',
    name: 'Hips and back',
    when: 'Any time, about 8 minutes',
    stretches: [
      { name: 'Cat and cow', seconds: 40, how: 'On hands and knees, round your back, then let it dip, with your breath.' },
      { name: '90/90 hip stretch', seconds: 40, sides: true, how: 'Sit with both knees bent at right angles, lean over the front shin.' },
      { name: 'Figure-four stretch', seconds: 30, sides: true, how: 'On your back, ankle across the other knee, draw them in.' },
      { name: 'Hip flexor stretch', seconds: 30, sides: true, how: 'Kneel on one knee, tuck your seat under, lean forward a little.' },
      { name: 'Hamstring stretch', seconds: 30, sides: true, how: 'Heel on a low step, hinge forward with a long back.' },
      { name: 'Child’s pose', seconds: 60, how: 'Knees wide, sit back toward your heels, arms long.' },
    ],
  },
];

/** The routine as steps of the guide: each side its own step. */
export function stepsOf(routine: Routine): { name: string; seconds: number; how: string; side?: 'Left' | 'Right' }[] {
  return routine.stretches.flatMap((stretch) =>
    stretch.sides
      ? [
          { name: stretch.name, seconds: stretch.seconds, how: stretch.how, side: 'Left' as const },
          { name: stretch.name, seconds: stretch.seconds, how: stretch.how, side: 'Right' as const },
        ]
      : [{ name: stretch.name, seconds: stretch.seconds, how: stretch.how }],
  );
}

/** Minutes, rounded up, with a few seconds between steps. */
export function routineMinutes(routine: Routine): number {
  const steps = stepsOf(routine);
  return Math.ceil((steps.reduce((sum, step) => sum + step.seconds, 0) + steps.length * 5) / 60);
}

export type MobilityLog = { id: string; date: string; routine: string; minutes: number; createdAt: string };

/** This week's mobility as facts: days and minutes. */
export function weekMobility(logs: readonly MobilityLog[], weekDates: readonly string[]): { days: number; minutes: number } {
  const inWeek = logs.filter((log) => weekDates.includes(log.date));
  return { days: new Set(inWeek.map((log) => log.date)).size, minutes: inWeek.reduce((sum, log) => sum + log.minutes, 0) };
}
