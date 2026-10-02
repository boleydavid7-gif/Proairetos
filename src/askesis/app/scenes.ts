import type { WorkoutKind } from '../core/workouts';

const files = import.meta.glob<string>('../assets/scenes/*.webp', { eager: true, import: 'default', query: '?url' });

/** The landscape photographs, by name ("lake-trail"). */
export const scenes: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]),
);

export function scene(name: string): string {
  return scenes[name] ?? scenes['lake-trail'] ?? '';
}

export const kindScene: Record<WorkoutKind, string> = {
  'walk-run': 'forest-trail',
  easy: 'lake-trail',
  strides: 'misty-lake',
  long: 'alpine-dusk',
  tempo: 'dusk-sky',
  intervals: 'pink-lake',
  hills: 'forest-path',
  'race-pace': 'starry-valley',
  walk: 'misty-forest',
  race: 'alpine-dusk',
};
