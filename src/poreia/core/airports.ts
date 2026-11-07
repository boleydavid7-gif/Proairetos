/*
 * The airport for a place, from OpenStreetMap: aerodromes with an IATA code within about 90 km, international ones
 * first, then the nearest. Used to fill flight and car searches that need codes (Kayak, Skyscanner and others).
 */

export type Airport = { code: string; name: string; lat?: number; lon?: number };

export type Element = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

export const airportQuery = (lat: number, lon: number) =>
  `[out:json][timeout:20];nwr["aeroway"="aerodrome"]["iata"](around:90000,${lat},${lon});out center tags;`;

const meters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
};

/** The airport to search from: an international one when there is one in range, else the nearest with a code. */
export function pickAirport(elements: readonly Element[], lat: number, lon: number): Airport | undefined {
  const found = elements
    .map((each) => {
      const at = each.center ?? (each.lat !== undefined && each.lon !== undefined ? { lat: each.lat, lon: each.lon } : undefined);
      const code = each.tags?.iata?.trim().toUpperCase();
      if (!at || !code || !/^[A-Z]{3}$/.test(code)) return undefined;
      const kind = `${each.tags?.['aerodrome:type'] ?? ''} ${each.tags?.aerodrome ?? ''}`.toLowerCase();
      // Military and private fields carry codes too, but no one books a flight to them.
      if (/military|private/.test(kind) || each.tags?.access === 'private') return undefined;
      return { code, name: each.tags?.name ?? code, at, international: kind.includes('international') || /international/i.test(each.tags?.name ?? ''), distance: meters({ lat, lon }, at) };
    })
    .filter((each): each is NonNullable<typeof each> => Boolean(each))
    .sort((a, b) => Number(b.international) - Number(a.international) || a.distance - b.distance);
  return found[0] ? { code: found[0].code, name: found[0].name, lat: found[0].at.lat, lon: found[0].at.lon } : undefined;
}
