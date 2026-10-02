import type { Sky } from '../weather/sky';

export type ReflectionKind =
  | 'FREE'
  /** The person's intention for one day; periodStart holds that local date. */
  | 'INTENTION'
  | 'REVIEW'
  | 'DECISION_FOLLOWUP';

/**
 * An inner-weather check-in the person can add to what they write. The app
 * never picks one or reads one into the text.
 */
export type InnerWeather = 'CLEAR' | 'PARTLY' | 'CLOUDY' | 'RAIN' | 'STORM';

export interface Reflection {
  id: string;
  userId: string;
  body: string;
  kind: ReflectionKind;
  createdAt: string;
  periodStart?: string;
  periodEnd?: string;
  itemId?: string;
  decisionId?: string;
  promptKey?: string;
  weather?: InnerWeather;
  /** The outdoor sky when this was written, if the person turned weather on. A fact, not a mood. */
  sky?: Sky;
  /** Values the person tagged this with. */
  valueIds?: string[];
}
