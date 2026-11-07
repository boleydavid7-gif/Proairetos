import { efforts, type Effort } from './effort';

/**
 * Heart-rate numbers, only if the person wants them. Maximum heart rate
 * is estimated with Tanaka, Monahan and Seals (2001): 208 - 0.7 x age,
 * which has a spread of about 10 beats either way; a measured maximum
 * replaces it. With a resting heart rate, ranges use heart-rate reserve
 * (Karvonen, 1957), which fits people with very low or high resting rates.
 */
export type HeartNumbers = { age?: number; maxHr?: number; restingHr?: number };

export function estimatedMax(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export function maxHeartRate(numbers: HeartNumbers): number | undefined {
  if (numbers.maxHr && numbers.maxHr > 100 && numbers.maxHr < 230) return Math.round(numbers.maxHr);
  if (numbers.age && numbers.age >= 10 && numbers.age <= 100) return estimatedMax(numbers.age);
  return undefined;
}

function at(share: number, max: number, resting?: number): number {
  if (resting && resting > 30 && resting < max) return Math.round(resting + share * (max - resting));
  return Math.round(share * max);
}

/** Beats per minute for an effort, or nothing when no maximum is known. */
export function heartRange(effort: Effort, numbers: HeartNumbers): [number, number] | undefined {
  const max = maxHeartRate(numbers);
  if (!max) return undefined;
  const [low, high] = efforts[effort].hr;
  return [at(low, max, numbers.restingHr), at(high, max, numbers.restingHr)];
}

/** The five common zones, as shares of maximum. */
export const fiveZones = [
  { zone: 1, name: 'Very light', share: [0.5, 0.6] },
  { zone: 2, name: 'Light: easy running', share: [0.6, 0.7] },
  { zone: 3, name: 'Moderate: steady', share: [0.7, 0.8] },
  { zone: 4, name: 'Hard: threshold', share: [0.8, 0.9] },
  { zone: 5, name: 'Very hard: intervals', share: [0.9, 1] },
] as const;

export function zoneRanges(numbers: HeartNumbers) {
  const max = maxHeartRate(numbers);
  if (!max) return [];
  return fiveZones.map((zone) => ({
    ...zone,
    low: at(zone.share[0], max, numbers.restingHr),
    high: at(zone.share[1], max, numbers.restingHr),
  }));
}
