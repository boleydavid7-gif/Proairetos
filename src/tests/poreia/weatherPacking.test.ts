import { describe, expect, it } from 'vitest';
import { offersLeft, weatherOffers } from '../../poreia/core/packing';

const c = (celsius: number) => `${Math.round(celsius)}°`;

describe('packing for the weather', () => {
  it('offers for rain, cold and heat, each with why', () => {
    const offers = weatherOffers({ source: 'forecast', days: [{ high: 12, low: 1, rain: 70 }, { high: 14, low: 4, rain: 80 }, { high: 13, low: 3, rain: 60 }, { high: 15, low: 5, rain: 10 }] }, c);
    const names = offers.map((offer) => offer.name);
    expect(names).toEqual(['Umbrella', 'Rain jacket', 'Waterproof shoes', 'Warm jacket', 'Sweater', 'Hat and gloves', 'Thermal layer']);
    expect(offers[0].why).toBe('Rain likely on 3 of 4 days');
    expect(offers.find((offer) => offer.name === 'Sweater')!.why).toBe('Lows down to 1°');
  });

  it('says when it reads last year, and offers for heat and wide swings', () => {
    const offers = weatherOffers({ source: 'last-year', days: [{ high: 33, low: 18, rain: 0 }, { high: 31, low: 19, rain: 0.2 }] }, c);
    expect(offers.map((offer) => offer.name)).toEqual(['Sun hat', 'Light, breathable clothes', 'Sunscreen', 'Reusable water bottle', 'Layers for cool mornings']);
    expect(offers[0].why).toBe('Highs up to 33° last year');
  });

  it('leaves out what is listed or set aside, once each', () => {
    const offers = weatherOffers({ source: 'forecast', days: [{ high: 30, low: 0, rain: 90 }] }, c);
    const left = offersLeft(offers, ['umbrella ', 'Sunscreen'], ['Thermal layer']).map((offer) => offer.name);
    expect(left).not.toContain('Umbrella');
    expect(left).not.toContain('Sunscreen');
    expect(left).not.toContain('Thermal layer');
    expect(new Set(left).size).toBe(left.length);
  });
});
