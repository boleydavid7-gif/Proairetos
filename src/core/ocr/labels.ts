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

const MONEY = /(?:[$£€¥]\s?)?(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2}))(?!\d)/g;
const DUE_WORDS = /\b(amount due|total due|balance due|due amount|amount to pay|new balance|minimum payment|total|balance|amount)\b/i;
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
  match = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/);
  if (match) {
    let [a, b] = [+match[1], +match[2]];
    if (a > 12) [a, b] = [b, a];
    const year = match[3].length === 2 ? 2000 + +match[3] : +match[3];
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

export function billFromText(text: string, thisYear = new Date().getFullYear()): Found[] {
  const all = lines(text);
  const found: Found[] = [];
  // The amount beside words like "Amount due", the strongest such words first; else the largest amount on the page.
  const labelled = all
    .map((line, i) => ({ line, next: all[i + 1] ?? '', words: line.match(DUE_WORDS)?.[1]?.toLowerCase() }))
    .filter((each) => each.words);
  const rank = (words: string) => ['amount due', 'total due', 'balance due', 'due amount', 'amount to pay', 'new balance', 'total', 'balance', 'amount', 'minimum payment'].indexOf(words);
  labelled.sort((a, b) => rank(a.words!) - rank(b.words!));
  let amount: number | undefined;
  for (const each of labelled) {
    const hit = [...each.line.matchAll(MONEY)].pop() ?? [...each.next.matchAll(MONEY)][0];
    if (hit) {
      amount = money(hit[0]);
      if (amount !== undefined) break;
    }
  }
  if (amount === undefined) {
    const amounts = all.flatMap((line) => [...line.matchAll(MONEY)].map((hit) => money(hit[0]) ?? 0));
    if (amounts.length) amount = Math.max(...amounts);
  }
  if (amount !== undefined && amount > 0) found.push({ key: 'amount', label: 'Amount', value: amount.toFixed(2) });
  const company = all.find((line) => /^[A-Za-z][A-Za-z&'.\s-]{2,40}$/.test(line) && !/\b(invoice|statement|bill|page|account|customer|date|total|amount|due|balance|summary|dear)\b/i.test(line));
  if (company) found.unshift({ key: 'name', label: 'Name', value: company });
  const dueLine = all.findIndex((line) => /\b(due|pay by|payment date)\b/i.test(line) && dateIn(line, thisYear));
  const due = dueLine >= 0 ? dateIn(all[dueLine], thisYear) : undefined;
  if (due) found.push({ key: 'due', label: 'Due', value: due });
  return found;
}

/** Receipt values use the same on-device reader as bills, but a printed date is a transaction date, not a due date. */
export function receiptFromText(text: string, thisYear = new Date().getFullYear()): Found[] {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const found = billFromText(text, thisYear).filter((each) => each.key !== 'amount' && each.key !== 'due');
  // Receipts contain many whole-number decoys: dates, phone numbers, item counts, ZIP codes, and references.
  // Only consider money with an explicit decimal separator, including grouped thousands.
  const moneyPattern = /(?<![\w./-])(?:[$£€¥]\s*)?(?:(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+|\d+)[.,]\d{1,2})(?![\d.,])/g;
  const moneyValue = (raw: string): number | undefined => {
    const cleaned = raw.replace(/[$£€¥\s]/g, '');
    const normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : undefined;
  };
  const amounts = lines.flatMap((line) => [...line.matchAll(moneyPattern)].map((match) => moneyValue(match[0])).filter((value): value is number => value !== undefined && value > 0));
  const amount = amounts.sort((a, b) => b - a)[0];
  if (amount !== undefined) found.push({ key: 'amount', label: 'Amount', value: amount.toFixed(2) });
  const date = lines.map((line) => dateIn(line, thisYear)).find(Boolean);
  if (date) found.push({ key: 'date', label: 'Date', value: date });
  return found;
}
