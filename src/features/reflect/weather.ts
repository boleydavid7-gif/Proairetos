import type { ComponentType } from 'react';
import { CloudIcon, MoonIcon, PartlyCloudyIcon, RainIcon, SnowIcon, StormIcon, SunIcon } from '../../components/icons/Icons';
import { formatTemp, skyKind, skyLabel, type Sky } from '../../core/weather/sky';
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

/** An icon for the outdoor sky. */
export function skyIcon(sky: Pick<Sky, 'code' | 'isDay'>): IconComponent {
  const kind = skyKind(sky.code);
  if (kind === 'clear') return sky.isDay ? SunIcon : MoonIcon;
  if (kind === 'partly') return sky.isDay ? PartlyCloudyIcon : MoonIcon;
  if (kind === 'rain') return RainIcon;
  if (kind === 'snow') return SnowIcon;
  if (kind === 'storm') return StormIcon;
  return CloudIcon;
}

/**
 * The mark beside an entry: the inner weather the person chose; otherwise
 * the sky outside when it was written (if weather is on); otherwise just
 * the time of day, sun by day and moon by night.
 */
export function entryMark(reflection: Reflection): { icon: IconComponent; label: string } {
  if (reflection.weather) {
    const option = weatherOptions.find((o) => o.id === reflection.weather)!;
    return { icon: option.icon, label: `Inner weather: ${option.label}` };
  }
  if (reflection.sky) return { icon: skyIcon(reflection.sky), label: `Outside: ${skyLabel(reflection.sky)}, ${formatTemp(reflection.sky)}` };
  return isDaytime(reflection.createdAt) ? { icon: SunIcon, label: 'Daytime' } : { icon: MoonIcon, label: 'Evening' };
}
