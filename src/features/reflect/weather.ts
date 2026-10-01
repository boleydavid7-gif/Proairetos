import type { ComponentType } from 'react';
import { CloudIcon, MoonIcon, PartlyCloudyIcon, RainIcon, StormIcon, SunIcon } from '../../components/icons/Icons';
import type { InnerWeather, Reflection } from '../../core/reflections/types';
import { isDaytime } from './format';

type IconComponent = ComponentType<{ size?: number }>;

/** Inner weather the person can pick when writing. The app never picks one. */
export const weatherOptions: readonly { id: InnerWeather; label: string; icon: IconComponent }[] = [
  { id: 'CLEAR', label: 'Clear', icon: SunIcon },
  { id: 'PARTLY', label: 'Partly cloudy', icon: PartlyCloudyIcon },
  { id: 'CLOUDY', label: 'Cloudy', icon: CloudIcon },
  { id: 'RAIN', label: 'Rain', icon: RainIcon },
  { id: 'STORM', label: 'Storm', icon: StormIcon },
];

export const weatherLabel = (weather: InnerWeather) => weatherOptions.find((option) => option.id === weather)!.label;

/** The person's chosen weather, or otherwise just the time of day: sun by day, moon by night. */
export function entryMark(reflection: Reflection): { icon: IconComponent; label: string } {
  if (reflection.weather) {
    const option = weatherOptions.find((o) => o.id === reflection.weather)!;
    return { icon: option.icon, label: `Inner weather: ${option.label}` };
  }
  return isDaytime(reflection.createdAt) ? { icon: SunIcon, label: 'Daytime' } : { icon: MoonIcon, label: 'Evening' };
}
