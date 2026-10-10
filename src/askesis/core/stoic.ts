import { daysBetween } from '../../core/scheduling/dates';

/**
 * A line for the day, from the Stoics, about practice. One a day, the same
 * all day.
 */
export const trainingLines: { text: string; by: string }[] = [
  { text: 'Every habit and faculty is maintained and increased by the corresponding actions: walking by walking, running by running.', by: 'Epictetus, Discourses 2.18' },
  { text: 'No great thing comes into being all at once.', by: 'Epictetus, Discourses 1.15' },
  { text: 'What stands in the way becomes the way.', by: 'Marcus Aurelius, Meditations 5.20' },
  { text: 'It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.', by: 'Seneca, Letters 104' },
  { text: 'Some things are up to us and some are not.', by: 'Epictetus, Enchiridion 1' },
  { text: 'Confine yourself to the present.', by: 'Marcus Aurelius, Meditations 8.36' },
  { text: 'Begin at once to live.', by: 'Seneca, Letters 101' },
  { text: 'Practise yourself, for heaven’s sake, in little things, and then proceed to greater.', by: 'Epictetus, Discourses 1.18' },
  { text: 'Hold every hour in your grasp.', by: 'Seneca, Letters 1' },
  { text: 'Do every act of your life as if it were the last.', by: 'Marcus Aurelius, Meditations 2.5' },
  { text: 'Difficulties show what a person is made of.', by: 'Epictetus, Discourses 1.24' },
];

export function lineFor(today: string): { text: string; by: string } {
  const index = Math.abs(daysBetween('2026-01-01', today)) % trainingLines.length;
  return trainingLines[index];
}

/** Asked, never required, before a session. */
export const intentionPrompt = 'What part of this is up to you?';

export const raceDayLine =
  'The effort is yours; the clock, the weather and the field are not. Run the race that is up to you.';
