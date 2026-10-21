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
