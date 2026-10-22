import { plainWiki } from './spots';

/*
 * Facts for arriving somewhere: the emergency numbers, the plugs and the current, and where the person's own
 * government keeps entry rules and travel advice. Kept here as tables, so they work offline. Numbers from each
 * country's published emergency numbers; plugs, volts and hertz as the IEC's World Plugs lists them.
 */

export type Emergency = { all?: string; police?: string; ambulance?: string; fire?: string };
export type Power = { plugs: string; volts: string; hertz: string };

const ONE = (all: string): Emergency => ({ all });

export const EMERGENCY: Record<string, Emergency> = {
  US: ONE('911'), CA: ONE('911'), MX: ONE('911'), PR: ONE('911'), CR: ONE('911'), DO: ONE('911'), EC: ONE('911'), PA: ONE('911'), PH: ONE('911'),
  GB: ONE('999 or 112'), IE: ONE('112 or 999'), HK: ONE('999'), MY: ONE('999'), KE: ONE('999 or 112'), QA: ONE('999'), JO: ONE('911'), SA: ONE('911'),
  FR: ONE('112'), DE: ONE('112'), ES: ONE('112'), PT: ONE('112'), IT: ONE('112'), NL: ONE('112'), BE: ONE('112'), LU: ONE('112'), AT: ONE('112'),
  DK: ONE('112'), SE: ONE('112'), NO: ONE('112'), FI: ONE('112'), IS: ONE('112'), PL: ONE('112'), CZ: ONE('112'), SK: ONE('112'), HU: ONE('112'),
  SI: ONE('112'), HR: ONE('112'), GR: ONE('112'), CY: ONE('112'), MT: ONE('112'), RO: ONE('112'), BG: ONE('112'), EE: ONE('112'), LV: ONE('112'),
  LT: ONE('112'), TR: ONE('112'), RU: ONE('112'), UA: ONE('112'), GE: ONE('112'), IN: ONE('112'), ID: ONE('112'), TZ: ONE('112'), CO: ONE('123'),
  CH: { all: '112', police: '117', ambulance: '144', fire: '118' },
  AU: { all: '000 (112 from a mobile)' },
  NZ: ONE('111'),
  JP: { police: '110', ambulance: '119', fire: '119' },
  KR: { police: '112', ambulance: '119', fire: '119' },
  CN: { police: '110', ambulance: '120', fire: '119' },
  TW: { police: '110', ambulance: '119', fire: '119' },
  SG: { police: '999', ambulance: '995', fire: '995' },
  TH: { police: '191', ambulance: '1669', fire: '199' },
  VN: { police: '113', ambulance: '115', fire: '114' },
  AE: { police: '999', ambulance: '998', fire: '997' },
  IL: { police: '100', ambulance: '101', fire: '102' },
  EG: { police: '122', ambulance: '123', fire: '180' },
  MA: { police: '19', ambulance: '15', fire: '15' },
  ZA: { all: '112 from a mobile', police: '10111', ambulance: '10177' },
  BR: { police: '190', ambulance: '192', fire: '193' },
  AR: { police: '911', ambulance: '107', fire: '100' },
  CL: { police: '133', ambulance: '131', fire: '132' },
  PE: { police: '105', ambulance: '106', fire: '116' },
  CU: { police: '106', ambulance: '104', fire: '105' },
  JM: { police: '119', ambulance: '110', fire: '110' },
};

const P = (plugs: string, volts: string, hertz: string): Power => ({ plugs, volts, hertz });
const EU = P('C, F', '230', '50');

export const POWER: Record<string, Power> = {
  US: P('A, B', '120', '60'), CA: P('A, B', '120', '60'), MX: P('A, B', '127', '60'), PR: P('A, B', '120', '60'), CR: P('A, B', '120', '60'),
  DO: P('A, B', '120', '60'), EC: P('A, B', '120', '60'), PA: P('A, B', '120', '60'), CO: P('A, B', '110', '60'), JM: P('A, B', '110', '50'),
  CU: P('A, B, C, L', '110 or 220', '60'), PE: P('A, B, C', '220', '60'), BR: P('C, N', '127 or 220', '60'), AR: P('C, I', '220', '50'),
  CL: P('C, L', '220', '50'),
  GB: P('G', '230', '50'), IE: P('G', '230', '50'), CY: P('G', '230', '50'), MT: P('G', '230', '50'), HK: P('G', '220', '50'),
  SG: P('G', '230', '50'), MY: P('G', '240', '50'), AE: P('G', '230', '50'), QA: P('G', '240', '50'), KE: P('G', '240', '50'), SA: P('G', '230', '60'),
  DE: EU, ES: EU, PT: EU, NL: EU, AT: EU, SE: EU, NO: EU, FI: EU, IS: EU, HU: EU, SI: EU, HR: EU, GR: EU, RO: EU, BG: EU, EE: EU, LV: EU, LT: EU,
  LU: EU, TR: EU, RU: P('C, F', '220', '50'), UA: EU, GE: P('C, F', '220', '50'), ID: EU, KR: P('C, F', '220', '60'),
  FR: P('C, E', '230', '50'), BE: P('C, E', '230', '50'), PL: P('C, E', '230', '50'), CZ: P('C, E', '230', '50'), SK: P('C, E', '230', '50'),
  IT: P('C, F, L', '230', '50'), DK: P('C, E, F, K', '230', '50'), CH: P('C, J', '230', '50'),
  JP: P('A, B', '100', '50 or 60'), TW: P('A, B', '110', '60'), CN: P('A, C, I', '220', '50'), TH: P('A, B, C, O', '230', '50'),
  VN: P('A, C', '220', '50'), PH: P('A, B, C', '220', '60'), IN: P('C, D, M', '230', '50'), TZ: P('D, G', '230', '50'),
  IL: P('C, H', '230', '50'), EG: P('C, F', '220', '50'), MA: P('C, E', '220', '50'), ZA: P('C, D, M, N', '230', '50'),
  JO: P('B, C, D, F, G, J', '230', '50'), AU: P('I', '230', '50'), NZ: P('I', '230', '50'),
};

export const emergencyIn = (countryCode?: string) => (countryCode ? EMERGENCY[countryCode.toUpperCase()] : undefined);
export const powerIn = (countryCode?: string) => (countryCode ? POWER[countryCode.toUpperCase()] : undefined);

/** Emergency numbers as short lines: "112", or "Police 110", "Ambulance and fire 119". */
export function emergencyLines(numbers: Emergency): string[] {
  const lines: string[] = [];
  if (numbers.all) lines.push(numbers.all);
  const named: [string, string | undefined][] = [
    ['Police', numbers.police],
    ['Ambulance', numbers.ambulance],
    ['Fire', numbers.fire],
  ];
  const seen = new Map<string, string[]>();
  for (const [name, number] of named) if (number) seen.set(number, [...(seen.get(number) ?? []), name]);
  for (const [number, names] of seen) lines.push(`${names.join(' and ').replace(/^(\w)(.*)$/, (_, first: string, rest: string) => first + rest.toLowerCase())} ${number}`);
  return lines;
}

/** Plugs that differ from home's, said plainly; nothing when home's plugs fit or are not known. */
export function plugNote(home: Power | undefined, there: Power): string | undefined {
  if (!home) return undefined;
  const homePlugs = new Set(home.plugs.split(', '));
  const fits = there.plugs.split(', ').some((plug) => homePlugs.has(plug));
  const voltsDiffer = home.volts !== there.volts;
  if (fits && !voltsDiffer) return 'Same plugs and current as home.';
  const parts = [fits ? 'Some plugs fit' : 'An adapter is needed for these plugs', voltsDiffer ? `the current is ${there.volts} V, home is ${home.volts} V` : ''];
  return `${parts.filter(Boolean).join('; ')}.`;
}

export type Advice = { name: string; url: string };

/** Where the person's own government keeps entry rules and travel advice; IATA's travel centre for anywhere else. */
export function adviceFor(homeCountry?: string): Advice {
  switch (homeCountry?.toUpperCase()) {
    case 'US':
      return { name: 'U.S. Department of State', url: 'https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages.html' };
    case 'GB':
      return { name: 'GOV.UK foreign travel advice', url: 'https://www.gov.uk/foreign-travel-advice' };
    case 'CA':
      return { name: 'Travel.gc.ca', url: 'https://travel.gc.ca/travelling/advisories' };
    case 'AU':
      return { name: 'Smartraveller', url: 'https://www.smartraveller.gov.au/destinations' };
    case 'NZ':
      return { name: 'SafeTravel', url: 'https://www.safetravel.govt.nz/destinations' };
    case 'IE':
      return { name: 'Ireland’s travel advice', url: 'https://www.ireland.ie/en/dfa/overseas-travel/advice/' };
    default:
      return { name: 'IATA Travel Centre', url: 'https://www.iatatravelcentre.com/' };
  }
}

/** The section of a Wikivoyage page under a heading such as "Tipping", as plain words, up to `limit` characters. */
export function wikiSection(wikitext: string, heading: RegExp, limit = 700): string | undefined {
  const lines = wikitext.split('\n');
  const start = lines.findIndex((line) => {
    const match = /^(=+)\s*(.*?)\s*=+\s*$/.exec(line);
    return match && heading.test(match[2]);
  });
  if (start === -1) return undefined;
  const level = /^(=+)/.exec(lines[start])![1].length;
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^(=+)[^=]/.exec(line);
    if (match && match[1].length <= level) break;
    if (/^\s*(\[\[(File|Image):|\{\{)/i.test(line) && !/\}\}.*\w/.test(line)) continue;
    body.push(line.replace(/^=+\s*(.*?)\s*=+\s*$/, '$1:').replace(/^[*#:]+\s*/, ''));
  }
  const text = plainWiki(body.join(' '));
  if (!text) return undefined;
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = cut.lastIndexOf('. ');
  return end > limit / 2 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}
