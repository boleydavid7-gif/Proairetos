/**
 * Free, round-the-clock crisis lines. Shown on request only, never because
 * of anything the person wrote: the app does not read their words.
 */
export type Helpline = { regions: string[]; place: string; name: string; how: string; tel?: string; sms?: string; url?: string };

export const helplines: readonly Helpline[] = [
  { regions: ['US'], place: 'United States', name: '988 Suicide & Crisis Lifeline', how: 'Call or text 988', tel: '988', sms: '988' },
  { regions: ['CA'], place: 'Canada', name: '9-8-8 Suicide Crisis Helpline', how: 'Call or text 988', tel: '988', sms: '988' },
  { regions: ['GB', 'IE'], place: 'UK and Ireland', name: 'Samaritans', how: 'Call 116 123, free', tel: '116123' },
  { regions: ['AU'], place: 'Australia', name: 'Lifeline', how: 'Call 13 11 14', tel: '131114' },
  { regions: ['NZ'], place: 'New Zealand', name: 'Need to talk?', how: 'Call or text 1737', tel: '1737', sms: '1737' },
];

export const elsewhere = { name: 'Find a Helpline', how: 'Free lines in over 130 countries', url: 'https://findahelpline.com' };

/** The person's own region first, from their browser's language setting (e.g. "en-GB"). */
export function helplinesFor(locale: string): Helpline[] {
  const region = locale.split('-')[1]?.toUpperCase();
  const mine = helplines.filter((line) => region && line.regions.includes(region));
  return [...mine, ...helplines.filter((line) => !mine.includes(line))];
}
