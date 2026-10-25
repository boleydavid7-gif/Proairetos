/**
 * A deliberately small allow-list for receipt merchants. Receipt OCR often turns a phone number or an address into
 * a convincing-looking name, so a merchant is only accepted when an online reader returns a known store name.
 */
const KNOWN_STORES = [
  ['Kroger'],
  ['Walmart'],
  ['Target'],
  ['Costco'],
  ["Sam's Club", 'Sams Club'],
  ['Whole Foods Market', 'Whole Foods'],
  ["Trader Joe's", 'Trader Joes'],
  ['Safeway'],
  ['Publix'],
  ['Aldi'],
  ['Lidl'],
  ['Meijer'],
  ['H-E-B', 'HEB'],
  ['CVS'],
  ['Walgreens'],
  ['Dollar General'],
  ['Family Dollar'],
  ['The Home Depot', 'Home Depot'],
  ["Lowe's", 'Lowes'],
  ['Amazon'],
  ['Tesco'],
  ["Sainsbury's", 'Sainsburys'],
  ['Asda'],
  ['Waitrose'],
  ['Morrisons'],
  ['Boots'],
  ['Carrefour'],
  ['IKEA'],
] as const;

const normalize = (value: string) => value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Returns a canonical name only when the value contains a known store name. */
export function knownStoreName(value: string): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  for (const [canonical, ...aliases] of KNOWN_STORES) {
    if ([canonical, ...aliases].some((alias) => {
      const candidate = normalize(alias);
      return text === candidate || text.startsWith(`${candidate} `) || text.endsWith(` ${candidate}`) || text.includes(` ${candidate} `);
    })) return canonical;
  }
  return undefined;
}
