/**
 * An amount as typed, in cents: "3,500.00", "3.500,00", "12,50", "3 500". The last mark with one or two digits after
 * it is the decimal; groups use the other mark. Blank is `null`; anything else unreadable ("1.234") is `undefined`.
 */
export function readAmount(value: string): number | null | undefined {
  const text = value.trim().replace(/[\s  ]/g, '').replace(/[.,]$/, '');
  if (!text) return null;
  const decimal = /[.,]\d{1,2}$/.test(text) ? text[text.search(/[.,]\d{1,2}$/)] : undefined;
  const whole = decimal ? text.slice(0, text.lastIndexOf(decimal)) : text;
  const cents = decimal ? text.slice(text.lastIndexOf(decimal) + 1) : '';
  const group = decimal === ',' ? '.' : ',';
  const grouped = new RegExp(`^\\d{1,3}(?:\\${group}\\d{3})+$`);
  if (!/^\d+$/.test(whole) && !grouped.test(whole)) return undefined;
  const amount = Math.round(Number(`${whole.split(group).join('')}.${cents || '0'}`) * 100);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
}
