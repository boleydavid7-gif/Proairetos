import { everyNow, everyText, type Hemisphere, type Plant } from './plants';
import { DRY_TEXT, TOXIC_TEXT, speciesBy } from './species';
import type { Away } from './outdoors';

/** One plant on the sheet for whoever waters while the person is away. */
export type SitterRow = { name: string; place?: string; water: string; often: string; notes: string; pets?: string };

export function sitterRows(plants: readonly Plant[], today: string, hemisphere: Hemisphere = 'north'): SitterRow[] {
  return [...plants]
    .sort((a, b) => (a.place ?? '').localeCompare(b.place ?? '') || a.name.localeCompare(b.name))
    .map((plant) => {
      const type = speciesBy(plant.species);
      return {
        name: plant.name,
        place: [plant.place, plant.outside ? 'outside' : undefined].filter(Boolean).join(', ') || undefined,
        water: type ? DRY_TEXT[type.dry] : 'Water when the top of the soil is dry',
        often: `About ${everyText(everyNow(plant, today, hemisphere)).toLowerCase()}${plant.outside ? ', less after rain' : ''}`,
        notes: [type?.humid ? 'Likes humid air' : undefined, type?.note, plant.note].filter(Boolean).join(' '),
        pets: type?.toxic && type.toxic !== 'none' ? TOXIC_TEXT[type.toxic] : undefined,
      };
    });
}

/** The sheet as plain text, for a message. */
export function sitterText(rows: readonly SitterRow[], away: Away | undefined, dateText: (day: string) => string): string {
  const head = away ? `Plants, ${dateText(away.from)} to ${dateText(away.to)}` : 'Plants';
  const lines = rows.map((row) =>
    [`${row.name}${row.place ? ` (${row.place})` : ''}`, `${row.water}. ${row.often}.`, row.notes, row.pets].filter(Boolean).join('\n'),
  );
  return [head, ...lines].join('\n\n');
}
