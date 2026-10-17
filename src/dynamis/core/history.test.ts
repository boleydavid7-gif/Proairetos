import { describe, expect, it } from 'vitest';
import { exerciseHistory, exerciseRecords, platesFor, platesText } from './history';
import type { Workout } from './plan';

const workout = (id: string, date: string, sets: { weight?: number; reps: number }[]): Workout => ({
  id,
  date,
  session: 'A',
  exercises: [{ exercise: 'back-squat', name: 'Back squat', sets }, { exercise: 'plank', name: 'Plank', sets: [{ reps: 30 }] }],
  createdAt: `${date}T10:00:00Z`,
});

describe('exercise history', () => {
  const all = [workout('a', '2026-10-01', [{ weight: 60, reps: 8 }, { weight: 60, reps: 7 }]), workout('b', '2026-10-08', [{ weight: 62.5, reps: 6 }, { weight: 60, reps: 10 }])];

  it('lists sessions newest first', () => {
    expect(exerciseHistory(all, 'back-squat').map((each) => each.workoutId)).toEqual(['b', 'a']);
    expect(exerciseHistory(all, 'lat-pulldown')).toEqual([]);
  });

  it('finds the heaviest set and the most reps', () => {
    const records = exerciseRecords(exerciseHistory(all, 'back-squat'));
    expect(records.heaviest).toEqual({ weight: 62.5, reps: 6, date: '2026-10-08' });
    expect(records.mostReps).toEqual({ reps: 10, weight: 60, date: '2026-10-08' });
  });
});

describe('plates', () => {
  it('loads each side largest first', () => {
    expect(platesFor(100, 20, 'kg')).toEqual({ side: [25, 15], left: 0 });
    expect(platesFor(62.5, 20, 'kg')).toEqual({ side: [20, 1.25], left: 0 });
    expect(platesFor(225, 45, 'lb')).toEqual({ side: [45, 45], left: 0 });
    expect(platesText(platesFor(135, 45, 'lb').side)).toBe('45 each side');
  });

  it('says what is short and handles the bar alone', () => {
    expect(platesFor(21, 20, 'kg')).toEqual({ side: [], left: 0.5 });
    expect(platesFor(20, 20, 'kg').side).toEqual([]);
    expect(platesText([])).toBe('The bar alone');
  });
});
