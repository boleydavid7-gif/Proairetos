import type { BookingKind, PackGroup } from './model';

/*
 * A starting packing list, offered once and edited freely: what nearly every trip takes, plus what this one's length,
 * weather and bookings point to. Clothes counts follow the nights (with laundry assumed after a week).
 */

export type PackContext = {
  nights: number;
  /** Abroad: another country than home. */
  abroad: boolean;
  /** The coldest low and warmest high forecast or usual for the dates, in °C. */
  low?: number;
  high?: number;
  rain?: boolean;
  kinds: readonly BookingKind[];
};

export type PackSuggestion = { name: string; group: PackGroup };

export function suggestedPacking(context: PackContext): PackSuggestion[] {
  const days = Math.max(1, Math.min(context.nights + 1, 8));
  const list: PackSuggestion[] = [];
  const add = (group: PackGroup, ...names: string[]) => names.forEach((name) => list.push({ name, group }));

  add('documents', 'ID or driver’s license', 'Payment cards');
  if (context.abroad) add('documents', 'Passport', 'Travel insurance details', 'Some local currency');
  if (context.kinds.includes('flight')) add('documents', 'Boarding passes');
  if (context.kinds.includes('car')) add('documents', 'Driver’s license for the rental');
  if (context.kinds.includes('cruise')) add('documents', 'Cruise documents and luggage tags');
  if (context.kinds.includes('event')) add('documents', 'Event tickets');

  add('clothes', `${days} × underwear`, `${days} × socks`, `${Math.ceil(days / 2) + 1} × tops`, `${Math.max(1, Math.ceil(days / 3))} × trousers or skirts`, 'Sleepwear', 'Comfortable shoes');
  if (context.low !== undefined && context.low <= 10) add('clothes', 'Warm jacket', 'Sweater');
  if (context.low !== undefined && context.low <= 2) add('clothes', 'Hat and gloves');
  if (context.high !== undefined && context.high >= 24) add('clothes', 'Swimwear', 'Sun hat', 'Sandals');
  if (context.rain) add('clothes', 'Rain jacket or umbrella');
  if (context.kinds.includes('cruise')) add('clothes', 'Evening outfit');

  add('wash', 'Toothbrush and toothpaste', 'Deodorant', 'Shampoo', 'Hairbrush or comb');
  if (context.high !== undefined && context.high >= 20) add('wash', 'Sunscreen');

  add('tech', 'Phone charger', 'Headphones');
  if (context.abroad) add('tech', 'Plug adapter');
  if (context.nights >= 3) add('tech', 'Power bank');

  add('health', 'Regular medicines', 'Pain relief', 'Plasters');
  if (context.kinds.includes('cruise') || context.kinds.includes('bus')) add('health', 'Motion sickness tablets');

  add('other', 'Reusable water bottle', 'Snacks for the journey');
  return list;
}

/** The trip's days at the place: a forecast (rain as a chance in %) or the same days last year (rain in mm). */
export type WeatherDays = { source: 'forecast' | 'last-year'; days: readonly { high: number; low: number; rain?: number; code?: number }[] };

/** One thing offered for the weather, with the reason in plain words. */
export type WeatherOffer = PackSuggestion & { why: string };

const SNOW = new Set([71, 73, 75, 77, 85, 86]);

/**
 * What the weather points to, each with why: rain, cold, heat, wide swings and snow. Read from the forecast when the
 * trip is near, else from the same days last year (said so). `°` is the person's own unit, given as a formatter.
 */
export function weatherOffers(weather: WeatherDays, degrees: (celsius: number) => string): WeatherOffer[] {
  const days = weather.days;
  if (!days.length) return [];
  const offers: WeatherOffer[] = [];
  const add = (group: PackGroup, why: string, ...names: string[]) => names.forEach((name) => offers.push({ name, group, why }));
  const lastYear = weather.source === 'last-year';
  const of = (count: number) => `${count} of ${days.length} ${days.length === 1 ? 'day' : 'days'}`;

  const wet = days.filter((day) => (lastYear ? (day.rain ?? 0) >= 1 : (day.rain ?? 0) >= 50)).length;
  if (wet > 0) add('clothes', lastYear ? `Rain on ${of(wet)} last year` : `Rain likely on ${of(wet)}`, 'Umbrella', 'Rain jacket');
  if (wet >= 3) add('clothes', lastYear ? `Rain on ${of(wet)} last year` : `Rain likely on ${of(wet)}`, 'Waterproof shoes');

  const low = Math.min(...days.map((day) => day.low));
  const high = Math.max(...days.map((day) => day.high));
  const lowWhy = `Lows down to ${degrees(low)}${lastYear ? ' last year' : ''}`;
  const highWhy = `Highs up to ${degrees(high)}${lastYear ? ' last year' : ''}`;
  if (low <= 10) add('clothes', lowWhy, 'Warm jacket', 'Sweater');
  if (low <= 2) add('clothes', lowWhy, 'Hat and gloves', 'Thermal layer');
  if (high >= 27) {
    add('clothes', highWhy, 'Sun hat', 'Light, breathable clothes');
    add('wash', highWhy, 'Sunscreen');
    add('other', highWhy, 'Reusable water bottle');
  }
  if (days.some((day) => day.high - day.low >= 12)) add('clothes', 'Cool mornings, warm afternoons', 'Layers for cool mornings');
  if (days.some((day) => day.code !== undefined && SNOW.has(day.code))) add('clothes', 'Snow in the forecast', 'Boots for snow');
  return offers;
}

/** The offers not on the list yet (by name, case ignored) and not set aside for this trip. */
export function offersLeft(offers: readonly WeatherOffer[], listed: readonly string[], setAside: readonly string[]): WeatherOffer[] {
  const taken = new Set([...listed, ...setAside].map((name) => name.trim().toLowerCase()));
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = offer.name.toLowerCase();
    if (taken.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
