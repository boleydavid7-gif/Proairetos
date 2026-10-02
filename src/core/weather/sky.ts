/**
 * The sky, from the World Meteorological Organization weather codes that
 * Open-Meteo reports. A plain fact about the outdoors, recorded only if the
 * person turns weather on; it says nothing about how they feel.
 */
export type SkyKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export type Sky = {
  code: number;
  isDay: boolean;
  /** Rounded to whole degrees, in the unit chosen. */
  temp: number;
  unit: 'C' | 'F';
};

export function skyKind(code: number): SkyKind {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}

const labels: Record<SkyKind, string> = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm',
};

export function skyLabel(sky: Pick<Sky, 'code' | 'isDay'>): string {
  const kind = skyKind(sky.code);
  return kind === 'clear' && !sky.isDay ? 'Clear night' : labels[kind];
}

export const formatTemp = (sky: Pick<Sky, 'temp' | 'unit'>) => `${sky.temp}°`;
