/**
 * Sunrise and sunset for a day and place, worked out on the device with the standard sunrise equation (the sun's
 * upper edge at the horizon, refraction included: -0.833°). Good to a minute or two away from the poles; no network.
 * Returns nothing for a day the sun never rises or never sets.
 */
const RAD = Math.PI / 180;
const J2000 = 2451545;
const UNIX_EPOCH_JD = 2440587.5;

const toDate = (julian: number) => new Date((julian - UNIX_EPOCH_JD) * 86_400_000);

export function sunTimes(date: string, lat: number, lon: number): { rise: Date; set: Date } | undefined {
  const [year, month, day] = date.split('-').map(Number);
  // Days since J2000 at local noon (longitude east is positive).
  const noonJulian = Date.UTC(year, month - 1, day, 12) / 86_400_000 + UNIX_EPOCH_JD;
  const n = Math.round(noonJulian - J2000 - 0.0008 - lon / 360);
  const meanSolar = n + 0.0008 - lon / 360;
  const anomaly = (357.5291 + 0.98560028 * meanSolar) % 360;
  const m = anomaly * RAD;
  const center = 1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m);
  const longitude = ((anomaly + center + 180 + 102.9372) % 360) * RAD;
  const transit = J2000 + meanSolar + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * longitude);
  const declination = Math.asin(Math.sin(longitude) * Math.sin(23.4397 * RAD));
  const phi = lat * RAD;
  const cosHour = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination));
  if (cosHour < -1 || cosHour > 1) return undefined;
  const hour = Math.acos(cosHour) / RAD / 360;
  return { rise: toDate(transit - hour), set: toDate(transit + hour) };
}
