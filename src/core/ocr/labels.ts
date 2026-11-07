/*
 * What a photo's text holds for a form: a medicine's name and strength, a thing's model and serial, a bill's amount
 * and date. The text comes from reading the photo on the device; these only pick likely values out of it. Each is a
 * first guess shown for review, never saved by itself.
 */

export type Found = { key: string; label: string; value: string };

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => /[A-Za-z0-9]/.test(line));

const titleCase = (text: string) =>
  text.toLowerCase().replace(/(^|[\s\-/])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());

// ---------- Medicines ----------

const STRENGTH = /(\d+(?:[.,]\d+)?)\s?(mg|mcg|µg|ug|g|ml|mL|iu|IU|units?|%)(?:\s?\/\s?(\d+(?:[.,]\d+)?)\s?(ml|mL|dose|tab(?:let)?))?\b/i;
/** Words on a label that are not the medicine's name. */
const NOT_NAME = /\b(rx|qty|quantity|refills?|pharmacy|dr\.?|doctor|prescriber|date|exp(?:iry|ires)?|lot|ndc|din|keep|store|warning|caution|take|use|apply|directions|patient|pack|box|each|contains|for oral|oral use|only)\b/i;
const FORM_WORDS = /\b(tablets?|capsules?|caps?|tabs?|film[- ]coated|oral|solution|suspension|syrup|cream|ointment|gel|drops?|spray|inhaler|patch(es)?|liquid|chewable|extended[- ]release|er|xr|sr|dr)\b/gi;

export function medicineFromText(text: string): Found[] {
  const all = lines(text);
  const found: Found[] = [];
  const strengthLine = all.find((line) => STRENGTH.test(line) && !NOT_NAME.test(line));
  const strength = (strengthLine ?? all.find((line) => STRENGTH.test(line)))?.match(STRENGTH);
  let name: string | undefined;
  if (strengthLine) {
    const before = strengthLine.slice(0, strengthLine.search(STRENGTH)).replace(FORM_WORDS, '').replace(/[^A-Za-z\s-]/g, ' ').trim();
    if (before.length >= 3) name = before;
  }
  if (!name) {
    // Otherwise the first line of letters that reads like a name: mostly letters, not label furniture.
    name = all
      .map((line) => line.replace(FORM_WORDS, '').replace(/\s+/g, ' ').trim())
      .find((line) => /^[A-Za-z][A-Za-z\s-]{2,40}$/.test(line) && !NOT_NAME.test(line));
  }
  if (name) found.push({ key: 'name', label: 'Name', value: titleCase(name.replace(/\s+/g, ' ').trim()) });
  if (strength) {
    const [, amount, unit, per, perUnit] = strength;
    const tidyUnit = /^(iu)$/i.test(unit) ? 'IU' : /^ml$/i.test(unit) ? 'ml' : /^ug$/i.test(unit) ? 'mcg' : unit.toLowerCase();
    found.push({ key: 'dose', label: 'Strength', value: `${amount.replace(',', '.')} ${tidyUnit}${per ? ` / ${per} ${perUnit.toLowerCase()}` : ''}` });
  }
  const directions = all.find((line) => /^(take|use|apply|inhale|place|chew|dissolve)\b/i.test(line));
  if (directions) found.push({ key: 'how', label: 'Directions', value: directions });
  return found;
}

// ---------- Things ----------

const MODEL = /\b(?:model|mod\.?|m\/n|model\s*(?:no|number|#)\.?|type)\s*[:#.]?\s*([A-Z0-9][A-Z0-9\-/.]{2,24})/i;
const SERIAL = /\b(?:serial(?:\s*(?:no|number|#))?|s\/n|sn|ser\.?\s*no\.?)\s*[:#.]?\s*([A-Z0-9][A-Z0-9-]{3,30})/i;

export function thingFromText(text: string): Found[] {
  const all = lines(text);
  const found: Found[] = [];
  for (const line of all) {
    const serial = line.match(SERIAL)?.[1];
    if (serial && !found.some((each) => each.key === 'serial')) found.push({ key: 'serial', label: 'Serial number', value: serial.toUpperCase() });
    const model = line.replace(SERIAL, '').match(MODEL)?.[1];
    if (model && !found.some((each) => each.key === 'model')) found.push({ key: 'model', label: 'Model', value: model.toUpperCase() });
  }
  return found;
}

// ---------- Bills ----------

const DECIMAL_MONEY = /(?<![\w./-])(?:[$£€¥]\s*)?(?:(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+|\d+)[.,]\d{1,2})(?![\d.,])/g;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function money(text: string): number | undefined {
  const raw = text.replace(/[$£€¥\s]/g, '');
  // "1,234.56", "1.234,56" or "12,50".
  const cleaned = /,\d{2}$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A date written on a bill, as YYYY-MM-DD. Slashes read month first unless the first number is over 12. */
export function dateIn(text: string, thisYear = new Date().getFullYear()): string | undefined {
  let match = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (match) return `${match[1]}-${pad(+match[2])}-${pad(+match[3])}`;
  match = text.match(/\b(\d{1,2})([/.])(\d{1,2})[/.](\d{2,4})\b/);
  if (match) {
    // Dots are written day first (11.03.2026 is 11 March); slashes month first unless the first number is over 12.
    let [a, b] = [+match[1], +match[3]];
    if (a > 12 || match[2] === '.') [a, b] = [b, a];
    const year = match[4].length === 2 ? 2000 + +match[4] : +match[4];
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return `${year}-${pad(a)}-${pad(b)}`;
  }
  match = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?!\d)(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?/);
  if (match && MONTHS.includes(match[1].slice(0, 3).toLowerCase())) {
    return `${match[3] ?? thisYear}-${pad(MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) + 1)}-${pad(+match[2])}`;
  }
  match = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?(?:\s+(\d{4}))?/);
  if (match && MONTHS.includes(match[2].slice(0, 3).toLowerCase())) {
    return `${match[3] ?? thisYear}-${pad(MONTHS.indexOf(match[2].slice(0, 3).toLowerCase()) + 1)}-${pad(+match[1])}`;
  }
  return undefined;
}

/** Photos misread digits as look-alike letters; inside a money-looking word they are put back. */
export function fixDigits(text: string): string {
  return text.replace(/(?<![A-Za-z])[$£€]?\s?[0-9OoIl|S][0-9OoIl|S,.]{2,}(?![A-Za-z])/g, (token) => {
    const digits = token.replace(/[^0-9]/g, '').length;
    if (digits < 2 || !/[.,][0-9OoIl|S]{1,2}$/.test(token)) return token;
    return token.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/S/g, '5');
  });
}

/** What each kind of paper calls the sum to pay, most specific first. */
const BILL_WORDS = [/\b(?:total\s+)?amount\s+due\b/i, /\b(?:total|balance|payment)\s+due\b/i, /\bpay\s+this\s+amount\b/i, /\b(?:please\s+pay|new\s+balance|current\s+charges)\b/i, /\bamount\s+to\s+pay\b/i, /\bbalance\b/i];
const RECEIPT_WORDS = [/\bgrand\s+total\b/i, /\b(?:total\s+(?:due|sale|amount)|amount\s+due|balance\s+due|order\s+total|sale\s+total)\b/i, /(?<!sub)(?<!sub )\btotal\b/i, /\bamount\s+(?:charged|paid)\b/i, /\bbalance\b/i];
/** Lines whose money is not the sum to pay. */
const NOT_THE_SUM = /\b(?:sub\s?-?total|tax|vat|gst|hst|tip|gratuity|change|cash|tender(?:ed)?|savings?|discount|coupon|you\s+saved|points?|items?|previous|prior|last\s+(?:payment|bill)|payment\s+received|minimum|late|credit\s+limit|available)\b/i;

function moneyIn(line: string): number[] {
  return [...line.matchAll(DECIMAL_MONEY)].map((hit) => money(hit[0])).filter((value): value is number => value !== undefined && value > 0);
}

/**
 * The sum to pay, read by its words: the first of a ranked list of labels whose line (or the next one, where the number
 * wraps) holds money, skipping subtotal, tax, change and cash lines. With no label, the largest amount outside those lines,
 * then the largest on the page.
 */
export function amountByWords(text: string, words: readonly RegExp[]): number | undefined {
  const all = lines(fixDigits(text));
  for (const word of words) {
    for (let i = 0; i < all.length; i += 1) {
      if (!word.test(all[i])) continue;
      if (NOT_THE_SUM.test(all[i].replace(word, ''))) continue;
      const own = moneyIn(all[i]);
      if (own.length) return own[own.length - 1];
      const next = all[i + 1];
      if (next && !NOT_THE_SUM.test(next)) {
        const after = moneyIn(next);
        if (after.length) return after[0];
      }
    }
  }
  const outside = all.filter((line) => !NOT_THE_SUM.test(line)).flatMap(moneyIn).sort((a, b) => b - a)[0];
  return outside ?? all.flatMap(moneyIn).sort((a, b) => b - a)[0];
}

const DUE_WORDS = /\b(?:due(?:\s+date)?|pay\s+by|payment\s+date|please\s+pay\s+by|pay\s+on\s+or\s+before)\b/i;

export function billFromText(text: string, thisYear = new Date().getFullYear()): Found[] {
  const all = lines(text);
  const found: Found[] = [];
  const amount = amountByWords(text, BILL_WORDS);
  if (amount !== undefined && amount > 0) found.push({ key: 'amount', label: 'Amount', value: amount.toFixed(2) });
  // Biller names are not trusted from offline OCR; the form leaves this for manual entry or a validated online reader.
  // A due date is on the line that says due, or on the line after it where the date wraps.
  let due: string | undefined;
  for (let i = 0; i < all.length && !due; i += 1) {
    if (!DUE_WORDS.test(all[i]) || /\b(?:statement|invoice|issue|billing)\s+date\b/i.test(all[i])) continue;
    due = dateIn(all[i], thisYear) ?? (all[i + 1] && !DUE_WORDS.test(all[i + 1]) ? dateIn(all[i + 1], thisYear) : undefined);
  }
  if (due) found.push({ key: 'due', label: 'Due', value: due });
  return found;
}

/** Receipt values use the same on-device reader as bills, but a printed date is a transaction date, not a due date. */
export function receiptFromText(text: string, thisYear = new Date().getFullYear()): Found[] {
  const all = lines(text);
  // The offline reader does not validate merchant names. Leave that field blank rather than promoting OCR noise;
  // the optional online reader may supply a validated store name separately.
  const found: Found[] = [];
  // Receipts contain many whole-number decoys: dates, phone numbers, item counts, ZIP codes, and references, and
  // cash handed over can beat the total. Only money with a decimal separator counts, and the total is read by its words.
  const amount = amountByWords(text, RECEIPT_WORDS);
  if (amount !== undefined) found.push({ key: 'amount', label: 'Amount', value: amount.toFixed(2) });
  const date = all.map((line) => dateIn(line, thisYear)).find(Boolean);
  if (date) found.push({ key: 'date', label: 'Date', value: date });
  return found;
}
