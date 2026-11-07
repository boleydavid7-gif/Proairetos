import { formatVolume, hydrationEquivalentOz, kindLabel, profileForDrink, type Drink, type HydrosDrinkProfile, type HydrosUnit } from './drinks';

const cell = (value: unknown) => {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const two = (value: number) => String(value).padStart(2, '0');

/** Local date and time as the phone shows them: 2026-10-15 and 07:30. */
function localParts(iso: string): [string, string] {
  const at = new Date(iso);
  return [`${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`, `${two(at.getHours())}:${two(at.getMinutes())}`];
}

/** Every recorded drink, oldest first, for a spreadsheet. Amounts in the person's unit. */
export function drinksCsv(drinks: readonly Drink[], profiles: readonly HydrosDrinkProfile[], unit: HydrosUnit): string {
  const header = ['Date', 'Time', 'Drink', `Amount (${unit})`, `Counts as (${unit})`, 'Caffeine (mg)', 'Electrolytes (mg)', 'Sugar (g)'];
  const rows = [...drinks]
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .map((drink) => {
      const [date, time] = localParts(drink.loggedAt);
      const name = drink.label || profileForDrink(drink, profiles)?.label || kindLabel(drink.kind);
      return [
        date,
        time,
        name,
        formatVolume(drink.amountOz, unit),
        formatVolume(hydrationEquivalentOz(drink, profiles), unit),
        drink.caffeineMg ?? '',
        drink.electrolytesMg ?? '',
        drink.sugarG ?? '',
      ].map(cell).join(',');
    });
  return [header.map(cell).join(','), ...rows].join('\r\n') + '\r\n';
}
