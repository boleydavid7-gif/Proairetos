/*
 * The person's country's embassies and consulates at the destination, from Wikidata (CC0): name, city, address,
 * phone and website as recorded there. Wikidata can be incomplete, so the page says where it came from.
 */

export type Mission = { name: string; city?: string; address?: string; phone?: string; site?: string; lat?: number; lon?: number };

/** SPARQL for diplomatic missions (embassies, consulates) of one country in another, by ISO codes. */
export const missionQuery = (home: string, there: string) => `SELECT ?m ?mLabel ?address ?phone ?site ?coord ?cityLabel WHERE {
  ?home wdt:P297 "${home.toUpperCase().replace(/[^A-Z]/g, '')}". ?there wdt:P297 "${there.toUpperCase().replace(/[^A-Z]/g, '')}".
  ?m wdt:P31/wdt:P279* wd:Q7843791; wdt:P137 ?home; wdt:P17 ?there.
  FILTER NOT EXISTS { ?m wdt:P576 ?ended }
  OPTIONAL { ?m wdt:P6375 ?address } OPTIONAL { ?m wdt:P1329 ?phone } OPTIONAL { ?m wdt:P856 ?site }
  OPTIONAL { ?m wdt:P625 ?coord } OPTIONAL { ?m wdt:P131 ?city }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 12`;

type Binding = Record<string, { value: string } | undefined>;

/** Wikidata's answer as missions, embassies first, each once. */
export function readMissions(data: { results?: { bindings?: Binding[] } }): Mission[] {
  const seen = new Map<string, Mission>();
  for (const row of data.results?.bindings ?? []) {
    const id = row.m?.value;
    const name = row.mLabel?.value;
    if (!id || !name || /^Q\d+$/.test(name)) continue;
    const point = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord?.value ?? '');
    const known = seen.get(id);
    seen.set(id, {
      name,
      city: known?.city ?? row.cityLabel?.value,
      address: known?.address ?? row.address?.value,
      phone: known?.phone ?? row.phone?.value,
      site: known?.site ?? row.site?.value,
      lat: known?.lat ?? (point ? Number(point[2]) : undefined),
      lon: known?.lon ?? (point ? Number(point[1]) : undefined),
    });
  }
  return [...seen.values()].sort((a, b) => Number(/consulate/i.test(a.name)) - Number(/consulate/i.test(b.name)) || a.name.localeCompare(b.name));
}
